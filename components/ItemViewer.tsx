import React from 'react';
import { Lineage, type CarouselItem } from '../types';
import { X, FileText, ExternalLink, ScrollText } from 'lucide-react';
import DOMPurify from 'dompurify';

interface ItemViewerProps {
  item: CarouselItem;
  lineage: Lineage;
  onClose: () => void;
}

const ItemViewer: React.FC<ItemViewerProps> = ({ item, lineage, onClose }) => {
  const isWizard = lineage === Lineage.WIZARD;
  const isFile = item.type === 'file' || item.type === 'video';
  
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

  const safeUrl = isValidUrl(item.fileUrl) ? item.fileUrl! : "";
  
  // Detect File Type
  const isVideo = item.type === 'video' || (safeUrl && safeUrl.match(/\.(mp4|webm|ogg|mov)$/i));
  const isPdf = item.type === 'file' && (safeUrl && safeUrl.match(/\.pdf$/i));

  const customStyle = item.style || {};
  const titleStyle = { 
      color: customStyle.titleColor,
      fontFamily: customStyle.fontFamily === 'wizard' ? '"EB Garamond", serif' : customStyle.fontFamily === 'muggle' ? '"JetBrains Mono", monospace' : undefined
  };
  const contentStyle = {
      color: customStyle.contentColor,
      fontFamily: customStyle.fontFamily === 'wizard' ? '"EB Garamond", serif' : customStyle.fontFamily === 'muggle' ? '"JetBrains Mono", monospace' : undefined
  };

  // SECURITY: Sanitize before render
  const cleanContent = DOMPurify.sanitize(item.content);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-[fade-in_0.2s_ease-out]">
      <div className={`w-full max-w-6xl h-[90vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden relative
        ${isWizard ? 'border-emerald-600 bg-[#0a0f0a]' : 'border-fuchsia-600 bg-[#0f0a15]'}
      `}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b shrink-0 ${isWizard ? 'border-emerald-900 bg-emerald-950/30' : 'border-fuchsia-900 bg-fuchsia-950/30'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
             <div className={`p-2 rounded shrink-0 ${isWizard ? 'bg-emerald-900/50 text-emerald-400' : 'bg-fuchsia-900/50 text-fuchsia-400'}`}>
               {isFile ? <FileText size={20} /> : <ScrollText size={20} />}
             </div>
             <div className="min-w-0">
               <h3 
                  className={`font-bold text-lg leading-tight truncate ${customStyle.isGradient ? 'bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400' : ''} ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`}
                  style={titleStyle}
               >
                 {item.title}
               </h3>
               <p className={`text-xs opacity-60 ${isWizard ? 'font-wizard text-emerald-300' : 'font-muggle text-fuchsia-300'}`}>
                 {item.date} • {item.subject || 'General'}
               </p>
             </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
             {isFile && safeUrl && (
                <a 
                  href={safeUrl} 
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
             )}
             <button 
               onClick={onClose} 
               className={`p-2 rounded hover:bg-white/10 transition-colors ${isWizard ? 'text-emerald-400 hover:text-emerald-300' : 'text-fuchsia-400 hover:text-fuchsia-300'}`}
             >
               <X size={24} />
             </button>
          </div>
        </div>

        {/* Content Area */}
        {/* Added "will-change-transform" and backface-visibility to prevent flickering during rendering */}
        <div className="flex-1 bg-zinc-900 relative w-full overflow-hidden flex flex-col" style={{ willChange: 'transform', backfaceVisibility: 'hidden' }}>
           {isFile && safeUrl ? (
             <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900">
               {isVideo ? (
                   <video src={safeUrl} controls className="max-w-full max-h-full" />
               ) : isPdf ? (
                   <iframe src={safeUrl} className="w-full h-full border-0 bg-white" title="PDF Viewer" style={{ willChange: 'transform' }} />
               ) : (
                   <iframe 
                     src={`https://docs.google.com/gview?url=${encodeURIComponent(safeUrl)}&embedded=true`} 
                     className="w-full h-full border-0 bg-white"
                     title="Doc Viewer"
                     sandbox="allow-scripts allow-popups allow-same-origin"
                     style={{ willChange: 'transform' }}
                   />
               )}
             </div>
           ) : (
             <div className={`flex-1 overflow-y-auto p-6 md:p-12 space-y-6 ${isWizard ? 'scrollbar-wizard' : 'scrollbar-muggle'}`}>
                {/* Text Content */}
                <div 
                    className={`max-w-3xl mx-auto text-lg leading-relaxed whitespace-pre-wrap ${isWizard ? 'font-wizard text-emerald-100' : 'font-muggle text-fuchsia-100'}`}
                    style={contentStyle}
                    dangerouslySetInnerHTML={{__html: cleanContent}}
                ></div>
                
                {/* If it's a message type but has an image attached */}
                {item.image && (
                  <div className="max-w-3xl mx-auto mt-6 rounded-lg overflow-hidden border border-white/10">
                    <img src={item.image} alt="Attachment" className="w-full h-auto" />
                  </div>
                )}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ItemViewer;