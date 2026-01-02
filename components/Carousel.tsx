
import React, { useState, useEffect } from 'react';
import { Lineage, type CarouselItem } from '../types';
import { Download, Eye, Heart, Sparkles, Trash2, Video, FileText, Layers, Link as LinkIcon, Code } from 'lucide-react';
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

  // Swipe State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  useEffect(() => {
    setLocalItems(items);
    if (items.length > 0 && activeIndex >= items.length) {
      setActiveIndex(0);
    }
  }, [items, activeIndex]);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 640) setRadius(250); // Mobile
      else if (w < 1024) setRadius(350); // Tablet
      else setRadius(700); // Laptop
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) setActiveIndex((prev) => (prev + 1) % localItems.length);
    if (isRightSwipe) setActiveIndex((prev) => (prev - 1 + localItems.length) % localItems.length);
  };

  if (localItems.length === 0) return null;

  const safeLength = localItems.length || 1;
  const rotateY = -activeIndex * (360 / safeLength);

  return (
    <div 
        className="relative w-full h-[450px] flex items-center justify-center overflow-hidden perspective-container touch-pan-y"
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
          
          // Fix Gradient Application
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

          const cleanContent = DOMPurify.sanitize(item.content);

          return (
            <div
              key={item.id}
              className={`absolute top-0 left-0 w-full h-full rounded-2xl flex flex-col justify-between p-6 transition-all duration-500 cursor-pointer overflow-hidden border backdrop-blur-md
                ${lineage === Lineage.WIZARD 
                  ? `bg-[#0a0f0a]/90 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]` 
                  : `bg-[#0f0a15]/90 border-fuchsia-500/30 shadow-[0_0_20px_rgba(217,70,239,0.2)]`
                }
                ${isActive ? 'opacity-100 z-10 scale-105' : 'opacity-40 grayscale blur-[1px]'}
              `}
              style={{
                transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
              }}
              onClick={() => setActiveIndex(index)}
            >
              {/* --- BACKGROUND IMAGE LAYER --- */}
              {hasImage && (
                <div className="absolute inset-0 z-0">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover opacity-40" />
                  <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent`}></div>
                </div>
              )}
              
              {/* --- CARD CONTENT LAYER --- */}
              <div className="relative z-10 w-full h-full flex flex-col">
                  
                  {/* Header: Date + Badge */}
                  <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest opacity-60 font-mono text-white`}>
                          {item.date}
                      </span>
                      {item.isUnread && (
                          <div className={`px-2 py-0.5 text-[10px] font-bold rounded ${lineage === Lineage.WIZARD ? 'bg-emerald-600 text-black' : 'bg-fuchsia-600 text-black'}`}>NEW</div>
                      )}
                  </div>

                  {/* Body: Title + Intro */}
                  <div className="flex-1 overflow-hidden mt-2">
                      <h2 
                        className={`text-3xl font-bold leading-tight mb-2 drop-shadow-md`}
                        style={titleStyle}
                      >
                          {item.title}
                      </h2>
                      <div 
                        className="text-xs text-white/70 line-clamp-4 font-sans leading-relaxed"
                        style={{ color: customStyle.contentColor }}
                        dangerouslySetInnerHTML={{__html: cleanContent}}
                      ></div>
                  </div>

                  {/* Footer: Likes + Action Button */}
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                      <button 
                         onClick={(e) => { e.stopPropagation(); toggleLike(index); }}
                         className={`flex items-center gap-2 transition-transform active:scale-95 ${item.isLiked ? 'text-red-500' : 'text-white/40 hover:text-white'}`}
                      >
                          <Heart size={18} fill={item.isLiked ? "currentColor" : "none"} />
                          <span className="font-bold text-xs">{item.likes || 999}</span>
                      </button>

                      {isActive && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onExtract(item); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 border backdrop-blur-md
                                ${lineage === Lineage.WIZARD 
                                    ? 'bg-emerald-900/40 border-emerald-500/50 text-white hover:bg-emerald-900/60' 
                                    : 'bg-fuchsia-900/40 border-fuchsia-500/50 text-white hover:bg-fuchsia-900/60'}
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
                  className="absolute top-2 left-2 z-30 p-2 bg-red-600/80 text-white rounded-full hover:bg-red-500"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Navigation Controls */}
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-4 z-20 pointer-events-none">
        <button 
          onClick={() => setActiveIndex(prev => (prev - 1 + safeLength) % safeLength)}
          className={`p-3 rounded-full border backdrop-blur-sm transition-transform active:scale-95 pointer-events-auto ${lineage === Lineage.WIZARD ? 'border-emerald-500/30 text-emerald-400 bg-black/50' : 'border-fuchsia-500/30 text-fuchsia-400 bg-black/50'}`}
        >
          &larr;
        </button>
         <button 
          onClick={() => setActiveIndex(prev => (prev + 1) % safeLength)}
          className={`p-3 rounded-full border backdrop-blur-sm transition-transform active:scale-95 pointer-events-auto ${lineage === Lineage.WIZARD ? 'border-emerald-500/30 text-emerald-400 bg-black/50' : 'border-fuchsia-500/30 text-fuchsia-400 bg-black/50'}`}
        >
          &rarr;
        </button>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          .preserve-3d { transform-style: preserve-3d; }
          .perspective-container { perspective: 1500px; }
        `
      }} />
    </div>
  );
};

export default Carousel;
