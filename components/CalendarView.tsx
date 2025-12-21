import React, { useState, useMemo } from 'react';
import { Memo } from '../types.js';
import { Icons } from '../constants.js';

interface CalendarViewProps {
  memos: Memo[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ memos }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const memosByDate = useMemo(() => {
    const map: Record<number, Memo[]> = {};
    memos.forEach(memo => {
      if (memo.dueDate && !memo.isDeleted && !memo.isArchived) {
        const date = new Date(memo.dueDate);
        if (date.getFullYear() === year && date.getMonth() === month) {
          const day = date.getDate();
          if (!map[day]) map[day] = [];
          map[day].push(memo);
        }
      }
    });
    return map;
  }, [memos, year, month]);

  const renderCalendarDays = () => {
    const days = [];
    const totalSlots = Math.ceil((daysInMonth + firstDayOfMonth) / 7) * 7;

    for (let i = 0; i < totalSlots; i++) {
      const dayNumber = i - firstDayOfMonth + 1;
      const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
      const isToday = isCurrentMonth && 
        new Date().getDate() === dayNumber && 
        new Date().getMonth() === month && 
        new Date().getFullYear() === year;

      const dayMemos = isCurrentMonth ? memosByDate[dayNumber] || [] : [];

      days.push(
        <div 
          key={i} 
          className={`
            min-h-[100px] border border-slate-50 p-2 relative group transition-colors
            ${!isCurrentMonth ? 'bg-slate-50/50' : 'bg-white hover:bg-blue-50/30'}
            ${isToday ? 'bg-blue-50/50' : ''}
          `}
        >
          {isCurrentMonth && (
            <>
              <div className={`
                w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold mb-2
                ${isToday ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-400 group-hover:text-blue-600'}
              `}>
                {dayNumber}
              </div>
              <div className="space-y-1 overflow-y-auto max-h-[80px] no-scrollbar">
                {dayMemos.map(memo => (
                  <div 
                    key={memo.id}
                    className={`
                      text-[10px] px-2 py-1 rounded-md truncate border-l-2 cursor-pointer transition-all hover:scale-105 shadow-sm
                      ${memo.completedAt ? 'bg-slate-100 text-slate-400 border-slate-300 line-through decoration-slate-400' : 
                        memo.priority === 'important' ? 'bg-rose-50 text-rose-700 border-rose-500' :
                        memo.priority === 'normal' ? 'bg-blue-50 text-blue-700 border-blue-500' :
                        'bg-slate-50 text-slate-600 border-slate-400'
                      }
                    `}
                    title={memo.content}
                  >
                    {memo.content}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      );
    }
    return days;
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in duration-500">
      <header className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center bg-slate-100 rounded-xl p-1">
            <button onClick={prevMonth} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={nextMonth} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
        <button 
          onClick={goToToday}
          className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-lg shadow-slate-200 hover:bg-blue-600 hover:shadow-blue-200 transition-all active:scale-95"
        >
          Today
        </button>
      </header>

      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
        {weekDays.map(day => (
          <div key={day} className="py-4 text-center text-xs font-black text-slate-400 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 bg-slate-100 gap-[1px]">
        {renderCalendarDays()}
      </div>
    </div>
  );
};

export default CalendarView;
