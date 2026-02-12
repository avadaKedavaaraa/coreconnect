import React, { useState, useEffect } from 'react';
import { CarouselItem } from '../types';
import { 
  Network, Trash2, Edit3, PlayCircle, X, RefreshCw, 
  Layers, Image as ImageIcon, ExternalLink,
  FolderOpen, Search, ImagePlus, Loader2, 
  Sparkles, Filter, ChevronRight, ChevronDown, ChevronUp, Clock,
  LayoutGrid, List, CheckCircle2, Zap, Calendar, Link as LinkIcon, Code
} from 'lucide-react';

// --- CONFIGURATION ---
const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY || '';

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
  
  // ==================================================================================
  // 1. HELPER FUNCTIONS
  // ==================================================================================

  // Generates a timestamp with seconds in Indian Standard Time
  // Format: YYYY.MM.DD HH:mm:ss
  const getISTTime = () => {
    try {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      
      // formatToParts gives us the pieces to assemble manually for consistent sorting
      const formatter = new Intl.DateTimeFormat('en-CA', options);
      const parts = formatter.formatToParts(now);
      
      const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00';
      
      return `${getPart('year')}.${getPart('month')}.${getPart('day')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
    } catch (e) {
      // Fallback
      return new Date().toISOString().replace('T', ' ').substring(0, 19).replace(/-/g, '.');
    }
  };

  // ==================================================================================
  // 2. STATE MANAGEMENT
  // ==================================================================================
  
  // Form State
  const [form, setForm] = useState({
    id: '',
    title: '',
    url: '',        // Direct Link
    image: '', 
    embedCode: '',  // Embed Code
    subject: '',
    batch: 'AICS' as 'AICS' | 'CSDA',
    date: getISTTime()
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  
  // Database View States
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [viewBatch, setViewBatch] = useState<'ALL' | 'AICS' | 'CSDA'>('ALL');
  const [showLatest3, setShowLatest3] = useState(false);
  
  // Image Search State
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageQuery, setImageQuery] = useState('');
  const [imageResults, setImageResults] = useState<string[]>([]);
  const [isSearchingImages, setIsSearchingImages] = useState(false);

  // ==================================================================================
  // 3. DERIVED DATA LOGIC
  // ==================================================================================

  const existingTreeItems = items.filter(i => i.type === 'link_tree');

  // Filter items based on the active batch view (ALL/AICS/CSDA)
  const filteredItems = existingTreeItems.filter(item => {
    if (viewBatch === 'ALL') return true;
    return item.batch === viewBatch;
  });

  // Group Items by Subject
  const itemsBySubject = filteredItems.reduce((acc, item) => {
    const subj = item.subject || 'Uncategorized';
    if (!acc[subj]) acc[subj] = [];
    acc[subj].push(item);
    return acc;
  }, {} as Record<string, CarouselItem[]>);

  const uniqueSubjects = Object.keys(itemsBySubject).sort();

  // Get "Latest 3" Items (Sorted by Full Timestamp descending)
  const latestItems = [...filteredItems].sort((a, b) => {
    // String comparison works for "YYYY.MM.DD HH:mm:ss" format
    if (a.date > b.date) return -1;
    if (a.date < b.date) return 1;
    return 0;
  }).slice(0, 3);

  // ==================================================================================
  // 4. HANDLERS
  // ==================================================================================

  const handleEditClick = (item: CarouselItem) => {
    setForm({
      id: item.id,
      title: item.title,
      url: item.fileUrl || '',
      image: item.image || '',
      embedCode: item.content !== 'Link Tree Item' ? item.content : '',
      subject: item.subject || 'General',
      batch: (item.batch as 'AICS' | 'CSDA') || 'AICS',
      date: item.date
    });
    setIsEditing(true);
    setIsCustomSubject(false);
    
    document.getElementById('link-tree-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = () => {
    if (!form.title || !form.subject) {
      alert("Please enter at least a Title and Subject.");
      return;
    }

    const finalContent = form.embedCode ? form.embedCode.trim() : 'Link Tree Item';
    const finalUrl = form.url ? form.url.trim() : '';

    const payload: CarouselItem = {
      id: isEditing ? form.id : crypto.randomUUID(),
      title: form.title,
      content: finalContent, 
      date: form.date, 
      type: 'link_tree',
      sector: 'resources',
      subject: form.subject,
      batch: form.batch,
      fileUrl: finalUrl,
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
      setActiveSubject(form.subject);
      setShowLatest3(false);
    }

    resetForm();
  };

  const resetForm = () => {
    setForm({ 
        id: '', title: '', url: '', image: '', embedCode: '', 
        subject: '', batch: 'AICS', date: getISTTime() 
    });
    setIsEditing(false);
    setIsCustomSubject(false);
  };

  const handleImageSearch = async () => {
    if (!imageQuery) return;
    setIsSearchingImages(true);
    
    if (!UNSPLASH_ACCESS_KEY) {
        alert("Configuration Error: VITE_UNSPLASH_ACCESS_KEY is missing in your Environment Variables.");
        setIsSearchingImages(false);
        return;
    }

    try {
      const response = await fetch(`https://api.unsplash.com/search/photos?page=1&per_page=12&query=${imageQuery}&client_id=${UNSPLASH_ACCESS_KEY}`);
      if (!response.ok) throw new Error(`Error ${response.status}`);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
         const urls = data.results.map((img: any) => img.urls.regular);
         setImageResults(urls);
      } else {
         alert("No results found for that keyword.");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to fetch images.");
    } finally {
      setIsSearchingImages(false);
    }
  };

  // ==================================================================================
  // 5. RENDER UI
  // ==================================================================================
  return (
    <div className="h-full flex flex-col gap-6" id="link-tree-form">
      
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-full shadow-lg ${isWizard ? 'bg-green-500/20 text-green-300' : 'bg-pink-500/20 text-pink-300'}`}>
            <Network size={24} />
          </div>
          <div>
            <h3 className="font-bold text-xl text-white">Link Tree Manager</h3>
            <p className="text-xs text-zinc-400">Manage Academic Resources & Recordings</p>
          </div>
        </div>
        {isEditing && (
            <button 
                onClick={resetForm} 
                className="px-4 py-2 bg-red-900/50 text-red-200 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-900 transition-colors flex items-center gap-2"
            >
                <X size={14}/> CANCEL EDIT
            </button>
        )}
      </div>

      {/* --- MAIN SPLIT LAYOUT (40% Form | 60% Data) --- */}
      <div className="flex flex-col xl:flex-row gap-8 h-full min-h-[600px]">
        
        {/* === LEFT COLUMN: THE EDITOR FORM === */}
        <div className="w-full xl:w-5/12 flex flex-col gap-4 animate-in slide-in-from-left-4 fade-in duration-500">
            <div className={`p-6 rounded-xl border ${isEditing ? 'border-yellow-500/50 bg-yellow-900/10' : 'border-white/10 bg-white/5'} space-y-5 shadow-xl transition-colors`}>
               
               {/* Form Header */}
               <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-2">
                  <h4 className={`font-bold ${isEditing ? 'text-yellow-400' : 'text-blue-400'} flex items-center gap-2`}>
                    {isEditing ? <Edit3 size={16}/> : <Sparkles size={16}/>}
                    {isEditing ? 'Editing Link Node' : 'Add New Link'}
                  </h4>
               </div>
                
               <div className="text-[10px] opacity-40 font-mono flex items-center gap-1 bg-black/30 p-2 rounded">
                    <Clock size={10}/> Timestamp: {form.date}
               </div>

               {/* Batch & Subject */}
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold opacity-50 block mb-1 uppercase">Target Batch</label>
                    <div className="relative">
                        <select 
                        value={form.batch}
                        onChange={e => setForm(prev => ({...prev, batch: e.target.value as any}))}
                        className="w-full p-3 bg-black/50 border border-white/10 rounded-lg text-xs text-white outline-none focus:border-blue-500/50 transition-colors appearance-none"
                        >
                        <option value="AICS">AICS</option>
                        <option value="CSDA">CSDA</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-3 text-white/30 pointer-events-none" size={14}/>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold opacity-50 block mb-1 uppercase">Subject</label>
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
                        className="w-full p-3 bg-black/50 border border-white/10 rounded-lg text-xs text-white outline-none focus:border-blue-500/50 transition-colors appearance-none"
                        >
                        <option value="">-- Select Subject --</option>
                        {Array.from(new Set(items.filter(i => i.type === 'link_tree').map(i => i.subject || 'General'))).sort().map(s => <option key={s} value={s}>{s}</option>)}
                        <option value="__NEW__" className="bg-blue-900 font-bold text-white">+ Create New Subject</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-3 text-white/30 pointer-events-none" size={14}/>
                    </div>
                  </div>
               </div>
               
               {isCustomSubject && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="text-[10px] font-bold text-blue-400 block mb-1 uppercase">New Subject Name</label>
                      <input
                        value={form.subject}
                        onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))}
                        className="w-full p-3 bg-blue-900/20 border border-blue-500/50 rounded-lg text-xs text-white outline-none focus:bg-blue-900/30 transition-colors"
                        placeholder="e.g. Artificial Intelligence"
                        autoFocus
                      />
                  </div>
               )}

               {/* Title */}
               <div>
                  <label className="text-[10px] font-bold opacity-50 block mb-1 uppercase">Link Title</label>
                  <input
                    value={form.title}
                    onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-3 bg-black/50 border border-white/10 rounded-lg text-xs text-white outline-none focus:border-blue-500/50 transition-colors"
                    placeholder="e.g. Lecture 5: Calculus Integration"
                  />
               </div>

               {/* Thumbnail */}
               <div>
                  <label className="text-[10px] font-bold opacity-50 block mb-1 uppercase flex justify-between">
                    <span>Thumbnail URL</span>
                    <button 
                        onClick={() => setShowImageModal(true)} 
                        className="text-pink-400 hover:text-white flex items-center gap-1 transition-colors text-[10px] uppercase font-bold hover:underline"
                    >
                      <ImagePlus size={12}/> Search Unsplash
                    </button>
                  </label>
                  <div className="flex gap-2 group">
                    <div className="relative flex-1">
                        <ImageIcon className="absolute left-3 top-3 text-white/20" size={16}/>
                        <input
                        value={form.image}
                        onChange={e => setForm(prev => ({ ...prev, image: e.target.value }))}
                        className="w-full pl-10 p-3 bg-black/50 border border-white/10 rounded-lg text-xs text-white outline-none focus:border-blue-500/50 transition-colors"
                        placeholder="https://example.com/image.jpg"
                        />
                    </div>
                    <div className="w-12 h-11 rounded-lg border border-white/10 bg-black overflow-hidden shrink-0 shadow-inner">
                        {form.image ? (
                            <img src={form.image} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"/>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-700"><ImageIcon size={16}/></div>
                        )}
                    </div>
                  </div>
               </div>

               {/* --- SPLIT: DIRECT LINK (NEW) --- */}
               <div>
                  <label className="text-[10px] font-bold opacity-50 block mb-1 uppercase flex justify-between">
                      <span>Direct URL Link (Optional)</span>
                      <span className="text-green-400 text-[10px] flex items-center gap-1"><LinkIcon size={10}/> For PDFs/External Sites</span>
                  </label>
                  <input
                    value={form.url}
                    onChange={e => setForm(prev => ({ ...prev, url: e.target.value }))}
                    className="w-full p-3 bg-black/50 border border-white/10 rounded-lg text-xs text-white outline-none focus:border-green-500/50 transition-colors font-mono text-[11px]"
                    placeholder='https://drive.google.com/file/...'
                  />
               </div>

               {/* --- SPLIT: EMBED CODE (SEPARATE) --- */}
               <div>
                  <label className="text-[10px] font-bold opacity-50 block mb-1 uppercase flex justify-between">
                      <span>Embed Code (Optional)</span>
                      <span className="text-yellow-500 text-[10px] flex items-center gap-1"><Code size={10}/> For YouTube/Players</span>
                  </label>
                  <textarea
                    value={form.embedCode}
                    onChange={e => setForm(prev => ({ ...prev, embedCode: e.target.value }))}
                    className="w-full h-32 p-3 bg-black/50 border border-white/10 rounded-lg text-[10px] font-mono text-zinc-300 outline-none resize-none focus:border-yellow-500/50 transition-colors custom-scrollbar"
                    placeholder='<iframe src="https://www.youtube.com/embed/..." ...></iframe>'
                  />
               </div>

               {/* Submit Button */}
               <button 
                onClick={handleSubmit}
                className={`w-full py-4 rounded-lg font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 mt-2
                    ${isEditing 
                        ? 'bg-yellow-500 text-black hover:bg-yellow-400 shadow-yellow-500/20' 
                        : 'bg-green-600 text-white hover:bg-green-500 shadow-green-500/20'
                    }`}
               >
                 {isEditing ? <><RefreshCw size={16}/> UPDATE LINK NODE</> : <><CheckCircle2 size={16}/> SAVE TO DATABASE</>}
               </button>
            </div>
        </div>

        {/* === RIGHT COLUMN: DATABASE LIST (Smart Accordion) === */}
        <div className="w-full xl:w-7/12 flex flex-col bg-black/20 border border-white/5 rounded-xl overflow-hidden animate-in slide-in-from-right-4 fade-in duration-500 shadow-2xl">
            
            {/* Database Header / Filter Bar */}
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-900/20 rounded-lg text-blue-400">
                        <Layers size={20}/>
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-white">Database Registry</h3>
                        <p className="text-[10px] text-zinc-500">
                            {filteredItems.length} Items Found
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* BATCH FILTER BUTTONS */}
                    <div className="flex p-1 bg-black/40 rounded-lg border border-white/10 shadow-inner mr-2">
                        {['ALL', 'AICS', 'CSDA'].map((b) => (
                        <button
                            key={b}
                            onClick={() => setViewBatch(b as any)}
                            className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all duration-300 ${
                            viewBatch === b 
                            ? 'bg-white text-black shadow-md scale-105' 
                            : 'text-zinc-500 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            {b}
                        </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setShowLatest3(!showLatest3)}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-2 uppercase tracking-wide
                            ${showLatest3 
                                ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-900/50' 
                                : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 hover:text-white'
                            }
                        `}
                    >
                        <Clock size={14} /> {showLatest3 ? 'Latest 3 (IST)' : 'Latest 3'}
                    </button>
                </div>
            </div>

            {/* List Content Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-black/10">
                
                {/* MODE A: LATEST 3 VIEW */}
                {showLatest3 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 mb-2 pl-1 border-b border-white/5 pb-2">
                            <Sparkles size={12} className="text-purple-400"/>
                            <span className="text-[10px] uppercase font-bold text-purple-400">
                                Most Recent Uploads (IST Order)
                            </span>
                        </div>
                        {latestItems.map(item => renderListItem(item, handleEditClick, onDeleteItem))}
                        {latestItems.length === 0 && (
                            <div className="text-center opacity-30 py-12 text-xs border border-dashed border-white/10 rounded-lg">
                                No recent items found matching filters.
                            </div>
                        )}
                    </div>
                )}

                {/* MODE B: SUBJECT ACCORDION VIEW (Default) */}
                {!showLatest3 && (
                    <div className="space-y-3">
                        {uniqueSubjects.length === 0 ? (
                            <div className="text-center opacity-30 py-20 flex flex-col items-center gap-4">
                                <div className="p-4 bg-white/5 rounded-full"><FolderOpen size={48}/></div>
                                <div>
                                    <p className="font-bold text-sm">No Data Found</p>
                                    <p className="text-xs">Try adjusting the filter or add a new link.</p>
                                </div>
                            </div>
                        ) : (
                            uniqueSubjects.map(subject => (
                                <div key={subject} className="border border-white/10 rounded-xl overflow-hidden bg-white/5 transition-all hover:border-white/20">
                                    <button 
                                        onClick={() => setActiveSubject(activeSubject === subject ? null : subject)}
                                        className={`w-full p-4 flex items-center justify-between transition-colors
                                            ${activeSubject === subject ? 'bg-white/10 text-blue-200 shadow-inner' : 'hover:bg-white/5 text-zinc-300'}
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            {activeSubject === subject ? <FolderOpen size={18} className="text-blue-400"/> : <FolderOpen size={18} className="opacity-50"/>}
                                            <span className="font-bold text-sm tracking-wide">{subject}</span>
                                            <span className="text-[10px] opacity-60 bg-black/40 px-2 py-0.5 rounded-full border border-white/5">
                                                {itemsBySubject[subject].length} items
                                            </span>
                                        </div>
                                        {activeSubject === subject ? <ChevronUp size={16} className="text-blue-400"/> : <ChevronDown size={16} className="opacity-50"/>}
                                    </button>

                                    {activeSubject === subject && (
                                        <div className="bg-black/30 p-3 space-y-2 border-t border-white/10 animate-in slide-in-from-top-2 fade-in duration-200 shadow-inner">
                                            {itemsBySubject[subject].map(item => renderListItem(item, handleEditClick, onDeleteItem))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* --- IMAGE SEARCH MODAL --- */}
      {showImageModal && (
        <div className="fixed inset-0 z-[10000] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-3xl bg-[#111] border border-white/10 rounded-2xl flex flex-col max-h-[80vh] shadow-2xl shadow-purple-900/20">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-2xl">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <ImagePlus className="text-pink-400" size={20}/> Unsplash Image Search
                    </h3>
                    <button onClick={() => setShowImageModal(false)} className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors">
                        <X size={20}/>
                    </button>
                </div>
                
                <div className="p-4 border-b border-white/10 flex gap-2">
                    <input 
                        value={imageQuery}
                        onChange={(e) => setImageQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleImageSearch()}
                        className="flex-1 p-2 bg-black border border-white/10 rounded-lg text-white text-sm outline-none focus:border-pink-500/50 transition-colors"
                        placeholder="Type keywords (e.g. 'Nature', 'Technology', 'Books')..."
                        autoFocus
                    />
                    <button onClick={handleImageSearch} disabled={isSearchingImages} className="px-6 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-bold text-xs">
                        {isSearchingImages ? <Loader2 className="animate-spin" size={16}/> : 'SEARCH'}
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-black/20">
                    {imageResults.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center opacity-40">
                            <ImageIcon size={48} className="mb-2"/>
                            <p className="text-sm">Enter a search term to find high-quality images.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {imageResults.map((url, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => { setForm(prev => ({ ...prev, image: url })); setShowImageModal(false); }}
                                    className="group relative aspect-video rounded-lg overflow-hidden border border-white/10 hover:border-pink-500 transition-all hover:scale-105 shadow-lg"
                                >
                                    <img src={url} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
                                        <span className="text-[10px] font-bold text-white bg-pink-600 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                                            <Zap size={10} className="fill-white"/> SELECT
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

// --- LIST ITEM COMPONENT ---
const renderListItem = (
    item: CarouselItem, 
    onEdit: (item: CarouselItem) => void, 
    onDelete: (id: string) => void
) => (
    <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all group">
        <div className="w-16 h-12 shrink-0 rounded-md bg-black relative overflow-hidden border border-white/10 shadow-sm">
            {item.image ? (
                <img src={item.image} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"/>
            ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700 group-hover:text-zinc-500 transition-colors">
                    <Network size={20}/>
                </div>
            )}
            <div className={`absolute top-0 left-0 w-1 h-full ${item.batch === 'CSDA' ? 'bg-fuchsia-500' : 'bg-blue-500'}`}></div>
        </div>
        <div className="flex-1 min-w-0">
            <h4 className="font-bold text-xs text-zinc-200 truncate pr-4 group-hover:text-white transition-colors">
                {item.title}
            </h4>
            <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border
                    ${item.batch === 'CSDA' ? 'bg-fuchsia-900/20 text-fuchsia-300 border-fuchsia-500/20' : 'bg-blue-900/20 text-blue-300 border-blue-500/20'}
                `}>
                    {item.batch}
                </span>
                <span className="text-[9px] text-zinc-500 flex items-center gap-1 font-mono">
                    <Calendar size={8}/> {item.date}
                </span>
                {item.content && item.content !== 'Link Tree Item' && (
                    <span className="text-[9px] text-yellow-400 bg-yellow-900/10 border border-yellow-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Code size={8}/> Embed
                    </span>
                )}
                 {item.fileUrl && (
                    <span className="text-[9px] text-green-400 bg-green-900/10 border border-green-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <LinkIcon size={8}/> Link
                    </span>
                )}
            </div>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity px-2">
            <button onClick={() => onEdit(item)} className="p-2 rounded bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:scale-110 transition-all">
                <Edit3 size={14}/>
            </button>
            <button onClick={() => { if(confirm('Delete this link?')) onDelete(item.id); }} className="p-2 rounded bg-red-600 hover:bg-red-500 text-white shadow-lg hover:scale-110 transition-all">
                <Trash2 size={14}/>
            </button>
        </div>
    </div>
);