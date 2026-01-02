
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Lineage, type CarouselItem } from '../types';
import { Book, FileText, Video, Calendar, Search, Filter, X, Trash2, LayoutGrid, List, FolderOpen, ArrowLeft, Edit2, Plus, FolderPlus, Loader2, Image as ImageIcon } from 'lucide-react';
import CalendarWidget from './CalendarWidget';
import DOMPurify from 'dompurify';

interface SectorViewProps {
  items: CarouselItem[];
  lineage: Lineage;
  sectorId: string;
  onViewItem: (item: CarouselItem) => void;
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (item: CarouselItem) => void;
  onBack?: () => void;
  onAddItem?: (sectorId: string) => void; 
  onQuickCreate?: (item: CarouselItem) => void; 
}

const SectorView: React.FC<SectorViewProps> = ({ items, lineage, sectorId, onViewItem, isAdmin, onDelete, onEdit, onBack, onAddItem, onQuickCreate }) => {
  const isWizard = lineage === Lineage.WIZARD;
  
  // --- STATE ---
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [viewMode, setViewMode] = useState<'folders' | 'masonry' | 'list'>('folders');
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Subject Creation State
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectImage, setNewSubjectImage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- DERIVED DATA ---
  const subjects = useMemo(() => Array.from(new Set(items.map(i => i.subject || 'General'))).sort(), [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                            item.content.toLowerCase().includes(search.toLowerCase());
      const normalizedItemDate = item.date.replace(/-/g, '.');
      const normalizedFilter = dateFilter.replace(/-/g, '.');
      
      const matchesDate = dateFilter ? normalizedItemDate === normalizedFilter : true;
      const matchesSubject = subjectFilter ? (item.subject || 'General') === subjectFilter : true;
      return matchesSearch && matchesDate && matchesSubject;
    });
  }, [items, search, dateFilter, subjectFilter]);

  // --- EFFECTS ---
  useEffect(() => {
    if ((search || dateFilter) && viewMode === 'folders') {
      setViewMode('masonry');
    }
  }, [search, dateFilter, viewMode]);

  useEffect(() => {
    setSearch('');
    setDateFilter('');
    setSubjectFilter('');
    setViewMode('folders');
  }, [sectorId]);

  useEffect(() => {
    if (isCreatingSubject && inputRef.current) {
        inputRef.current.focus();
    }
  }, [isCreatingSubject]);

  const handleSubjectClick = (subject: string) => {
    setSubjectFilter(subject);
    setViewMode('masonry');
  };

  const clearFilters = () => {
    setSearch('');
    setDateFilter('');
    setSubjectFilter('');
    if (viewMode !== 'folders') setViewMode('folders');
  };

  // --- SUBJECT MANAGEMENT HANDLERS ---

  const handleCreateSubject = async () => {
      if (!newSubjectName.trim() || !onQuickCreate) return;
      setIsProcessing(true);

      const today = new Date().toISOString().split('T')[0].replace(/-/g, '.');
      
      // Create a "Genesis" item to establish the folder
      const genesisItem: CarouselItem = {
          id: crypto.randomUUID(), 
          title: `Welcome to ${newSubjectName}`,
          content: `This folder has been created for ${newSubjectName} resources.`,
          date: today,
          type: 'announcement',
          sector: sectorId,
          subject: newSubjectName,
          image: newSubjectImage || undefined,
          author: 'System',
          isUnread: true,
          likes: 0
      };

      try {
          await onQuickCreate(genesisItem);
          setNewSubjectName('');
          setNewSubjectImage('');
          setIsCreatingSubject(false);
      } catch (e) {
          console.error(e);
          alert("Failed to create subject.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleDeleteSubject = async (e: React.MouseEvent, subject: string) => {
      e.stopPropagation();
      if (!onDelete) return;

      const count = items.filter(i => (i.subject || 'General') === subject).length;
      if (!confirm(`WARNING: This will delete the subject "${subject}" and ALL ${count} items inside it.\n\nThis action cannot be undone.\n\nAre you sure?`)) {
          return;
      }

      // Find all items in this subject
      const itemsToDelete = items.filter(i => (i.subject || 'General') === subject);
      
      // Loop call onDelete
      for (const item of itemsToDelete) {
          onDelete(item.id);
      }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pb-20 animate-[fade-in-up_0.3s_ease-out]">
      
      {/* Top Navigation Bar */}
      <div className="flex items-center gap-4 mb-4 justify-between">
          <div className="flex items-center gap-4">
              {onBack && (
                <button 
                    onClick={onBack}
                    className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider transition-colors
                        ${isWizard ? 'text-emerald-400 hover:text-emerald-300' : 'text-fuchsia-400 hover:text-fuchsia-300'}
                    `}
                >
                    <ArrowLeft size={16} /> Exit Sector
                </button>
              )}
              {/* Back to Folders */}
              {!onBack && subjectFilter && viewMode !== 'folders' && (
                 <button 
                    onClick={clearFilters}
                    className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider transition-colors
                        ${isWizard ? 'text-emerald-400 hover:text-emerald-300' : 'text-fuchsia-400 hover:text-fuchsia-300'}
                    `}
                 >
                    <FolderOpen size={16} /> Back to Folders
                 </button>
              )}
          </div>
          
          {onAddItem && (
             <button 
                onClick={() => onAddItem(sectorId)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold shadow-lg transition-all hover:scale-105 active:scale-95
                   ${isWizard 
                     ? 'bg-emerald-600 text-black hover:bg-emerald-500' 
                     : 'bg-fuchsia-600 text-black hover:bg-fuchsia-500'}
                `}
             >
                <Plus size={18} />
                <span className="hidden sm:inline">Add Content</span>
             </button>
          )}
      </div>

      {/* FILTER BAR - Mobile Responsive */}
      <div className={`mb-8 p-4 rounded-xl border backdrop-blur-md flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between sticky top-0 z-30 shadow-xl transition-all
        ${isWizard ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-fuchsia-900/20 border-fuchsia-500/30'}
      `}>
         <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto flex-1">
            <div className="relative flex-[2] min-w-[200px]">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isWizard ? 'text-emerald-500' : 'text-fuchsia-500'}`} />
              <input 
                type="text" 
                placeholder={isWizard ? "Search the archives..." : "Filter database..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded border bg-black/40 outline-none transition-all text-base
                  ${isWizard 
                    ? 'border-emerald-700 text-emerald-100 placeholder:text-emerald-700/50 focus:border-emerald-400 font-wizard' 
                    : 'border-fuchsia-700 text-fuchsia-100 placeholder:text-fuchsia-700/50 focus:border-fuchsia-400 font-muggle'}
                `}
              />
            </div>
            {/* FIX: Z-Index for Calendar Widget Popup */}
            <div className="relative w-full md:w-auto z-[40]">
               <CalendarWidget 
                 lineage={lineage} items={items} selectedDate={dateFilter} onSelectDate={setDateFilter}
                 isOpen={calendarOpen} setIsOpen={setCalendarOpen}
               />
            </div>
            <div className="relative w-full md:w-auto min-w-[160px]">
               <select 
                 value={subjectFilter}
                 onChange={(e) => {
                    setSubjectFilter(e.target.value);
                    if(e.target.value && viewMode === 'folders') setViewMode('masonry');
                 }}
                 className={`w-full px-4 py-2 rounded border bg-transparent outline-none appearance-none cursor-pointer text-base
                   ${isWizard 
                     ? 'border-emerald-700 text-emerald-100 bg-[#050a05] font-wizard' 
                     : 'border-fuchsia-700 text-fuchsia-100 bg-[#09050f] font-muggle'}
                 `}
               >
                 <option value="" className="bg-black text-white">{isWizard ? "All Subjects" : "All Directories"}</option>
                 {subjects.map(sub => <option key={sub} value={sub} className="bg-black text-white">{sub}</option>)}
               </select>
               <Filter className={`absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-50`} />
            </div>
            {(search || dateFilter || subjectFilter) && (
              <button onClick={clearFilters} className={`p-2 rounded hover:bg-white/10 ${isWizard ? 'text-emerald-400' : 'text-fuchsia-400'} shrink-0 self-end md:self-auto`}>
                <X size={20} />
              </button>
            )}
         </div>
         <div className={`flex items-center gap-1 p-1 rounded border shrink-0 justify-center ${isWizard ? 'border-emerald-800 bg-black/40' : 'border-fuchsia-800 bg-black/40'}`}>
            <button onClick={() => { setSubjectFilter(''); setViewMode('folders'); }} className={`p-2 rounded transition-all ${viewMode === 'folders' ? (isWizard ? 'bg-emerald-800 text-emerald-100' : 'bg-fuchsia-800 text-fuchsia-100') : 'text-white/40 hover:text-white'}`}><FolderOpen size={16} /></button>
            <div className="w-px h-4 bg-white/10 mx-1"></div>
            <button onClick={() => setViewMode('masonry')} className={`p-2 rounded transition-all ${viewMode === 'masonry' ? (isWizard ? 'bg-emerald-800 text-emerald-100' : 'bg-fuchsia-800 text-fuchsia-100') : 'text-white/40 hover:text-white'}`}><LayoutGrid size={16} /></button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded transition-all ${viewMode === 'list' ? (isWizard ? 'bg-emerald-800 text-emerald-100' : 'bg-fuchsia-800 text-fuchsia-100') : 'text-white/40 hover:text-white'}`}><List size={16} /></button>
         </div>
      </div>

      {viewMode === 'folders' && !search && !dateFilter ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-[fade-in_0.3s]">
          {subjects.map((subject, idx) => {
             const subjectItems = items.filter(i => (i.subject || 'General') === subject);
             const count = subjectItems.length;
             
             // Find cover image: prioritize items with images, newest first
             const coverItem = subjectItems.find(i => i.image && i.image.length > 0);
             const coverImage = coverItem?.image;

             return (
              <button
                key={idx}
                onClick={() => handleSubjectClick(subject)}
                className={`h-40 relative overflow-hidden rounded-2xl border p-6 flex flex-col justify-end gap-2 text-left transition-all duration-500 hover:scale-[1.02] group
                  ${isWizard 
                    ? 'bg-black/60 border-emerald-900/50 hover:border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.05)]' 
                    : 'bg-black/60 border-fuchsia-900/50 hover:border-fuchsia-500/50 shadow-[0_0_20px_rgba(217,70,239,0.05)]'}
                `}
              >
                {/* Background Image Logic */}
                {coverImage ? (
                    <>
                        <div className="absolute inset-0 bg-cover bg-center blur-sm opacity-40 group-hover:opacity-60 transition-opacity duration-700 transform scale-110" style={{ backgroundImage: `url(${coverImage})` }}></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30"></div>
                    </>
                ) : (
                    <Book size={100} className={`absolute -right-4 -top-4 opacity-5 transition-transform duration-700 group-hover:rotate-12 group-hover:scale-110 ${isWizard ? 'text-emerald-500' : 'text-fuchsia-500'}`} />
                )}
                
                {/* Delete Button (Only visible on hover for Admin) */}
                {isAdmin && onDelete && (
                    <div 
                        onClick={(e) => handleDeleteSubject(e, subject)}
                        className="absolute top-2 right-2 p-2 rounded-full bg-red-900/80 text-white opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-red-700"
                        title="Delete entire subject & all items"
                    >
                        <Trash2 size={16} />
                    </div>
                )}

                <span className={`relative z-10 text-2xl font-bold leading-none drop-shadow-lg ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`}>
                  {subject}
                </span>
                <div className={`relative z-10 flex items-center gap-2 text-xs opacity-80 group-hover:opacity-100 transition-opacity drop-shadow-md ${isWizard ? 'font-wizard text-emerald-200' : 'font-muggle text-fuchsia-200'}`}>
                   <div className={`h-px w-8 ${isWizard ? 'bg-emerald-500' : 'bg-fuchsia-500'}`}></div>
                   {count} {isWizard ? 'Scrolls' : 'Files'}
                </div>
              </button>
            );
          })}

          {/* ADD NEW FOLDER CARD */}
          {isAdmin && onQuickCreate && (
              <div
                className={`h-40 relative overflow-hidden rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all duration-300
                  ${isWizard 
                    ? 'border-emerald-900/50 hover:border-emerald-500/50 hover:bg-emerald-900/10' 
                    : 'border-fuchsia-900/50 hover:border-fuchsia-500/50 hover:bg-fuchsia-900/10'}
                `}
              >
                  {!isCreatingSubject ? (
                      <button 
                        onClick={() => setIsCreatingSubject(true)}
                        className={`flex flex-col items-center justify-center w-full h-full text-white/50 hover:text-white transition-colors`}
                      >
                          <FolderPlus size={40} className="mb-2" />
                          <span className="font-bold uppercase tracking-widest text-xs">Create Subject</span>
                      </button>
                  ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-black/80 animate-[fade-in_0.2s]">
                          <input 
                            ref={inputRef}
                            type="text" 
                            value={newSubjectName}
                            onChange={(e) => setNewSubjectName(e.target.value)}
                            placeholder="Subject Name..."
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreateSubject();
                                if (e.key === 'Escape') { setIsCreatingSubject(false); setNewSubjectName(''); }
                            }}
                            className={`w-full bg-transparent border-b outline-none text-center font-bold text-sm mb-2
                                ${isWizard ? 'border-emerald-500 text-emerald-100 placeholder:text-emerald-800' : 'border-fuchsia-500 text-fuchsia-100 placeholder:text-fuchsia-800'}
                            `}
                          />
                          
                          <div className="relative w-full mb-3 group">
                             <ImageIcon size={14} className="absolute left-0 top-1.5 opacity-50"/>
                             <input 
                                type="text"
                                value={newSubjectImage}
                                onChange={(e) => setNewSubjectImage(e.target.value)}
                                placeholder="Cover Image URL (Optional)"
                                className={`w-full bg-transparent border-b outline-none text-[10px] pl-5
                                    ${isWizard ? 'border-emerald-900 text-emerald-300 placeholder:text-emerald-900' : 'border-fuchsia-900 text-fuchsia-300 placeholder:text-fuchsia-900'}
                                `}
                             />
                          </div>

                          <div className="flex gap-2">
                              <button 
                                onClick={handleCreateSubject}
                                disabled={isProcessing}
                                className={`px-4 py-1.5 rounded text-[10px] font-bold ${isWizard ? 'bg-emerald-600 text-black' : 'bg-fuchsia-600 text-black'}`}
                              >
                                {isProcessing ? <Loader2 size={12} className="animate-spin"/> : 'CREATE'}
                              </button>
                              <button 
                                onClick={() => { setIsCreatingSubject(false); setNewSubjectName(''); setNewSubjectImage(''); }}
                                className="px-4 py-1.5 rounded text-[10px] font-bold border border-white/20 hover:bg-white/10"
                              >
                                CANCEL
                              </button>
                          </div>
                      </div>
                  )}
              </div>
          )}
        </div>
      ) : (
        <>
           <div className={`mb-4 text-xs opacity-50 px-2 ${isWizard ? 'font-wizard text-emerald-200' : 'font-muggle text-fuchsia-200'}`}>
              Found {filteredItems.length} {isWizard ? 'artifacts' : 'records'}
           </div>
           {filteredItems.length === 0 ? (
             <div className="text-center py-20 opacity-40">
                <Search size={48} className="mx-auto mb-4" />
                <p>{isWizard ? "The archives yield nothing." : "No matching records found."}</p>
             </div>
           ) : (
             <div className={viewMode === 'list' ? 'flex flex-col gap-3' : 'columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6'}>
                {filteredItems.map((item) => {
                  const customStyle = item.style || {};
                  // SECURITY: Sanitize Content
                  const cleanContent = DOMPurify.sanitize(item.content);

                  return (
                  <div key={item.id} onClick={() => onViewItem(item)}
                    className={`break-inside-avoid relative rounded-xl border backdrop-blur-md group transition-all duration-300 cursor-pointer overflow-hidden
                      ${viewMode === 'list' ? 'p-4 flex items-center gap-4 hover:translate-x-1' : 'p-6 flex flex-col gap-4 hover:-translate-y-1'}
                      ${isWizard ? 'bg-black/40 border-emerald-900/50 hover:bg-emerald-900/10' : 'bg-black/40 border-fuchsia-900/50 hover:bg-fuchsia-900/10'}
                    `}
                  >
                    {isAdmin && (
                        <div className={`absolute top-2 right-2 flex gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity ${viewMode === 'list' ? 'order-last relative top-0 right-0 opacity-100' : ''}`}>
                             {onEdit && (
                                 <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-1.5 bg-yellow-600 rounded text-black hover:bg-yellow-500" title="Edit Item">
                                     <Edit2 size={14}/>
                                 </button>
                             )}
                             {onDelete && (
                                 <button onClick={(e) => { e.stopPropagation(); if(confirm('Delete?')) onDelete(item.id); }} className="p-1.5 bg-red-600 rounded text-white hover:bg-red-500" title="Delete Item">
                                     <Trash2 size={14}/>
                                 </button>
                             )}
                        </div>
                    )}

                    <div className={`shrink-0 rounded-full flex items-center justify-center ${viewMode === 'list' ? 'w-10 h-10' : 'w-12 h-12 mb-2'} ${isWizard ? 'bg-emerald-900/30 text-emerald-400' : 'bg-fuchsia-900/30 text-fuchsia-400'}`}>
                       {item.type === 'video' ? <Video size={viewMode==='list'?18:24} /> : <FileText size={viewMode==='list'?18:24} />}
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2 mb-1">
                          {item.subject && <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border opacity-60 ${isWizard ? 'border-emerald-800 text-emerald-300' : 'border-fuchsia-800 text-fuchsia-300'}`}>{item.subject}</span>}
                          {/* Calendar Date Display */}
                          <div className={`flex items-center gap-1 text-[10px] opacity-50 ${isWizard ? 'font-wizard' : 'font-muggle'}`}>
                             <Calendar size={10} />
                             <span>{item.date}</span>
                          </div>
                       </div>
                       <h4 
                          className={`font-bold leading-tight truncate ${viewMode === 'list' ? 'text-sm' : 'text-lg mb-2'} ${customStyle.isGradient ? 'bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400' : ''} ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`}
                          style={{color: customStyle.titleColor}}
                       >
                           {item.title}
                       </h4>
                       {viewMode !== 'list' && (
                           <div 
                              className={`text-sm opacity-60 line-clamp-4 ${isWizard ? 'font-wizard' : 'font-muggle'}`}
                              style={{color: customStyle.contentColor}}
                              dangerouslySetInnerHTML={{__html: cleanContent}}
                           ></div>
                       )}
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
