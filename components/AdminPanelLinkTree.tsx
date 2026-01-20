import React, { useState, useEffect } from 'react';
import { CarouselItem } from '../types';
import { 
  Network, Trash2, Edit3, PlayCircle, ExternalLink, 
  Maximize2, X, RefreshCw, Layers, MonitorPlay 
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
  // Form State
  const [form, setForm] = useState({
    id: '',
    title: '',
    url: '', // Direct Link
    embedCode: '', // The Iframe Code
    subject: '',
    batch: 'AICS' as 'AICS' | 'CSDA'
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [cinemaMode, setCinemaMode] = useState(false); // Advanced Preview Mode

  // Derived Data
  const uniqueSubjects = Array.from(new Set(items.map(i => i.subject || 'General'))).sort();
  const existingTreeItems = items.filter(i => i.type === 'link_tree');

  // Handle Edit Click
  const handleEditClick = (item: CarouselItem) => {
    setForm({
      id: item.id,
      title: item.title,
      url: item.fileUrl || '',
      embedCode: item.content !== 'Link Tree Item' ? item.content : '',
      subject: item.subject || 'General',
      batch: (item.batch as 'AICS' | 'CSDA') || 'AICS'
    });
    setIsEditing(true);
    setIsCustomSubject(false);
    // Scroll to top
    document.getElementById('link-tree-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle Submit (Create or Update)
  const handleSubmit = () => {
    if (!form.title || !form.subject) {
      alert("Please enter at least a Title and Subject.");
      return;
    }

    const payload: CarouselItem = {
      id: isEditing ? form.id : crypto.randomUUID(),
      title: form.title,
      // If embed code exists, use it as content. Otherwise use fallback text.
      content: form.embedCode || 'Link Tree Item',
      date: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
      type: 'link_tree',
      sector: 'resources',
      subject: form.subject,
      batch: form.batch,
      fileUrl: form.url,
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

    // Reset form but keep Subject/Batch for faster data entry
    setForm(prev => ({ ...prev, id: '', title: '', url: '', embedCode: '' }));
  };

  const resetForm = () => {
    setForm({ id: '', title: '', url: '', embedCode: '', subject: '', batch: 'AICS' });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 h-full flex flex-col" id="link-tree-form">
      
      {/* Header */}
      <div className="flex items-center justify-between">
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
          <button onClick={resetForm} className="px-4 py-2 bg-red-900/50 text-red-200 rounded-lg text-xs font-bold border border-red-500/30 flex items-center gap-2 hover:bg-red-900">
            <X size={14} /> CANCEL EDIT
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: EDITOR */}
        <div className="space-y-6">
          <div className={`p-6 rounded-xl border ${isEditing ? 'border-yellow-500/50 bg-yellow-900/10' : 'border-white/10 bg-white/5'} space-y-4 transition-colors`}>
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
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
                    onClick={() => setForm({ ...form, batch: b })}
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
            <div>
              <label className="text-xs font-bold opacity-50 block mb-1 uppercase">Subject</label>
              <div className="relative">
                <select
                  value={isCustomSubject ? '__NEW__' : form.subject}
                  onChange={(e) => {
                    if (e.target.value === '__NEW__') {
                      setIsCustomSubject(true);
                      setForm({ ...form, subject: '' });
                    } else {
                      setIsCustomSubject(false);
                      setForm({ ...form, subject: e.target.value });
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
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  className="w-full mt-2 p-3 bg-blue-900/20 border border-blue-500/50 rounded-lg text-sm text-white outline-none animate-[fade-in_0.2s]"
                  placeholder="Enter New Subject Name..."
                  autoFocus
                />
              )}
            </div>

            {/* Inputs */}
            <div>
              <label className="text-xs font-bold opacity-50 block mb-1 uppercase">Title</label>
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-white/30 transition-colors"
                placeholder="Lecture 1: Introduction..."
              />
            </div>

            <div>
              <label className="text-xs font-bold opacity-50 block mb-1 uppercase">Direct URL (Optional)</label>
              <input
                value={form.url}
                onChange={e => setForm({ ...form, url: e.target.value })}
                className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-sm text-white outline-none font-mono text-xs focus:border-white/30 transition-colors"
                placeholder="https://sharepoint..."
              />
            </div>

            <div>
              <label className="text-xs font-bold opacity-50 block mb-1 uppercase flex justify-between">
                <span>Embed Code (HTML)</span>
                <span className="text-[10px] text-yellow-500">Paste &lt;iframe&gt; code here</span>
              </label>
              <textarea
                value={form.embedCode}
                onChange={e => setForm({ ...form, embedCode: e.target.value })}
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

          {/* LIST OF EXISTING ITEMS */}
          <div className="space-y-2">
            <h4 className="font-bold text-sm opacity-60 uppercase flex items-center gap-2">
              <Layers size={14}/> Database Entries ({existingTreeItems.length})
            </h4>
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar bg-black/20 p-2 rounded-xl border border-white/5">
              {existingTreeItems.map(item => (
                <div 
                  key={item.id} 
                  className={`flex justify-between items-center p-3 rounded-lg border transition-all cursor-pointer group
                    ${isEditing && form.id === item.id 
                      ? 'bg-yellow-900/20 border-yellow-500/50' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                    }
                  `}
                  onClick={() => handleEditClick(item)}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-1 h-8 rounded-full ${item.batch === 'CSDA' ? 'bg-fuchsia-500' : 'bg-blue-500'}`}></div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate text-white">{item.title}</div>
                      <div className="flex gap-2 items-center text-[10px] opacity-50">
                        <span className="uppercase font-bold tracking-wider">{item.batch || 'AICS'}</span>
                        <span>• {item.subject}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); handleEditClick(item); }} className="p-2 hover:bg-blue-500/20 text-blue-400 rounded" title="Edit">
                      <Edit3 size={14}/>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); if(confirm('Delete?')) onDeleteItem(item.id); }} className="p-2 hover:bg-red-900/50 text-red-400 rounded" title="Delete">
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEWER */}
        <div className="space-y-4">
          <div className="p-1 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/10">
            <div className="bg-black/80 backdrop-blur-xl rounded-lg overflow-hidden">
              {/* Preview Header */}
              <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h4 className="font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                  <MonitorPlay size={14} className="text-blue-400"/> Live Preview
                </h4>
                <button 
                  onClick={() => setCinemaMode(true)} 
                  className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                  disabled={!form.embedCode}
                >
                  <Maximize2 size={10}/> CINEMA MODE
                </button>
              </div>

              {/* Preview Content */}
              <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
                {form.embedCode ? (
                  <div 
                    className="w-full h-full"
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(form.embedCode, { 
                        ADD_TAGS: ['iframe', 'div', 'style'], 
                        ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'style', 'width', 'height', 'src'] 
                      }) 
                    }} 
                  />
                ) : (
                  <div className="text-center opacity-30">
                    <PlayCircle size={48} className="mx-auto mb-2"/>
                    <p className="text-xs">Paste embed code to preview</p>
                  </div>
                )}
              </div>

              {/* Debug Info */}
              <div className="p-3 bg-black/50 text-[10px] font-mono text-zinc-500 border-t border-white/5 truncate">
                SRC: {form.url || 'No Direct Link'}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-900/10 text-xs text-blue-200">
            <p className="font-bold mb-1">💡 Tip for SharePoint/Stream:</p>
            <p className="opacity-70">
              The preview above uses the exact HTML you paste. If it looks wrong here, check if you copied the full <code>&lt;iframe&gt;</code> code. 
              The 3D Tree will handle the visual presentation on the student side.
            </p>
          </div>
        </div>
      </div>

      {/* CINEMA MODE MODAL (Advanced Controls Wrapper) */}
      {cinemaMode && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col animate-[fade-in_0.2s]">
          <div className="flex justify-between items-center p-4 border-b border-white/10 bg-[#0f0f0f]">
            <h3 className="font-bold text-white tracking-widest">ADVANCED PREVIEW</h3>
            <button onClick={() => setCinemaMode(false)} className="p-2 hover:bg-white/10 rounded-full text-white">
              <X size={24}/>
            </button>
          </div>
          
          <div className="flex-1 flex items-center justify-center p-4 sm:p-10">
            <div className="w-full max-w-5xl aspect-video bg-black shadow-2xl rounded-xl border border-white/10 overflow-hidden relative group">
              {/* The Iframe */}
              <div 
                className="w-full h-full"
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(form.embedCode, { 
                    ADD_TAGS: ['iframe', 'div', 'style'], 
                    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'style', 'width', 'height', 'src'] 
                  }) 
                }} 
              />
              
              {/* Overlay Controls (Simulated "Advanced Controls" for Iframe) */}
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                 <div className="bg-black/80 backdrop-blur text-white text-[10px] px-2 py-1 rounded border border-white/20">
                    STREAM V2.0
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};