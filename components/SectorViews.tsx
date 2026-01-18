import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Lineage, Sector, CarouselItem, LectureRule, GlobalConfig, 
  SECTORS 
} from '../types';
import { 
  Book, FileText, Video, Calendar, Search, Filter, X, Trash2, LayoutGrid, List, 
  FolderOpen, ArrowLeft, Edit2, Plus, FolderPlus, Loader2, Image as ImageIcon, 
  Send, Link as LinkIcon, ExternalLink, Layers, Code, Pin, PinOff, Check,
  Clock, CalendarDays, MousePointer2
} from 'lucide-react';
import CalendarWidget from './CalendarWidget';
import DOMPurify from 'dompurify';
import { trackActivity } from '../services/tracking';

interface SectorViewProps {
  items: CarouselItem[];
  allItems?: CarouselItem[];
  lineage: Lineage | null;
  sectorId: string;
  onViewItem: (item: CarouselItem) => void;
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (item: CarouselItem) => void;
  onUpdateItem?: (item: CarouselItem) => Promise<void>;
  onBack?: () => void;
  onAddItem?: (sectorId: string) => void;
  onQuickCreate?: (item: CarouselItem) => Promise<void>;
  onUpdateSubject?: (oldName: string, newName: string, newImage?: string) => Promise<void>;
  onReorder?: (updates: { id: string, order_index: number }[]) => Promise<void>;
  
  // New Props for V2.5 Scheduler
  schedules?: LectureRule[];
  config?: GlobalConfig;
  sectors?: Sector[];
  quickInputOnly?: boolean;
}

const ACADEMIC_SECTORS = ['books', 'notes', 'resources', 'tasks'];

// --- SCHEDULER HELPERS (V2.5) ---
const isDateInRange = (checkDate: Date, start?: string, end?: string) => {
    if (!start && !end) return true; // No range = always active
    const target = new Date(checkDate).setHours(0,0,0,0);
    const s = start ? new Date(start).setHours(0,0,0,0) : -Infinity;
    const e = end ? new Date(end).setHours(0,0,0,0) : Infinity;
    return target >= s && target <= e;
};

const isDayMatch = (checkDate: Date, days?: string[], legacyDay?: string) => {
    const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' });
    if (days && days.length > 0) {
        return days.includes(dayName);
    }
    return legacyDay === dayName;
};

export const SectorView: React.FC<SectorViewProps> = ({ 
  items, allItems, lineage, sectorId, onViewItem, isAdmin, onDelete, onEdit, 
  onUpdateItem, onBack, onAddItem, onQuickCreate, onUpdateSubject, onReorder, 
  schedules = [], config, sectors = [], quickInputOnly
}) => {
  const isWizard = lineage === Lineage.WIZARD;
  const currentSector = sectors.find(s => s.id === sectorId) || SECTORS[0];
  const isLectures = sectorId === 'lectures';

  // --- TRACKING ---
  useEffect(() => {
      try {
          const profile = JSON.parse(localStorage.getItem('core_connect_profile') || '{}');
          if (profile.id && !quickInputOnly) {
              trackActivity(profile.id, 'ENTER_SECTOR', sectorId, sectorId, 0, profile.displayName);
          }
      } catch (e) { }
  }, [sectorId, quickInputOnly]);
  
  // State
  const [search, setSearch] = useState('');
  
  // Initialize dateFilter to Today's date (YYYY-MM-DD)
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [subjectFilter, setSubjectFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'folders' | 'masonry'>('folders');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  // Lecture Specific State
  const [activeBatch, setActiveBatch] = useState<'AICS' | 'CSDA'>('AICS');

  // Drag & Drop State
  const [draggedItem, setDraggedItem] = useState<CarouselItem | null>(null);
  const [localDisplayItems, setLocalDisplayItems] = useState<CarouselItem[]>([]);
  const [isOrderChanged, setIsOrderChanged] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Admin UI State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: CarouselItem } | null>(null);
  const [quickPostText, setQuickPostText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [editingSubject, setEditingSubject] = useState<{ originalName: string, name: string, image: string } | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectImage, setNewSubjectImage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- DERIVED DATA ---
  const subjects = useMemo(() => Array.from(new Set(items.map(i => i.subject || 'General'))).sort(), [items]);
  const activeSortOrder = currentSector?.sortOrder || 'newest';
  const isManualSort = activeSortOrder === 'manual';

  // --- ITEM SORTING & FILTERING (Files/Announcements) ---
  useEffect(() => {
      let combined = [...items];
      combined.sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          if (activeSortOrder === 'manual') {
              const orderA = a.order_index ?? 9999;
              const orderB = b.order_index ?? 9999;
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
  }, [items, sectorId, activeSortOrder]);

  const filteredItems = useMemo(() => {
      const source = search ? (allItems || items) : localDisplayItems;
      return source.filter(item => {
          const matchSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                              item.content.toLowerCase().includes(search.toLowerCase());
          
          const normalizedItemDate = item.date.replace(/-/g, '.');
          const normalizedFilter = dateFilter.replace(/-/g, '.');
          // For non-lectures, only filter by date if user explicitly picked one via Calendar widget
          const matchDate = (!isLectures && !dateFilter) ? true : (isLectures ? true : normalizedItemDate === normalizedFilter);
          
          const matchSector = search ? true : item.sector === sectorId;
          const matchSubject = subjectFilter ? (item.subject || 'General') === subjectFilter : true;
          const matchesPinned = showPinnedOnly ? item.isPinned : true;
          return matchSearch && matchSector && matchDate && matchSubject && matchesPinned;
      });
  }, [items, allItems, localDisplayItems, search, sectorId, dateFilter, subjectFilter, showPinnedOnly, isLectures]);

  // --- SCHEDULER LOGIC (V2.5) ---
  const activeClasses = useMemo(() => {
      if (!schedules || !isLectures) return [];
      
      const targetDate = dateFilter ? new Date(dateFilter) : new Date();

      return schedules.filter(rule => {
          if (!rule.isActive) return false;
          
          // 1. Batch Filter
          if (rule.batch && rule.batch !== activeBatch) return false;

          // 2. Date Range Check (Semester)
          if (!isDateInRange(targetDate, rule.startDate, rule.endDate)) return false;

          // 3. Day of Week Check
          return isDayMatch(targetDate, rule.days, rule.dayOfWeek);
      }).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [schedules, isLectures, activeBatch, dateFilter]);

  // --- DRAG & DROP HANDLERS ---
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

  // --- UI EFFECTS ---
  useEffect(() => {
      if ((search) && viewMode === 'folders') { setViewMode('masonry'); }
  }, [search, viewMode]);

  useEffect(() => {
      setSearch(''); setSubjectFilter(''); setShowPinnedOnly(false);
      // Default to List for lectures, Folders for others
      setViewMode(isLectures ? 'list' : 'folders');
      // Default date to today only for lectures
      if (isLectures) setDateFilter(new Date().toISOString().split('T')[0]);
      else setDateFilter('');
  }, [sectorId, isLectures]);

  // --- QUICK ACTIONS ---
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

  const handleTogglePin = async (e: React.MouseEvent, item: CarouselItem) => {
      e.stopPropagation();
      if (onUpdateItem) { await onUpdateItem({ ...item, isPinned: !item.isPinned }); } else if (onEdit) { onEdit({ ...item, isPinned: !item.isPinned }); }
  };

  const handleContextMenu = (e: React.MouseEvent, item: CarouselItem) => {
      if (!isAdmin) return;
      e.preventDefault(); e.stopPropagation();
      let x = e.clientX; let y = e.clientY;
      if (window.innerWidth - x < 160) x -= 160;
      if (window.innerHeight - y < 150) y -= 150;
      setContextMenu({ x, y, item });
  };

  const getTypeIcon = (type: string) => {
      switch (type) { case 'video': return <Video size={20} />; case 'file': return <FileText size={20} />; case 'mixed': return <Layers size={20} />; case 'code': return <Code size={20} />; case 'link': return <LinkIcon size={20} />; default: return <FileText size={20} />; }
  };

  // --- ADMIN HUD QUICK CREATE ---
  if (quickInputOnly) {
      return (
          <div className={`relative flex items-center p-2 rounded-lg border backdrop-blur-sm transition-all ${isWizard ? 'bg-emerald-950/40 border-emerald-500/30 focus-within:border-emerald-400' : 'bg-fuchsia-950/40 border-fuchsia-500/30 focus-within:border-fuchsia-400'}`}>
              <input type="text" value={quickPostText} onChange={(e) => setQuickPostText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleQuickPost()} placeholder="Lazy Post: Type message & press Enter..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/30 px-2" disabled={isPosting} />
              <button onClick={handleQuickPost} disabled={!quickPostText.trim() || isPosting} className={`p-2 rounded-full transition-colors ${isWizard ? 'text-emerald-400 hover:bg-emerald-900/50' : 'text-fuchsia-400 hover:bg-fuchsia-900/50'}`}>{isPosting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
          </div>
      );
  }

  // --- LECTURE RENDERER ---
  const renderLectures = () => {
    return (
        <div className={`grid gap-6 ${viewMode === 'list' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {activeClasses.length > 0 ? (
                activeClasses.map(cls => (
                    <div 
                        key={cls.id} 
                        className={`group relative rounded-xl overflow-hidden border border-white/10 flex flex-col transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)] bg-[#121212] cursor-pointer ring-1 ring-white/5 hover:ring-white/20`}
                        onClick={() => window.open(cls.link, '_blank')}
                    >
                        {/* Large Banner Image */}
                        <div className="h-48 w-full relative overflow-hidden bg-black">
                            {cls.image ? (
                                <img src={cls.image} alt={cls.subject} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-all duration-500 transform group-hover:scale-110" />
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center opacity-30 bg-gradient-to-br ${activeBatch === 'AICS' ? 'from-blue-900 via-blue-800' : 'from-fuchsia-900 via-purple-900'} to-black`}>
                                    <Video size={56} className="text-white drop-shadow-lg" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent"></div>
                            
                            {/* Time Badge */}
                            <div className="absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest bg-black/80 backdrop-blur-md border border-white/10 text-white shadow-xl flex items-center gap-2 z-10">
                                <Clock size={12} className={activeBatch === 'AICS' ? 'text-blue-400' : 'text-fuchsia-400'} />
                                <span>{cls.startTime}</span>
                                <span className="opacity-50">|</span>
                                <span>{cls.endTime || 'End'}</span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-5 flex-1 flex flex-col relative -mt-10 z-20">
                            {/* Floating Icon */}
                            <div className={`w-14 h-14 rounded-2xl rotate-3 flex items-center justify-center border-4 border-[#121212] shadow-2xl mb-3 transition-transform group-hover:rotate-6 group-hover:scale-110 ${activeBatch === 'AICS' ? 'bg-gradient-to-br from-blue-600 to-blue-800' : 'bg-gradient-to-br from-fuchsia-600 to-purple-800'}`}>
                                <Video size={24} className="text-white drop-shadow-md" />
                            </div>
                            
                            <h3 className="text-2xl font-bold text-white leading-tight mb-2 group-hover:text-blue-300 transition-colors">{cls.subject}</h3>
                            
                            {/* Note / Message */}
                            <div className="mb-6 flex-1">
                                {cls.customMessage ? (
                                    <p className="text-sm text-zinc-400 leading-relaxed border-l-2 border-white/10 pl-3 italic">{cls.customMessage}</p>
                                ) : (
                                    <p className="text-sm text-zinc-600 italic">No additional notes.</p>
                                )}
                            </div>

                            {/* Animated Join Button */}
                            {cls.link && (
                                <button className={`relative overflow-hidden w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-[0.2em] text-center transition-all shadow-lg flex items-center justify-center gap-3 group/btn
                                    ${activeBatch === 'AICS' 
                                        ? 'bg-blue-600/10 border border-blue-500/30 text-blue-200 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500' 
                                        : 'bg-fuchsia-600/10 border border-fuchsia-500/30 text-fuchsia-200 group-hover:bg-fuchsia-600 group-hover:text-white group-hover:border-fuchsia-500'}
                                `}>
                                    <span className="relative z-10 flex items-center gap-2">
                                        JOIN SESSION 
                                        <ExternalLink size={14} className="transition-transform group-hover/btn:translate-x-1" />
                                    </span>
                                    
                                    {/* Mouse Cursor Animation */}
                                    <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 text-white drop-shadow-lg z-20">
                                        <MousePointer2 size={24} className="fill-white text-black" />
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>
                ))
            ) : (
                <div className="col-span-full py-24 text-center border-2 border-dashed border-white/10 rounded-3xl bg-white/5 opacity-60 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 animate-pulse">
                        <Calendar size={40} className="text-white/30" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2 tracking-wide">No Lectures Found</h3>
                    <p className="text-base text-zinc-400 max-w-md mx-auto">
                        There are no classes scheduled for <span className="text-white font-bold">{new Date(dateFilter).toLocaleDateString()}</span> for the <span className={activeBatch === 'AICS' ? 'text-blue-400' : 'text-fuchsia-400'}>{activeBatch}</span> batch.
                    </p>
                </div>
            )}
        </div>
    );
  };

  // --- MAIN RENDER ---
  return (
    <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 pb-24 animate-[fade-in_0.3s_ease-out] ${isWizard ? 'scrollbar-wizard' : 'scrollbar-muggle'}`}>

        {/* Context Menu */}
        {contextMenu && isAdmin && (
            <div className={`fixed z-[100] min-w-[160px] rounded-lg border shadow-xl overflow-hidden py-1 animate-[fade-in_0.1s] ${isWizard ? 'bg-[#0a0f0a] border-emerald-500/50 shadow-emerald-900/50' : 'bg-[#0f0a15] border-fuchsia-500/50 shadow-fuchsia-900/50'}`} style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
                <button onClick={(e) => { handleTogglePin(e, contextMenu.item); setContextMenu(null); }} className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/10 ${isWizard ? 'text-emerald-100' : 'text-fuchsia-100'}`}>{contextMenu.item.isPinned ? <PinOff size={14} /> : <Pin size={14} />} {contextMenu.item.isPinned ? "Unpin" : "Pin to Top"}</button>
                {onEdit && <button onClick={(e) => { onEdit(contextMenu.item); setContextMenu(null); }} className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/10 ${isWizard ? 'text-emerald-100' : 'text-fuchsia-100'}`}><Edit2 size={14} /> Edit</button>}
                {onDelete && <button onClick={(e) => { if (confirm('Delete this item?')) onDelete(contextMenu.item.id); setContextMenu(null); }} className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-red-900/30 text-red-400"><Trash2 size={14} /> Delete</button>}
            </div>
        )}

        {/* Edit Subject Modal */}
        {editingSubject && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className={`w-full max-w-md p-6 rounded-xl border shadow-2xl space-y-4 ${isWizard ? 'bg-[#0a0f0a] border-emerald-600' : 'bg-[#0f0a15] border-fuchsia-600'}`}>
                    <h3 className={`text-xl font-bold ${isWizard ? 'text-emerald-100' : 'text-fuchsia-100'}`}>Edit Subject</h3>
                    <input value={editingSubject.name || ''} onChange={(e) => setEditingSubject(prev => prev ? { ...prev, name: e.target.value } : null)} placeholder="Subject Name" className={`w-full p-3 rounded border bg-black/40 outline-none ${isWizard ? 'border-emerald-800 text-emerald-100' : 'border-fuchsia-800 text-fuchsia-100'}`} autoFocus />
                    <input value={editingSubject.image || ''} onChange={(e) => setEditingSubject(prev => prev ? { ...prev, image: e.target.value } : null)} placeholder="Cover Image URL" className={`w-full p-3 rounded border bg-black/40 outline-none ${isWizard ? 'border-emerald-800 text-emerald-100' : 'border-fuchsia-800 text-fuchsia-100'}`} />
                    {editingSubject.image && <img src={editingSubject.image} className="w-full h-32 object-cover rounded border border-white/10" />}
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingSubject(null)} className="px-4 py-2 rounded text-white/50 hover:text-white">Cancel</button>
                        <button onClick={async () => {
                            if(onUpdateSubject) {
                                setIsProcessing(true);
                                await onUpdateSubject(editingSubject.originalName, editingSubject.name, editingSubject.image);
                                setIsProcessing(false);
                                setEditingSubject(null);
                            }
                        }} disabled={isProcessing} className={`px-6 py-2 rounded font-bold flex items-center gap-2 ${isWizard ? 'bg-emerald-600 text-black' : 'bg-fuchsia-600 text-black'}`}>
                            {isProcessing ? <Loader2 className="animate-spin" /> : <Check size={18} />} Save Changes
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* HEADER CONTROLS (Responsive) */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8 border-b border-white/10 pb-4">
            <div className="flex-1 w-full md:w-auto">
                <div className="flex items-center gap-4 mb-2">
                    {onBack && (
                        <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <h2 className={`text-2xl font-bold ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`}>
                        {isWizard ? currentSector.wizardName : currentSector.muggleName}
                    </h2>
                </div>
                
                {/* Search Bar (Hidden on Lectures for clarity, or kept for global searching) */}
                {!isLectures && (
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-2.5 text-white/30" size={14} />
                        <input 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={`Search ${isWizard ? 'Archives' : 'Database'}...`}
                            className={`w-full pl-9 pr-4 py-2 rounded-lg border text-sm outline-none transition-all
                                ${isWizard ? 'bg-[#050a05]/80 border-emerald-900/50 focus:border-emerald-500/50 text-emerald-100' : 'bg-[#0a050a]/80 border-fuchsia-900/50 focus:border-fuchsia-500/50 text-fuchsia-100'}
                            `}
                        />
                    </div>
                )}
                
                {/* Date Display for Lectures */}
                {isLectures && (
                    <div className="flex items-center gap-3 mt-1">
                        <div className="text-sm font-bold opacity-80 bg-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/10">
                             <CalendarDays size={14} className="text-white/60" />
                             {new Date(dateFilter).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                        {/* Inline Date Picker */}
                        <div className="relative overflow-hidden w-9 h-9 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 transition-colors cursor-pointer flex items-center justify-center group" title="Change Date">
                            <Calendar size={16} className="text-blue-300 group-hover:text-white" />
                            <input 
                                type="date" 
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* TOP RIGHT CONTROLS: BATCH TOGGLE + VIEW TOGGLE */}
            <div className="flex flex-wrap gap-2 items-center justify-end w-full md:w-auto">
                {/* Batch Selector (Visible on Mobile & Desktop for Lectures) */}
                {isLectures && (
                     <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                         <button onClick={() => setActiveBatch('AICS')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${activeBatch === 'AICS' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}>AICS</button>
                         <button onClick={() => setActiveBatch('CSDA')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${activeBatch === 'CSDA' ? 'bg-fuchsia-600 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}>CSDA</button>
                     </div>
                )}

                {/* View Toggles */}
                <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`} title="List View"><List size={18} /></button>
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`} title="Grid View"><LayoutGrid size={18} /></button>
                </div>
                
                {isAdmin && onAddItem && (
                    <button onClick={() => onAddItem(sectorId)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded font-bold hover:bg-blue-500 transition-colors text-sm h-full shadow-lg">
                        <Plus size={16} /> <span className="hidden sm:inline">NEW</span>
                    </button>
                )}
            </div>
        </div>

        {/* LECTURE SCHEDULER VIEW */}
        {sectorId === 'lectures' && renderLectures()}

        {/* ITEMS GRID/LIST (NON-LECTURES) */}
        {!isLectures && filteredItems.length > 0 ? (
            <div className={`grid gap-6 ${viewMode === 'grid' || viewMode === 'masonry' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                {filteredItems.map(item => (
                    <div 
                        key={item.id} 
                        onClick={() => onViewItem(item)}
                        draggable={isAdmin && isManualSort} onDragStart={(e) => handleDragStart(e, item)} onDragOver={(e) => handleDragOver(e, item)} onDrop={(e) => handleDrop(e, item)} onContextMenu={(e) => handleContextMenu(e, item)}
                        className={`group relative p-6 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden select-none
                            ${isWizard ? 'bg-[#0a0f0a] border-emerald-900/30 hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-[#0f0a15] border-fuchsia-900/30 hover:border-fuchsia-500/50 hover:shadow-[0_0_20px_rgba(217,70,239,0.1)]'}
                        `}
                    >
                        {/* Hover Glow */}
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${isWizard ? 'from-emerald-500 via-transparent to-transparent' : 'from-fuchsia-500 via-transparent to-transparent'}`}></div>
                        
                        {item.isPinned && <div className={`absolute top-0 right-0 p-1.5 rounded-bl-lg shadow-sm ${isWizard ? 'bg-emerald-800 text-yellow-300' : 'bg-fuchsia-800 text-yellow-300'}`}><Pin size={12} fill="currentColor" /></div>}

                        <div className="relative z-10 flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ${isWizard ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400' : 'bg-fuchsia-900/20 border-fuchsia-500/30 text-fuchsia-400'}`}>
                                        {item.date}
                                    </span>
                                    {item.isUnread && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>}
                                </div>
                                
                                <h3 className={`font-bold truncate pr-4 ${viewMode === 'grid' || viewMode === 'masonry' ? 'text-lg' : 'text-xl'} ${isWizard ? 'text-emerald-100' : 'text-fuchsia-100'}`}
                                    style={item.style?.isGradient ? {
                                        backgroundImage: `linear-gradient(to right, ${item.style.titleColor}, ${item.style.titleColorEnd || item.style.titleColor})`,
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                        color: 'transparent',
                                        fontFamily: item.style.fontFamily === 'wizard' ? '"EB Garamond", serif' : item.style.fontFamily === 'muggle' ? '"JetBrains Mono", monospace' : 'inherit'
                                    } : { color: item.style?.titleColor, fontFamily: item.style?.fontFamily === 'wizard' ? '"EB Garamond", serif' : item.style?.fontFamily === 'muggle' ? '"JetBrains Mono", monospace' : 'inherit' }}
                                >
                                    {item.title}
                                </h3>
                                
                                <div className="text-sm opacity-60 mt-2 line-clamp-2" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.content, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'span'], ALLOWED_ATTR: ['style', 'class'] }) }}></div>
                            </div>

                            {/* Thumbnail or Icon */}
                            <div className={`w-16 h-16 shrink-0 rounded-lg flex items-center justify-center border ${isWizard ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-fuchsia-900/10 border-fuchsia-500/20'}`}>
                                {item.image ? (
                                    <img src={item.image} alt="" className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                    <FileText className="opacity-50" />
                                )}
                            </div>
                        </div>

                        {/* Footer / Actions */}
                        {viewMode === 'list' && (
                            <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-4 text-xs opacity-50">
                                <span>Subject: {item.subject}</span>
                                <span>Type: {item.type}</span>
                                {isAdmin && (
                                    <div className="ml-auto flex gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); onEdit?.(item); }} className="hover:text-blue-400">EDIT</button>
                                        <button onClick={(e) => { e.stopPropagation(); onDelete?.(item.id); }} className="hover:text-red-400">DELETE</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        ) : !isLectures && (
            <div className="flex flex-col items-center justify-center py-20 opacity-30">
                <div className={`text-2xl font-bold mb-2 ${isWizard ? 'font-wizardTitle text-emerald-300' : 'font-muggle text-fuchsia-300'}`}>EMPTY SECTOR</div>
                <p className="text-sm opacity-60">{isWizard ? "The scrolls are blank..." : "No data found."}</p>
                {search && <p className="text-sm">Try adjusting your search filters.</p>}
            </div>
        )}
        
        {/* Style Injection for Animations */}
        <style dangerouslySetInnerHTML={{ __html: `@keyframes fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }` }} />
    </div>
  );
};

export default SectorView;