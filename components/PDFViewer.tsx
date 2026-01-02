
import React, { useState } from 'react';
import { Lineage, type CarouselItem } from '../types';
import { X, FileText, Download, ExternalLink, Maximize2, Minimize2, ZoomIn, ZoomOut, Eye } from 'lucide-react';

interface PDFViewerProps {
  item: CarouselItem;
  lineage: Lineage;
  onClose: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ item, lineage, onClose }) => {
  const isWizard = lineage === Lineage.WIZARD;
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  // --- SECURITY: Protocol Sanitization ---
  const isValidUrl = (url?: string) => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (e) {
      return false;
    }
  };

  const safePdfUrl = isValidUrl(item.fileUrl) ? item.fileUrl! : "https://pdfobject.com/pdf/sample.pdf";
  
  // Note: Google Viewer doesn't support programmatic zoom via URL params easily without refresh, 
  // so zoom is handled by CSS scaling the container or iframe for visual aid.
  const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(safePdfUrl)}&embedded=true`;

  return (
    <div className={`fixed z-[60] flex items-center justify-center p-4 animate-[fade-in_0.2s_ease-out]
        ${isFullScreen ? 'inset-0 bg-black' : 'inset-0 bg-black/90 backdrop-blur-md'}
    `}>
      <div 
        className={`flex flex-col rounded-xl border shadow-2xl overflow-hidden relative transition-all duration-300
          ${isWizard ? 'border-emerald-600 bg-[#0a0f0a]' : 'border-fuchsia-600 bg-[#0f0a15]'}
          ${isFullScreen ? 'w-full h-full rounded-none border-0' : 'w-full max-w-6xl h-[90vh]'}
          ${highContrast ? 'grayscale contrast-125 brightness-110' : ''}
        `}
      >
        {/* Header / Toolbar */}
        <div className={`flex items-center justify-between p-3 border-b shrink-0 ${isWizard ? 'border-emerald-900 bg-emerald-950/50' : 'border-fuchsia-900 bg-fuchsia-950/50'}`}>
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded ${isWizard ? 'bg-emerald-900/50 text-emerald-400' : 'bg-fuchsia-900/50 text-fuchsia-400'}`}>
               <FileText size={20} />
             </div>
             <div>
               <h3 className={`font-bold text-sm leading-tight max-w-[200px] truncate md:max-w-md ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`}>
                 {item.title}
               </h3>
             </div>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2">
             {/* Zoom Controls (Visual Scale) */}
             <div className="hidden md:flex items-center gap-1 mr-2 px-2 border-r border-white/10">
                 <button onClick={() => setZoomLevel(z => Math.max(50, z - 10))} className="p-1.5 hover:bg-white/10 rounded text-white/70" title="Zoom Out"><ZoomOut size={16}/></button>
                 <span className="text-xs font-mono w-8 text-center">{zoomLevel}%</span>
                 <button onClick={() => setZoomLevel(z => Math.min(200, z + 10))} className="p-1.5 hover:bg-white/10 rounded text-white/70" title="Zoom In"><ZoomIn size={16}/></button>
             </div>

             {/* Accessibility Toggle */}
             <button 
                onClick={() => setHighContrast(!highContrast)} 
                className={`p-2 rounded hover:bg-white/10 ${highContrast ? 'text-yellow-400' : 'text-white/50'}`}
                title="Toggle High Contrast"
             >
                 <Eye size={18} />
             </button>

             {/* Fullscreen Toggle */}
             <button 
                onClick={() => setIsFullScreen(!isFullScreen)} 
                className="p-2 rounded hover:bg-white/10 text-white/70"
                title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
             >
                 {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
             </button>

             <div className="w-px h-6 bg-white/10 mx-1"></div>

             <a 
               href={safePdfUrl} 
               target="_blank" 
               rel="noreferrer" 
               className={`p-2 rounded hover:bg-white/10 flex items-center gap-2 text-sm font-bold transition-colors
                 ${isWizard ? 'text-emerald-400' : 'text-fuchsia-400'}
               `}
               title="Open Original"
             >
               <ExternalLink size={18} />
               <span className="hidden sm:inline">Open</span>
             </a>
             <button 
               onClick={onClose} 
               className={`p-2 rounded hover:bg-white/10 transition-colors ${isWizard ? 'text-emerald-400 hover:text-emerald-300' : 'text-fuchsia-400 hover:text-fuchsia-300'}`}
             >
               <X size={24} />
             </button>
          </div>
        </div>
        
        {/* Content - Iframe with Zoom Container */}
        <div className="flex-1 bg-zinc-900 relative w-full overflow-hidden">
           <div 
             className="w-full h-full transition-transform origin-top-left"
             style={{ 
                 width: `${100 * (100/zoomLevel)}%`, 
                 height: `${100 * (100/zoomLevel)}%`,
                 transform: `scale(${zoomLevel / 100})`
             }}
           >
               <iframe 
                 src={viewerUrl} 
                 className="w-full h-full border-0"
                 title="PDF Viewer"
                 sandbox="allow-scripts allow-popups allow-forms"
               />
           </div>
           
           {/* Loading State Overlay */}
           <div className="absolute inset-0 -z-10 flex items-center justify-center">
             <div className={`animate-pulse ${isWizard ? 'text-emerald-700' : 'text-fuchsia-700'}`}>
               Loading Document...
             </div>
           </div>
        </div>
        
        {/* Resize Handle (Visual Indicator only, as modal is fixed size unless fullscreen) */}
        {!isFullScreen && (
            <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-white/10 rounded-tl"></div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;
