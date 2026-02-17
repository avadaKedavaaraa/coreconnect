import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom'; // ✨ NEW: The Teleportation Spell! ✨
import { Lineage, type CarouselItem } from '../types';
import {
    X, FileText, ExternalLink, Maximize2, Minimize2, ZoomIn, ZoomOut,
    RotateCw, Moon, Sun, StickyNote, Eye, Layers,
    Monitor, Smartphone, PenTool, Save, Trash2, AlignJustify, Loader2, Share2,
    CornerDownRight, Calendar, User, ArrowRight, AlertTriangle,
    Play, Pause, Scan, Sliders, Eraser, Video, RefreshCw, Droplet, Lock, Unlock, SlidersHorizontal,
    Settings, Type, Camera
} from 'lucide-react';
import DOMPurify from 'dompurify';
import OfficeViewer from './OfficeViewer'; 
import { trackActivity } from '../services/tracking';

interface ItemViewerProps {
    item: CarouselItem;
    lineage: Lineage;
    onClose: () => void;
}

type RenderEngine = 'native' | 'google';
type VideoPlayerMode = 'smart' | 'native';

const ItemViewer: React.FC<ItemViewerProps> = ({ item, lineage, onClose }) => {
    const isWizard = lineage === Lineage.WIZARD;

    // 🧹 HELPER: Strips away messy divs and keeps ONLY the iframe video!
    const extractCleanIframe = (html: string) => {
        if (!html) return "";
        const match = html.match(/<iframe.*?<\/iframe>/i);
        return match ? match[0] : html;
    };

    const enableSmartTools = true; 
    
    const isResourcesSector = item.sector === 'resources';
    const isLinkTree = item.type === 'link_tree';

    // --- STATE ---
    const [engine, setEngine] = useState<RenderEngine>(() => {
        const url = item.fileUrl || '';
        if (url.includes('sharepoint') || url.includes('localhost') || url.includes('127.0.0.1')) return 'native';
        return 'google';
    });

    const [videoPlayerMode, setVideoPlayerMode] = useState<VideoPlayerMode>(() => {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        if (isResourcesSector && isMobile) return 'native';
        const saved = localStorage.getItem('core_video_mode') as VideoPlayerMode;
        return saved || 'smart';
    });

    useEffect(() => {
        localStorage.setItem('core_video_mode', videoPlayerMode);
    }, [videoPlayerMode]);

    // ✨ NEW: Multi-Filter State Engine! (Mix and match!) 🧪
    const [filters, setFilters] = useState({
        dark: false,
        sepia: false,
        grayscale: false,
    });

    const toggleFilter = (key: keyof typeof filters) => {
        setFilters(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const [isFullScreen, setIsFullScreen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(100);
    const [rotation, setRotation] = useState(0);
    const [showRuler, setShowRuler] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [videoBrightness, setVideoBrightness] = useState(100);
    const [isSmartLayerActive, setIsSmartLayerActive] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
    const [selectionRect, setSelectionRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
    const [regionBrightness, setRegionBrightness] = useState(100);
    const [showControls, setShowControls] = useState(false);
    const [menuPos, setMenuPos] = useState({ x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 200 });
    const [showNotes, setShowNotes] = useState(false);
    const [notes, setNotes] = useState('');
    const [savedStatus, setSavedStatus] = useState('');

    const rulerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const controlsRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

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
                let actionType = 'VIEW_ITEM'; 
                const url = item.fileUrl?.toLowerCase() || '';
                
                if (url.endsWith('.pdf')) actionType = 'OPEN_PDF';
                else if (item.type === 'video' || url.match(/\.(mp4|mov|webm)$/)) actionType = 'WATCH_VIDEO';
                else if (item.type === 'link') actionType = 'CLICK_LINK';
                else if (url.includes('drive.google.com')) actionType = 'OPEN_DRIVE_FILE';

                trackActivity(profile.id, actionType, item.id, item.title, 0);
            }
        } catch (e) { console.error("Tracking failed", e); }
    }, [item.id]);

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

    // ✨ THE GOOGLE DRIVE AUTO-FORMATTER ✨
    let safePdfUrl = isValidUrl(item.fileUrl) ? item.fileUrl! : "";
    
    // If you pasted a raw Google Drive link, this instantly cleans it into a pure preview! 🧼
    if (safePdfUrl.includes('drive.google.com') && safePdfUrl.includes('/view')) {
        safePdfUrl = safePdfUrl.replace(/\/view.*$/, '/preview');
    }
    const isVideoFile = item.type === 'video' || (safePdfUrl && safePdfUrl.match(/\.(mp4|webm|ogg|mov)$/i));
    const isPdf = safePdfUrl.toLowerCase().endsWith('.pdf');

    const isOfficeFile = /\.(ppt|pptx|doc|docx|xls|xlsx|csv)$/i.test(safePdfUrl) ||
        (item.type === 'file' && !isPdf && !isVideoFile && !item.type.includes('image'));

    if (isOfficeFile) {
        return <OfficeViewer item={item} lineage={lineage} onClose={onClose} />;
    }

    const isGoogleDrive = safePdfUrl.includes('drive.google.com');
    const isMediaView = (item.type === 'file' || item.type === 'video' || item.type === 'link' || item.isLecture) && !!safePdfUrl;
    const isCloudViewer = isGoogleDrive || isPdf; 

    const isNativeMode = isVideoFile && isResourcesSector && videoPlayerMode === 'native';

    const togglePlay = () => {
        if (isNativeMode) return; 
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
            if (e.code === 'Space' && isVideoFile && !showNotes && !isNativeMode) {
                e.preventDefault();
                togglePlay();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, isVideoFile, showNotes, showControls, isNativeMode]);

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
        if (isNativeMode && !isSmartLayerActive && !isSelectionMode) return;
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

    useEffect(() => {
        if (!dragStart) return; 

        const handleWindowMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;

            setSelectionRect({
                x: Math.min(dragStart.x, currentX),
                y: Math.min(dragStart.y, currentY),
                w: Math.abs(currentX - dragStart.x),
                h: Math.abs(currentY - dragStart.y)
            });
        };

        const handleWindowUp = (e: MouseEvent) => {
            if (!containerRef.current) {
                setDragStart(null);
                return;
            }

            const rect = containerRef.current.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            const w = Math.abs(currentX - dragStart.x);
            const h = Math.abs(currentY - dragStart.y);

            if (w < 10 || h < 10) {
                setSelectionRect(null);
            } else {
                setTimeout(() => setShowControls(true), 100);
                setIsSelectionMode(false);
            }

            setDragStart(null);
        };

        window.addEventListener('mousemove', handleWindowMove);
        window.addEventListener('mouseup', handleWindowUp);

        return () => {
            window.removeEventListener('mousemove', handleWindowMove);
            window.removeEventListener('mouseup', handleWindowUp);
        };
    }, [dragStart]);

    const handleRulerMove = (e: React.MouseEvent) => {
        if (showRuler && rulerRef.current && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            rulerRef.current.style.top = `${e.clientY - rect.top}px`;
        }
    };

    // ✨ NEW: Multi-Filter Combiner
    const getFilterStyle = () => {
        let f = '';
        if (filters.dark) f += 'invert(1) hue-rotate(180deg) ';
        if (filters.sepia) f += 'sepia(0.8) contrast(1.2) ';
        if (filters.grayscale) f += 'grayscale(1) ';
        if (videoBrightness !== 100) f += `brightness(${videoBrightness}%) `;
        return f;
    };

    const handleResetFilters = (e: React.MouseEvent) => {
        e.stopPropagation();
        setVideoBrightness(100);
        setFilters({ dark: false, sepia: false, grayscale: false });
        setZoomLevel(100);
        setSelectionRect(null);
        setRotation(0);
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

    const rawContent = item.content || '';
    const contentToRender = isLinkTree ? extractCleanIframe(rawContent) : rawContent;

    const cleanContent = DOMPurify.sanitize(contentToRender, {
        ADD_TAGS: ['style', 'iframe', 'img', 'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'div', 'span', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'hr', 'button', 'input', 'label', 'form', 'audio', 'video', 'source', 'track', 'center'],
        ADD_ATTR: ['target', 'href', 'src', 'frameborder', 'allow', 'allowfullscreen', 'style', 'class', 'id', 'width', 'height', 'align', 'controls', 'autoplay', 'loop', 'muted', 'poster', 'type', 'name', 'referrerpolicy', 'loading']
    });

    // ✨✨✨ THE TELEPORTATION MAGIC ✨✨✨
    // createPortal forces this code to render OUTSIDE of all other elements, directly on the body!
    const viewerContent = (
        <div className={`fixed top-0 left-0 right-0 bottom-0 z-[2147483647] flex items-center justify-center p-0 sm:p-4 animate-[fade-in_0.2s_ease-out]
        ${isFullScreen || isNativeMode ? 'bg-black' : 'bg-black/90 backdrop-blur-xl'}
    `}>
            <div
                className={`flex flex-col relative transition-all duration-300 group
          ${isWizard ? 'border-emerald-600 bg-[#0a0f0a]' : 'border-fuchsia-600 bg-[#0f0a15]'}
          ${isFullScreen || isNativeMode
                        ? 'w-full h-full rounded-none border-0'
                        : 'w-full max-w-7xl h-[100dvh] sm:h-[90vh] rounded-xl border shadow-2xl overflow-hidden'}
        `}
            >
                {!isNativeMode && (
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
                                {isMediaView && (
                                    <div className="flex gap-2 text-[10px] mt-0.5">
                                        {!isGoogleDrive && (
                                            <button onClick={() => { setEngine('native'); setIsLoading(true); setLoadError(false); }} className={`flex items-center gap-1 hover:underline ${engine === 'native' ? 'opacity-100 font-bold' : 'opacity-50'}`}>
                                                <Monitor size={10} /> Native
                                            </button>
                                        )}
                                        {!isGoogleDrive && <span className="opacity-30">|</span>}
                                        <button onClick={() => { setEngine('google'); setIsLoading(true); setLoadError(false); }} className={`flex items-center gap-1 hover:underline ${engine === 'google' || isGoogleDrive ? 'opacity-100 font-bold' : 'opacity-50'}`}>
                                            <Smartphone size={10} /> Cloud
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
                            {isVideoFile && isResourcesSector && (
                                <div className="flex items-center bg-black/20 rounded p-1 mr-2 border border-white/5">
                                    <button
                                        onClick={() => setVideoPlayerMode('smart')}
                                        className={`p-1.5 rounded transition-all ${videoPlayerMode === 'smart' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
                                        title="Smart Player"
                                    >
                                        <Layers size={14} />
                                    </button>
                                    <button
                                        onClick={() => setVideoPlayerMode('native')}
                                        className={`p-1.5 rounded transition-all ${videoPlayerMode === 'native' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
                                        title="Normal Player"
                                    >
                                        <Monitor size={14} />
                                    </button>
                                </div>
                            )}
                            {item.fileUrl && (
                                <button
                                    onClick={() => window.open(item.fileUrl, '_blank')}
                                    className="p-2 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors flex items-center gap-2"
                                    title="Open Source in New Tab"
                                >
                                    <ExternalLink size={18} />
                                    <span className="text-xs font-bold hidden md:block">Open</span>
                                </button>
                            )}
                            <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>
                            
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
                                <button onClick={() => setZoomLevel(z => Math.max(50, z - 10))} className="p-1.5 hover:bg-white/10 rounded text-white/70" title="Zoom Out"><ZoomOut size={16} /></button>
                                <span className="text-[10px] font-mono w-8 text-center hidden sm:block">{zoomLevel}%</span>
                                <button onClick={() => setZoomLevel(z => Math.min(200, z + 10))} className="p-1.5 hover:bg-white/10 rounded text-white/70" title="Zoom In"><ZoomIn size={16} /></button>
                            </div>
                            <button onClick={() => setShowRuler(!showRuler)} className={`p-2 hover:bg-white/10 rounded transition-colors ${showRuler ? (isWizard ? 'text-emerald-400 bg-emerald-900/30' : 'text-fuchsia-400 bg-fuchsia-900/30') : 'text-white/70'}`} title="Reading Ruler">
                                <AlignJustify size={18} />
                            </button>
                            <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>
                            <button onClick={() => setShowNotes(!showNotes)} className={`p-2 rounded transition-colors flex items-center gap-2 ${showNotes ? (isWizard ? 'bg-emerald-600 text-black' : 'bg-fuchsia-600 text-black') : 'hover:bg-white/10 text-white/70'}`}>
                                <StickyNote size={18} />
                                <span className="text-xs font-bold hidden md:block">Notes</span>
                            </button>
                            <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>
                            <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-2 hover:bg-white/10 rounded text-white/70 hidden sm:block" title="App Fullscreen">
                                {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-red-500/20 rounded text-white/70 hover:text-red-400 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {isNativeMode && (
                    <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between pointer-events-none">
                        <button
                            onClick={onClose}
                            className="pointer-events-auto p-2 bg-black/50 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md"
                            title="Close Viewer"
                        >
                            <X size={20} />
                        </button>
                        <button
                            onClick={() => setShowControls(true)}
                            className="control-trigger pointer-events-auto p-2 bg-black/50 hover:bg-white/20 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md"
                            title="Open Settings"
                        >
                            <Settings size={20} />
                        </button>
                    </div>
                )}

                <div className="flex flex-1 overflow-hidden relative">
                    <div
                        ref={containerRef}
                        className="flex-1 bg-zinc-900 relative w-full h-full overflow-hidden flex flex-col"
                        onContextMenu={handleContextMenu}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleRulerMove}
                    >
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
                                                className="w-full h-full object-cover shadow-2xl"
                                                onLoadStart={() => setIsLoading(true)}
                                                onLoadedData={() => setIsLoading(false)}
                                                onError={() => setLoadError(true)}
                                                onPlay={handleVideoStateChange}
                                                onPause={handleVideoStateChange}
                                                style={{
                                                    filter: getFilterStyle(),
                                                    cursor: isSmartLayerActive ? 'crosshair' : (isNativeMode ? 'default' : 'pointer')
                                                }}
                                                controls={isNativeMode}
                                            />
                                        ) : (
                                            /* ✨ THE ULTIMATE PRO VIEWER: Dimmer + Tinted Glass ✨ */
                                            <div className="w-full h-full p-2 sm:p-6 flex items-center justify-center">
                                                <div className="relative w-full h-full max-w-5xl rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 bg-black">
                                                    
                                                    {/* 🎛️ LAYER 1: The Dimmer Switch */}
                                                    {videoBrightness < 100 && (
                                                        <div 
                                                            className="absolute inset-0 pointer-events-none z-20 transition-opacity duration-200"
                                                            style={{ backgroundColor: `rgba(0,0,0, ${1 - (videoBrightness / 100)})` }}
                                                        />
                                                    )}

                                                    {/* 🌙 LAYER 2: The Custom Dark Mode Tint */}
                                                    {filters.dark && isCloudViewer && (
                                                        <div 
                                                            className="absolute inset-0 pointer-events-none z-20 mix-blend-multiply transition-all duration-300"
                                                            style={{ backgroundColor: isWizard ? 'rgba(6, 78, 59, 0.5)' : 'rgba(74, 4, 78, 0.5)' }} 
                                                        />
                                                    )}

                                                    {/* 📄 LAYER 3: The PDF Itself! (It now actually applies the inverted CSS properly!) */}
                                                    <div 
                                                        className="w-full h-full" 
                                                        style={{ 
                                                            filter: getFilterStyle(),
                                                            cursor: isSmartLayerActive ? 'crosshair' : 'default' 
                                                        }}
                                                    >
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

                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div
                                className={`flex-1 relative 
                            ${isLinkTree
                                        ? 'p-0 overflow-hidden flex flex-col items-center justify-center' 
                                        : `overflow-y-auto p-6 md:p-10 space-y-8 ${isWizard ? 'scrollbar-wizard' : 'scrollbar-muggle'}`
                                    }
                        `}
                                style={{ filter: getFilterStyle() }}
                            >
                                {!isLinkTree && (
                                    <h2 className="text-2xl md:text-3xl font-bold leading-tight break-words mb-6" style={titleStyle}>{item.title}</h2>
                                )}
                                <div
                                    className={isLinkTree ? "w-full h-full flex items-center justify-center [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:border-none" : `prose prose-invert max-w-none safe-font text-lg leading-relaxed html-content ${isWizard ? 'prose-emerald' : 'prose-fuchsia'}`}
                                    style={{ color: customStyle.contentColor || '#e4e4e7' }}
                                >
                                    {cleanContent ? <div className={isLinkTree ? 'w-full h-full' : ''} dangerouslySetInnerHTML={{ __html: cleanContent }}></div> : <p className="italic opacity-50 text-center py-10">No additional text content provided.</p>}
                                </div>
                            </div>
                        )}

                        {isSmartLayerActive && (
                            <div
                                className="absolute inset-0 z-30 cursor-crosshair bg-transparent"
                                onContextMenu={handleContextMenu}
                            ></div>
                        )}

                        {showRuler && (
                            <div ref={rulerRef} className={`absolute left-0 right-0 h-8 pointer-events-none z-30 mix-blend-difference opacity-50 ${isWizard ? 'bg-emerald-500/30 border-y border-emerald-400' : 'bg-fuchsia-500/30 border-y border-fuchsia-400'}`} style={{ top: '50%' }}></div>
                        )}
                        {selectionRect && (
                            <div className="absolute border-2 border-dashed border-white/50 bg-transparent z-40 pointer-events-none" style={{ left: selectionRect.x, top: selectionRect.y, width: selectionRect.w, height: selectionRect.h, backdropFilter: `invert(1) hue-rotate(180deg) brightness(${regionBrightness}%)` }}>
                                <div className="absolute -top-8 right-0 flex gap-1 pointer-events-auto">
                                    <button onClick={(e) => { e.stopPropagation(); setSelectionRect(null); }} className="bg-red-500/80 p-1 rounded hover:bg-red-600 text-white"><X size={12} /></button>
                                </div>
                            </div>
                        )}
                        {isSelectionMode && dragStart && (
                            <div className="absolute inset-0 z-50 bg-transparent pointer-events-none">
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 px-3 py-1 rounded text-xs text-white">Drag to select area for Dark Mode</div>
                            </div>
                        )}

                        {showControls && (
                            <div
                                ref={controlsRef}
                                className={`fixed z-[2147483647] p-4 rounded-xl border backdrop-blur-xl shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 text-white
                            ${isWizard ? 'bg-black/95 border-emerald-500/50 shadow-emerald-900/50' : 'bg-black/95 border-fuchsia-500/50 shadow-fuchsia-900/50'}
                        `}
                                style={{ left: menuPos.x, top: menuPos.y, minWidth: '320px' }}
                                onMouseDown={(e) => e.stopPropagation()}
                                onMouseUp={(e) => e.stopPropagation()} 
                            >
                                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest opacity-70 mb-1 border-b border-white/10 pb-2">
                                    <span className="flex items-center gap-2"><SlidersHorizontal size={14} /> Smart Controls</span>
                                    <div className="flex gap-2">
                                        <button onClick={handleResetFilters} className="p-1 hover:bg-white/10 rounded text-red-400" title="Reset All"><RefreshCw size={14} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); setShowControls(false); }} className="p-1 hover:bg-white/10 rounded text-white" title="Close"><X size={14} /></button>
                                    </div>
                                </div>

                                <button onClick={() => setIsSmartLayerActive(!isSmartLayerActive)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold border transition-all ${isSmartLayerActive ? (isWizard ? 'bg-emerald-900/50 border-emerald-500 text-emerald-100' : 'bg-fuchsia-900/50 border-fuchsia-500 text-fuchsia-100') : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}>
                                    <span className="flex items-center gap-2">{isSmartLayerActive ? <Lock size={14} /> : <Unlock size={14} />} Iframe Interaction Lock</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isSmartLayerActive ? 'bg-emerald-500 text-black' : 'bg-black/50 text-white'}`}>{isSmartLayerActive ? 'ON' : 'OFF'}</span>
                                </button>
                                <p className="text-[10px] opacity-40 -mt-2 px-1 text-zinc-400">Turn ON to right-click/draw. Turn OFF for native controls.</p>
                                <div className="h-px bg-white/10 my-1"></div>

                                {isVideoFile && isResourcesSector && (
                                    <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                                        <label className="text-[10px] font-bold uppercase opacity-70 mb-2 block flex items-center gap-2"><Video size={12} /> Video Player Mode</label>
                                        <div className="flex bg-black/50 rounded-lg p-1">
                                            <button onClick={() => setVideoPlayerMode('smart')} className={`flex-1 py-1.5 text-[10px] rounded flex items-center justify-center gap-1 transition-all ${videoPlayerMode === 'smart' ? (isWizard ? 'bg-emerald-600 text-white' : 'bg-fuchsia-600 text-white') : 'text-white/50 hover:text-white'}`}><Layers size={12} /> Smart</button>
                                            <button onClick={() => setVideoPlayerMode('native')} className={`flex-1 py-1.5 text-[10px] rounded flex items-center justify-center gap-1 transition-all ${videoPlayerMode === 'native' ? (isWizard ? 'bg-emerald-600 text-white' : 'bg-fuchsia-600 text-white') : 'text-white/50 hover:text-white'}`}><Monitor size={12} /> Normal</button>
                                        </div>
                                    </div>
                                )}
                                <div className="h-px bg-white/10 my-1"></div>

                                {/* ✨ NEW: Multi-select Buttons! ✨ */}
                                <div className="grid grid-cols-4 gap-2">
                                    <button onClick={() => toggleFilter('dark')} className={`p-2 rounded flex flex-col items-center gap-1 text-[10px] ${filters.dark ? 'bg-white text-black' : 'bg-white/5 hover:bg-white/10'}`}><Moon size={16} /> Dark</button>
                                    <button onClick={() => toggleFilter('sepia')} className={`p-2 rounded flex flex-col items-center gap-1 text-[10px] ${filters.sepia ? 'bg-amber-700 text-amber-100' : 'bg-white/5 hover:bg-white/10'}`}><Sun size={16} /> Sepia</button>
                                    <button onClick={() => toggleFilter('grayscale')} className={`p-2 rounded flex flex-col items-center gap-1 text-[10px] ${filters.grayscale ? 'bg-zinc-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}><Droplet size={16} /> B&W</button>
                                    <button onClick={() => { setIsSelectionMode(true); setShowControls(false); }} className={`p-2 rounded flex flex-col items-center gap-1 text-[10px] bg-white/5 hover:bg-white/10 text-emerald-400`}><Scan size={16} /> Scan</button>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <div><div className="flex justify-between text-[10px] mb-1 font-mono text-zinc-300"><span>Brightness</span><span>{videoBrightness}%</span></div><input type="range" min="30" max="200" value={videoBrightness} onChange={(e) => setVideoBrightness(Number(e.target.value))} className={`w-full h-1 rounded-lg appearance-none cursor-pointer ${isWizard ? 'bg-emerald-900/50 accent-emerald-500' : 'bg-fuchsia-900/50 accent-fuchsia-500'}`} /></div>
                                    <div><div className="flex justify-between text-[10px] mb-1 font-mono text-zinc-300"><span>Scale</span><span>{zoomLevel}%</span></div><input type="range" min="50" max="200" value={zoomLevel} onChange={(e) => setZoomLevel(Number(e.target.value))} className={`w-full h-1 rounded-lg appearance-none cursor-pointer ${isWizard ? 'bg-emerald-900/50 accent-emerald-500' : 'bg-fuchsia-900/50 accent-fuchsia-500'}`} /></div>
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

                    {showNotes && !isNativeMode && (
                        <div className={`w-80 border-l flex flex-col shrink-0 transition-all animate-[fade-in-left_0.2s]
                    ${isWizard ? 'bg-[#050a05] border-emerald-900' : 'bg-[#09050f] border-fuchsia-900'}
                `}>
                            <div className={`p-4 border-b flex justify-between items-center ${isWizard ? 'border-emerald-900' : 'border-fuchsia-900'}`}>
                                <h4 className="font-bold flex items-center gap-2"><PenTool size={16} /> Study Notes</h4>
                                <div className="flex gap-1">
                                    <button onClick={() => { }} className={`p-1.5 rounded hover:bg-white/10 ${isWizard ? 'text-emerald-400' : 'text-fuchsia-400'}`} title="Save">
                                        <Save size={16} />
                                    </button>
                                    <button onClick={() => setNotes('')} className="p-1.5 rounded hover:bg-red-900/30 text-red-400" title="Delete">
                                        <Trash2 size={16} />
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

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes fade-in-left { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .safe-font { font-family: "Inter", system-ui, sans-serif !important; }
        .prose a { color: ${accentColor}; text-decoration: underline; text-underline-offset: 4px; }
        .prose blockquote { border-left: 4px solid ${accentColor}; padding-left: 1em; font-style: italic; opacity: 0.8; }
      `}} />
        </div>
    );

    // ✨ THIS IS THE TELEPORTER! 
    return createPortal(viewerContent, document.body);
};

export default ItemViewer;