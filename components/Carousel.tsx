
import React, { useState, useEffect, useRef } from 'react';
import { Lineage, type CarouselItem } from '../types';
import { Download, Eye, Heart, Sparkles, AlertCircle, Trash2 } from 'lucide-react';
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
      else if (w < 1024) setRadius(350);
      else setRadius(550);
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
        className="relative w-[220px] sm:w-[300px] h-[320px] sm:h-[450px] preserve-3d transition-transform duration-700 ease-out"
        style={{ transform: `translateZ(-${radius}px) rotateY(${rotateY}deg)` }}
      >
        {localItems.map((item, index) => {
          // Guard clause to prevent rendering if item is undefined (though map handles this, explicit check requested)
          if (!item) return null;

          const angle = index * (360 / safeLength);
          const isActive = index === activeIndex;
          const hasImage = !!item.image;
          
          const customStyle = item.style || {};
          const titleStyle = { 
              color: customStyle.titleColor,
              fontFamily: customStyle.fontFamily === 'wizard' ? '"EB Garamond", serif' : customStyle.fontFamily === 'muggle' ? '"JetBrains Mono", monospace' : undefined
          };
          const contentStyle = {
              color: customStyle.contentColor,
              fontFamily: customStyle.fontFamily === 'wizard' ? '"EB Garamond", serif' : customStyle.fontFamily === 'muggle' ? '"JetBrains Mono", monospace' : undefined
          };

          // SECURITY: Sanitize content before render
          const cleanContent = DOMPurify.sanitize(item.content);

          return (
            <div
              key={item.id}
              className={`absolute top-0 left-0 w-full h-full rounded-xl border flex flex-col justify-between transition-all duration-500 cursor-pointer overflow-hidden
                ${lineage === Lineage.WIZARD 
                  ? `bg-black/90 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.1)] ${isActive ? 'shadow-[0_0_60px_rgba(16,185,129,0.4)] border-emerald-400 scale-105 opacity-100' : 'opacity-30 grayscale blur-[1px]'}` 
                  : `bg-black/90 border-fuchsia-500/40 shadow-[0_0_30px_rgba(217,70,239,0.1)] ${isActive ? 'shadow-[0_0_60px_rgba(217,70,239,0.4)] border-fuchsia-400 scale-105 opacity-100' : 'opacity-30 grayscale blur-[1px]'}`
                }
              `}
              style={{
                transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
              }}
              onClick={() => setActiveIndex(index)}
            >
              {/* Image Background if present */}
              {hasImage && (
                <div className="absolute inset-0 z-0">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover opacity-50" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
                </div>
              )}

              {/* Admin Delete Button */}
              {isAdmin && onDelete && isActive && (
                <button 
                  onClick={(e) => { e.stopPropagation(); if(confirm('Delete this item?')) onDelete(item.id); }}
                  className="absolute -top-3 -left-3 z-30 p-2 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-500"
                >
                  <Trash2 size={16} />
                </button>
              )}

              {/* Unread Badge */}
              {item.isUnread && (
                <div className="absolute top-2 right-2 z-20">
                  <span className={`flex h-4 w-4 relative`}>
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${lineage === Lineage.WIZARD ? 'bg-red-500' : 'bg-fuchsia-400'}`}></span>
                    <span className={`relative inline-flex rounded-full h-4 w-4 ${lineage === Lineage.WIZARD ? 'bg-red-600' : 'bg-fuchsia-500'}`}></span>
                  </span>
                </div>
              )}

              {/* Card Content - Animates when active */}
              <div className={`relative z-10 p-4 sm:p-6 space-y-3 sm:space-y-4 h-full flex flex-col ${isActive ? 'animate-[fade-in-up_0.6s_ease-out_forwards]' : ''}`}>
                <div className="flex justify-between items-start">
                   <div className={`text-[10px] sm:text-xs uppercase tracking-widest opacity-60 ${lineage === Lineage.WIZARD ? 'font-wizard' : 'font-muggle'}`}>
                    {item.date}
                  </div>
                  {item.isUnread && isActive && (
                     <div className={`text-[10px] px-2 py-0.5 rounded border ${lineage === Lineage.WIZARD ? 'border-red-500/50 text-red-400' : 'border-fuchsia-500/50 text-fuchsia-400'}`}>
                       NEW
                     </div>
                  )}
                </div>

                <h3 
                    className={`text-base sm:text-2xl font-bold leading-tight line-clamp-2 ${customStyle.isGradient ? 'bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400' : ''} ${lineage === Lineage.WIZARD ? 'font-wizardTitle text-emerald-100' : 'font-muggle text-fuchsia-100'}`}
                    style={titleStyle}
                >
                  {item.title}
                </h3>
                
                <div 
                    className={`text-xs sm:text-sm opacity-80 line-clamp-5 flex-1 ${lineage === Lineage.WIZARD ? 'font-wizard text-emerald-200/80' : 'font-muggle text-fuchsia-200/80'}`}
                    style={contentStyle}
                    dangerouslySetInnerHTML={{__html: cleanContent}}
                ></div>

                {/* Footer Controls */}
                <div className="mt-auto pt-4 border-t border-white/10 flex justify-between items-center">
                   <button 
                     onClick={(e) => { e.stopPropagation(); toggleLike(index); }}
                     className={`flex items-center gap-2 text-sm transition-colors hover:scale-110 active:scale-95 ${item.isLiked ? 'text-red-500' : 'opacity-50'}`}
                     title="Press Up/Down arrow to like"
                   >
                      <Heart size={18} fill={item.isLiked ? "currentColor" : "none"} />
                      <span>{item.likes}</span>
                   </button>
                   
                   {isActive && (
                     <button
                      onClick={(e) => { e.stopPropagation(); onExtract(item); }}
                      className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded flex items-center gap-2 text-[10px] sm:text-xs font-bold transition-all hover:scale-105 active:scale-95
                        ${lineage === Lineage.WIZARD 
                          ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-900' 
                          : 'bg-fuchsia-900/50 text-fuchsia-400 border border-fuchsia-500/50 hover:bg-fuchsia-900'
                        }
                      `}
                     >
                       {lineage === Lineage.WIZARD ? <Sparkles size={14} /> : <Download size={14} />}
                       {lineage === Lineage.WIZARD ? 'REVEAL' : 'READ'}
                     </button>
                   )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Navigation Controls (Mobile Friendly) */}
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
          @keyframes fade-in-up {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        `
      }} />
    </div>
  );
};

export default Carousel;
