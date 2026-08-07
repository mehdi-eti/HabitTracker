import React, { useState, useEffect } from 'react';
import { Habit, DayRecord } from '../types';
import { useI18n } from '../contexts/I18nContext';
import { getHabitTargetDates } from '../lib/habitUtils';
import { getTodayStr, getYesterdayStr, cn } from '../lib/utils';
import { toggleDay } from '../hooks/useHabits';
import { Check, Edit2, RotateCcw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import HabitModal, { CATEGORIES } from './HabitModal';
import DailyTrackingModal from './DailyTrackingModal';
import { db } from '../lib/db';
import CSSConfetti from './CSSConfetti';

interface HabitCardProps {
  key?: React.Key;
  habit: Habit;
  dayRecords: DayRecord[];
}

export default function HabitCard({ habit, dayRecords }: HabitCardProps) {
  const { t } = useI18n();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [trackingDate, setTrackingDate] = useState<string | null>(null);
  const [undoAction, setUndoAction] = useState<{ date: string, wasCompleted: boolean } | null>(null);

  useEffect(() => {
    if (undoAction) {
      const timer = setTimeout(() => {
        setUndoAction(null);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [undoAction]);

  const handleUndo = async () => {
    if (!undoAction) return;
    await toggleDay(habit, undoAction.date, undoAction.wasCompleted);
    
    if (habit.status === 'completed' && !undoAction.wasCompleted) {
      await db.habits.update(habit.id, { status: 'active', completedAt: undefined });
    }
    
    setUndoAction(null);
  };
  
  const duration = habit.durationDays || 21;
  const targetDates = getHabitTargetDates(habit.currentStartDate, habit.mode, habit.selectedDays, duration);
  const recordsMap = new Map(dayRecords.map(r => [r.date, r.completed]));
  
  const todayStr = getTodayStr();
  const yesterdayStr = getYesterdayStr();
  
  let completedCount = 0;
  let currentStreak = 0;
  
  targetDates.forEach(date => {
    if (recordsMap.get(date)) {
      completedCount++;
      currentStreak++;
    } else if (date < todayStr) {
      currentStreak = 0; // Streak breaks if a past day is missed. 
      // But wait, the background task resets the chain if a past day (older than yesterday) is missed.
      // So if currentStreak is calculated here, we just count consecutive from start.
    }
  });

  const progressPercent = Math.round((completedCount / duration) * 100);
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const handleSaveRecord = async (completed: boolean, note: string) => {
    if (!trackingDate) return;
    const date = trackingDate;
    const wasCompleted = !!recordsMap.get(date);
    
    // We update db directly to include note instead of calling toggleDay
    const recordId = `${habit.id}_${date}`;
    if (!completed && !note.trim()) {
      await db.dayRecords.delete(recordId);
    } else {
      await db.dayRecords.put({
        id: recordId,
        habitId: habit.id,
        date,
        completed,
        note,
        updatedAt: Date.now()
      });
    }

    if (completed !== wasCompleted) {
      setUndoAction({ date, wasCompleted });
      
      const updatedCompletedCount = completed ? completedCount + 1 : completedCount - 1;
      if (updatedCompletedCount >= duration) {
        setShowConfetti(true);
        await db.habits.update(habit.id, { status: 'completed', completedAt: Date.now() });
      }
    }
  };

  const categoryDef = CATEGORIES.find(c => c.id === habit.category);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-50 dark:border-slate-800 shadow-sm relative overflow-hidden transition-all">
      <div className="flex justify-between items-start mb-6">
        <div className="flex gap-4 items-center">
          <div className="relative w-14 h-14 shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-slate-100 dark:text-slate-800" />
              <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="5" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="text-indigo-600 dark:text-indigo-500 transition-all duration-500" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold">{progressPercent}%</span>
            </div>
          </div>
          <div>
            {categoryDef && (
              <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold mb-1 uppercase tracking-wider ${categoryDef.color.split(' ').filter(c => c.startsWith('text-') || c.startsWith('bg-')).join(' ')}`}>
                {t(categoryDef.label as any)}
              </span>
            )}
            <h3 className="text-lg font-bold mb-1 leading-tight">{habit.title}</h3>
            {habit.description && (
              <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-1">{habit.description}</p>
            )}
          </div>
        </div>
        <button 
          onClick={() => setIsEditModalOpen(true)}
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors shrink-0"
        >
          <Edit2 size={18} />
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {targetDates.map((date, index) => {
          const record = dayRecords.find(r => r.date === date);
          const isCompleted = !!record?.completed;
          const hasNote = !!record?.note?.trim();
          const isToday = date === todayStr;
          const isYesterday = date === yesterdayStr;
          const isFuture = date > todayStr;
          const isEditable = isToday || isYesterday;
          
          return (
            <button
              key={date}
              disabled={isFuture}
              onClick={() => setTrackingDate(date)}
              title={format(parseISO(date), 'MMM d, yyyy')}
              className={cn(
                "relative aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all",
                isCompleted 
                  ? "bg-indigo-500 text-white shadow-sm" 
                  : isFuture 
                    ? "bg-slate-50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700",
                isToday && !isCompleted && "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900",
                !isEditable && !isFuture && !isCompleted && "bg-red-50 dark:bg-red-900/20 text-red-300 cursor-not-allowed" // Missed day
              )}
            >
              {isCompleted ? <Check size={14} strokeWidth={3} /> : index + 1}
              {hasNote && (
                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
            </button>
          );
        })}
      </div>
      
      {undoAction && (
        <div className="flex justify-between items-center bg-slate-800 dark:bg-slate-800 text-white dark:text-slate-200 p-3 rounded-xl mb-4 text-sm font-medium animate-in fade-in slide-in-from-top-2">
          <span>{undoAction.wasCompleted ? 'Day unmarked' : 'Day completed'}</span>
          <button onClick={handleUndo} className="flex items-center gap-1 text-indigo-300 hover:text-indigo-200 transition-colors">
            <RotateCcw size={14} /> Undo
          </button>
        </div>
      )}
      
      {/* Reflections History */}
      {dayRecords.some(r => r.note?.trim()) && (
        <div className="mb-4">
          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Reflections</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
            {dayRecords
              .filter(r => r.note?.trim())
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(record => (
                <div key={record.id} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-sm border border-slate-100 dark:border-slate-700/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-600 dark:text-slate-300 text-xs">
                      {format(parseISO(record.date), 'MMM d, yyyy')}
                    </span>
                    {record.completed && <Check size={12} className="text-emerald-500" />}
                  </div>
                  <div className="text-slate-700 dark:text-slate-200 text-sm prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: record.note || '' }} />
                </div>
              ))
            }
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">{currentStreak}</span> {t('streak')}
        </div>
        <div className="text-xs px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300">
          {habit.mode === 'consecutive' ? t('consecutive_days') : t('selected_days')}
        </div>
      </div>

      {showConfetti && <CSSConfetti active={showConfetti} onComplete={() => setShowConfetti(false)} />}
      {isEditModalOpen && (
        <HabitModal 
          habit={habit} 
          onClose={() => setIsEditModalOpen(false)} 
        />
      )}

      {trackingDate && (
        <DailyTrackingModal
          habit={habit}
          date={trackingDate}
          initialRecord={dayRecords.find(r => r.date === trackingDate)}
          isEditable={trackingDate === todayStr || trackingDate === yesterdayStr}
          onClose={() => setTrackingDate(null)}
          onSave={handleSaveRecord}
        />
      )}
    </div>
  );
}
