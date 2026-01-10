import React, { useState, useMemo } from 'react';
import { Lineage, CarouselItem } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Check } from 'lucide-react';

interface CalendarWidgetProps {
  lineage: Lineage;
  items: CarouselItem[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ 
  lineage, items, selectedDate, onSelectDate, isOpen, setIsOpen 
}) => {
  const isWizard = lineage === Lineage.WIZARD;
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const normalizeDate = (d: string) => d.replace(/-/g, '.');

  const activeDates = useMemo(() => {
    const dates = new Set<string>();
    items.forEach(item => dates.add(normalizeDate(item.date)));
    return dates;
  }, [items]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const dateStr = `${currentMonth.getFullYear()}.${month}.${d}`;
    
    if (selectedDate === dateStr) {
        onSelectDate(''); 
    } else {
        onSelectDate(dateStr);
    }
    setIsOpen(false); // Auto close on select for better UX
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Trigger Button (The small button in the HUD/Header)
  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-lg transition-all hover:scale-105 active:scale-95
          ${selectedDate 
            ? (isWizard ? 'bg-emerald-900/80 border-emerald-400 text-emerald-300 shadow-emerald-900/50' : 'bg-fuchsia-900/80 border-fuchsia-400 text-fuchsia-300 shadow-fuchsia-900/50')
            : (isWizard ? 'bg-black/40 border-emerald-800 text-emerald-100 hover:bg-emerald-900/30' : 'bg-black/40 border-fuchsia-800 text-fuchsia-100 hover:bg-fuchsia-900/30')
          }
        `}
      >
        <CalendarIcon size={16} />
        <span className={isWizard ? 'font-wizard tracking-wider' : 'font-muggle text-xs'}>
            {selectedDate || (isWizard ? "Consult Stars" : "Filter Date")}
        </span>
        {selectedDate && (
            <span 
                onClick={(e) => { e.stopPropagation(); onSelectDate(''); }}
                className="ml-1 p-1 rounded-full hover:bg-white/20"
            >
                <X size={12}/>
            </span>
        )}
      </button>
    );
  }

  // Full Screen Backdrop & Modal
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fade-in_0.2s]">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={() => setIsOpen(false)}></div>

      <div className={`relative w-full max-w-md p-6 rounded-2xl border-2 shadow-2xl transform transition-all animate-[scale-up_0.2s]
        ${isWizard 
          ? 'bg-[#0a0f0a] border-emerald-600/50 shadow-[0_0_50px_rgba(16,185,129,0.2)] font-wizard text-emerald-100' 
          : 'bg-[#0f0a15] border-fuchsia-600/50 shadow-[0_0_50px_rgba(217,70,239,0.2)] font-muggle text-fuchsia-100'}
      `}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={handlePrevMonth} className={`p-2 rounded-full hover:bg-white/10 transition-colors ${isWizard ? 'text-emerald-400' : 'text-fuchsia-400'}`}>
              <ChevronLeft size={24} />
          </button>
          <div className="text-center">
              <div className="text-xl font-bold tracking-widest">{monthNames[currentMonth.getMonth()]}</div>
              <div className="text-xs opacity-50 font-mono">{currentMonth.getFullYear()}</div>
          </div>
          <button onClick={handleNextMonth} className={`p-2 rounded-full hover:bg-white/10 transition-colors ${isWizard ? 'text-emerald-400' : 'text-fuchsia-400'}`}>
              <ChevronRight size={24} />
          </button>
        </div>

        {/* Days Header */}
        <div className={`grid grid-cols-7 mb-4 text-center text-xs font-bold opacity-60 ${isWizard ? 'text-emerald-400' : 'text-fuchsia-400'}`}>
          {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => <div key={d} className="py-1">{d}</div>)}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}

          {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const monthStr = String(currentMonth.getMonth() + 1).padStart(2, '0');
              const dayStr = String(day).padStart(2, '0');
              const fullDate = `${currentMonth.getFullYear()}.${monthStr}.${dayStr}`;
              const hasActivity = activeDates.has(fullDate);
              const isSelected = selectedDate === fullDate;
              const isToday = new Date().toDateString() === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toDateString();

              return (
                  <button
                      key={day}
                      onClick={() => handleDateClick(day)}
                      className={`
                          aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all duration-200 border border-transparent
                          ${isSelected 
                              ? (isWizard ? 'bg-emerald-600 text-black shadow-[0_0_15px_#10b981] scale-110 z-10' : 'bg-fuchsia-600 text-black shadow-[0_0_15px_#d946ef] scale-110 z-10') 
                              : 'hover:bg-white/10 hover:border-white/20 hover:scale-105'}
                          ${isToday && !isSelected ? 'border-white/30 bg-white/5' : ''}
                      `}
                  >
                      <span className="text-sm font-bold">{day}</span>
                      
                      {/* Activity Dot */}
                      {hasActivity && !isSelected && (
                          <span className={`absolute bottom-2 w-1.5 h-1.5 rounded-full ${isWizard ? 'bg-emerald-400' : 'bg-fuchsia-400'}`}></span>
                      )}
                      
                      {/* Checkmark for Selected */}
                      {isSelected && <Check size={12} className="absolute bottom-1" strokeWidth={4} />}
                  </button>
              );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-white/10 flex justify-between items-center">
            <button 
                onClick={() => { onSelectDate(''); setIsOpen(false); }} 
                className="text-xs hover:underline opacity-60 hover:opacity-100 transition-opacity"
            >
                Clear Filter
            </button>
            <button 
                onClick={() => setIsOpen(false)} 
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${isWizard ? 'bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200' : 'bg-fuchsia-900/50 hover:bg-fuchsia-800 text-fuchsia-200'}`}
            >
                CLOSE
            </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarWidget;