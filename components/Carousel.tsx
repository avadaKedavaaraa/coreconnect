
import React, { useState, useEffect, useRef } from 'react';
import { Lineage, type CarouselItem } from '../types';
import { Download, Eye, Heart, Sparkles, AlertCircle, Trash2, ArrowRight } from 'lucide-react';
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
  // Local state to handle likes immediately in UI
  const [localItems, setLocalItems] = useState(items);

  // Swipe State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  // Update local items and reset index if out of bounds to prevent crashes
  useEffect(() => {
    setLocalItems(items);
    if (items.length > 0 && activeIndex >= items.length) {
      setActiveIndex(0);
    }
  }, [items, activeIndex]);

  // Responsive radius
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      // Mobile optimization: Decrease radius significantly to bring back cards into view
      if (w < 640) setRadius(250); 
      // Tablet
      else if (w < 1024) setRadius(350);
      // Laptop/Desktop: INCREASE spacing to reduce overlap as requested
      else setRadius(700); 
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard Navigation & Likes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard clause if no items
      if (localItems.length === 0) return;

      if (e.key === 'ArrowRight') {
        setActiveIndex((prev) => (prev + 1) % localItems.length);
      } else if (e.key === 'ArrowLeft') {
        setActiveIndex((prev) => (prev - 1 + localItems.length) % localItems.length);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        // Handle Like Toggle
        toggleLike(activeIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, localItems.length]);

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

  // Touch Handlers
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
    
    if (isLeftSwipe) {
       setActiveIndex((prev) => (prev + 1) % localItems.length);
    }
    if (isRightSwipe) {
       setActiveIndex((prev) => (prev - 1 + localItems.length) % localItems.length);
    }
  };

  if (localItems.length === 0) return null;

  // Safety check to ensure we don't calculate NaN
  const safeLength = localItems.length || 1;
  const rotateY = -activeIndex * (360 / safeLength);

  return (
    <div 
        className="relative w-full h-[400px] sm:h-[500px] flex items-center justify-center overflow-hidden perspective-container touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
    >
      <div 
        className="relative w-[280px] sm:w-[320px] h-[400px] sm:h-[480px] preserve-3d transition-transform duration-700 ease-out"
        style={{ transform: `translateZ(-${radius}px) rotateY(${rotateY}deg)` }}
      >
        {localItems.map((item, index) => {
          if (!item) return null;

          const angle = index * (360 / safeLength);
          const isActive = index === activeIndex;
          const hasImage = !!item.image;
          
          const customStyle = item.style || {};
          const titleColor = customStyle.titleColor || (lineage === Lineage.WIZARD ? '#ffffff' : '#ffffff');
          const titleFont = customStyle.fontFamily === 'wizard' ? '"EB Garamond", serif' : customStyle.fontFamily === 'muggle' ? '"JetBrains Mono", monospace' : 'inherit';

          // SECURITY: Sanitize content before render
          const cleanContent = DOMPurify.sanitize(item.content);

          return (
            <div
              key={item.id}
              className={`absolute top-0 left-0 w-full h-full rounded-2xl flex flex-col justify-between transition-all duration-500 cursor-pointer overflow-hidden
                ${lineage === Lineage.WIZARD 
                  ? `bg-black border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.8)]` 
                  : `bg-black border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.8)]`
                }
                ${isActive ? 'opacity-100 scale-105 shadow-2xl' : 'opacity-40 grayscale blur-[1px]'}
              `}
              style={{
                transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
              }}
              onClick={() => setActiveIndex(index)}
            >
              {/* --- BACKGROUND IMAGE LAYER --- */}
              {hasImage && (
                <div className="absolute inset-0 z-0">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  {/* Heavy overlay for readability */}
                  <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60`}></div>
                </div>
              )}
              
              {/* --- CARD CONTENT LAYER --- */}
              <div className="relative z-10 w-full h-full flex flex-col p-6">
                  
                  {/* Header: Date + Badge */}
                  <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 font-mono">
                          {item.date}
                      </span>
                      {item.isUnread && (
                          <span className={`text-[10px] font-bold px-2 py-1 rounded bg-white/10 border border-white/20 backdrop-blur-md ${lineage === Lineage.WIZARD ? 'text-emerald-300' : 'text-fuchsia-300'}`}>
                              NEW
                          </span>
                      )}
                  </div>

                  {/* Body: Title + Intro */}
                  <div className="mt-4 flex-1">
                      <h2 
                        className={`text-3xl font-bold leading-tight mb-2 drop-shadow-md ${customStyle.isGradient ? 'bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400' : ''}`}
                        style={{ color: titleColor, fontFamily: titleFont }}
                      >
                          {item.title}
                      </h2>
                      <div 
                        className="text-sm text-white/70 line-clamp-3 font-sans leading-relaxed"
                        dangerouslySetInnerHTML={{__html: cleanContent}}
                      ></div>
                  </div>

                  {/* Footer: Likes + Action Button */}
                  <div className="mt-auto flex items-end justify-between pt-4 border-t border-white/10">
                      <button 
                         onClick={(e) => { e.stopPropagation(); toggleLike(index); }}
                         className={`flex items-center gap-2 transition-transform active:scale-95 ${item.isLiked ? 'text-red-500' : 'text-white/50 hover:text-white'}`}
                      >
                          <Heart size={20} fill={item.isLiked ? "currentColor" : "none"} />
                          <span className="font-bold text-sm">{item.likes || 999}</span>
                      </button>

                      {isActive && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onExtract(item); }}
                            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 border backdrop-blur-md
                                ${lineage === Lineage.WIZARD 
                                    ? 'bg-emerald-900/40 border-emerald-500/50 text-white hover:bg-emerald-900/60' 
                                    : 'bg-fuchsia-900/40 border-fuchsia-500/50 text-white hover:bg-fuchsia-900/60'}
                            `}
                          >
                              {lineage === Lineage.WIZARD ? <Sparkles size={14}/> : <Download size={14}/>}
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
                  <Trash2 size={14} />
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
