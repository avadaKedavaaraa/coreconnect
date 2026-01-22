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
  // Enable Smart Tools for Resources AND Lectures AND Link Trees
  const enableSmartTools = item.sector === 'resources' || item.sector === 'lectures' || item.type === 'link_tree';

  // --- CHECK IF THIS IS A LINK TREE (Triggers "Clean Mode") ---
  const isLinkTree = item.type === 'link_tree';

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

    const saved = localStorage.getItem(`core_notes_${item.id}`);
    if (saved) setNotes(saved);

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
  const isPdf = safePdfUrl.toLowerCase().endsWith('.pdf');
  const isGoogleDrive = safePdfUrl.includes('drive.google.com');
  const isMediaView = (item.type === 'file' || item.type === 'video' || item.type === 'link' || item.isLecture) && !!safePdfUrl;

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (showControls) setShowControls(false);
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((!isSmartLayerActive && !isSelectionMode) || !containerRef.current) return;
    if ((e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).closest('input')) return;
    if (showControls && controlsRef.current?.contains(e.target as Node)) return; 
    
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDragStart({ x, y });
    setSelectionRect({ x, y, w: 0, h: 0 });
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
  
  const titleFont = customStyle.fontFamily === 'wizard' ? '"EB Garamond", serif' : customStyle.fontFamily === 'muggle' ? '"JetBrains Mono", monospace' : undefined;

  const titleStyle: React.CSSProperties = customStyle.isGradient ? {
      backgroundImage: `linear-gradient(to right, ${customStyle.titleColor}, ${customStyle.titleColorEnd || customStyle.titleColor})`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      color: 'transparent',
      fontFamily: titleFont
  } : {
      color: customStyle.titleColor || (isWizard ? '#d1fae5' : '#f5d0fe'),
      fontFamily: titleFont
  };

  const cleanContent = DOMPurify.sanitize(item.content || '', { 
      ADD_TAGS: ['style', 'iframe', 'img', 'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'div', 'span', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'hr', 'button', 'input', 'label', 'form', 'audio', 'video', 'source', 'track'],
      ADD_ATTR: ['target', 'href', 'src', 'frameborder', 'allow', 'allowfullscreen', 'style', 'class', 'id', 'width', 'height', 'align', 'controls', 'autoplay', 'loop', 'muted', 'poster', 'type']
  });

  return (
    <div className={`fixed z-[130] flex items-center justify-center p-0 sm:p-4 animate-[fade-in_0.2s_ease-out]
        ${isFullScreen ? 'inset-0 bg-black' : 'inset-0 bg-black/90 backdrop-blur-xl'}
    `}>
      <div 
        className={`flex flex-col rounded-xl border shadow-2xl overflow-hidden relative transition-all duration-300
          ${isWizard ? 'border-emerald-600 bg-[#0a0f0a]' : 'border-fuchsia-600 bg-[#0f0a15]'}
          ${isFullScreen ? 'w-full h-full rounded-none border-0' : 'w-full max-w-7xl h-[100dvh] sm:h-[90vh]'}
        `}
      >
        
        {/* --- TOOLBAR --- */}
        <div className={`p-2 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 z-30 relative backdrop-blur-md
            ${isWizard ? 'border-emerald-900/30 bg-emerald-950/40' : 'border-fuchsia-900/30 bg-fuchsia-950/40'}
        `}>
            <div className="flex items-center gap-3 min-w-0 max-w-[40%]">
                <div className={`p-2 rounded shrink-0 hidden sm:block ${isWizard ? 'bg-emerald-900/50 text-emerald-400' : 'bg-fuchsia-900/50 text-fuchsia-400'}`}>
                    <FileText size={18} />
                </div>
                <div className="min-w-0">
                    <h3 className={`font-bold text-xs sm:text-sm truncate ${isWizard ? 'text-emerald-100' : 'text-fuchsia-100'}`}>
                        {item.title}
                    </h3>
                    
                    {/* CONDITIONAL METADATA: Only show here for Link Trees */}
                    {isLinkTree && (
                        <div className="flex gap-2 text-[10px] opacity-60 mt-0.5">
                            {item.author && <span>{item.author}</span>}
                            {item.date && <span>• {item.date}</span>}
                        </div>
                    )}

                    {/* Engine Switcher (Media only) */}
                    {isMediaView && (
                        <div className="flex gap-2 text-[10px] mt-0.5">
                            {!isGoogleDrive && (
                                <button onClick={() => { setEngine('native'); setIsLoading(true); setLoadError(false); }} className={`flex items-center gap-1 hover:underline ${engine === 'native' ? 'opacity-100 font-bold' : 'opacity-50'}`}>
                                    <Monitor size={10}/> Native
                                </button>
                            )}
                            {!isGoogleDrive && <span className="opacity-30">|</span>}
                            <button onClick={() => { setEngine('google'); setIsLoading(true); setLoadError(false); }} className={`flex items-center gap-1 hover:underline ${engine === 'google' || isGoogleDrive ? 'opacity-100 font-bold' : 'opacity-50'}`}>
                                <Smartphone size={10}/> Cloud
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
                
                {enableSmartTools && (
                    <button 
                        onClick={() => setShowControls(!showControls)}
                        className={`control-trigger p-2 rounded transition-colors flex items-center gap-2 border shrink-0
                            ${showControls 
                                ? (isWizard ? 'bg-emerald-600 text-black border-emerald-500' : 'bg-fuchsia-600 text-black border-fuchsia-500') 
                                : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70'}
                        `}
                        title="Open Smart Controls"
                    >
                        <SlidersHorizontal size={18} />
                        <span className="text-xs font-bold hidden md:block whitespace-nowrap">Controls</span>
                    </button>
                )}

                <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>

                <div className="flex items-center bg-black/20 rounded p-1">
                    <button onClick={() => setZoomLevel(z => Math.max(50, z - 10))} className="p-1.5 hover:bg-white/10 rounded text-white/70" title="Zoom Out"><ZoomOut size={16}/></button>
                    <span className="text-[10px] font-mono w-8 text-center hidden sm:block">{zoomLevel}%</span>
                    <button onClick={() => setZoomLevel(z => Math.min(200, z + 10))} className="p-1.5 hover:bg-white/10 rounded text-white/70" title="Zoom In"><ZoomIn size={16}/></button>
                </div>

                <button onClick={() => setShowRuler(!showRuler)} className={`p-2 hover:bg-white/10 rounded transition-colors ${showRuler ? (isWizard ? 'text-emerald-400 bg-emerald-900/30' : 'text-fuchsia-400 bg-fuchsia-900/30') : 'text-white/70'}`} title="Reading Ruler">
                    <AlignJustify size={18}/>
                </button>

                <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>
                
                <button onClick={() => setShowNotes(!showNotes)} className={`p-2 rounded transition-colors flex items-center gap-2 ${showNotes ? (isWizard ? 'bg-emerald-600 text-black' : 'bg-fuchsia-600 text-black') : 'hover:bg-white/10 text-white/70'}`}>
                    <StickyNote size={18} />
                    <span className="text-xs font-bold hidden md:block">Notes</span>
                </button>

                {safePdfUrl && !isMediaView && (
                    <a 
                        href={safePdfUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className={`p-2 rounded transition-colors flex items-center gap-2 hover:bg-white/10 text-white/70`}
                        title="Open Attached Resource"
                    >
                        {isGoogleDrive ? <Share2 size={18}/> : <ExternalLink size={18}/>}
                        <span className="text-xs font-bold hidden md:block">Resource</span>
                    </a>
                )}

                <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>

                {/* APP FULLSCREEN BUTTON - RECOMMENDED */}
                <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-2 hover:bg-white/10 rounded text-white/70 hidden sm:block" title="App Fullscreen (Keeps Controls)">
                    {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
                
                {/* Close Button */}
                <button onClick={onClose} className="p-2 hover:bg-red-500/20 rounded text-white/70 hover:text-red-400 transition-colors">
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* --- CONTENT + SIDEBAR WRAPPER --- */}
        <div className="flex flex-1 overflow-hidden relative">

            {/* GLOBAL CONTENT CONTAINER */}
            <div 
                ref={containerRef}
                className="flex-1 bg-zinc-900 relative w-full h-full overflow-hidden flex flex-col group"
                onContextMenu={handleContextMenu}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            >
                {/* 1. MEDIA MODE (Video/PDF) */}
                {isMediaView ? (
                    <>
                        {isLoading && !loadError && (
                            <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300`}>
                                <Loader2 className={`w-12 h-12 mb-4 animate-spin ${isWizard ? 'text-emerald-500' : 'text-fuchsia-500'}`} />
                                <div className={`text-sm font-bold tracking-widest animate-pulse ${isWizard ? 'text-emerald-200' : 'text-fuchsia-200'}`}>
                                    {isWizard ? 'SUMMONING SCROLL...' : 'DECRYPTING STREAM...'}
                                </div>
                            </div>
                        )}

                        {loadError && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 p-6 text-center">
                                <AlertTriangle size={48} className="text-yellow-500 mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">Display Error</h3>
                                <p className="text-zinc-400 text-sm mb-6 max-w-md">The embedded viewer could not load this file.</p>
                                <a href={safePdfUrl} target="_blank" rel="noreferrer" className={`px-6 py-3 rounded-full font-bold flex items-center gap-2 ${isWizard ? 'bg-emerald-600 text-black' : 'bg-fuchsia-600 text-black'}`}>
                                    <ExternalLink size={18} /> OPEN FILE EXTERNALLY
                                </a>
                            </div>
                        )}

                        {!loadError && (
                            <div 
                                className="w-full h-full transition-all duration-300 origin-center relative z-10 flex-1 flex items-center justify-center"
                                style={{ transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)` }}
                            >
                                {isVideoFile ? (
                                    <video 
                                        ref={videoRef}
                                        src={safePdfUrl} 
                                        className="max-w-full max-h-[85vh] shadow-2xl" 
                                        onLoadStart={() => setIsLoading(true)} 
                                        onLoadedData={() => setIsLoading(false)} 
                                        onError={() => setLoadError(true)}
                                        onPlay={handleVideoStateChange}
                                        onPause={handleVideoStateChange}
                                        style={{ 
                                            filter: getFilterStyle(),
                                            cursor: isSmartLayerActive ? 'crosshair' : 'default'
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full" style={{ filter: getFilterStyle(), cursor: isSmartLayerActive ? 'crosshair' : 'default' }}>
                                        {/* Use <object> ONLY for PDF to allow plugins, otherwise direct iframe for better video support */}
                                        {engine === 'native' && !isGoogleDrive ? (
                                            isPdf ? (
                                                <object data={safePdfUrl} type="application/pdf" className="w-full h-full" onLoad={() => setIsLoading(false)}>
                                                    <iframe src={safePdfUrl} className="w-full h-full border-0" title="Native Viewer" />
                                                </object>
                                            ) : (
                                                <iframe src={safePdfUrl} className="w-full h-full border-0" title="Native Viewer" onLoad={() => setIsLoading(false)} />
                                            )
                                        ) : (
                                            <iframe src={safePdfUrl} className="w-full h-full border-0 bg-white" title="Cloud Viewer" allow="autoplay; fullscreen" onLoad={() => setIsLoading(false)} onError={() => setLoadError(true)} />
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    // 2. TEXT/LINK TREE MODE
                    <div 
                        className={`flex-1 relative 
                            ${isLinkTree 
                                ? 'p-0 overflow-hidden flex flex-col' 
                                : `overflow-y-auto p-6 md:p-10 space-y-8 ${isWizard ? 'scrollbar-wizard' : 'scrollbar-muggle'}`
                            }
                        `}
                        style={{ filter: getFilterStyle() }} 
                    >
                        {/* METADATA */}
                        {!isLinkTree && (
                            <div className="flex flex-wrap items-center gap-2 mb-3 text-[10px] uppercase tracking-widest font-bold opacity-70">
                                <span className={`px-2 py-1 rounded border flex items-center gap-1 ${isWizard ? 'border-emerald-800 text-emerald-400' : 'border-fuchsia-800 text-fuchsia-400'}`}><CornerDownRight size={10} /> {item.sector || 'ARCHIVE'}</span>
                                <span className="flex items-center gap-1"><Calendar size={10}/> {item.date}</span>
                                <span className="flex items-center gap-1"><User size={10}/> {item.author || 'SYSTEM'}</span>
                            </div>
                        )}

                        {/* TITLE */}
                        {!isLinkTree && (
                            <h2 className="text-2xl md:text-3xl font-bold leading-tight break-words mb-6" style={titleStyle}>{item.title}</h2>
                        )}
                        
                        {/* LOGIN WARNING */}
                        {!isLinkTree && (item.content && item.content.includes('iframe')) && (
                            <div className={`p-3 rounded-lg border mb-6 flex flex-wrap items-center justify-between gap-4 animate-[fade-in_0.3s_ease-out]
                                ${isWizard ? 'bg-amber-900/20 border-amber-700/50' : 'bg-amber-900/20 border-amber-700/50'}
                            `}>
                                <div className="flex items-start gap-3">
                                    <AlertTriangle size={18} className="text-amber-400 mt-0.5 shrink-0" />
                                    <div className="text-xs text-amber-200/90 leading-relaxed max-w-xl">
                                        If the video shows a login screen, please ensure you are logged into your college account.
                                    </div>
                                </div>
                                
                                {enableSmartTools && (
                                    <button 
                                        onClick={() => setShowControls(true)}
                                        className="control-trigger flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border shadow-lg shrink-0 bg-white/10 border-white/20 hover:bg-white/20 text-white"
                                    >
                                        <SlidersHorizontal size={14}/>
                                        <span>OPEN CONTROLS</span>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* IMAGE */}
                        {item.image && item.type !== 'link_tree' && (
                            <div className="rounded-xl overflow-hidden shadow-2xl border border-white/10 relative group">
                                <img src={item.image} alt={item.title} className="w-full h-auto max-h-[500px] object-cover" />
                            </div>
                        )}
                        
                        {/* CONTENT AREA */}
                        <div 
                            className={isLinkTree 
                                ? "w-full h-full [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:border-0 [&_video]:w-full [&_video]:h-full" 
                                : `prose prose-invert max-w-none safe-font text-lg leading-relaxed html-content ${isWizard ? 'prose-emerald selection:bg-emerald-900/50' : 'prose-fuchsia selection:bg-fuchsia-900/50'}`
                            }
                            style={{ color: customStyle.contentColor || '#e4e4e7', fontFamily: '"Inter", "Segoe UI", sans-serif' }}
                        >
                            {cleanContent ? <div className={isLinkTree ? 'w-full h-full' : ''} dangerouslySetInnerHTML={{__html: cleanContent}}></div> : <p className="italic opacity-50 text-center py-10">No additional text content provided.</p>}
                        </div>

                        {/* RESOURCE LINK */}
                        {!isLinkTree && safePdfUrl && (
                            <div className="mt-8 pt-8 border-t border-white/10">
                                <a href={safePdfUrl} target="_blank" rel="noreferrer" className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:scale-[1.01] group ${isWizard ? 'bg-emerald-900/20 border-emerald-500/30 hover:bg-emerald-900/30 hover:border-emerald-500' : 'bg-fuchsia-900/20 border-fuchsia-500/30 hover:bg-fuchsia-900/30 hover:border-fuchsia-500'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${isWizard ? 'bg-emerald-500/20 text-emerald-400' : 'bg-fuchsia-500/20 text-fuchsia-400'}`}>{isGoogleDrive ? <Share2 size={20}/> : <ExternalLink size={20}/>}</div>
                                        <div><div className={`font-bold text-sm ${isWizard ? 'text-emerald-100' : 'text-fuchsia-100'}`}>Attached Resource</div><div className="text-xs opacity-50 truncate max-w-[200px] sm:max-w-md">{safePdfUrl}</div></div>
                                    </div>
                                    <ArrowRight size={20} className={`transform transition-transform group-hover:translate-x-1 ${isWizard ? 'text-emerald-500' : 'text-fuchsia-500'}`} />
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {/* --- GLASS LAYER --- */}
                {isSmartLayerActive && (
                    <div 
                        className="absolute inset-0 z-30 cursor-crosshair bg-transparent"
                        onContextMenu={handleContextMenu}
                    ></div>
                )}

                {/* --- UNIVERSAL OVERLAYS --- */}

                {showRuler && (
                    <div 
                        ref={rulerRef}
                        className={`absolute left-0 right-0 h-8 pointer-events-none z-30 mix-blend-difference opacity-50
                            ${isWizard ? 'bg-emerald-500/30 border-y border-emerald-400' : 'bg-fuchsia-500/30 border-y border-fuchsia-400'}
                        `}
                        style={{ top: '50%' }}
                    ></div>
                )}

                {selectionRect && (
                    <div 
                        className="absolute border-2 border-dashed border-white/50 bg-transparent z-40 pointer-events-none"
                        style={{
                            left: selectionRect.x,
                            top: selectionRect.y,
                            width: selectionRect.w,
                            height: selectionRect.h,
                            backdropFilter: `invert(1) hue-rotate(180deg) brightness(${regionBrightness}%)`
                        }}
                    >
                        <div className="absolute -top-8 right-0 flex gap-1 pointer-events-auto">
                            <button onClick={(e) => { e.stopPropagation(); setSelectionRect(null); }} className="bg-red-500/80 p-1 rounded hover:bg-red-600 text-white">
                                <X size={12} />
                            </button>
                        </div>
                    </div>
                )}
                
                {isSelectionMode && dragStart && (
                    <div className="absolute inset-0 z-50 bg-transparent pointer-events-none">
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 px-3 py-1 rounded text-xs text-white">
                            Drag to select area for Dark Mode
                        </div>
                    </div>
                )}

                {/* --- CONTROL DOCK (Now Fixed Positioning to survive Fullscreen) --- */}
                {showControls && (
                    <div 
                        ref={controlsRef}
                        className={`fixed z-[9999] p-4 rounded-xl border backdrop-blur-xl shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 text-white
                            ${isWizard ? 'bg-black/95 border-emerald-500/50 shadow-emerald-900/50' : 'bg-black/95 border-fuchsia-500/50 shadow-fuchsia-900/50'}
                        `}
                        style={{ 
                            left: menuPos.x, 
                            top: menuPos.y, 
                            minWidth: '300px'
                        }}
                        onMouseDown={(e) => e.stopPropagation()} 
                    >
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest opacity-70 mb-1 border-b border-white/10 pb-2">
                            <span className="flex items-center gap-2"><SlidersHorizontal size={14}/> Smart Controls</span>
                            <div className="flex gap-2">
                                <button onClick={handleResetFilters} className="p-1 hover:bg-white/10 rounded text-red-400" title="Reset All">
                                    <RefreshCw size={14}/>
                                </button>
                                <button onClick={() => setShowControls(false)} className="p-1 hover:bg-white/10 rounded text-white" title="Close">
                                    <X size={14}/>
                                </button>
                            </div>
                        </div>

                        {/* Smart Layer Switch */}
                        <button 
                            onClick={() => setIsSmartLayerActive(!isSmartLayerActive)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold border transition-all
                                ${isSmartLayerActive 
                                    ? (isWizard ? 'bg-emerald-900/50 border-emerald-500 text-emerald-100' : 'bg-fuchsia-900/50 border-fuchsia-500 text-fuchsia-100')
                                    : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                                }
                            `}
                        >
                            <span className="flex items-center gap-2">
                                {isSmartLayerActive ? <Lock size={14}/> : <Unlock size={14}/>}
                                Iframe Interaction Lock
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${isSmartLayerActive ? 'bg-emerald-500 text-black' : 'bg-black/50 text-white'}`}>
                                {isSmartLayerActive ? 'ON' : 'OFF'}
                            </span>
                        </button>
                        <p className="text-[10px] opacity-40 -mt-2 px-1 text-zinc-400">
                            Turn ON to draw/right-click. Turn OFF to use native video controls.
                        </p>

                        <div className="h-px bg-white/10 my-1"></div>

                        {/* Feature Toggles */}
                        <div className="grid grid-cols-4 gap-2">
                            <button onClick={() => setFilter(f => f === 'invert' ? 'none' : 'invert')} className={`p-2 rounded flex flex-col items-center gap-1 text-[10px] ${filter === 'invert' ? 'bg-white text-black' : 'bg-white/5 hover:bg-white/10'}`}>
                                <Moon size={16}/> Dark
                            </button>
                            <button onClick={() => setFilter(f => f === 'sepia' ? 'none' : 'sepia')} className={`p-2 rounded flex flex-col items-center gap-1 text-[10px] ${filter === 'sepia' ? 'bg-amber-700 text-amber-100' : 'bg-white/5 hover:bg-white/10'}`}>
                                <Sun size={16}/> Sepia
                            </button>
                            <button onClick={() => setFilter(f => f === 'grayscale' ? 'none' : 'grayscale')} className={`p-2 rounded flex flex-col items-center gap-1 text-[10px] ${filter === 'grayscale' ? 'bg-zinc-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}>
                                <Droplet size={16}/> B&W
                            </button>
                            <button onClick={() => { setIsSelectionMode(true); setShowControls(false); }} className={`p-2 rounded flex flex-col items-center gap-1 text-[10px] bg-white/5 hover:bg-white/10 text-emerald-400`}>
                                <Scan size={16}/> Scan
                            </button>
                        </div>

                        {/* Sliders */}
                        <div className="space-y-3 pt-2">
                            <div>
                                <div className="flex justify-between text-[10px] mb-1 font-mono text-zinc-300">
                                    <span>Brightness</span>
                                    <span>{videoBrightness}%</span>
                                </div>
                                <input 
                                    type="range" min="30" max="200" 
                                    value={videoBrightness} 
                                    onChange={(e) => setVideoBrightness(Number(e.target.value))}
                                    className={`w-full h-1 rounded-lg appearance-none cursor-pointer ${isWizard ? 'bg-emerald-900/50 accent-emerald-500' : 'bg-fuchsia-900/50 accent-fuchsia-500'}`}
                                />
                            </div>
                            
                            <div>
                                <div className="flex justify-between text-[10px] mb-1 font-mono text-zinc-300">
                                    <span>Scale</span>
                                    <span>{zoomLevel}%</span>
                                </div>
                                <input 
                                    type="range" min="50" max="200" 
                                    value={zoomLevel} 
                                    onChange={(e) => setZoomLevel(Number(e.target.value))}
                                    className={`w-full h-1 rounded-lg appearance-none cursor-pointer ${isWizard ? 'bg-emerald-900/50 accent-emerald-500' : 'bg-fuchsia-900/50 accent-fuchsia-500'}`}
                                />
                            </div>

                            {selectionRect && (
                                <div className="animate-in fade-in slide-in-from-left-2 pt-2 border-t border-white/10">
                                    <div className="flex justify-between text-[10px] mb-1 font-mono text-emerald-400">
                                        <span>Dark Box Brightness</span>
                                        <span>{regionBrightness}%</span>
                                    </div>
                                    <input 
                                        type="range" min="50" max="200" 
                                        value={regionBrightness} 
                                        onChange={(e) => setRegionBrightness(Number(e.target.value))}
                                        className={`w-full h-1 rounded-lg appearance-none cursor-pointer ${isWizard ? 'bg-emerald-900/50 accent-emerald-500' : 'bg-fuchsia-900/50 accent-fuchsia-500'}`}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* --- RIGHT: NOTEBOOK SIDEBAR --- */}
            {showNotes && (
                <div className={`w-80 border-l flex flex-col shrink-0 transition-all animate-[fade-in-left_0.2s]
                    ${isWizard ? 'bg-[#050a05] border-emerald-900' : 'bg-[#09050f] border-fuchsia-900'}
                `}>
                    <div className={`p-4 border-b flex justify-between items-center ${isWizard ? 'border-emerald-900' : 'border-fuchsia-900'}`}>
                        <h4 className="font-bold flex items-center gap-2"><PenTool size={16}/> Study Notes</h4>
                        <div className="flex gap-1">
                            <button onClick={() => {}} className={`p-1.5 rounded hover:bg-white/10 ${isWizard ? 'text-emerald-400' : 'text-fuchsia-400'}`} title="Save">
                                <Save size={16}/>
                            </button>
                            <button onClick={() => setNotes('')} className="p-1.5 rounded hover:bg-red-900/30 text-red-400" title="Delete">
                                <Trash2 size={16}/>
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 p-4 relative">
                        <textarea 
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Type your observations here..."
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
                        Notes are saved locally to your device.
                    </div>
                </div>
            )}
        </div>
      </div>
  
      {/* Global Styles for Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in-left { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .safe-font { font-family: "Inter", system-ui, sans-serif !important; }
        .prose a { color: ${accentColor}; text-decoration: underline; text-underline-offset: 4px; }
        .prose blockquote { border-left: 4px solid ${accentColor}; padding-left: 1em; font-style: italic; opacity: 0.8; }
      `}} />
    </div>
  );
};

export default ItemViewer;