import React, { useEffect, useRef, useState } from 'react';
import { Lineage, type CarouselItem } from '../types';
import { 
  X, FileText, ExternalLink, Maximize2, Minimize2, ZoomIn, ZoomOut, 
  RotateCw, Moon, Sun, StickyNote, Eye, EyeOff, Layers, 
  Monitor, Smartphone, PenTool, Save, Trash2, AlignJustify, Loader2, Share2, CornerDownRight, Calendar, User, Tag, ArrowRight, AlertTriangle
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
  
  // --- STATE ---
  // Default to Google (Cloud) for stability, unless it's a local dev file
  const [engine, setEngine] = useState<RenderEngine>(() => {
      const url = item.fileUrl || '';
      if (url.includes('localhost') || url.includes('127.0.0.1')) return 'native';
      return 'google';
  });

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [filter, setFilter] = useState<VisualFilter>('none');
  const [showRuler, setShowRuler] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false); // New Error State
  
  // Notebook State
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [savedStatus, setSavedStatus] = useState('');

  // Refs
  const rulerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // --- INIT & TRACKING ---
  useEffect(() => {
    setIsLoading(true);
    setLoadError(false);
    
    // Auto-switch engine based on URL type
    if (item.fileUrl) {
        const url = item.fileUrl;
        const isDrive = url.includes('drive.google.com');
        const isLocal = url.includes('localhost');
        
        // Force Google Engine for Drive & External PDFs (Fixes CORS issues)
        if (isDrive || (!isLocal && !item.fileUrl.endsWith('.pdf'))) { 
            setEngine('google'); 
        } else if (isLocal) {
            setEngine('native');
        }
    }

    // Load saved notes
    const saved = localStorage.getItem(`core_notes_${item.id}`);
    if (saved) setNotes(saved);

    // TRACKING ACTIVITY
    try {
        const profile = JSON.parse(localStorage.getItem('core_connect_profile') || '{}');
        if (profile.id) {
            trackActivity(profile.id, 'VIEW_ITEM', item.id, item.title, 0);
        }
    } catch(e) {}

  }, [item.id]);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Prevent background scrolling
  useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
  }, []);

  // --- HANDLERS ---
  
  const isValidUrl = (url?: string) => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (e) { return false; }
  };

  const safePdfUrl = isValidUrl(item.fileUrl) ? item.fileUrl! : "";
  const isVideo = item.type === 'video' || (safePdfUrl && safePdfUrl.match(/\.(mp4|webm|ogg|mov)$/i));
  const isGoogleDrive = safePdfUrl.includes('drive.google.com');
  const isMediaView = (item.type === 'file' || item.type === 'video' || item.type === 'link') && !!safePdfUrl;
  
  // Robust Embed URL Generator
  const getEmbedUrl = (url: string, engineType: RenderEngine) => {
      if (!url) return '';

      // 1. Handle Google Drive Links
      if (url.includes('drive.google.com')) {
          let id = '';
          const parts = url.split('/');
          const dIndex = parts.indexOf('d');
          if (dIndex !== -1 && parts[dIndex + 1]) {
              id = parts[dIndex + 1].split(/[?&]/)[0]; 
          }
          if (!id) {
             try {
                 const urlObj = new URL(url);
                 id = urlObj.searchParams.get('id') || '';
             } catch(e) {}
          }
          if (id) return `https://drive.google.com/file/d/${id}/preview`;
          return url.replace(/\/view.*$/, '/preview').replace(/\/edit.*$/, '/preview');
      }
      
      // 2. Handle Standard PDFs via Google Viewer (Bypasses CORS)
      if (engineType === 'google') {
          return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
      }
      
      // 3. Native (Direct Link)
      return url;
  };

  const currentSrc = getEmbedUrl(safePdfUrl, engine);

  // Note Saving
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
        className={`flex rounded-xl border shadow-2xl overflow-hidden relative transition-all duration-300
          ${isWizard ? 'border-emerald-600 bg-[#0a0f0a]' : 'border-fuchsia-600 bg-[#0f0a15]'}
          ${isFullScreen ? 'w-full h-full rounded-none border-0' : 'w-full max-w-7xl h-[100dvh] sm:h-[90vh]'}
        `}
      >
        
        {/* --- LEFT: MAIN VIEWER --- */}
        <div className="flex-1 flex flex-col relative min-w-0">
            
            {/* Toolbar */}
            <div className={`p-2 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 z-30 relative
                ${isWizard ? 'border-emerald-900 bg-emerald-950/80' : 'border-fuchsia-900 bg-fuchsia-950/80'}
            `}>
                
                {/* Title & Engine Switch */}
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
                                    <button 
                                        onClick={() => { setEngine('native'); setIsLoading(true); setLoadError(false); }} 
                                        className={`flex items-center gap-1 hover:underline ${engine === 'native' ? 'opacity-100 font-bold' : 'opacity-50'}`}
                                        title="Use built-in browser viewer (Fast, but blocky)"
                                    >
                                        <Monitor size={10}/> Native
                                    </button>
                                )}
                                {!isGoogleDrive && <span className="opacity-30">|</span>}
                                <button 
                                    onClick={() => { setEngine('google'); setIsLoading(true); setLoadError(false); }} 
                                    className={`flex items-center gap-1 hover:underline ${engine === 'google' || isGoogleDrive ? 'opacity-100 font-bold' : 'opacity-50'}`}
                                    title="Use Cloud Viewer (Compatible, but slower)"
                                >
                                    <Smartphone size={10}/> Cloud
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Controls */}
                <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
                    
                    {/* View Controls Group */}
                    {isMediaView && (
                        <>
                            <div className="flex items-center bg-black/20 rounded p-1">
                                <button onClick={() => setZoomLevel(z => Math.max(50, z - 10))} className="p-1.5 hover:bg-white/10 rounded text-white/70" title="Zoom Out"><ZoomOut size={16}/></button>
                                <span className="text-[10px] font-mono w-8 text-center hidden sm:block">{zoomLevel}%</span>
                                <button onClick={() => setZoomLevel(z => Math.min(200, z + 10))} className="p-1.5 hover:bg-white/10 rounded text-white/70" title="Zoom In"><ZoomIn size={16}/></button>
                            </div>

                            <button onClick={() => setRotation(r => (r + 90) % 360)} className="p-2 hover:bg-white/10 rounded text-white/70" title="Rotate"><RotateCw size={18}/></button>
                            
                            <div className="flex items-center bg-black/20 rounded p-1">
                                <button onClick={() => setFilter(f => f === 'invert' ? 'none' : 'invert')} className={`p-1.5 rounded ${filter === 'invert' ? 'bg-white text-black' : 'text-white/70'}`} title="Dark Mode"><Moon size={16}/></button>
                                <button onClick={() => setFilter(f => f === 'sepia' ? 'none' : 'sepia')} className={`p-1.5 rounded ${filter === 'sepia' ? 'bg-amber-700 text-amber-100' : 'text-white/70'}`} title="Sepia Mode"><Sun size={16}/></button>
                                <button onClick={() => setFilter(f => f === 'contrast' ? 'none' : 'contrast')} className={`p-1.5 rounded ${filter === 'contrast' ? 'bg-white text-black' : 'text-white/70'}`} title="High Contrast"><Eye size={16}/></button>
                            </div>

                            <button 
                                onClick={() => setShowRuler(!showRuler)} 
                                className={`p-2 hover:bg-white/10 rounded transition-colors ${showRuler ? (isWizard ? 'text-emerald-400 bg-emerald-900/30' : 'text-fuchsia-400 bg-fuchsia-900/30') : 'text-white/70'}`} 
                                title="Toggle Reading Ruler"
                            >
                                <AlignJustify size={18}/>
                            </button>

                            <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>
                        </>
                    )}

                    {/* Sidebar Toggle */}
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

                    <button onClick={onClose} className="p-2 hover:bg-red-500/20 rounded text-white/70 hover:text-red-400">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Document Container */}
            <div 
                ref={containerRef}
                className="flex-1 bg-zinc-900 relative w-full overflow-hidden flex flex-col"
                onMouseMove={handleMouseMove}
            >
                {isMediaView ? (
                    <>
                        {/* LOADING OVERLAY */}
                        {isLoading && !loadError && (
                            <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300`}>
                                <Loader2 className={`w-12 h-12 mb-4 animate-spin ${isWizard ? 'text-emerald-500' : 'text-fuchsia-500'}`} />
                                <div className={`text-sm font-bold tracking-widest animate-pulse ${isWizard ? 'text-emerald-200' : 'text-fuchsia-200'}`}>
                                    {isWizard ? 'SUMMONING SCROLL...' : 'DECRYPTING STREAM...'}
                                </div>
                            </div>
                        )}

                        {/* ERROR OVERLAY */}
                        {loadError && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 p-6 text-center">
                                <AlertTriangle size={48} className="text-yellow-500 mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">Display Error</h3>
                                <p className="text-zinc-400 text-sm mb-6 max-w-md">
                                    The embedded viewer could not load this file. This usually happens with secure files or strict browser privacy settings.
                                </p>
                                <a 
                                    href={safePdfUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className={`px-6 py-3 rounded-full font-bold flex items-center gap-2 ${isWizard ? 'bg-emerald-600 text-black hover:bg-emerald-500' : 'bg-fuchsia-600 text-black hover:bg-fuchsia-500'}`}
                                >
                                    <ExternalLink size={18} /> OPEN FILE EXTERNALLY
                                </a>
                                {engine === 'native' && (
                                     <button 
                                        onClick={() => { setEngine('google'); setLoadError(false); setIsLoading(true); }}
                                        className="mt-4 text-xs text-white/50 hover:text-white underline"
                                     >
                                         Try switching to Cloud Viewer
                                     </button>
                                )}
                            </div>
                        )}

                        {/* Viewer Area */}
                        {!loadError && (
                            <div 
                                className="w-full h-full transition-all duration-300 origin-center relative z-10 flex-1"
                                style={{ 
                                    transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                                    filter: getFilterStyle()
                                }}
                            >
                                {isVideo ? (
                                    <div className="flex-1 bg-black flex items-center justify-center p-4 w-full h-full">
                                        <video src={safePdfUrl} controls className="max-w-full max-h-full rounded shadow-lg w-full" onLoadStart={() => setIsLoading(true)} onLoadedData={() => setIsLoading(false)} onError={() => setLoadError(true)} />
                                    </div>
                                ) : (engine === 'native' && !isGoogleDrive) ? (
                                    <object
                                        data={currentSrc}
                                        type="application/pdf"
                                        className="w-full h-full"
                                        onLoad={() => setIsLoading(false)}
                                        onError={() => {
                                            // Fallback to Google if Native fails
                                            console.warn("Native load failed, switching to Google");
                                            setEngine('google');
                                        }}
                                    >
                                        <iframe 
                                            src={getEmbedUrl(safePdfUrl, 'google')} 
                                            className="w-full h-full border-0"
                                            title="PDF Viewer Fallback"
                                            onLoad={() => setIsLoading(false)}
                                            onError={() => setLoadError(true)}
                                        />
                                    </object>
                                ) : (
                                    <iframe 
                                        src={currentSrc} 
                                        className="w-full h-full border-0 bg-white"
                                        title="Cloud Viewer"
                                        allow="autoplay" 
                                        onLoad={() => setIsLoading(false)}
                                        onError={() => setLoadError(true)}
                                    />
                                )}
                            </div>
                        )}

                        {/* Reading Ruler */}
                        {showRuler && (
                            <div 
                                ref={rulerRef}
                                className={`absolute left-0 right-0 h-8 pointer-events-none z-30 mix-blend-difference opacity-50
                                    ${isWizard ? 'bg-emerald-500/30 border-y border-emerald-400' : 'bg-fuchsia-500/30 border-y border-fuchsia-400'}
                                `}
                                style={{ top: '50%' }}
                            ></div>
                        )}
                    </>
                ) : (
                    // TEXT-ONLY MODE
                    <div className={`flex-1 overflow-y-auto p-6 md:p-10 space-y-8 relative ${isWizard ? 'scrollbar-wizard' : 'scrollbar-muggle'}`}>
                        <div className="flex flex-wrap items-center gap-2 mb-3 text-[10px] uppercase tracking-widest font-bold opacity-70">
                            <span className={`px-2 py-1 rounded border flex items-center gap-1 ${isWizard ? 'border-emerald-800 text-emerald-400' : 'border-fuchsia-800 text-fuchsia-400'}`}><CornerDownRight size={10} /> {item.sector || 'ARCHIVE'}</span>
                            <span className="flex items-center gap-1"><Calendar size={10}/> {item.date}</span>
                            <span className="flex items-center gap-1"><User size={10}/> {item.author || 'SYSTEM'}</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold leading-tight break-words mb-6" style={titleStyle}>{item.title}</h2>

                        {item.image && <div className="rounded-xl overflow-hidden shadow-2xl border border-white/10 relative group"><img src={item.image} alt={item.title} className="w-full h-auto max-h-[500px] object-cover" /></div>}
                        
                        <div ref={contentRef} className={`prose prose-invert max-w-none safe-font text-lg leading-relaxed html-content ${isWizard ? 'prose-emerald selection:bg-emerald-900/50' : 'prose-fuchsia selection:bg-fuchsia-900/50'}`} style={{ color: customStyle.contentColor || '#e4e4e7', fontFamily: '"Inter", "Segoe UI", sans-serif' }}>
                            {cleanContent ? <div dangerouslySetInnerHTML={{__html: cleanContent}}></div> : <p className="italic opacity-50 text-center py-10">No additional text content provided.</p>}
                        </div>
                        
                        {safePdfUrl && (
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
            </div>
        </div>

        {/* --- RIGHT: NOTEBOOK SIDEBAR --- */}
        {showNotes && (
            <div className={`w-80 border-l flex flex-col shrink-0 transition-all animate-[fade-in-left_0.2s]
                ${isWizard ? 'bg-[#050a05] border-emerald-900' : 'bg-[#09050f] border-fuchsia-900'}
            `}>
                <div className={`p-4 border-b flex justify-between items-center ${isWizard ? 'border-emerald-900' : 'border-fuchsia-900'}`}>
                    <h4 className="font-bold flex items-center gap-2"><PenTool size={16}/> Study Notes</h4>
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
      
      {/* Global Styles for Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in-left { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .safe-font { font-family: "Inter", system-ui, sans-serif !important; }
        .prose a { color: ${accentColor}; text-decoration: underline; text-underline-offset: 4px; }
        .prose a:hover { opacity: 0.8; }
        .prose blockquote { border-left: 4px solid ${accentColor}; padding-left: 1em; font-style: italic; opacity: 0.8; }
        .prose code { background: rgba(255,255,255,0.1); padding: 0.2em 0.4em; rounded: 4px; font-family: monospace; }
        .prose pre { background: #000; padding: 1em; rounded: 8px; overflow-x: auto; }
        .html-content p { margin-bottom: 0.75em; min-height: 1em; }
        .html-content ul { list-style: disc outside; margin-left: 1.5em; margin-bottom: 0.75em; }
        .html-content ol { list-style: decimal outside; margin-left: 1.5em; margin-bottom: 0.75em; }
        .html-content li { margin-bottom: 0.25em; }
      `}} />
    </div>
  );
};

export default ItemViewer;