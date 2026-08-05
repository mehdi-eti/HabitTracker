import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameMonth, parseISO, isToday, startOfWeek, endOfWeek, getDay } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { Habit, HabitMode, HabitStatus, DayRecord } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, X, Filter } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { cn, getTodayStr } from '../lib/utils';
import HabitDetailModal from '../components/HabitDetailModal';

interface DayDetailModalProps {
  date: Date;
  habits: Habit[];
  records: DayRecord[];
  onClose: () => void;
  onHabitClick: (habit: Habit) => void;
}

const DayDetailModal = ({ date, habits, records, onClose, onHabitClick }: DayDetailModalProps) => {
  const { t, dir } = useI18n();
  const dateStr = format(date, 'yyyy-MM-dd');
  
  const relevantHabits = habits.filter(h => {
    const isSelectedDay = h.mode === 'consecutive' || (h.selectedDays || []).includes(date.getDay() as any);
    return isSelectedDay && dateStr >= (h.currentStartDate || '9999-99-99');
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" dir={dir}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {format(date, 'MMMM d, yyyy')}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto space-y-3">
          {relevantHabits.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-4">No habits scheduled for this day.</p>
          ) : (
            relevantHabits.map(habit => {
              const record = records.find(r => r.habitId === habit.id && r.date === dateStr);
              const isCompleted = record?.completed;
              return (
                <div 
                  key={habit.id}
                  onClick={() => { onClose(); onHabitClick(habit); }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500 hover:shadow-sm cursor-pointer transition-all"
                >
                  <div className="w-4 h-4 rounded-full border border-slate-200 dark:border-slate-700" style={{ backgroundColor: habit.color || '#6366f1' }} />
                  <div className="flex-1 font-bold text-slate-700 dark:text-slate-200">{habit.title}</div>
                  <div className={cn(
                    "px-2 py-1 rounded-md text-xs font-bold",
                    isCompleted ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  )}>
                    {isCompleted ? 'Done' : 'Pending'}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default function Calendar() {
  const { t, dir } = useI18n();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [statusFilter, setStatusFilter] = useState<HabitStatus | 'all'>('active');
  const [modeFilter, setModeFilter] = useState<HabitMode | 'all'>('all');
  
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const habits = useLiveQuery(() => db.habits.toArray(), []) || [];
  const allRecords = useLiveQuery(() => db.dayRecords.toArray(), []) || [];

  const filteredHabits = useMemo(() => {
    return habits.filter(h => {
      if (statusFilter !== 'all' && h.status !== statusFilter) return false;
      if (modeFilter !== 'all' && h.mode !== modeFilter) return false;
      return true;
    });
  }, [habits, statusFilter, modeFilter]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const todayStr = getTodayStr();

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  // Calculate Calendar Stats for visible month
  const stats = useMemo(() => {
    let expected = 0;
    let completed = 0;
    let missed = 0;
    
    // For each day in monthStart to monthEnd
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    filteredHabits.forEach(habit => {
      daysInMonth.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const isSelectedDay = habit.mode === 'consecutive' || (habit.selectedDays || []).includes(day.getDay() as any);
        if (isSelectedDay && dateStr >= (habit.currentStartDate || '9999-99-99') && dateStr <= todayStr) {
          expected++;
          const record = allRecords.find(r => r.habitId === habit.id && r.date === dateStr);
          if (record?.completed) {
            completed++;
          } else if (dateStr < todayStr) {
            missed++;
          }
        }
      });
    });
    
    return {
      monthlyPercent: expected > 0 ? Math.round((completed / expected) * 100) : 0,
      completed,
      missed
    };
  }, [filteredHabits, allRecords, monthStart, monthEnd, todayStr]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={dir}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <CalendarIcon className="text-indigo-500" />
            {t('calendar' as any) || 'Calendar'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Track your habits visually over time.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300 outline-none focus:border-indigo-500 shadow-sm"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
          <select 
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as any)}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300 outline-none focus:border-indigo-500 shadow-sm"
          >
            <option value="all">All Modes</option>
            <option value="consecutive">Consecutive</option>
            <option value="selected_days">Selected Days</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-xl flex items-center justify-center font-bold text-lg">
            {stats.monthlyPercent}%
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Monthly Completion</h3>
            <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Success Rate</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 rounded-xl flex items-center justify-center font-bold text-lg">
            <Check size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Completed</h3>
            <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{stats.completed} habits done</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 dark:bg-red-900/30 text-red-500 rounded-xl flex items-center justify-center font-bold text-lg">
            <X size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Missed</h3>
            <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{stats.missed} days missed</p>
          </div>
        </div>
      </div>

      {/* Calendar UI */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 w-48">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={prevMonth}
              className="p-2 rounded-xl text-slate-500 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all shadow-sm hover:shadow"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={goToToday}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
            >
              {t('today')}
            </button>
            <button 
              onClick={nextMonth}
              className="p-2 rounded-xl text-slate-500 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all shadow-sm hover:shadow"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-4 md:p-6">
          <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="bg-slate-50 dark:bg-slate-900 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span className="hidden md:inline">{d}</span>
                <span className="md:hidden">{d[0]}</span>
              </div>
            ))}
            
            {calendarDays.map((day, idx) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayFlag = dateStr === todayStr;
              
              // Get habits active on this day
              const dayHabits = filteredHabits.filter(h => {
                const isSelectedDay = h.mode === 'consecutive' || (h.selectedDays || []).includes(day.getDay() as any);
                return isSelectedDay && dateStr >= (h.currentStartDate || '9999-99-99');
              });

              return (
                <div 
                  key={idx} 
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "min-h-[100px] bg-white dark:bg-slate-900 p-2 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/80 group",
                    !isCurrentMonth && "bg-slate-50/50 dark:bg-slate-900/50 opacity-60"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold",
                      isTodayFlag 
                        ? "bg-indigo-600 text-white shadow-md" 
                        : "text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                    )}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    {dayHabits.map(habit => {
                      const record = allRecords.find(r => r.habitId === habit.id && r.date === dateStr);
                      const isCompleted = record?.completed;
                      const baseColor = habit.color || '#6366f1';
                      
                      return (
                        <div 
                          key={habit.id}
                          onClick={(e) => { e.stopPropagation(); setSelectedHabit(habit); }}
                          className={cn(
                            "text-xs px-2 py-1 rounded md:rounded-md font-bold truncate transition-all shadow-sm hover:opacity-80",
                            isCompleted ? "text-white" : "text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                          )}
                          style={isCompleted ? { backgroundColor: baseColor } : { borderLeftColor: baseColor, borderLeftWidth: '4px' }}
                          title={habit.title}
                        >
                          {habit.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedHabit && (
        <HabitDetailModal habit={selectedHabit} onClose={() => setSelectedHabit(null)} />
      )}
      
      {selectedDay && (
        <DayDetailModal 
          date={selectedDay} 
          habits={filteredHabits} 
          records={allRecords} 
          onClose={() => setSelectedDay(null)} 
          onHabitClick={(habit) => setSelectedHabit(habit)}
        />
      )}
    </div>
  );
}
