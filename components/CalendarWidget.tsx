import React, { useState, useMemo } from 'react';
import { Lineage, CarouselItem } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';

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

  // Helper to normalize date strings (YYYY.MM.DD or YYYY-MM-DD)
  const normalizeDate = (d: string) => d.replace(/-/g, '.');

  // Identify days with items
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
        onSelectDate(''); // Deselect
    } else {
        onSelectDate(dateStr);
    }
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 rounded border transition-all hover:bg-white/5
          ${selectedDate 
            ? (isWizard ? 'bg-emerald-900/40 border-emerald-500 text-emerald-300' : 'bg-fuchsia-900/40 border-fuchsia-500 text-fuchsia-300')
            : (isWizard ? 'border-emerald-700 text-emerald-100' : 'border-fuchsia-700 text-fuchsia-100')
          }
        `}
      >
        <CalendarIcon size={16} />
        <span className={isWizard ? 'font-wizard' : 'font-muggle text-xs'}>
            {selectedDate || (isWizard ? "Consult Calendar" : "Filter Date")}
        </span>
        {selectedDate && <span onClick={(e) => { e.stopPropagation(); onSelectDate(''); }}><X size={14}/></span>}
      </button>
    );
  }

  return (
    <div className={`absolute top-full left-0 mt-2 z-50 p-4 rounded-xl border shadow-2xl w-80 backdrop-blur-xl animate-[fade-in_0.2s]
      ${isWizard 
        ? 'bg-[#0a0f0a] border-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.2)] font-wizard text-emerald-100' 
        : 'bg-[#0f0a15] border-fuchsia-600 shadow-[0_0_20px_rgba(217,70,239,0.2)] font-muggle text-fuchsia-100'}
    `}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <button onClick={handlePrevMonth} className={`p-1 rounded hover:bg-white/10 ${isWizard ? 'text-emerald-400' : 'text-fuchsia-400'}`}>
            <ChevronLeft size={20} />
        </button>
        <div className={`font-bold text-lg ${isWizard ? 'text-emerald-100' : 'text-fuchsia-100'}`}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
        <button onClick={handleNextMonth} className={`p-1 rounded hover:bg-white/10 ${isWizard ? 'text-emerald-400' : 'text-fuchsia-400'}`}>
            <ChevronRight size={20} />
        </button>
      </div>

      {/* Grid */}
      <div className={`grid grid-cols-7 gap-1 text-center text-xs mb-2 opacity-50 ${isWizard ? 'text-emerald-200' : 'text-fuchsia-200'}`}>
        {['S','M','T','W','T','F','S'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {/* Empty slots for start of month */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}

        {/* Days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const monthStr = String(currentMonth.getMonth() + 1).padStart(2, '0');
            const dayStr = String(day).padStart(2, '0');
            const fullDate = `${currentMonth.getFullYear()}.${monthStr}.${dayStr}`;
            const isActive = activeDates.has(fullDate);
            const isSelected = selectedDate === fullDate;

            return (
                <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`h-9 w-9 rounded-full flex flex-col items-center justify-center relative transition-all
                        ${isSelected 
                            ? (isWizard ? 'bg-emerald-600 text-black font-bold' : 'bg-fuchsia-600 text-black font-bold') 
                            : 'hover:bg-white/10'}
                        ${!isSelected && isWizard ? 'text-emerald-100' : ''}
                        ${!isSelected && !isWizard ? 'text-fuchsia-100' : ''}
                    `}
                >
                    <span>{day}</span>
                    {isActive && !isSelected && (
                        <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isWizard ? 'bg-emerald-500' : 'bg-fuchsia-500'}`}></span>
                    )}
                </button>
            );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center">
        <button onClick={() => onSelectDate('')} className="text-xs hover:underline opacity-70">Clear Selection</button>
        <button onClick={() => setIsOpen(false)} className={`text-xs px-2 py-1 rounded border ${isWizard ? 'border-emerald-800 text-emerald-400' : 'border-fuchsia-800 text-fuchsia-400'}`}>
            Close
        </button>
      </div>
    </div>
  );
};

export default CalendarWidget;