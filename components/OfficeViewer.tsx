import React, { useState, useEffect, useRef } from 'react';
import { Lineage, type CarouselItem } from '../types';
import { 
  X, FileText, ExternalLink, Maximize2, Minimize2, ZoomIn, ZoomOut, 
  RotateCw, Moon, Sun, StickyNote, Eye, Save, Trash2, AlignJustify, Loader2,
  Monitor, Smartphone, PenTool, Layout, FileSpreadsheet, Presentation
} from 'lucide-react';

interface OfficeViewerProps {
  item: CarouselItem;
  lineage: Lineage;
  onClose: () => void;
}

type VisualFilter = 'none' | 'invert' | 'sepia' | 'grayscale' | 'contrast';

const OfficeViewer: React.FC<OfficeViewerProps> = ({ item, lineage, onClose }) => {
  const isWizard = lineage === Lineage.WIZARD;
  
  // --- STATE ---
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [filter, setFilter] = useState<VisualFilter>('none');
  const [showRuler, setShowRuler] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Notebook State
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [savedStatus, setSavedStatus] = useState('');

  // Refs
  const rulerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- INIT ---
  useEffect(() => {
    setIsLoading(true);
    // Load saved notes
    const saved = localStorage.getItem(`core_notes_${item.id}`);
    if (saved) setNotes(saved);
  }, [item.id]);

  // --- URL HANDLER (Microsoft Engine) ---
  const getMicrosoftUrl = (url: string) => {
    // Encodes the URL to pass it safely to Microsoft's viewer
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  };

  const safeUrl = item.fileUrl || "";
  const viewerUrl = getMicrosoftUrl(safeUrl);

  // File Type Icon
  const getFileIcon = () => {
    if (safeUrl.match(/\.(xls|xlsx|csv)$/i)) return <FileSpreadsheet size={18} />;
    if (safeUrl.match(/\.(ppt|pptx)$/i)) return <Presentation size={18} />;
    return <FileText size={18} />;
  };

  // --- HANDLERS ---
  const handleSaveNotes = () => {
      localStorage.setItem(`core_notes_${item.id}`, notes);
      setSavedStatus('Saved!');
      setTimeout(() => setSavedStatus(''), 2000);
  };

  const handleClearNotes = () => {
      if(confirm('Clear notes for this file?')) {
          setNotes('');
          localStorage.removeItem(`core_notes_${item.id}`);
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (showRuler && rulerRef.current && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const y = e.clientY - rect.top;
          rulerRef.current.style.top = `${y}px`;
      }
  };

  // --- STYLES ---
  const getFilterStyle = () => {
      switch(filter) {
          case 'invert': return 'invert(1) hue-rotate(180deg)';
          case 'sepia': return 'sepia(0.8) contrast(1.2)';
          case 'grayscale': return 'grayscale(1)';
          case 'contrast': return 'contrast(1.5) saturate(1.5)';
          default: return 'none';
      }
  };

  return (
    <div className={`fixed z-[2147483647] top-0 left-0 right-0 bottom-0 flex items-center justify-center p-0 sm:p-4 animate-[fade-in_0.2s_ease-out]
        ${isFullScreen ? 'bg-black' : 'bg-black/90 backdrop-blur-xl'}
    `}>
      <div 
        className={`flex flex-col rounded-xl border shadow-2xl overflow-hidden relative transition-all duration-300
          ${isWizard ? 'border-emerald-600 bg-[#0a0f0a]' : 'border-fuchsia-600 bg-[#0f0a15]'}
          ${isFullScreen ? 'w-full h-full rounded-none border-0' : 'w-full max-w-7xl h-[100dvh] sm:h-[90vh]'}
        `}
      >
        
        {/* --- TOOLBAR --- */}
        <div className={`p-2 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 z-30 relative
            ${isWizard ? 'border-emerald-900 bg-emerald-950/80' : 'border-fuchsia-900 bg-fuchsia-950/80'}
        `}>
            
            {/* Title Section */}
            <div className="flex items-center gap-3 min-w-0 max-w-[40%]">
                <div className={`p-2 rounded shrink-0 hidden sm:block ${isWizard ? 'bg-emerald-900/50 text-emerald-400' : 'bg-fuchsia-900/50 text-fuchsia-400'}`}>
                    {getFileIcon()}
                </div>
                <div className="min-w-0">
                    <h3 className={`font-bold text-xs sm:text-sm truncate ${isWizard ? 'text-emerald-100' : 'text-fuchsia-100'}`}>
                        {item.title}
                    </h3>
                    <div className="flex gap-2 text-[10px] mt-0.5 opacity-60">
                         <span className="flex items-center gap-1"><Monitor size={10}/> MS Office Engine</span>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
                
                {/* Zoom Controls (Applied to Container) */}
                <div className="flex items-center bg-black/20 rounded p-1">
                    <button onClick={() => setZoomLevel(z => Math.max(50, z - 10))} className="p-1.5 hover:bg-white/10 rounded text-white/70" title="Zoom Out"><ZoomOut size={16}/></button>
                    <span className="text-[10px] font-mono w-8 text-center hidden sm:block">{zoomLevel}%</span>
                    <button onClick={() => setZoomLevel(z => Math.min(200, z + 10))} className="p-1.5 hover:bg-white/10 rounded text-white/70" title="Zoom In"><ZoomIn size={16}/></button>
                </div>

                <button onClick={() => setRotation(r => (r + 90) % 360)} className="p-2 hover:bg-white/10 rounded text-white/70" title="Rotate"><RotateCw size={18}/></button>
                
                {/* Visual Filters */}
                <div className="flex items-center bg-black/20 rounded p-1">
                    <button onClick={() => setFilter(f => f === 'invert' ? 'none' : 'invert')} className={`p-1.5 rounded ${filter === 'invert' ? 'bg-white text-black' : 'text-white/70'}`} title="Dark Mode"><Moon size={16}/></button>
                    <button onClick={() => setFilter(f => f === 'sepia' ? 'none' : 'sepia')} className={`p-1.5 rounded ${filter === 'sepia' ? 'bg-amber-700 text-amber-100' : 'text-white/70'}`} title="Sepia Mode"><Sun size={16}/></button>
                    <button onClick={() => setFilter(f => f === 'contrast' ? 'none' : 'contrast')} className={`p-1.5 rounded ${filter === 'contrast' ? 'bg-white text-black' : 'text-white/70'}`} title="High Contrast"><Eye size={16}/></button>
                </div>

                <button 
                    onClick={() => setShowRuler(!showRuler)} 
                    className={`p-2 hover:bg-white/10 rounded transition-colors ${showRuler ? (isWizard ? 'text-emerald-400 bg-emerald-900/30' : 'text-fuchsia-400 bg-fuchsia-900/30') : 'text-white/70'}`} 
                    title="Reading Ruler"
                >
                    <AlignJustify size={18}/>
                </button>

                <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>

                <button 
                    onClick={() => setShowNotes(!showNotes)} 
                    className={`p-2 rounded transition-colors flex items-center gap-2
                        ${showNotes 
                            ? (isWizard ? 'bg-emerald-600 text-black' : 'bg-fuchsia-600 text-black') 
                            : 'hover:bg-white/10 text-white/70'}
                    `}
                    title="Notebook"
                >
                    <StickyNote size={18} />
                    <span className="text-xs font-bold hidden md:block">Notes</span>
                </button>

                <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>

                <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-2 hover:bg-white/10 rounded text-white/70 hidden sm:block">
                    {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>

                <button onClick={onClose} className="p-2 hover:bg-red-500/20 rounded text-white/70 hover:text-red-400 transition-colors">
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex flex-1 overflow-hidden relative">
            
            <div 
                ref={containerRef}
                className="flex-1 bg-zinc-900 relative w-full h-full overflow-hidden flex items-center justify-center"
                onMouseMove={handleMouseMove}
            >
                {/* LOADING STATE */}
                {isLoading && (
                    <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300`}>
                        <Loader2 className={`w-12 h-12 mb-4 animate-spin ${isWizard ? 'text-emerald-500' : 'text-fuchsia-500'}`} />
                        <div className={`text-sm font-bold tracking-widest animate-pulse ${isWizard ? 'text-emerald-200' : 'text-fuchsia-200'}`}>
                            {isWizard ? 'DECODING RUNES...' : 'LOADING DOCUMENT...'}
                        </div>
                    </div>
                )}

                {/* IFRAME CONTAINER (Apply Zoom/Rotate Here) */}
                <div 
                    className="w-full h-full transition-all duration-300 origin-center relative z-10 bg-white"
                    style={{ 
                        transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                        filter: getFilterStyle()
                    }}
                >
                    <iframe 
                        src={viewerUrl} 
                        className="w-full h-full border-0"
                        title="Microsoft Office Viewer"
                        onLoad={() => setIsLoading(false)}
                        onError={() => setIsLoading(false)}
                    />
                </div>

                {/* Ruler Overlay */}
                {showRuler && (
                    <div 
                        ref={rulerRef}
                        className={`absolute left-0 right-0 h-8 pointer-events-none z-30 mix-blend-difference opacity-50
                            ${isWizard ? 'bg-emerald-500/30 border-y border-emerald-400' : 'bg-fuchsia-500/30 border-y border-fuchsia-400'}
                        `}
                        style={{ top: '50%' }}
                    ></div>
                )}
            </div>

            {/* --- RIGHT: NOTEBOOK SIDEBAR --- */}
            {showNotes && (
                <div className={`w-80 border-l flex flex-col shrink-0 transition-all animate-[fade-in-left_0.2s]
                    ${isWizard ? 'bg-[#050a05] border-emerald-900' : 'bg-[#09050f] border-fuchsia-900'}
                `}>
                    <div className={`p-4 border-b flex justify-between items-center ${isWizard ? 'border-emerald-900' : 'border-fuchsia-900'}`}>
                        <h4 className="font-bold flex items-center gap-2"><PenTool size={16}/> Document Notes</h4>
                        <div className="flex gap-1">
                            <button onClick={handleSaveNotes} className={`p-1.5 rounded hover:bg-white/10 ${isWizard ? 'text-emerald-400' : 'text-fuchsia-400'}`} title="Save">
                                <Save size={16}/>
                            </button>
                            <button onClick={handleClearNotes} className="p-1.5 rounded hover:bg-red-900/30 text-red-400" title="Delete">
                                <Trash2 size={16}/>
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 p-4 relative">
                        <textarea 
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Type your notes here..."
                            className={`w-full h-full bg-transparent resize-none outline-none font-mono text-sm leading-relaxed
                                ${isWizard 
                                    ? 'text-emerald-100 placeholder:text-emerald-800' 
                                    : 'text-fuchsia-100 placeholder:text-fuchsia-800'}
                            `}
                            spellCheck={false}
                        />
                        {savedStatus && (
                            <div className="absolute bottom-4 right-4 text-xs text-green-400 font-bold animate-pulse">
                                {savedStatus}
                            </div>
                        )}
                    </div>
                    
                    <div className="p-3 text-[10px] opacity-40 text-center border-t border-white/5">
                        Notes are saved locally.
                    </div>
                </div>
            )}
        </div>

      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in-left { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default OfficeViewer;