import React, { useEffect, useRef, useState } from 'react';
import { Lineage, type CarouselItem } from '../types';
import { 
  X, FileText, ExternalLink, Maximize2, Minimize2, ZoomIn, ZoomOut, 
  RotateCw, Moon, Sun, StickyNote, Eye, Layers, 
  Monitor, Smartphone, PenTool, Save, Trash2, AlignJustify, Loader2, Share2, 
  CornerDownRight, Calendar, User, ArrowRight, AlertTriangle, 
  Play, Pause, Scan, Sliders, Eraser, Video, RefreshCw, Droplet, Lock, Unlock, SlidersHorizontal
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { trackActivity } from '../services/tracking';

interface ItemViewerProps {
  item: CarouselItem;
  lineage: Lineage;
  onClose: () => void;
}

type RenderEngine = 'native' | 'google';
type VisualFilter = 'none' | 'invert' | 'sepia' | 'grayscale' | 'contrast';

const ItemViewer: React.FC<ItemViewerProps> = ({ item, lineage, onClose }) => {
  const isWizard = lineage === Lineage.WIZARD;
  

  // --- SECTOR CHECK ---
  const enableSmartTools = item.sector === 'resources' || item.sector === 'lectures' || item.type === 'link_tree';

  // --- STATE ---
  const [engine, setEngine] = useState<RenderEngine>(() => {
      const url = item.fileUrl || '';
      if (url.includes('localhost') || url.includes('127.0.0.1')) return 'native';
      return 'google';
  });

  // View States
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [filter, setFilter] = useState<VisualFilter>('none');
  const [showRuler, setShowRuler] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  
  // Video Specific States
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoBrightness, setVideoBrightness] = useState(100);
  
  // Smart Interaction States
  const [isSmartLayerActive, setIsSmartLayerActive] = useState(false); 
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [selectionRect, setSelectionRect] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const [regionBrightness, setRegionBrightness] = useState(100);

  // Control Dock State
  const [showControls, setShowControls] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 200 });

  // Notebook State
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [savedStatus, setSavedStatus] = useState('');

  // Refs
  const rulerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); 
  const controlsRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // --- INIT & TRACKING ---
  useEffect(() => {
    setIsLoading(true);
    setLoadError(false);
    
    // Auto-switch engine based on URL
    if (item.fileUrl) {
        const url = item.fileUrl;
        const isDrive = url.includes('drive.google.com');
        const isLocal = url.includes('localhost');
        const isSharePoint = url.includes('sharepoint.com') || url.includes('point');
        
        if (isSharePoint) {
            setEngine('native');
        } else if (isDrive || (!isLocal && !item.fileUrl.endsWith('.pdf') && !item.type.includes('video'))) { 
            setEngine('google'); 
        } else if (isLocal) {
            setEngine('native');
        }
    }

    // Load saved notes
    const saved = localStorage.getItem(`core_notes_${item.id}`);
    if (saved) setNotes(saved);

    // TRACKING
    try {
        const profile = JSON.parse(localStorage.getItem('core_connect_profile') || '{}');
        if (profile.id) {
            trackActivity(profile.id, 'VIEW_ITEM', item.id, item.title, 0);
        }
    } catch(e) {}

  }, [item.id]);

  // Click Outside to Close Menu
  useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
          if (showControls && controlsRef.current && !controlsRef.current.contains(e.target as Node)) {
              const target = e.target as HTMLElement;
              if (!target.closest('.control-trigger')) {
                  setShowControls(false);
              }
          }
      };
      window.addEventListener('mousedown', handleClickOutside);
      return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showControls]);

  const isValidUrl = (url?: string) => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (e) { return false; }
  };

  const safePdfUrl = isValidUrl(item.fileUrl) ? item.fileUrl! : "";
  const isVideoFile = item.type === 'video' || (safePdfUrl && safePdfUrl.match(/\.(mp4|webm|ogg|mov)$/i));
  const isGoogleDrive = safePdfUrl.includes('drive.google.com');
  const isMediaView = (item.type === 'file' || item.type === 'video' || item.type === 'link' || item.isLecture) && !!safePdfUrl;

  // --- DETECT EMBEDS (iframe/video tags) to force Full Screen layout ---
  const hasEmbed = item.content && (item.content.includes('<iframe') || item.content.includes('<video') || item.content.includes('<object'));
  const isImmersiveView = isMediaView || hasEmbed || item.type === 'link_tree';

  // --- VIDEO CONTROLS ---
  const togglePlay = () => {
    if (videoRef.current) {
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (showControls) setShowControls(false);
            else onClose();
        }
        if (e.code === 'Space' && isVideoFile && !showNotes) {
            e.preventDefault(); 
            togglePlay();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isVideoFile, showNotes, showControls]);

  const handleVideoStateChange = () => {
      if (videoRef.current) setIsPlaying(!videoRef.current.paused);
  };

  // --- CONTEXT MENU HANDLER ---
  const handleContextMenu = (e: React.MouseEvent) => {
      if (!enableSmartTools) return;
      e.preventDefault(); 
      let x = e.clientX;
      let y = e.clientY;
      if (x + 250 > window.innerWidth) x = window.innerWidth - 260;
      if (y + 400 > window.innerHeight) y = window.innerHeight - 410;
      setMenuPos({ x, y });
      setShowControls(true);
  };

  // --- DRAG SELECTION HANDLERS ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((!isSmartLayerActive && !isSelectionMode) || !containerRef.current) return;
    if ((e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).closest('input')) return;
    if (showControls && controlsRef.current?.contains(e.target as Node)) return; 
    
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setSelectionRect({ x: e.clientX - rect.left, y: e.clientY - rect.top, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentY = e.clientY - rect.top;
    if (showRuler && rulerRef.current) rulerRef.current.style.top = `${currentY}px`;

    if (!dragStart) return;
    const currentX = e.clientX - rect.left;
    setSelectionRect({
        x: Math.min(dragStart.x, currentX),
        y: Math.min(dragStart.y, currentY),
        w: Math.abs(currentX - dragStart.x),
        h: Math.abs(currentY - dragStart.y)
    });
  };

  const handleMouseUp = () => {
    setDragStart(null);
    if (selectionRect && (selectionRect.w < 10 || selectionRect.h < 10)) {
        setSelectionRect(null); 
    } else if (selectionRect) {
        setTimeout(() => setShowControls(true), 100);
        setIsSelectionMode(false); 
    }
  };

  const handleResetFilters = () => {
      setVideoBrightness(100);
      setFilter('none');
      setZoomLevel(100);
      setSelectionRect(null);
      setRotation(0);
  };

  const getFilterStyle = () => {
      let f = '';
      switch(filter) {
          case 'invert': f += 'invert(1) hue-rotate(180deg) '; break;
          case 'sepia': f += 'sepia(0.8) contrast(1.2) '; break;
          case 'grayscale': f += 'grayscale(1) '; break;
          case 'contrast': f += 'contrast(1.5) saturate(1.5) '; break;
      }
      if (videoBrightness !== 100) f += `brightness(${videoBrightness}%) `;
      return f;
  };

  const customStyle = item.style || {};
  const accentColor = isWizard ? '#10b981' : '#d946ef';

  const cleanContent = DOMPurify.sanitize(item.content || '', { 
      ADD_TAGS: ['iframe', 'video', 'source', 'style', 'div', 'span', 'img', 'p', 'br', 'b', 'i', 'strong', 'a'],
      ADD_ATTR: ['src', 'frameborder', 'allow', 'allowfullscreen', 'style', 'class', 'width', 'height', 'controls', 'autoplay', 'loop', 'muted', 'type', 'target', 'href']
  });

  return (
    <div className={`fixed z-[130] flex items-center justify-center p-0 sm:p-4 animate-[fade-in_0.2s_ease-out]
        ${isFullScreen ? 'inset-0 bg-black' : 'inset-0 bg-black/90 backdrop-blur-xl'}
    `}>
      <div 
        className={`flex flex-col rounded-xl border shadow-2xl overflow-hidden relative transition-all duration-300
          ${isWizard ? 'border-emerald-600/50 bg-[#050a05]' : 'border-fuchsia-600/50 bg-[#0a050f]'}
          ${isFullScreen ? 'w-full h-full rounded-none border-0' : 'w-full max-w-7xl h-[95dvh] sm:h-[90vh]'}
        `}
      >
        
        {/* --- TOOLBAR (Glassmorphism + Title + Close Button) --- */}
        <div className={`h-14 shrink-0 px-4 flex items-center justify-between gap-4 z-40 border-b backdrop-blur-md
            ${isWizard ? 'border-emerald-900/30 bg-emerald-950/60' : 'border-fuchsia-900/30 bg-fuchsia-950/60'}
        `}>
            {/* Left: Title */}
            <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                <div className={`p-2 rounded shrink-0 ${isWizard ? 'bg-emerald-500/10 text-emerald-400' : 'bg-fuchsia-500/10 text-fuchsia-400'}`}>
                    {item.type === 'video' ? <Video size={18} /> : <FileText size={18} />}
                </div>
                <div className="min-w-0 flex flex-col justify-center">
                    <h3 className={`font-bold text-sm truncate leading-tight ${isWizard ? 'text-emerald-100' : 'text-fuchsia-100'}`}>
                        {item.title}
                    </h3>
                    <div className="hidden sm:flex gap-2 text-[10px] opacity-60">
                        {item.author && <span>{item.author}</span>}
                        {item.date && <span>• {item.date}</span>}
                    </div>
                </div>
            </div>

            {/* Right: Controls & X Button */}
            <div className="flex items-center gap-2">
                {/* Smart Controls Toggle */}
                {enableSmartTools && (
                    <button 
                        onClick={() => setShowControls(!showControls)}
                        className={`p-2 rounded transition-colors flex items-center gap-2 border text-xs font-bold
                            ${showControls 
                                ? (isWizard ? 'bg-emerald-600 text-black border-emerald-500' : 'bg-fuchsia-600 text-black border-fuchsia-500') 
                                : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70'}
                        `}
                    >
                        <SlidersHorizontal size={16} />
                        <span className="hidden sm:inline">Controls</span>
                    </button>
                )}

                <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>

                {/* Attached Resource (Icon Only) */}
                {safePdfUrl && !isMediaView && (
                    <a href={safePdfUrl} target="_blank" rel="noreferrer" className="p-2 hover:bg-white/10 rounded text-white/70" title="Open Resource">
                        {isGoogleDrive ? <Share2 size={18}/> : <ExternalLink size={18}/>}
                    </a>
                )}

                <button onClick={() => setShowNotes(!showNotes)} className={`p-2 rounded hover:bg-white/10 ${showNotes ? (isWizard ? 'text-emerald-400' : 'text-fuchsia-400') : 'text-white/70'}`} title="Notes">
                    <StickyNote size={18} />
                </button>

                <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>

                <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-2 hover:bg-white/10 rounded text-white/70 hidden sm:block">
                    {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
                
                {/* RESTORED: Close Button */}
                <button onClick={onClose} className="p-2 hover:bg-red-500/20 rounded text-white/70 hover:text-red-400 transition-colors">
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 flex relative overflow-hidden">
            
            {/* Viewer Container */}
            <div 
                ref={containerRef}
                className="flex-1 bg-black relative w-full h-full overflow-hidden flex flex-col justify-center items-center"
                onContextMenu={handleContextMenu}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            >
                {/* 1. IMMERSIVE MODE (Video/Embed/LinkTree) - NO PADDING, NO SCROLL */}
                {isImmersiveView ? (
                    <div className="w-full h-full relative flex items-center justify-center bg-black">
                         {/* Optional Loading State */}
                        {isLoading && !loadError && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 pointer-events-none">
                                <Loader2 className={`w-10 h-10 animate-spin ${isWizard ? 'text-emerald-500' : 'text-fuchsia-500'}`} />
                            </div>
                        )}

                        {isMediaView ? (
                            /* DIRECT FILE/VIDEO RENDERER */
                            <div className="w-full h-full" style={{ transform: `scale(${zoomLevel / 100})`, filter: getFilterStyle() }}>
                                {isVideoFile ? (
                                    <video 
                                        ref={videoRef}
                                        src={safePdfUrl} 
                                        className="w-full h-full object-contain"
                                        controls={!isSmartLayerActive}
                                        onLoadStart={() => setIsLoading(true)} 
                                        onLoadedData={() => setIsLoading(false)} 
                                        onError={() => setLoadError(true)}
                                        onPlay={handleVideoStateChange}
                                        onPause={handleVideoStateChange}
                                    />
                                ) : (
                                    <iframe src={engine === 'native' ? safePdfUrl : `https://docs.google.com/viewer?url=${encodeURIComponent(safePdfUrl)}&embedded=true`} className="w-full h-full border-0" onLoad={() => setIsLoading(false)} />
                                )}
                            </div>
                        ) : (
                            /* EMBED CODE RENDERER (Clean Box) */
                            <div 
                                className="w-full h-full flex items-center justify-center [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:border-0 [&_video]:w-full [&_video]:h-full"
                                style={{ filter: getFilterStyle() }}
                                dangerouslySetInnerHTML={{ __html: cleanContent }} 
                            />
                        )}
                    </div>
                ) : (
                    // 2. TEXT ARTICLE MODE (Padding + Scroll)
                    <div className={`w-full h-full overflow-y-auto p-8 md:p-12 ${isWizard ? 'scrollbar-wizard' : 'scrollbar-muggle'}`}>
                         <div className="max-w-3xl mx-auto">
                            <h2 className={`text-3xl font-bold mb-6 ${isWizard ? 'text-emerald-100' : 'text-fuchsia-100'}`}>{item.title}</h2>
                            {item.image && (
                                <div className="rounded-xl overflow-hidden shadow-2xl mb-8 border border-white/10">
                                    <img src={item.image} alt={item.title} className="w-full h-auto" />
                                </div>
                            )}
                            <div 
                                className={`prose prose-invert max-w-none text-lg leading-relaxed ${isWizard ? 'prose-emerald' : 'prose-fuchsia'}`}
                                dangerouslySetInnerHTML={{__html: cleanContent}}
                            />
                         </div>
                    </div>
                )}

                {/* --- OVERLAYS --- */}
                {isSmartLayerActive && <div className="absolute inset-0 z-30 cursor-crosshair bg-transparent" onContextMenu={handleContextMenu}></div>}
                
                {showRuler && <div ref={rulerRef} className={`absolute left-0 right-0 h-8 pointer-events-none z-30 mix-blend-difference opacity-50 ${isWizard ? 'bg-emerald-500/30' : 'bg-fuchsia-500/30'}`} style={{ top: '50%' }}></div>}

                {selectionRect && (
                    <div className="absolute border-2 border-dashed border-white/50 z-40 pointer-events-none backdrop-invert"
                        style={{ left: selectionRect.x, top: selectionRect.y, width: selectionRect.w, height: selectionRect.h }}
                    ></div>
                )}

                 {/* --- CONTROL DOCK --- */}
                 {showControls && (
                    <div 
                        ref={controlsRef}
                        className={`absolute z-[100] p-4 rounded-xl border backdrop-blur-xl shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 text-white
                            ${isWizard ? 'bg-black/95 border-emerald-500/50 shadow-emerald-900/50' : 'bg-black/95 border-fuchsia-500/50 shadow-fuchsia-900/50'}
                        `}
                        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', minWidth: '300px' }}
                        onMouseDown={(e) => e.stopPropagation()} 
                    >
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest opacity-70 mb-1 border-b border-white/10 pb-2">
                            <span className="flex items-center gap-2"><SlidersHorizontal size={14}/> Smart Controls</span>
                            <div className="flex gap-2">
                                <button onClick={handleResetFilters} className="p-1 hover:bg-white/10 rounded text-red-400" title="Reset"><RefreshCw size={14}/></button>
                                <button onClick={() => setShowControls(false)} className="p-1 hover:bg-white/10 rounded text-white" title="Close"><X size={14}/></button>
                            </div>
                        </div>

                        {/* Smart Layer Toggle */}
                        <button onClick={() => setIsSmartLayerActive(!isSmartLayerActive)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold border transition-all ${isSmartLayerActive ? (isWizard ? 'bg-emerald-900/50 border-emerald-500 text-emerald-100' : 'bg-fuchsia-900/50 border-fuchsia-500 text-fuchsia-100') : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}>
                            <span className="flex items-center gap-2">{isSmartLayerActive ? <Lock size={14}/> : <Unlock size={14}/>} Interaction Lock</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${isSmartLayerActive ? 'bg-emerald-500 text-black' : 'bg-black/50 text-white'}`}>{isSmartLayerActive ? 'ON' : 'OFF'}</span>
                        </button>

                        <div className="h-px bg-white/10 my-1"></div>

                        {/* Visual Filters */}
                        <div className="grid grid-cols-4 gap-2">
                            <button onClick={() => setFilter(f => f === 'invert' ? 'none' : 'invert')} className={`p-2 rounded flex flex-col items-center gap-1 text-[10px] ${filter === 'invert' ? 'bg-white text-black' : 'bg-white/5 hover:bg-white/10'}`}><Moon size={16}/> Dark</button>
                            <button onClick={() => setFilter(f => f === 'sepia' ? 'none' : 'sepia')} className={`p-2 rounded flex flex-col items-center gap-1 text-[10px] ${filter === 'sepia' ? 'bg-amber-700 text-amber-100' : 'bg-white/5 hover:bg-white/10'}`}><Sun size={16}/> Sepia</button>
                            <button onClick={() => setFilter(f => f === 'grayscale' ? 'none' : 'grayscale')} className={`p-2 rounded flex flex-col items-center gap-1 text-[10px] ${filter === 'grayscale' ? 'bg-zinc-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}><Droplet size={16}/> B&W</button>
                            <button onClick={() => { setIsSelectionMode(true); setShowControls(false); }} className={`p-2 rounded flex flex-col items-center gap-1 text-[10px] bg-white/5 hover:bg-white/10 text-emerald-400`}><Scan size={16}/> Scan</button>
                        </div>

                        {/* Sliders */}
                        <div className="space-y-3 pt-2">
                            <div>
                                <div className="flex justify-between text-[10px] mb-1 font-mono text-zinc-300"><span>Brightness</span><span>{videoBrightness}%</span></div>
                                <input type="range" min="30" max="200" value={videoBrightness} onChange={(e) => setVideoBrightness(Number(e.target.value))} className={`w-full h-1 rounded-lg appearance-none cursor-pointer ${isWizard ? 'bg-emerald-900/50 accent-emerald-500' : 'bg-fuchsia-900/50 accent-fuchsia-500'}`} />
                            </div>
                            
                            <div>
                                <div className="flex justify-between text-[10px] mb-1 font-mono text-zinc-300"><span>Scale</span><span>{zoomLevel}%</span></div>
                                <input type="range" min="50" max="200" value={zoomLevel} onChange={(e) => setZoomLevel(Number(e.target.value))} className={`w-full h-1 rounded-lg appearance-none cursor-pointer ${isWizard ? 'bg-emerald-900/50 accent-emerald-500' : 'bg-fuchsia-900/50 accent-fuchsia-500'}`} />
                            </div>

                            {selectionRect && (
                                <div className="animate-in fade-in slide-in-from-left-2 pt-2 border-t border-white/10">
                                    <div className="flex justify-between text-[10px] mb-1 font-mono text-emerald-400"><span>Dark Box Brightness</span><span>{regionBrightness}%</span></div>
                                    <input type="range" min="50" max="200" value={regionBrightness} onChange={(e) => setRegionBrightness(Number(e.target.value))} className={`w-full h-1 rounded-lg appearance-none cursor-pointer ${isWizard ? 'bg-emerald-900/50 accent-emerald-500' : 'bg-fuchsia-900/50 accent-fuchsia-500'}`} />
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* --- RIGHT: NOTEBOOK SIDEBAR (Overlays content) --- */}
            {showNotes && (
                <div className={`w-80 border-l flex flex-col shrink-0 absolute right-0 top-0 bottom-0 z-50 backdrop-blur-xl animate-[fade-in-left_0.2s]
                    ${isWizard ? 'bg-black/90 border-emerald-900' : 'bg-black/90 border-fuchsia-900'}
                `}>
                    <div className={`p-4 border-b flex justify-between items-center ${isWizard ? 'border-emerald-900' : 'border-fuchsia-900'}`}>
                        <h4 className="font-bold flex items-center gap-2"><PenTool size={16}/> Notes</h4>
                        <button onClick={() => setNotes('')} className="p-1.5 rounded hover:bg-red-900/30 text-red-400"><Trash2 size={16}/></button>
                    </div>
                    <textarea 
                        value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Type notes..." 
                        className={`flex-1 w-full bg-transparent resize-none p-4 outline-none font-mono text-sm ${isWizard ? 'text-emerald-100 placeholder:text-emerald-800' : 'text-fuchsia-100 placeholder:text-fuchsia-800'}`} 
                        spellCheck={false}
                    />
                </div>
            )}
        </div>

      </div>
      
      {/* Global Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in-left { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default ItemViewer;