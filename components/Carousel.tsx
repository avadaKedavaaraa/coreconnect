
import React, { useState, useEffect } from 'react';
import { Lineage, type CarouselItem } from '../types';
import { Download, Heart, Sparkles, Trash2, ChevronLeft, ChevronRight, Pin } from 'lucide-react';
import DOMPurify from 'dompurify';

interface CarouselProps {
  items: CarouselItem[];
  lineage: Lineage;
  onExtract: (item: CarouselItem) => void;
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
}

const Carousel: React.FC<CarouselProps> = ({ items, lineage, onExtract, isAdmin, onDelete }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [radius, setRadius] = useState(400);
  const [localItems, setLocalItems] = useState(items);
  const [isMobile, setIsMobile] = useState(false);

  // Swipe State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const safeLength = localItems.length || 1;

  useEffect(() => {
    setLocalItems(items);
    if (items.length > 0 && activeIndex >= items.length) {
      setActiveIndex(0);
    }
  }, [items, activeIndex]);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setIsMobile(w < 640);
      if (w < 640) setRadius(250); // Mobile
      else if (w < 1024) setRadius(350); // Tablet
      else setRadius(700); // Laptop
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') {
           setActiveIndex((prev) => (prev - 1 + safeLength) % safeLength);
        } else if (e.key === 'ArrowRight') {
           setActiveIndex((prev) => (prev + 1) % safeLength);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [safeLength]);

  const toggleLike = (index: number) => {
    setLocalItems(prev => prev.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          isLiked: !item.isLiked,
          likes: (item.likes || 0) + (item.isLiked ? -1 : 1)
        };
      }
      return item;
    }));
  };

  const onTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation(); // Prevent Sidebar from opening
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation(); // Prevent Sidebar from opening
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation(); // Prevent Sidebar from opening
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) setActiveIndex((prev) => (prev + 1) % localItems.length);
    if (isRightSwipe) setActiveIndex((prev) => (prev - 1 + localItems.length) % localItems.length);
  };

  if (localItems.length === 0) return null;

  const rotateY = -activeIndex * (360 / safeLength);

  return (
    <div 
        className="relative w-full h-[450px] flex items-center justify-center overflow-hidden perspective-container touch-pan-y no-swipe"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
    >
      <div 
        className="relative w-[300px] h-[450px] preserve-3d transition-transform duration-700 ease-out"
        style={{ transform: `translateZ(-${radius}px) rotateY(${rotateY}deg)` }}
      >
        {localItems.map((item, index) => {
          if (!item) return null;

          const angle = index * (360 / safeLength);
          const isActive = index === activeIndex;
          const hasImage = !!item.image;
          
          const customStyle = item.style || {};
          const titleFont = customStyle.fontFamily === 'wizard' ? '"EB Garamond", serif' : customStyle.fontFamily === 'muggle' ? '"JetBrains Mono", monospace' : 'inherit';
          
          const titleStyle = customStyle.isGradient ? {
              backgroundImage: `linear-gradient(to right, ${customStyle.titleColor}, ${customStyle.titleColorEnd || customStyle.titleColor})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
              fontFamily: titleFont
          } : {
              color: customStyle.titleColor || (lineage === Lineage.WIZARD ? '#ffffff' : '#ffffff'),
              fontFamily: titleFont
          };

          // Allow rich HTML in cards (Styles, Images, Tables, etc.)
          const cleanContent = DOMPurify.sanitize(item.content, {
              ADD_TAGS: ['style', 'iframe', 'img', 'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'div', 'span', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'hr', 'button', 'input', 'label', 'form', 'audio', 'video', 'source', 'track'],
              ADD_ATTR: ['target', 'href', 'src', 'frameborder', 'allow', 'allowfullscreen', 'style', 'class', 'id', 'width', 'height', 'align', 'controls', 'autoplay', 'loop', 'muted', 'poster', 'type']
          });

          return (
            <div
              key={item.id}
              className={`absolute top-0 left-0 w-full h-full rounded-2xl flex flex-col justify-between p-6 transition-all duration-500 cursor-pointer overflow-hidden border backdrop-blur-md
                ${lineage === Lineage.WIZARD 
                  ? `bg-[#0a0f0a]/90 border-emerald-500/30` 
                  : `bg-[#0f0a15]/90 border-fuchsia-500/30`
                }
                ${isActive 
                    ? (lineage === Lineage.WIZARD 
                        ? 'opacity-100 z-50 scale-105 shadow-[0_0_5px_rgba(16,185,129,0.2)] md:shadow-[0_0_60px_rgba(16,185,129,0.5)] border-emerald-500 pointer-events-auto' 
                        : 'opacity-100 z-50 scale-105 shadow-[0_0_5px_rgba(217,70,239,0.2)] md:shadow-[0_0_60px_rgba(217,70,239,0.5)] border-fuchsia-500 pointer-events-auto')
                    : (isMobile 
                        ? 'opacity-0 z-0 pointer-events-none hidden' // Completely hide on mobile if not active to prevent conflict
                        : 'opacity-40 grayscale blur-[1px] z-0 pointer-events-none'
                      )
                }
              `}
              style={{
                transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
              }}
              onClick={(e) => { 
                  // CRITICAL FIX: Only active card handles click to preview. 
                  if (isActive) {
                      e.stopPropagation(); 
                      onExtract(item);
                  }
              }}
            >
              {/* --- BACKGROUND IMAGE LAYER --- */}
              {hasImage && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover opacity-40" />
                  <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent`}></div>
                </div>
              )}
              
              {/* --- CARD CONTENT LAYER --- */}
              <div className="relative z-10 w-full h-full flex flex-col select-none">
                  
                  {/* Header: Date + Badge */}
                  <div className="flex justify-between items-start mb-2 shrink-0">
                      <span className={`text-[10px] font-bold uppercase tracking-widest opacity-60 font-mono text-white`}>
                          {item.date}
                      </span>
                      <div className="flex gap-2">
                          {item.isPinned && (
                              <div className={`p-1 rounded-full ${lineage === Lineage.WIZARD ? 'bg-emerald-800 text-yellow-300' : 'bg-fuchsia-800 text-yellow-300'}`}>
                                  <Pin size={10} fill="currentColor" />
                              </div>
                          )}
                          {item.isUnread && (
                              <div className={`px-2 py-0.5 text-[10px] font-bold rounded ${lineage === Lineage.WIZARD ? 'bg-emerald-600 text-black' : 'bg-fuchsia-600 text-black'}`}>NEW</div>
                          )}
                      </div>
                  </div>

                  {/* Body: Title + Intro */}
                  <div className="flex-1 flex flex-col overflow-hidden mt-2 relative">
                      <h2 
                        className={`text-3xl font-bold leading-tight mb-3 drop-shadow-md shrink-0`}
                        style={titleStyle}
                      >
                          {item.title || 'Untitled'}
                      </h2>
                      {/* Content Container - With Custom HTML Support & Scrolling */}
                      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                          <div 
                            className="text-xs text-white/70 font-sans leading-relaxed html-content"
                            style={{ color: customStyle.contentColor }}
                            dangerouslySetInnerHTML={{__html: cleanContent}}
                          />
                      </div>
                  </div>

                  {/* Footer: Likes + Action Button */}
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between w-full pointer-events-auto shrink-0">
                      <button 
                         onClick={(e) => { e.stopPropagation(); toggleLike(index); }}
                         className={`flex items-center gap-2 transition-transform active:scale-95 ${item.isLiked ? 'text-red-500' : 'text-white/40 hover:text-white'}`}
                      >
                          <Heart size={18} fill={item.isLiked ? "currentColor" : "none"} />
                          <span className="font-bold text-xs">{item.likes || 0}</span>
                      </button>

                      {isActive && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onExtract(item); }}
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 border backdrop-blur-md shadow-lg z-50
                                ${lineage === Lineage.WIZARD 
                                    ? 'bg-emerald-900/60 border-emerald-500 text-white hover:bg-emerald-800' 
                                    : 'bg-fuchsia-900/60 border-fuchsia-500 text-white hover:bg-fuchsia-800'}
                            `}
                          >
                              {lineage === Lineage.WIZARD ? <Sparkles size={12}/> : <Download size={12}/>}
                              <span>READ</span>
                          </button>
                      )}
                  </div>
              </div>

              {/* Admin Delete Overlay */}
              {isAdmin && onDelete && isActive && (
                <button 
                  onClick={(e) => { e.stopPropagation(); if(confirm('Delete?')) onDelete(item.id); }}
                  className="absolute top-2 left-2 z-30 p-2 bg-red-600/80 text-white rounded-full hover:bg-red-500 pointer-events-auto"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Navigation Controls - Hidden on Mobile (Swipe), Visible on Desktop */}
      <div className="hidden md:block">
        <button 
          onClick={(e) => { e.stopPropagation(); setActiveIndex(prev => (prev - 1 + safeLength) % safeLength); }}
          className={`absolute top-1/2 -translate-y-1/2 z-30 p-4 rounded-full border backdrop-blur-sm transition-transform active:scale-95 pointer-events-auto shadow-xl hover:scale-110
            ${lineage === Lineage.WIZARD ? 'border-emerald-500/30 text-emerald-400 bg-black/60 hover:bg-emerald-900/40' : 'border-fuchsia-500/30 text-fuchsia-400 bg-black/60 hover:bg-fuchsia-900/40'}
          `}
          style={{ left: 'calc(50% - 230px)' }}
        >
          <ChevronLeft size={24} />
        </button>
         <button 
          onClick={(e) => { e.stopPropagation(); setActiveIndex(prev => (prev + 1) % safeLength); }}
          className={`absolute top-1/2 -translate-y-1/2 z-30 p-4 rounded-full border backdrop-blur-sm transition-transform active:scale-95 pointer-events-auto shadow-xl hover:scale-110
            ${lineage === Lineage.WIZARD ? 'border-emerald-500/30 text-emerald-400 bg-black/60 hover:bg-emerald-900/40' : 'border-fuchsia-500/30 text-fuchsia-400 bg-black/60 hover:bg-fuchsia-900/40'}
          `}
          style={{ right: 'calc(50% - 230px)' }}
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* GLOBAL STYLE FOR HTML CONTENT RESTORATION */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .preserve-3d { transform-style: preserve-3d; }
          .perspective-container { perspective: 1500px; }
          
          /* RESTORE DEFAULT HTML SPACING & LISTS */
          .html-content p { margin-bottom: 0.75em; min-height: 1em; }
          .html-content ul { list-style: disc outside; margin-left: 1.5em; margin-bottom: 0.75em; }
          .html-content ol { list-style: decimal outside; margin-left: 1.5em; margin-bottom: 0.75em; }
          .html-content li { margin-bottom: 0.25em; }
          .html-content blockquote { border-left: 3px solid currentColor; padding-left: 1em; margin-bottom: 0.75em; opacity: 0.8; font-style: italic; }
          .html-content h1, .html-content h2, .html-content h3 { font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; line-height: 1.2; }
          .html-content a { text-decoration: underline; text-underline-offset: 3px; }
          .html-content img { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 0.5em 0; }
          .html-content table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
          .html-content th, .html-content td { border: 1px solid rgba(255,255,255,0.2); padding: 0.5em; text-align: left; }
          .html-content th { background-color: rgba(255,255,255,0.1); font-weight: bold; }
        `
      }} />
    </div>
  );
};

export default Carousel;
