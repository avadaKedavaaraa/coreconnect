
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Lineage, type CarouselItem, type LectureRule, GlobalConfig, Sector } from '../types';
import { Book, FileText, Video, Calendar, Search, Filter, X, Trash2, LayoutGrid, List, FolderOpen, ArrowLeft, Edit2, Plus, FolderPlus, Loader2, Image as ImageIcon, Send, Link as LinkIcon, Repeat, ExternalLink, Hourglass, MonitorOff, Bell, Layers, Code, Pin, PinOff, SortAsc, SortDesc, GripVertical, Save, Check } from 'lucide-react';
import CalendarWidget from './CalendarWidget';
import DOMPurify from 'dompurify';
import { trackActivity } from '../App';

interface SectorViewProps {
  items: CarouselItem[];
  allItems?: CarouselItem[];
  lineage: Lineage;
  sectorId: string;
  onViewItem: (item: CarouselItem) => void;
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (item: CarouselItem) => void;
  onUpdateItem?: (item: CarouselItem) => Promise<void>; 
  onBack?: () => void;
  onAddItem?: (sectorId: string) => void; 
  onQuickCreate?: (item: CarouselItem) => void; 
  onUpdateSubject?: (oldName: string, newName: string, newImage?: string) => Promise<void>;
  onReorder?: (updates: { id: string, order_index: number }[]) => Promise<void>;
  schedules?: LectureRule[];
  quickInputOnly?: boolean; 
  config?: GlobalConfig;
  sectors?: Sector[]; 
}

const ACADEMIC_SECTORS = ['books', 'notes', 'resources', 'tasks'];

const SectorView: React.FC<SectorViewProps> = ({ 
    items, allItems, lineage, sectorId, onViewItem, isAdmin, onDelete, onEdit, onUpdateItem, onBack, onAddItem, onQuickCreate, onUpdateSubject, onReorder, schedules, quickInputOnly, config, sectors 
}) => {
  const isWizard = lineage === Lineage.WIZARD;
  
  // TRACKING HOOK
  useEffect(() => {
      try {
          const profile = JSON.parse(localStorage.getItem('core_connect_profile') || '{}');
          if (profile.id && !quickInputOnly) {
              trackActivity(profile.id, 'ENTER_SECTOR', sectorId, sectorId, 0);
          }
      } catch(e) {}
  }, [sectorId, quickInputOnly]);

  // --- STATE ---
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [viewMode, setViewMode] = useState<'folders' | 'masonry' | 'list'>('folders');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  const [draggedItem, setDraggedItem] = useState<CarouselItem | null>(null);
  const [localDisplayItems, setLocalDisplayItems] = useState<CarouselItem[]>([]);
  const [isOrderChanged, setIsOrderChanged] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: CarouselItem } | null>(null);
  const [quickPostText, setQuickPostText] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [editingSubject, setEditingSubject] = useState<{originalName: string, name: string, image: string} | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectImage, setNewSubjectImage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- DERIVED DATA ---
  const subjects = useMemo(() => Array.from(new Set(items.map(i => i.subject || 'General'))).sort(), [items]);
  const currentSector = sectors?.find(s => s.id === sectorId);
  const activeSortOrder = currentSector?.sortOrder || 'newest';
  const isManualSort = activeSortOrder === 'manual';

  // --- SORTING & MERGING LOGIC ---
  useEffect(() => {
      let combined = [...items];
      const safeSchedules = schedules || [];

      // Inject Virtual Lectures if in Lectures Sector
      if (sectorId === 'lectures' && safeSchedules.length > 0) {
          const today = new Date();
          const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
          const todayStr = today.toISOString().split('T')[0].replace(/-/g, '.');

          const todaysRules = safeSchedules.filter(rule => 
              rule.isActive && rule.dayOfWeek === dayName && 
              (!rule.endDate || new Date(rule.endDate) >= today)
          );

          const virtualItems: CarouselItem[] = todaysRules.map(rule => ({
              id: `virtual-${rule.id}`,
              title: `${rule.subject}`,
              content: `Scheduled Lecture at ${rule.startTime}.`,
              date: todayStr,
              type: 'video', 
              subject: rule.subject,
              sector: 'lectures',
              author: 'Scheduler',
              fileUrl: rule.link,
              isUnread: true,
              isPinned: true, 
              likes: 0,
              style: { titleColor: isWizard ? '#34d399' : '#e879f9', contentColor: '#ffffff' }
          }));

          // Avoid duplicates if admin already created one manually for today
          virtualItems.forEach(vItem => {
              const realExists = items.some(i => i.date === vItem.date && i.subject === vItem.subject && i.title.includes(vItem.title));
              if (!realExists) combined.unshift(vItem);
          });
      }
      
      // Sort
      combined.sort((a, b) => {
          // Pinned items always on top
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          
          if (activeSortOrder === 'manual') {
              const orderA = a.order_index ?? 0;
              const orderB = b.order_index ?? 0;
              if (orderA !== orderB) return orderA - orderB;
          }

          if (activeSortOrder === 'alphabetical') {
              return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
          }

          const dateA = a.date.replace(/\./g, '-');
          const dateB = b.date.replace(/\./g, '-');
          if (dateA !== dateB) {
              const timeA = new Date(dateA).getTime() || 0;
              const timeB = new Date(dateB).getTime() || 0;
              return activeSortOrder === 'oldest' ? timeA - timeB : timeB - timeA;
          }
          return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
      });

      setLocalDisplayItems(combined);
      setIsOrderChanged(false);

  }, [items, sectorId, schedules, lineage, sectors, activeSortOrder]);

  const filteredItems = useMemo(() => {
    return localDisplayItems.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                            item.content.toLowerCase().includes(search.toLowerCase());
      const normalizedItemDate = item.date.replace(/-/g, '.');
      const normalizedFilter = dateFilter.replace(/-/g, '.');
      
      const matchesDate = dateFilter ? normalizedItemDate === normalizedFilter : true;
      const matchesSubject = subjectFilter ? (item.subject || 'General') === subjectFilter : true;
      const matchesPinned = showPinnedOnly ? item.isPinned : true;

      return matchesSearch && matchesDate && matchesSubject && matchesPinned;
    });
  }, [localDisplayItems, search, dateFilter, subjectFilter, showPinnedOnly]);

  const isLectureMode = sectorId === 'lectures';

  // --- DRAG & DROP ---
  const handleDragStart = (e: React.DragEvent, item: CarouselItem) => {
      if (!isAdmin || !isManualSort) return;
      setDraggedItem(item);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragOver = (e: React.DragEvent, targetItem: CarouselItem) => {
      if (!isAdmin || !isManualSort || !draggedItem || draggedItem.id === targetItem.id) return;
      e.preventDefault(); 
  };

  const handleDrop = (e: React.DragEvent, targetItem: CarouselItem) => {
      if (!isAdmin || !isManualSort || !draggedItem || draggedItem.id === targetItem.id) return;
      e.preventDefault();

      const currentIndex = localDisplayItems.findIndex(i => i.id === draggedItem.id);
      const targetIndex = localDisplayItems.findIndex(i => i.id === targetItem.id);

      if (currentIndex === -1 || targetIndex === -1) return;

      const newItems = [...localDisplayItems];
      const [removed] = newItems.splice(currentIndex, 1);
      newItems.splice(targetIndex, 0, removed);

      setLocalDisplayItems(newItems);
      setIsOrderChanged(true);
      setDraggedItem(null);
  };

  const handleSaveOrder = async () => {
      if (!onReorder) return;
      setIsSavingOrder(true);
      try {
          const updates = localDisplayItems.map((item, index) => ({ id: item.id, order_index: index }));
          await onReorder(updates);
          setIsOrderChanged(false);
      } catch (e) { alert("Failed to save order."); } finally { setIsSavingOrder(false); }
  };

  // --- UI STATE MANAGEMENT ---
  useEffect(() => {
    if ((search || dateFilter) && viewMode === 'folders') { setViewMode('masonry'); }
  }, [search, dateFilter, viewMode]);

  useEffect(() => {
    setSearch(''); setDateFilter(''); setSubjectFilter(''); setShowPinnedOnly(false);
    setViewMode(isLectureMode ? 'list' : 'folders');
  }, [sectorId, isLectureMode]);

  useEffect(() => { if (isCreatingSubject && inputRef.current) inputRef.current.focus(); }, [isCreatingSubject]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, item: CarouselItem) => {
      if (!isAdmin) return;
      e.preventDefault(); e.stopPropagation();
      let x = e.clientX; let y = e.clientY;
      // Adjust if close to edge
      if (window.innerWidth - x < 160) x -= 160;
      if (window.innerHeight - y < 150) y -= 150;
      setContextMenu({ x, y, item });
  };

  const handleSubjectClick = (subject: string) => { setSubjectFilter(subject); setViewMode('masonry'); };
  const clearFilters = () => { setSearch(''); setDateFilter(''); setSubjectFilter(''); setShowPinnedOnly(false); if (viewMode !== 'folders' && !isLectureMode) setViewMode('folders'); };

  // --- QUICK POST & SUBJECTS ---
  const handleQuickPost = async () => {
      if (!quickPostText.trim() || !onQuickCreate) return;
      setIsPosting(true);
      try {
          await onQuickCreate({
              id: crypto.randomUUID(),
              title: quickPostText.substring(0, 30) + (quickPostText.length > 30 ? '...' : ''),
              content: quickPostText,
              date: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
              type: 'announcement', sector: sectorId, subject: subjectFilter || 'General', author: 'Admin', isUnread: true, isPinned: false, likes: 0, style: {}
          });
          setQuickPostText('');
      } catch (e) { alert('Failed to post'); } finally { setIsPosting(false); }
  };
  
  const handleTogglePin = async (e: React.MouseEvent, item: CarouselItem) => {
      e.stopPropagation();
      if (onUpdateItem) { await onUpdateItem({...item, isPinned: !item.isPinned}); } else if (onEdit) { onEdit({...item, isPinned: !item.isPinned}); }
  };

  const handleCreateSubject = async () => {
      if (!newSubjectName.trim() || !onQuickCreate) return;
      setIsProcessing(true);
      const subjectName = newSubjectName.trim();
      let targetSectors = [sectorId];
      if (ACADEMIC_SECTORS.includes(sectorId)) targetSectors = ACADEMIC_SECTORS;
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '.');
      
      try {
          for (const targetSector of targetSectors) {
              const sourceList = allItems || items;
              const subjectExists = sourceList.some(item => item.sector === targetSector && (item.subject || '').trim().toLowerCase() === subjectName.toLowerCase());
              if (!subjectExists) {
                  await onQuickCreate({
                      id: crypto.randomUUID(), title: `Welcome to ${subjectName}`, content: `This folder has been created for ${subjectName} resources.`, 
                      date: today, type: 'announcement', sector: targetSector, subject: subjectName, image: newSubjectImage || undefined, 
                      author: 'System', isUnread: true, likes: 0, style: { titleColor: isWizard ? '#10b981' : '#d946ef', contentColor: '#ffffff', fontFamily: 'sans', isGradient: false }
                  });
              }
          }
          setNewSubjectName(''); setNewSubjectImage(''); setIsCreatingSubject(false);
      } catch (e) { alert("Failed to create subject."); } finally { setIsProcessing(false); }
  };

  const handleSaveSubjectEdit = async () => {
      if (!editingSubject || !onUpdateSubject) return;
      setIsProcessing(true);
      try { await onUpdateSubject(editingSubject.originalName, editingSubject.name, editingSubject.image); setEditingSubject(null); } catch(e) { alert('Failed to update subject'); } finally { setIsProcessing(false); }
  };

  const handleDeleteSubject = async (e: React.MouseEvent, subject: string) => {
      e.stopPropagation(); if (!onDelete) return;
      const count = items.filter(i => (i.subject || 'General') === subject).length;
      if (!confirm(`WARNING: This will delete the subject "${subject}" and ALL ${count} items inside it.\n\nThis action cannot be undone.\n\nAre you sure?`)) return;
      items.filter(i => (i.subject || 'General') === subject).forEach(item => onDelete(item.id));
  };

  const getTypeIcon = (type: string) => {
      switch(type) { case 'video': return <Video size={20} />; case 'file': return <FileText size={20} />; case 'mixed': return <Layers size={20} />; case 'code': return <Code size={20} />; case 'link': return <LinkIcon size={20} />; default: return <FileText size={20} />; }
  };

  if (quickInputOnly) {
     return (
        <div className={`relative flex items-center p-2 rounded-lg border backdrop-blur-sm transition-all ${isWizard ? 'bg-emerald-950/40 border-emerald-500/30 focus-within:border-emerald-400' : 'bg-fuchsia-950/40 border-fuchsia-500/30 focus-within:border-fuchsia-400'}`}>
            <input type="text" value={quickPostText} onChange={(e) => setQuickPostText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleQuickPost()} placeholder="Lazy Post: Type message & press Enter..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/30 px-2" disabled={isPosting}/>
            <button onClick={handleQuickPost} disabled={!quickPostText.trim() || isPosting} className={`p-2 rounded-full transition-colors ${isWizard ? 'text-emerald-400 hover:bg-emerald-900/50' : 'text-fuchsia-400 hover:bg-fuchsia-900/50'}`}>{isPosting ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}</button>
        </div>
      );
  }

  return (
    <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 pb-20 animate-[fade-in-up_0.3s_ease-out] ${isWizard ? 'scrollbar-wizard' : 'scrollbar-muggle'}`}>
      
      {contextMenu && isAdmin && (
        <div className={`fixed z-[100] min-w-[160px] rounded-lg border shadow-xl overflow-hidden py-1 animate-[fade-in_0.1s] ${isWizard ? 'bg-[#0a0f0a] border-emerald-500/50 shadow-emerald-900/50' : 'bg-[#0f0a15] border-fuchsia-500/50 shadow-fuchsia-900/50'}`} style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
            <button onClick={(e) => { handleTogglePin(e, contextMenu.item); setContextMenu(null); }} className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/10 ${isWizard ? 'text-emerald-100' : 'text-fuchsia-100'}`}>{contextMenu.item.isPinned ? <PinOff size={14}/> : <Pin size={14}/>} {contextMenu.item.isPinned ? "Unpin" : "Pin to Top"}</button>
            {onEdit && <button onClick={(e) => { onEdit(contextMenu.item); setContextMenu(null); }} className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/10 ${isWizard ? 'text-emerald-100' : 'text-fuchsia-100'}`}><Edit2 size={14}/> Edit</button>}
            {onDelete && <button onClick={(e) => { if(confirm('Delete this item?')) onDelete(contextMenu.item.id); setContextMenu(null); }} className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-red-900/30 text-red-400"><Trash2 size={14}/> Delete</button>}
        </div>
      )}

      {editingSubject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className={`w-full max-w-md p-6 rounded-xl border shadow-2xl space-y-4 ${isWizard ? 'bg-[#0a0f0a] border-emerald-600' : 'bg-[#0f0a15] border-fuchsia-600'}`}>
                <h3 className={`text-xl font-bold ${isWizard ? 'text-emerald-100' : 'text-fuchsia-100'}`}>Edit Subject</h3>
                <input value={editingSubject.name || ''} onChange={(e) => setEditingSubject(prev => prev ? {...prev, name: e.target.value} : null)} placeholder="Subject Name" className={`w-full p-3 rounded border bg-black/40 outline-none ${isWizard ? 'border-emerald-800 text-emerald-100' : 'border-fuchsia-800 text-fuchsia-100'}`} autoFocus />
                <input value={editingSubject.image || ''} onChange={(e) => setEditingSubject(prev => prev ? {...prev, image: e.target.value} : null)} placeholder="Cover Image URL" className={`w-full p-3 rounded border bg-black/40 outline-none ${isWizard ? 'border-emerald-800 text-emerald-100' : 'border-fuchsia-800 text-fuchsia-100'}`} />
                {editingSubject.image && <img src={editingSubject.image} className="w-full h-32 object-cover rounded border border-white/10" />}
                <div className="flex gap-2 justify-end"><button onClick={() => setEditingSubject(null)} className="px-4 py-2 rounded text-white/50 hover:text-white">Cancel</button><button onClick={handleSaveSubjectEdit} disabled={isProcessing} className={`px-6 py-2 rounded font-bold flex items-center gap-2 ${isWizard ? 'bg-emerald-600 text-black' : 'bg-fuchsia-600 text-black'}`}>{isProcessing ? <Loader2 className="animate-spin"/> : <Check size={18}/>} Save Changes</button></div>
            </div>
        </div>
      )}
      
      {/* Header Controls */}
      <div className="flex items-center gap-4 mb-4 justify-between">
          <div className="flex items-center gap-4">
              {onBack && <button onClick={onBack} className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 border-transparent ${isWizard ? 'text-emerald-400 hover:text-emerald-200 hover:border-emerald-500' : 'text-fuchsia-400 hover:text-fuchsia-200 hover:border-fuchsia-500'}`}><ArrowLeft size={16} /> Exit Sector</button>}
              {!onBack && subjectFilter && viewMode !== 'folders' && !isLectureMode && <button onClick={clearFilters} className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 border-transparent ${isWizard ? 'text-emerald-400 hover:text-emerald-200 hover:border-emerald-500' : 'text-fuchsia-400 hover:text-fuchsia-200 hover:border-fuchsia-500'}`}><FolderOpen size={16} /> Back to Folders</button>}
          </div>
          <div className="flex items-center gap-3">{onAddItem && <button onClick={() => onAddItem(sectorId)} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold shadow-lg transition-all hover:scale-105 active:scale-95 ${isWizard ? 'bg-emerald-600 text-black hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-fuchsia-600 text-black hover:bg-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.3)]'}`}><Plus size={18} /> <span className="hidden sm:inline">Add Content</span></button>}</div>
      </div>

      {!onBack && !isLectureMode && subjectFilter && <div className="mb-6 text-center animate-[fade-in_0.5s]"><h2 className={`text-4xl font-bold tracking-widest uppercase drop-shadow-[0_0_10px_currentColor] ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`}>{subjectFilter}</h2><div className={`h-1 w-24 mx-auto mt-2 rounded-full ${isWizard ? 'bg-emerald-500' : 'bg-fuchsia-500'}`}></div></div>}

      {/* FILTER BAR */}
      <div className={`mb-8 p-4 rounded-xl border backdrop-blur-md flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between sticky top-2 sm:top-4 z-40 shadow-2xl transition-all mx-2 sm:mx-0 ${isWizard ? 'bg-emerald-950/80 border-emerald-500/50 shadow-black/50' : 'bg-fuchsia-950/80 border-fuchsia-500/50 shadow-black/50'}`}>
         <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto flex-1">
            <div className="relative flex-[2] min-w-[200px]"><Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isWizard ? 'text-emerald-500' : 'text-fuchsia-500'} pointer-events-none`} /><input type="text" placeholder={isWizard ? "Search the archives..." : "Filter database..."} value={search} onChange={(e) => setSearch(e.target.value)} className={`w-full pl-10 pr-4 py-2 rounded border bg-black/40 outline-none transition-all text-base ${isWizard ? 'border-emerald-700 text-emerald-100 placeholder:text-emerald-700/50 focus:border-emerald-400 font-wizard' : 'border-fuchsia-700 text-fuchsia-100 placeholder:text-fuchsia-700/50 focus:border-fuchsia-400 font-muggle'}`} /></div>
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0"><div className="relative z-[40]"><CalendarWidget lineage={lineage} items={localDisplayItems} selectedDate={dateFilter} onSelectDate={setDateFilter} isOpen={calendarOpen} setIsOpen={setCalendarOpen} /></div><button onClick={() => setShowPinnedOnly(!showPinnedOnly)} className={`flex items-center gap-2 px-4 py-2 rounded border transition-all hover:bg-white/5 whitespace-nowrap ${showPinnedOnly ? (isWizard ? 'bg-emerald-900/40 border-emerald-500 text-emerald-300' : 'bg-fuchsia-900/40 border-fuchsia-500 text-fuchsia-300') : (isWizard ? 'border-emerald-700 text-emerald-100' : 'border-fuchsia-700 text-fuchsia-100')}`} title="Show Pinned Messages Only"><Pin size={16} fill={showPinnedOnly ? "currentColor" : "none"} /><span className={isWizard ? 'font-wizard' : 'font-muggle text-xs'}>{showPinnedOnly ? "Pinned" : "All"}</span></button>{!isLectureMode && (<div className="relative min-w-[140px]"><select value={subjectFilter} onChange={(e) => { setSubjectFilter(e.target.value); if(e.target.value && viewMode === 'folders') setViewMode('masonry'); }} className={`w-full px-4 py-2 rounded border bg-transparent outline-none appearance-none cursor-pointer text-base h-full ${isWizard ? 'border-emerald-700 text-emerald-100 bg-[#050a05] font-wizard' : 'border-fuchsia-700 text-fuchsia-100 bg-[#09050f] font-muggle'}`}><option value="" className="bg-black">{isWizard ? "All Subjects" : "All Directories"}</option>{subjects.map(sub => <option key={sub} value={sub} className="bg-black text-white">{sub}</option>)}</select><Filter className={`absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-50`} /></div>)}</div>
            {isAdmin && isManualSort && isOrderChanged && <button onClick={handleSaveOrder} disabled={isSavingOrder} className={`flex items-center gap-2 px-4 py-2 rounded font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 ${isWizard ? 'bg-yellow-600 text-black' : 'bg-blue-600 text-white'}`}>{isSavingOrder ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {isSavingOrder ? 'Saving...' : 'Save Order'}</button>}
            {(search || dateFilter || subjectFilter || showPinnedOnly) && <button onClick={clearFilters} className={`p-2 rounded hover:bg-white/10 ${isWizard ? 'text-emerald-400' : 'text-fuchsia-400'} shrink-0 self-end md:self-auto`}><X size={20} /></button>}
         </div>
         {!isLectureMode && <div className={`flex items-center gap-1 p-1 rounded border shrink-0 justify-center ${isWizard ? 'border-emerald-800 bg-black/40' : 'border-fuchsia-800 bg-black/40'}`}><button onClick={() => { setSubjectFilter(''); setViewMode('folders'); }} className={`p-2 rounded transition-all ${viewMode === 'folders' ? (isWizard ? 'bg-emerald-800 text-emerald-100' : 'bg-fuchsia-800 text-fuchsia-100') : 'text-white/40 hover:text-white'}`}><FolderOpen size={16} /></button><div className="w-px h-4 bg-white/10 mx-1"></div><button onClick={() => setViewMode('masonry')} className={`p-2 rounded transition-all ${viewMode === 'masonry' ? (isWizard ? 'bg-emerald-800 text-emerald-100' : 'bg-fuchsia-800 text-fuchsia-100') : 'text-white/40 hover:text-white'}`}><LayoutGrid size={16} /></button><button onClick={() => setViewMode('list')} className={`p-2 rounded transition-all ${viewMode === 'list' ? (isWizard ? 'bg-emerald-800 text-emerald-100' : 'bg-fuchsia-800 text-fuchsia-100') : 'text-white/40 hover:text-white'}`}><List size={16} /></button></div>}
      </div>

      {viewMode === 'folders' && !search && !dateFilter && !isLectureMode && !showPinnedOnly ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-[fade-in_0.3s]">
          {subjects.map((subject, idx) => {
             const subjectItems = localDisplayItems.filter(i => (i.subject || 'General') === subject);
             const count = subjectItems.length;
             const coverItem = subjectItems.find(i => i.image && i.image.length > 0);
             const coverImage = coverItem?.image;
             return (
              <div key={idx} className="relative group">
                  <button onClick={() => handleSubjectClick(subject)} className={`w-full h-40 relative overflow-hidden rounded-2xl border p-6 flex flex-col justify-end gap-2 text-left transition-all duration-500 hover:scale-[1.02] ${isWizard ? 'bg-black/60 border-emerald-900/50 hover:border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.05)]' : 'bg-black/60 border-fuchsia-900/50 hover:border-fuchsia-500/50 shadow-[0_0_20px_rgba(217,70,239,0.05)]'}`}>
                    {coverImage ? <><div className="absolute inset-0 bg-cover bg-center blur-md opacity-40 group-hover:opacity-60 transition-opacity duration-700 transform scale-110" style={{ backgroundImage: `url(${coverImage})` }}></div><div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30"></div></> : <Book size={100} className={`absolute -right-4 -top-4 opacity-5 transition-transform duration-700 group-hover:rotate-12 group-hover:scale-110 ${isWizard ? 'text-emerald-500' : 'text-fuchsia-500'}`} />}
                    <span className={`relative z-10 text-2xl font-bold leading-none drop-shadow-lg ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`}>{subject}</span>
                    <div className={`relative z-10 flex items-center gap-2 text-xs opacity-80 group-hover:opacity-100 transition-opacity drop-shadow-md ${isWizard ? 'font-wizard text-emerald-200' : 'font-muggle text-fuchsia-200'}`}><div className={`h-px w-8 ${isWizard ? 'bg-emerald-500' : 'bg-fuchsia-500'}`}></div>{count} {isWizard ? 'Scrolls' : 'Files'}</div>
                  </button>
                  {isAdmin && (<div className="absolute top-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">{onUpdateSubject && <button onClick={(e) => { e.stopPropagation(); setEditingSubject({originalName: subject, name: subject, image: coverImage || ''}); }} className="p-2 rounded-full bg-blue-600/80 text-white hover:bg-blue-500"><Edit2 size={16} /></button>}{onDelete && <button onClick={(e) => handleDeleteSubject(e, subject)} className="p-2 rounded-full bg-red-900/80 text-white hover:bg-red-700"><Trash2 size={16} /></button>}</div>)}
              </div>
            );
          })}
          {isAdmin && onQuickCreate && (
              <div className={`h-40 relative overflow-hidden rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all duration-300 ${isWizard ? 'border-emerald-900/50 hover:border-emerald-500/50 hover:bg-emerald-900/10' : 'border-fuchsia-900/50 hover:border-fuchsia-500/50 hover:bg-fuchsia-900/10'}`}>
                  {!isCreatingSubject ? <button onClick={() => setIsCreatingSubject(true)} className={`flex flex-col items-center justify-center w-full h-full text-white/50 hover:text-white transition-colors`}><FolderPlus size={40} className="mb-2" /><span className="font-bold uppercase tracking-widest text-xs">Create Subject</span></button> : <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-black/80 animate-[fade-in_0.2s]"><input ref={inputRef} type="text" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Subject Name..." onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSubject(); if (e.key === 'Escape') { setIsCreatingSubject(false); setNewSubjectName(''); } }} className={`w-full bg-transparent border-b outline-none text-center font-bold text-sm mb-2 ${isWizard ? 'border-emerald-500 text-emerald-100 placeholder:text-emerald-800' : 'border-fuchsia-500 text-fuchsia-100 placeholder:text-fuchsia-800'}`} /><input type="text" value={newSubjectImage} onChange={(e) => setNewSubjectImage(e.target.value)} placeholder="Cover Image URL (Optional)..." className={`w-full bg-transparent border-b outline-none text-center text-[10px] mb-2 opacity-70 ${isWizard ? 'border-emerald-800 text-emerald-200' : 'border-fuchsia-800 text-fuchsia-200'}`} /><div className="flex gap-2"><button onClick={handleCreateSubject} disabled={isProcessing} className={`px-4 py-1.5 rounded text-[10px] font-bold ${isWizard ? 'bg-emerald-600 text-black' : 'bg-fuchsia-600 text-black'}`}>{isProcessing ? <Loader2 size={12} className="animate-spin"/> : 'CREATE'}</button><button onClick={() => { setIsCreatingSubject(false); setNewSubjectName(''); setNewSubjectImage(''); }} className="px-4 py-1.5 rounded text-[10px] font-bold border border-white/20 hover:bg-white/10">CANCEL</button></div></div>}
              </div>
          )}
        </div>
      ) : (
        <>
           <div className={`mb-4 flex items-center justify-between px-2 ${isWizard ? 'font-wizard text-emerald-200' : 'font-muggle text-fuchsia-200'}`}>
              <div className="text-xs opacity-50">Found {filteredItems.length} {isWizard ? 'artifacts' : 'records'}</div>
              <div className="flex items-center gap-2 text-[10px] opacity-70 uppercase tracking-widest border border-white/10 px-2 py-1 rounded">
                  {activeSortOrder === 'alphabetical' && <SortAsc size={12} />}
                  {activeSortOrder === 'newest' && <SortDesc size={12} />}
                  {activeSortOrder === 'oldest' && <SortAsc size={12} />}
                  {activeSortOrder === 'manual' && <GripVertical size={12} />}
                  <span>Sorted by: {activeSortOrder === 'alphabetical' ? 'Name' : activeSortOrder === 'oldest' ? 'Date (Oldest)' : activeSortOrder === 'manual' ? 'Manual (Custom)' : 'Date (Newest)'}</span>
              </div>
           </div>
           
           {filteredItems.length === 0 ? (
             sectorId === 'lectures' ? (
                 <div className={`flex flex-col items-center justify-center py-20 animate-[fade-in_0.5s] relative overflow-hidden rounded-xl border border-dashed border-white/10 ${isWizard ? 'bg-emerald-950/10' : 'bg-fuchsia-950/10'}`}><div className={`mb-6 p-6 rounded-full border-2 ${isWizard ? 'border-emerald-500/30 text-emerald-400 bg-black/40' : 'border-fuchsia-500/30 text-fuchsia-400 bg-black/40'} relative group`}><div className={`absolute inset-0 rounded-full blur-xl opacity-30 ${isWizard ? 'bg-emerald-500' : 'bg-fuchsia-500'} animate-pulse`}></div>{isWizard ? <Hourglass size={48} className="animate-spin-slow" /> : <MonitorOff size={48} />}</div><h3 className={`text-2xl font-bold mb-2 ${isWizard ? 'font-wizardTitle text-emerald-200' : 'font-muggle text-fuchsia-200'}`}>{isWizard ? "Time Stands Still..." : "Bandwidth Clear"}</h3><p className={`text-sm opacity-60 max-w-sm text-center ${isWizard ? 'font-wizard' : 'font-muggle'}`}>{isWizard ? "The sands of time show no lectures for this day. Rest, apprentice." : "No scheduled data streams found for today. System idle."}</p></div>
             ) : (
                 <div className="text-center py-20 opacity-40"><Search size={48} className="mx-auto mb-4" /><div className={`text-2xl font-bold mb-2 ${isWizard ? 'font-wizardTitle text-emerald-300' : 'font-muggle text-fuchsia-300'}`}>COMING SOON!</div><p className="text-sm opacity-60">{isWizard ? "The magic is still brewing..." : "Data stream compiling..."}</p></div>
             )
           ) : (
             <div className={isLectureMode ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : viewMode === 'list' ? 'flex flex-col gap-3' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}>
                {filteredItems.map((item) => {
                  const customStyle = item.style || {};
                  const isVirtual = item.id.startsWith('virtual-');
                  const hasLink = item.fileUrl && (item.fileUrl.startsWith('http') || item.fileUrl.startsWith('https'));
                  const titleStyle = customStyle.isGradient ? { backgroundImage: `linear-gradient(to right, ${customStyle.titleColor}, ${customStyle.titleColorEnd || customStyle.titleColor})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent', fontFamily: customStyle.fontFamily === 'wizard' ? '"EB Garamond", serif' : customStyle.fontFamily === 'muggle' ? '"JetBrains Mono", monospace' : 'inherit' } : { color: customStyle.titleColor || '#ffffff', fontFamily: customStyle.fontFamily === 'wizard' ? '"EB Garamond", serif' : customStyle.fontFamily === 'muggle' ? '"JetBrains Mono", monospace' : 'inherit' };

                  // Sanitize Content for preview to avoid XSS but allow basic styling
                  const previewContent = DOMPurify.sanitize(item.content, { 
                      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'span'],
                      ALLOWED_ATTR: ['style', 'class']
                  });

                  if (isLectureMode) {
                      return <div key={item.id} onClick={() => onViewItem(item)} className={`group relative p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer flex flex-col items-center text-center gap-4 overflow-hidden ${isWizard ? 'bg-[#0f1510]/95 border-emerald-500/30 hover:border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.1)] hover:shadow-[0_0_50px_rgba(16,185,129,0.2)]' : 'bg-[#150f1a]/95 border-fuchsia-500/30 hover:border-fuchsia-500 shadow-[0_0_30px_rgba(217,70,239,0.1)] hover:shadow-[0_0_50px_rgba(217,70,239,0.2)]'}`}><div className={`relative mb-2 w-20 h-20 rounded-full flex items-center justify-center border-2 ${isWizard ? 'border-emerald-500/50 bg-emerald-900/20 text-emerald-400' : 'border-fuchsia-500/50 bg-fuchsia-900/20 text-fuchsia-400'}`}><Bell size={32} className={isVirtual ? 'animate-pulse' : ''} /><div className={`absolute inset-0 rounded-full blur-xl opacity-40 animate-pulse ${isWizard ? 'bg-emerald-500' : 'bg-fuchsia-500'}`}></div></div><h1 className={`text-2xl font-bold tracking-wide ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`}>{item.subject || 'Lecture'}</h1><h2 className={`text-sm opacity-70 max-w-[80%] line-clamp-2 ${isWizard ? 'font-wizard text-emerald-200' : 'font-muggle text-fuchsia-200'}`}>{item.title}</h2><div className="mt-4 w-full"><div className={`w-full py-3 px-4 rounded-lg font-bold text-xs uppercase tracking-widest border transition-all shadow-[0_0_15px_currentColor] animate-pulse ${isWizard ? 'border-emerald-500 text-emerald-300 bg-emerald-900/30 hover:bg-emerald-900/50 hover:text-emerald-100' : 'border-fuchsia-500 text-fuchsia-300 bg-fuchsia-900/30 hover:bg-fuchsia-900/50 hover:text-fuchsia-100'}`}>Click Here To Go Class ⚡</div></div>{isAdmin && !isVirtual && (<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">{onEdit && <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-1.5 bg-yellow-600 rounded text-black"><Edit2 size={12}/></button>}{onDelete && <button onClick={(e) => { e.stopPropagation(); if(confirm('Delete?')) onDelete(item.id); }} className="p-1.5 bg-red-600 rounded text-white"><Trash2 size={12}/></button>}</div>)}</div>;
                  }

                  return (
                  <div key={item.id} draggable={isAdmin && isManualSort} onDragStart={(e) => handleDragStart(e, item)} onDragOver={(e) => handleDragOver(e, item)} onDrop={(e) => handleDrop(e, item)} onClick={() => onViewItem(item)} onContextMenu={(e) => handleContextMenu(e, item)} className={`relative rounded-xl border backdrop-blur-md group transition-all duration-300 cursor-pointer overflow-hidden select-none ${viewMode === 'list' ? 'p-4 flex items-center gap-4 hover:translate-x-1' : 'p-6 flex flex-col gap-4 hover:-translate-y-1 h-full'} ${isWizard ? 'bg-black/40 border-emerald-900/50 hover:bg-emerald-900/10' : 'bg-black/40 border-fuchsia-900/50 hover:bg-fuchsia-900/10'} ${isVirtual ? 'border-l-4' : ''} ${item.isPinned ? (isWizard ? 'border-l-4 border-l-yellow-500' : 'border-l-4 border-l-yellow-500') : ''} ${draggedItem?.id === item.id ? 'opacity-20' : 'opacity-100'}`} style={isVirtual ? {borderLeftColor: customStyle.titleColor} : {}}>
                    {isVirtual && <div className="absolute top-0 right-0 bg-white/10 text-[10px] px-2 py-0.5 rounded-bl opacity-70 flex items-center gap-1 font-bold tracking-wider"><Repeat size={10}/> RECURRING</div>}
                    {item.isPinned && !isVirtual && <div className={`absolute top-0 right-0 p-1.5 rounded-bl-lg shadow-sm ${isWizard ? 'bg-emerald-800 text-yellow-300' : 'bg-fuchsia-800 text-yellow-300'}`}><Pin size={12} fill="currentColor" /></div>}
                    {item.image && viewMode === 'masonry' && <div className="w-full h-32 overflow-hidden rounded-lg relative"><img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" /><div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div></div>}
                    {viewMode === 'list' && item.image && <div className="w-16 h-16 shrink-0 overflow-hidden rounded-lg"><img src={item.image} alt={item.title} className="w-full h-full object-cover" /></div>}
                    {!item.image && <div className={`shrink-0 rounded-full flex items-center justify-center z-10 ${viewMode === 'list' ? 'w-12 h-12' : 'w-12 h-12 mb-2'} ${isWizard ? 'bg-emerald-900/30 text-emerald-400' : 'bg-fuchsia-900/30 text-fuchsia-400'}`}>{getTypeIcon(item.type)}</div>}
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2 mb-1">{item.subject && <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border opacity-60 ${isWizard ? 'border-emerald-800 text-emerald-300' : 'border-fuchsia-800 text-fuchsia-300'}`}>{item.subject}</span>}<div className={`flex items-center gap-1 text-[10px] opacity-50 ${isWizard ? 'font-wizard' : 'font-muggle'}`}><Calendar size={10} /><span>{item.date}</span></div></div>
                       <h4 className={`font-bold leading-tight truncate ${viewMode === 'list' ? 'text-lg' : 'text-lg mb-2'}`} style={titleStyle}>{item.title}</h4>
                       
                       {/* CONTENT PREVIEW - NOW SUPPORTS HTML (SAFE) */}
                       {!isVirtual && !hasLink && (
                           <div 
                                className={`text-xs opacity-70 line-clamp-3 mt-1 ${isWizard ? 'font-wizard' : 'font-muggle'}`}
                                dangerouslySetInnerHTML={{ __html: previewContent }}
                           />
                       )}

                       {(isVirtual || hasLink) && <div className="mt-2 pt-2 border-t border-white/5 flex"><a href={item.fileUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className={`flex items-center justify-center gap-2 px-4 py-2 rounded font-bold text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-lg ${isWizard ? 'bg-emerald-600 hover:bg-emerald-500 text-black' : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-black'}`}><ExternalLink size={14} /> {isVirtual ? "ENTER CLASSROOM" : "OPEN LINK"}</a></div>}
                    </div>
                  </div>
                )})}
             </div>
           )}
        </>
      )}
      <style dangerouslySetInnerHTML={{ __html: `@keyframes fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }` }} />
    </div>
  );
};

export default SectorView;
