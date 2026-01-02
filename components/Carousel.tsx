
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
        className="relative w-[280px] sm:w-[320px] h-[350px] sm:h-[450px] preserve-3d transition-transform duration-700 ease-out"
        style={{ transform: `translateZ(-${radius}px) rotateY(${rotateY}deg)` }}
      >
        {localItems.map((item, index) => {
          if (!item) return null;

          const angle = index * (360 / safeLength);
          const isActive = index === activeIndex;
          const hasImage = !!item.image;
          
          const customStyle = item.style || {};
          const titleColor = customStyle.titleColor || (lineage === Lineage.WIZARD ? '#d1fae5' : '#f5d0fe');
          const titleFont = customStyle.fontFamily === 'wizard' ? '"EB Garamond", serif' : customStyle.fontFamily === 'muggle' ? '"JetBrains Mono", monospace' : 'inherit';

          // SECURITY: Sanitize content before render
          const cleanContent = DOMPurify.sanitize(item.content);

          return (
            <div
              key={item.id}
              className={`absolute top-0 left-0 w-full h-full rounded-2xl flex flex-col justify-between p-6 transition-all duration-500 cursor-pointer overflow-hidden border backdrop-blur-md
                ${lineage === Lineage.WIZARD 
                  ? `bg-emerald-950/80 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]` 
                  : `bg-fuchsia-950/80 border-fuchsia-500/30 shadow-[0_0_20px_rgba(217,70,239,0.1)]`
                }
                ${isActive ? 'opacity-100 scale-105 shadow-2xl z-10' : 'opacity-40 grayscale blur-[1px]'}
              `}
              style={{
                transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
              }}
              onClick={() => setActiveIndex(index)}
            >
              {/* --- BACKGROUND IMAGE LAYER --- */}
              {hasImage && (
                <div className="absolute inset-0 z-0">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover opacity-30" />
                  <div className={`absolute inset-0 bg-gradient-to-t ${lineage === Lineage.WIZARD ? 'from-emerald-950' : 'from-fuchsia-950'} via-transparent to-transparent`}></div>
                </div>
              )}
              
              {/* --- CARD CONTENT LAYER --- */}
              <div className="relative z-10 w-full h-full flex flex-col">
                  
                  {/* Header: Date + Badge */}
                  <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest opacity-60 font-mono ${lineage === Lineage.WIZARD ? 'text-emerald-200' : 'text-fuchsia-200'}`}>
                          {item.date}
                      </span>
                      {item.isUnread && (
                          <div className={`w-2 h-2 rounded-full animate-pulse ${lineage === Lineage.WIZARD ? 'bg-emerald-400' : 'bg-fuchsia-400'}`}></div>
                      )}
                  </div>

                  {/* Body: Title + Intro */}
                  <div className="flex-1 overflow-hidden">
                      <h2 
                        className={`text-2xl font-bold leading-tight mb-2 ${customStyle.isGradient ? 'bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400' : ''}`}
                        style={{ color: titleColor, fontFamily: titleFont }}
                      >
                          {item.title}
                      </h2>
                      <div 
                        className="text-xs text-white/60 line-clamp-4 font-sans leading-relaxed"
                        dangerouslySetInnerHTML={{__html: cleanContent}}
                      ></div>
                  </div>

                  {/* Footer: Likes + Action Button */}
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                      <button 
                         onClick={(e) => { e.stopPropagation(); toggleLike(index); }}
                         className={`flex items-center gap-2 transition-transform active:scale-95 ${item.isLiked ? 'text-red-500' : 'text-white/40 hover:text-white'}`}
                      >
                          <Heart size={16} fill={item.isLiked ? "currentColor" : "none"} />
                          <span className="font-bold text-xs">{item.likes || 0}</span>
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
                              <span>View</span>
                          </button>
                      )}
                  </div>
              </div>

              {/* Admin Delete Overlay */}
              {isAdmin && onDelete && isActive && (
                <button 
                  onClick={(e) => { e.stopPropagation(); if(confirm('Delete?')) onDelete(item.id); }}
                  className="absolute top-2 right-2 z-30 p-2 bg-red-600/20 text-red-400 rounded hover:bg-red-600 hover:text-white transition-colors"
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
