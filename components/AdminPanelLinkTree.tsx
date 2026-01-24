import React, { useState, useEffect } from 'react';
import { CarouselItem } from '../types';
import { 
  Network, Trash2, Edit3, PlayCircle, Maximize2, X, RefreshCw, 
  Layers, MonitorPlay, Image as ImageIcon, AlertTriangle, ExternalLink,
  ChevronLeft, ChevronRight, FolderOpen 
} from 'lucide-react';
import DOMPurify from 'dompurify';

interface AdminPanelLinkTreeProps {
  items: CarouselItem[];
  onAddItem: (item: CarouselItem) => void;
  onUpdateItem: (item: CarouselItem) => void;
  onDeleteItem: (id: string) => void;
  isWizard: boolean;
}

export const AdminPanelLinkTree: React.FC<AdminPanelLinkTreeProps> = ({ 
  items, onAddItem, onUpdateItem, onDeleteItem, isWizard 
}) => {
  // --- STATE ---
  const [form, setForm] = useState({
    id: '',
    title: '',
    url: '', // Direct Link
    image: '', // Thumbnail/Banner
    embedCode: '', // The Iframe Code
    subject: '',
    batch: 'AICS' as 'AICS' | 'CSDA'
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  
  // Preview States
  const [cinemaMode, setCinemaMode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  // --- DERIVED DATA ---
  const uniqueSubjects = Array.from(new Set(items.map(i => i.subject || 'General'))).sort();
  const existingTreeItems = items.filter(i => i.type === 'link_tree');

  // GROUPING LOGIC: Subject -> Batch -> Items
  const groupedItems = existingTreeItems.reduce((acc, item) => {
    const subj = item.subject || 'Uncategorized';
    if (!acc[subj]) acc[subj] = { AICS: [], CSDA: [] };
    
    // Normalize batch
    const batchKey = (item.batch === 'CSDA') ? 'CSDA' : 'AICS';
    acc[subj][batchKey].push(item);
    return acc;
  }, {} as Record<string, { AICS: CarouselItem[], CSDA: CarouselItem[] }>);

  // --- HANDLERS ---

  // Load Item into Edit Form
  const handleEditClick = (item: CarouselItem) => {
    setForm({
      id: item.id,
      title: item.title,
      url: item.fileUrl || '',
      image: item.image || '',
      embedCode: item.content !== 'Link Tree Item' ? item.content : '',
      subject: item.subject || 'General',
      batch: (item.batch as 'AICS' | 'CSDA') || 'AICS'
    });
    setIsEditing(true);
    setIsCustomSubject(false);
    setShowPreview(false); // Reset preview to force click-to-load
    // Scroll to top
    document.getElementById('link-tree-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Submit (Create or Update)
  const handleSubmit = () => {
    if (!form.title || !form.subject) {
      alert("Please enter at least a Title and Subject.");
      return;
    }

    const payload: CarouselItem = {
      id: isEditing ? form.id : crypto.randomUUID(),
      title: form.title,
      content: form.embedCode || 'Link Tree Item',
      date: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
      type: 'link_tree',
      sector: 'resources',
      subject: form.subject,
      batch: form.batch,
      fileUrl: form.url,
      image: form.image,
      isUnread: false,
      isPinned: false,
      likes: 0,
      style: { titleColor: '#ffffff' }
    };

    if (isEditing) {
      onUpdateItem(payload);
      alert("Link Updated Successfully!");
      setIsEditing(false);
    } else {
      onAddItem(payload);
      alert("Link Added to Tree!");
    }

    // Reset form but keep Subject/Batch for fast entry
    setForm(prev => ({ ...prev, id: '', title: '', url: '', image: '', embedCode: '' }));
    setShowPreview(false);
  };

  const resetForm = () => {
    setForm({ id: '', title: '', url: '', image: '', embedCode: '', subject: '', batch: 'AICS' });
    setIsEditing(false);
    setShowPreview(false);
  };

  // --- EFFECTS ---

  // Cinema Mode Keyboard Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!cinemaMode) return;
      
      if (e.key === 'ArrowRight') {
         setActivePreviewIndex((prev) => (prev + 1) % existingTreeItems.length);
      } else if (e.key === 'ArrowLeft') {
         setActivePreviewIndex((prev) => (prev - 1 + existingTreeItems.length) % existingTreeItems.length);
      } else if (e.key === 'Escape') {
         setCinemaMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cinemaMode, existingTreeItems.length]);

  const openCinema = () => {
      if (isEditing && form.id) {
          const idx = existingTreeItems.findIndex(i => i.id === form.id);
          if (idx !== -1) setActivePreviewIndex(idx);
      }
      setCinemaMode(true);
  };

  // Helper to render a single item card
  const renderItemCard = (item: CarouselItem) => (
    <div 
      key={item.id} 
      className={`
        relative flex items-stretch rounded-lg border overflow-hidden transition-all group cursor-pointer
        ${isEditing && form.id === item.id 
          ? 'border-yellow-500/50 bg-yellow-900/10' 
          : 'border-white/5 bg-black/20 hover:border-white/20 hover:bg-white/5'
        }
      `}
      onClick={() => handleEditClick(item)}
    >
      {/* Batch Color Strip */}
      <div className={`w-1 shrink-0 ${item.batch === 'CSDA' ? 'bg-fuchsia-500' : 'bg-blue-500'}`}></div>
      
      {/* Thumbnail */}
      <div className="w-12 bg-black/40 relative overflow-hidden shrink-0 hidden sm:block">
        {item.image ? (
          <img src={item.image} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Network size={16} className="opacity-20" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-2 min-w-0 flex flex-col justify-center">
        <h4 className="font-bold text-xs text-white truncate pr-16">{item.title}</h4>
        <div className="flex items-center gap-2 mt-1">
            {/* Visual Indicator for Recording */}
            {item.content && item.content !== 'Link Tree Item' && (
                <div className="flex items-center gap-1 text-[10px] text-pink-400">
                    <PlayCircle size={10} className="fill-pink-400/20" /> Recording
                </div>
            )}
            {/* Visual Indicator for Direct Link */}
            {item.fileUrl && (
                <div className="flex items-center gap-1 text-[10px] text-green-400">
                    <ExternalLink size={10} /> Direct Link
                </div>
            )}
        </div>
      </div>

      {/* Actions (Absolute) */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-black/60 rounded-lg p-1 backdrop-blur-sm">
        <button 
            onClick={(e) => { e.stopPropagation(); handleEditClick(item); }} 
            className="p-1.5 hover:bg-blue-600 hover:text-white text-blue-400 rounded-md transition-colors" 
            title="Edit"
        >
          <Edit3 size={12}/>
        </button>
        <button 
            onClick={(e) => { e.stopPropagation(); if(confirm('Delete?')) onDeleteItem(item.id); }} 
            className="p-1.5 hover:bg-red-600 hover:text-white text-red-400 rounded-md transition-colors" 
            title="Delete"
        >
          <Trash2 size={12}/>
        </button>
      </div>
    </div>
  );

  // --- RENDER ---
  return (
    <div className="space-y-6 h-full flex flex-col" id="link-tree-form">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-full ${isWizard ? 'bg-green-500/20 text-green-300' : 'bg-pink-500/20 text-pink-300'}`}>
            <Network size={24} />
          </div>
          <div>
            <h3 className="font-bold text-xl">Link Tree Manager</h3>
            <p className="text-sm opacity-60">Manage Recordings & Direct Links</p>
          </div>
        </div>
        {isEditing && (
          <button onClick={resetForm} className="w-full sm:w-auto px-4 py-2 bg-red-900/50 text-red-200 rounded-lg text-xs font-bold border border-red-500/30 flex items-center justify-center gap-2 hover:bg-red-900 transition-colors">
            <X size={14} /> CANCEL EDIT
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: EDITOR */}
        <div className="space-y-6 order-2 xl:order-1">
          <div className={`p-6 rounded-xl border ${isEditing ? 'border-yellow-500/50 bg-yellow-900/10' : 'border-white/10 bg-white/5'} space-y-4 transition-colors`}>
            
            <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-2">
              <h4 className={`font-bold ${isEditing ? 'text-yellow-400' : 'text-white'}`}>
                {isEditing ? 'Editing Link Node' : 'Add New Recording'}
              </h4>
              {isEditing && <span className="text-[10px] font-mono opacity-50">{form.id}</span>}
            </div>

            {/* Batch Selector */}
            <div>
              <label className="text-xs font-bold opacity-50 block mb-1 uppercase">Target Batch</label>
              <div className="flex gap-2 p-1 bg-black/40 rounded-lg border border-white/10">
                {(['AICS', 'CSDA'] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => setForm(prev => ({ ...prev, batch: b }))}
                    className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                      form.batch === b 
                      ? (b === 'AICS' ? 'bg-blue-600 text-white' : 'bg-fuchsia-600 text-white') 
                      : 'text-zinc-400 hover:bg-white/5'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="text-xs font-bold opacity-50 block mb-1 uppercase">Subject</label>
                    <div className="relative">
                        <select
                        value={isCustomSubject ? '__NEW__' : form.subject}
                        onChange={(e) => {
                            if (e.target.value === '__NEW__') {
                            setIsCustomSubject(true);
                            setForm(prev => ({ ...prev, subject: '' }));
                            } else {
                            setIsCustomSubject(false);
                            setForm(prev => ({ ...prev, subject: e.target.value }));
                            }
                        }}
                        className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-sm text-white outline-none"
                        >
                        <option value="">-- Select Subject --</option>
                        {uniqueSubjects.map(s => <option key={s} value={s} className="bg-black">{s}</option>)}
                        <option value="__NEW__" className="bg-blue-900 font-bold">+ Create New Subject</option>
                        </select>
                    </div>
                    {isCustomSubject && (
                        <input
                        value={form.subject}
                        onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))}
                        className="w-full mt-2 p-3 bg-blue-900/20 border border-blue-500/50 rounded-lg text-sm text-white outline-none animate-[fade-in_0.2s]"
                        placeholder="Enter New Subject Name..."
                        autoFocus
                        />
                    )}
                </div>

                {/* Title & Image Inputs */}
                <div className="md:col-span-2">
                    <label className="text-xs font-bold opacity-50 block mb-1 uppercase">Title</label>
                    <input
                        value={form.title}
                        onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-white/30 transition-colors"
                        placeholder="Lecture 1: Introduction..."
                    />
                </div>
                
                <div className="md:col-span-2">
                    <label className="text-xs font-bold opacity-50 block mb-1 uppercase">Thumbnail URL</label>
                    <div className="flex gap-2">
                    <div className="relative flex-1">
                        <ImageIcon className="absolute left-3 top-3 text-white/30" size={16} />
                        <input
                        value={form.image}
                        onChange={e => setForm(prev => ({ ...prev, image: e.target.value }))}
                        className="w-full pl-10 p-3 bg-black/40 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-white/30 transition-colors"
                        placeholder="https://..."
                        />
                    </div>
                    {form.image && (
                        <div className="w-12 h-12 rounded border border-white/10 bg-black overflow-hidden shrink-0">
                        <img src={form.image} className="w-full h-full object-cover" />
                        </div>
                    )}
                    </div>
                </div>
            </div>

            {/* Direct URL */}
            <div>
              <label className="text-xs font-bold opacity-50 block mb-1 uppercase">Direct Link URL (Optional)</label>
              <input
                value={form.url}
                onChange={e => setForm(prev => ({ ...prev, url: e.target.value }))}
                className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-sm text-white outline-none font-mono text-xs focus:border-white/30 transition-colors"
                placeholder="https://sharepoint..."
              />
            </div>

            {/* Embed Code */}
            <div>
              <label className="text-xs font-bold opacity-50 block mb-1 uppercase flex justify-between">
                <span>Embed Code (HTML)</span>
                <span className="text-[10px] text-yellow-500">Paste &lt;iframe&gt; code here</span>
              </label>
              <textarea
                value={form.embedCode}
                onChange={e => { 
                    const val = e.target.value; 
                    setForm(prev => ({ ...prev, embedCode: val })); 
                    setShowPreview(false); 
                }}
                className="w-full h-24 p-3 bg-black/40 border border-white/10 rounded-lg text-xs font-mono text-zinc-300 outline-none resize-none focus:border-white/30 transition-colors"
                placeholder='<div style="..."><iframe src="..."></iframe></div>'
              />
            </div>

            <button 
              onClick={handleSubmit} 
              className={`w-full py-3 rounded-lg font-bold text-black transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2
                ${isEditing 
                  ? 'bg-yellow-500 hover:bg-yellow-400' 
                  : 'bg-green-600 hover:bg-green-500'
                }`}
            >
              {isEditing ? <><RefreshCw size={18}/> UPDATE LINK NODE</> : <><PlayCircle size={18}/> ADD TO TREE</>}
            </button>
          </div>

          {/* LIST OF EXISTING ITEMS - GROUPED */}
          <div className="space-y-2">
            <h4 className="font-bold text-sm opacity-60 uppercase flex items-center gap-2 border-b border-white/10 pb-2">
              <Layers size={14}/> Database Entries ({existingTreeItems.length})
            </h4>
            
            <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2 custom-scrollbar p-1">
              {existingTreeItems.length === 0 ? (
                  <div className="text-center opacity-30 py-8 text-xs">No entries found.</div>
              ) : (
                  Object.entries(groupedItems).sort((a,b) => a[0].localeCompare(b[0])).map(([subject, batches]) => (
                    <div key={subject} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                      {/* Subject Header */}
                      <div className="bg-white/5 p-3 flex items-center gap-2 border-b border-white/5">
                        <FolderOpen size={16} className="text-yellow-500 opacity-80" />
                        <span className="font-bold text-sm text-yellow-100">{subject}</span>
                      </div>

                      <div className="p-2 space-y-3">
                         {/* AICS Group */}
                         {batches.AICS.length > 0 && (
                           <div className="space-y-2">
                              <h5 className="text-[10px] font-bold text-blue-300 uppercase tracking-wider pl-2 border-l-2 border-blue-500/30">
                                AICS Batch ({batches.AICS.length})
                              </h5>
                              <div className="space-y-2 pl-2">
                                {batches.AICS.map(item => renderItemCard(item))}
                              </div>
                           </div>
                         )}

                         {/* Separator if both exist */}
                         {batches.AICS.length > 0 && batches.CSDA.length > 0 && (
                            <div className="h-px bg-white/5 w-full"></div>
                         )}

                         {/* CSDA Group */}
                         {batches.CSDA.length > 0 && (
                           <div className="space-y-2">
                              <h5 className="text-[10px] font-bold text-fuchsia-300 uppercase tracking-wider pl-2 border-l-2 border-fuchsia-500/30">
                                CSDA Batch ({batches.CSDA.length})
                              </h5>
                              <div className="space-y-2 pl-2">
                                {batches.CSDA.map(item => renderItemCard(item))}
                              </div>
                           </div>
                         )}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEWER */}
        <div className="space-y-4 order-1 xl:order-2">
          <div className="p-1 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/10">
            <div className="bg-black/80 backdrop-blur-xl rounded-lg overflow-hidden">
              {/* Preview Header */}
              <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h4 className="font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                  <MonitorPlay size={14} className="text-blue-400"/> Live Preview
                </h4>
                <div className="flex gap-2">
                  <button 
                    onClick={openCinema} 
                    className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                    disabled={!form.embedCode && existingTreeItems.length === 0}
                  >
                    <Maximize2 size={10}/> CINEMA
                  </button>
                </div>
              </div>

              {/* Preview Content */}
              <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
                {!form.embedCode ? (
                  <div className="text-center opacity-30">
                    <PlayCircle size={48} className="mx-auto mb-2"/>
                    <p className="text-xs">Paste embed code to preview</p>
                  </div>
                ) : (
                  !showPreview ? (
                    <button 
                      onClick={() => setShowPreview(true)}
                      className="flex flex-col items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all"
                    >
                      <PlayCircle size={32} className="text-white"/>
                      <span className="text-xs font-bold uppercase tracking-widest text-white">Click to Load Preview</span>
                    </button>
                  ) : (
                    <div 
                      className="w-full h-full"
                      dangerouslySetInnerHTML={{ 
                        __html: DOMPurify.sanitize(form.embedCode, { 
                          ADD_TAGS: ['iframe', 'div', 'style'], 
                          ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'style', 'width', 'height', 'src'] 
                        }) 
                      }} 
                    />
                  )
                )}
              </div>

              {/* Warning Footer */}
              <div className="p-3 bg-yellow-900/20 border-t border-yellow-500/20 flex items-start gap-2">
                <AlertTriangle size={16} className="text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-yellow-200/80 leading-relaxed">
                  <strong>Authentication Warning:</strong> If the preview shows "Refused to connect" or a login screen, verify you are logged into the source (e.g. SharePoint) in this browser.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CINEMA MODE MODAL (Z-9999 Fix) */}
      {cinemaMode && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col animate-[fade-in_0.2s]">
          <div className="flex justify-between items-center p-4 border-b border-white/10 bg-[#0f0f0f]">
            <div className="flex items-center gap-4">
                <h3 className="font-bold text-white tracking-widest hidden sm:block">ADVANCED PREVIEW</h3>
                <div className="flex items-center gap-2 text-xs text-zinc-400 bg-white/5 px-3 py-1 rounded-full">
                    <span>Item {activePreviewIndex + 1} / {existingTreeItems.length}</span>
                    <span className="hidden sm:inline opacity-50">| Use Arrow Keys to Browse</span>
                </div>
            </div>
            <button onClick={() => setCinemaMode(false)} className="p-2 hover:bg-white/10 rounded-full text-white">
              <X size={24}/>
            </button>
          </div>
          
          <div className="flex-1 flex items-center justify-center p-2 sm:p-10 relative">
            {/* Left Arrow */}
            <button 
                onClick={() => setActivePreviewIndex((prev) => (prev - 1 + existingTreeItems.length) % existingTreeItems.length)}
                className="absolute left-2 sm:left-4 p-4 rounded-full bg-white/5 hover:bg-white/20 text-white z-50 transition-colors"
                title="Previous (Left Arrow)"
            >
                <ChevronLeft size={32} />
            </button>
            
            {/* Content Container */}
            <div className="w-full max-w-7xl h-[85vh] bg-black shadow-2xl rounded-xl border border-white/10 relative group flex flex-col">
              {existingTreeItems[activePreviewIndex] ? (
                  <div 
                    className="flex-1 w-full relative [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:border-none"
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(existingTreeItems[activePreviewIndex].content, { 
                        ADD_TAGS: ['iframe', 'div', 'style', 'span', 'img', 'video', 'source', 'p', 'a', 'b', 'strong', 'center'],
                        ADD_ATTR: [
                            'allow', 'allowfullscreen', 'frameborder', 'scrolling', 
                            'style', 'width', 'height', 'src', 'title', 
                            'class', 'id', 'name', 'referrerpolicy', 'loading',
                            'controls', 'autoplay', 'loop', 'muted', 'poster', 'type', 'href', 'target'
                        ]
                      }) 
                    }} 
                  />
              ) : (
                  <div className="flex items-center justify-center h-full opacity-50">No items available.</div>
              )}
              
              {/* Overlay Info */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <h2 className="text-xl font-bold text-white mb-1">{existingTreeItems[activePreviewIndex]?.title}</h2>
                  <p className="text-sm opacity-70">{existingTreeItems[activePreviewIndex]?.subject} • {existingTreeItems[activePreviewIndex]?.date}</p>
              </div>
            </div>

            {/* Right Arrow */}
            <button 
                onClick={() => setActivePreviewIndex((prev) => (prev + 1) % existingTreeItems.length)}
                className="absolute right-2 sm:right-4 p-4 rounded-full bg-white/5 hover:bg-white/20 text-white z-50 transition-colors"
                title="Next (Right Arrow)"
            >
                <ChevronRight size={32} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};