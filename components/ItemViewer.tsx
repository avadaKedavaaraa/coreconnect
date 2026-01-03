import React from 'react';
import { Lineage, type CarouselItem } from '../types';
import { X, FileText, ExternalLink, MessageCircle, Share2, CornerDownRight } from 'lucide-react';
import DOMPurify from 'dompurify';

interface ItemViewerProps {
  item: CarouselItem;
  lineage: Lineage;
  onClose: () => void;
}

const ItemViewer: React.FC<ItemViewerProps> = ({ item, lineage, onClose }) => {
  const isWizard = lineage === Lineage.WIZARD;
  const isFile = item.type === 'file' || item.type === 'video' || item.type === 'link'; // Expanded to allow Link types to attempt preview
  
  const isValidUrl = (url?: string) => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (e) { return false; }
  };

  const safeUrl = isValidUrl(item.fileUrl) ? item.fileUrl! : "";
  const isVideo = item.type === 'video' || (safeUrl && safeUrl.match(/\.(mp4|webm|ogg|mov)$/i));
  
  // Google Drive Logic
  const isGoogleDrive = safeUrl.includes('drive.google.com');
  const getDriveEmbed = (url: string) => {
      let id = '';
      const parts = url.split('/');
      const dIndex = parts.indexOf('d');
      
      if (dIndex !== -1 && parts[dIndex + 1]) {
          id = parts[dIndex + 1].split(/[?&]/)[0]; 
      } else {
          try {
             const urlObj = new URL(url);
             id = urlObj.searchParams.get('id') || '';
          } catch(e) {}
      }
      return id ? `https://drive.google.com/file/d/${id}/preview` : url;
  };

  const isPdfOrDoc = (
      (item.type === 'file' || item.type === 'link') && 
      ((safeUrl && safeUrl.match(/\.pdf$/i)) || isGoogleDrive)
  );

  const embedUrl = isGoogleDrive ? getDriveEmbed(safeUrl) : safeUrl;

  // --- STYLING LOGIC ---
  const customStyle = item.style || {};
  const titleFont = customStyle.fontFamily === 'wizard' ? '"EB Garamond", serif' : customStyle.fontFamily === 'muggle' ? '"JetBrains Mono", monospace' : undefined;

  const titleStyle = customStyle.isGradient ? {
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

  // Content is FORCED to be readable Sans Serif but allows color override
  const contentStyle = {
      color: customStyle.contentColor || '#e4e4e7',
      // Explicitly set font here, but class 'safe-font' will enforce it via !important if needed
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif', 
      lineHeight: '1.6',
      fontSize: '1rem'
  };

  // ALLOW STYLE TAGS for custom CSS support
  const cleanContent = DOMPurify.sanitize(item.content, { ADD_TAGS: ['style'] });

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-0 md:p-4 animate-[fade-in_0.2s_ease-out]">
      {/* Backdrop with heavy blur */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose}></div>

      {/* Main Container - Chat Bubble / Slate Aesthetic */}
      <div className={`w-full h-full md:h-[90vh] md:max-w-4xl flex flex-col md:rounded-3xl shadow-2xl overflow-hidden relative z-10 border-0 md:border transition-all
        ${isWizard 
            ? 'bg-[#0f1510] md:bg-[#0f1510]/95 border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.2)]' 
            : 'bg-[#150f1a] md:bg-[#150f1a]/95 border-fuchsia-500/30 shadow-[0_0_50px_rgba(217,70,239,0.2)]'}
      `}>
        
        {/* Header Bar - Sticky & Safe Area Aware */}
        <div className={`flex items-center justify-between p-4 md:p-6 border-b shrink-0 sticky top-0 z-50 pt-safe-top
            ${isWizard ? 'border-emerald-900/50 bg-[#0f1510] md:bg-emerald-950/40' : 'border-fuchsia-900/50 bg-[#150f1a] md:bg-fuchsia-950/40'}
        `}>
            <div className="flex items-start gap-4">
                <div className={`p-2 md:p-3 rounded-2xl shrink-0 shadow-lg ${isWizard ? 'bg-emerald-900 text-emerald-300' : 'bg-fuchsia-900 text-fuchsia-300'}`}>
                    {isFile ? <FileText size={20} /> : <MessageCircle size={20} />}
                </div>
                <div className="min-w-0 pr-8"> {/* Right padding prevents overlap with close button */}
                    <h3 className={`text-lg md:text-2xl font-bold leading-tight line-clamp-2 mb-1`} style={titleStyle}>
                        {item.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] md:text-xs opacity-60 uppercase tracking-widest font-mono">
                        <span className={isWizard ? 'text-emerald-400' : 'text-fuchsia-400'}>{item.author || 'System'}</span>
                        <span>•</span>
                        <span>{item.date}</span>
                    </div>
                </div>
            </div>
            
            {/* Prominent Close Button */}
            <button 
                onClick={onClose} 
                className={`absolute top-4 right-4 md:static p-2 rounded-full transition-all hover:scale-110 active:scale-95 shadow-lg
                    ${isWizard ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/50' : 'bg-fuchsia-900/50 text-fuchsia-400 border border-fuchsia-500/50'}
                `}
                title="Close"
            >
                <X size={24} />
            </button>
        </div>

        {/* Content Area */}
        <div className={`flex-1 overflow-y-auto relative ${isWizard ? 'scrollbar-wizard' : 'scrollbar-muggle'}`}>
            
            {/* If Media (File/Video/Link-Preview) */}
            {isPdfOrDoc || isVideo ? (
                <div className="w-full h-full min-h-[400px] bg-black/50 flex flex-col items-center justify-center p-4">
                    {isVideo ? (
                        <video src={safeUrl} controls className="max-w-full max-h-full rounded-lg shadow-2xl" />
                    ) : (
                        <iframe 
                            src={embedUrl} 
                            className="w-full h-full border-0 rounded-lg bg-white shadow-2xl" 
                            title="Document Viewer"
                            allow="autoplay" 
                        />
                    )}
                </div>
            ) : isFile && safeUrl ? (
                <div className="w-full h-full min-h-[400px] bg-black/50 flex flex-col items-center justify-center p-4">
                     <div className="text-center">
                        <a href={safeUrl} target="_blank" rel="noreferrer" className={`px-8 py-4 rounded-full font-bold flex items-center gap-2 transition-transform hover:scale-105 ${isWizard ? 'bg-emerald-600 text-black' : 'bg-fuchsia-600 text-black'}`}>
                            <ExternalLink size={20}/> Open Document
                        </a>
                    </div>
                </div>
            ) : (
                /* Text Content - Stylized as a high-end message */
                <div className="p-6 md:p-10 space-y-8 pb-24">
                    {/* The Message Body - Added 'safe-font' class to protect from global override */}
                    <div className="prose prose-invert max-w-none">
                        <div 
                            className="bg-white/5 p-6 md:p-8 rounded-2xl border border-white/5 shadow-inner safe-font"
                            style={contentStyle}
                            dangerouslySetInnerHTML={{__html: cleanContent}}
                        ></div>
                    </div>

                    {/* Image Attachment */}
                    {item.image && (
                        <div className="mt-4 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                            <img src={item.image} alt="Attachment" className="w-full h-auto object-cover" />
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Footer Actions */}
        <div className={`p-4 border-t flex justify-between items-center text-xs font-mono opacity-60 ${isWizard ? 'border-emerald-900/50 bg-black/40' : 'border-fuchsia-900/50 bg-black/40'}`}>
            <div className="flex gap-4">
                <span className="flex items-center gap-1"><CornerDownRight size={14}/> {item.sector?.toUpperCase()}</span>
                {item.subject && <span className="flex items-center gap-1"># {item.subject.toUpperCase()}</span>}
            </div>
            {safeUrl && (
                <a href={safeUrl} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                    <Share2 size={14}/> OPEN SOURCE
                </a>
            )}
        </div>

      </div>
    </div>
  );
};

export default ItemViewer;