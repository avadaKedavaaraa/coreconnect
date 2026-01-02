import React from 'react';
import { Lineage, type CarouselItem } from '../types';
import { X, FileText, Download, ExternalLink } from 'lucide-react';

interface PDFViewerProps {
  item: CarouselItem;
  lineage: Lineage;
  onClose: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ item, lineage, onClose }) => {
  const isWizard = lineage === Lineage.WIZARD;
  
  // --- SECURITY: Protocol Sanitization ---
  // A malicious admin could set fileUrl to "javascript:alert(document.cookie)"
  // This check ensures we only render legitimate HTTP/HTTPS URLs.
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
  
  const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(safePdfUrl)}&embedded=true`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-[fade-in_0.2s_ease-out]">
      <div className={`w-full max-w-6xl h-[90vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden relative
        ${isWizard ? 'border-emerald-600 bg-[#0a0f0a]' : 'border-fuchsia-600 bg-[#0f0a15]'}
      `}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b shrink-0 ${isWizard ? 'border-emerald-900 bg-emerald-950/30' : 'border-fuchsia-900 bg-fuchsia-950/30'}`}>
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded ${isWizard ? 'bg-emerald-900/50 text-emerald-400' : 'bg-fuchsia-900/50 text-fuchsia-400'}`}>
               <FileText size={20} />
             </div>
             <div>
               <h3 className={`font-bold text-lg leading-tight ${isWizard ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`}>
                 {item.title}
               </h3>
               <p className={`text-xs opacity-60 ${isWizard ? 'font-wizard text-emerald-300' : 'font-muggle text-fuchsia-300'}`}>
                 {isWizard ? 'Ancient Scroll Archive • Read-Only Spell Active' : 'Portable Document Format • Read-Only Mode'}
               </p>
             </div>
          </div>
          <div className="flex items-center gap-2">
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
        
        {/* Helper Banner */}
        <div className={`px-4 py-2 text-center text-xs font-bold border-b z-10
            ${isWizard ? 'bg-emerald-900/20 text-emerald-300 border-emerald-900/50' : 'bg-fuchsia-900/20 text-fuchsia-300 border-fuchsia-900/50'}
        `}>
             Use "Open" for the best viewing experience or if the document fails to load here.
        </div>

        {/* Content - Iframe */}
        <div className="flex-1 bg-zinc-900 relative w-full">
           <iframe 
             src={viewerUrl} 
             className="w-full h-full border-0"
             title="PDF Viewer"
             // SANDBOX: Restrict what the iframe can do.
             // We allow scripts (for Google Viewer to work) but block same-origin (so it can't access parent cookies)
             sandbox="allow-scripts allow-popups"
           />
           
           {/* Loading State Overlay */}
           <div className="absolute inset-0 -z-10 flex items-center justify-center">
             <div className={`animate-pulse ${isWizard ? 'text-emerald-700' : 'text-fuchsia-700'}`}>
               Loading Document...
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;