import { useEffect } from 'react';
import { db } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { getTodayStr } from '../lib/utils';
import { Habit } from '../types';

export function useNotifications() {
  const habits = useLiveQuery(() => db.habits.where('status').equals('active').toArray());
  const settings = useLiveQuery(() => db.settings.get('global'));

  useEffect(() => {
    if (!habits || !settings) return;

    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    if (Notification.permission !== 'granted') return;

    const todayStr = getTodayStr();
    const todayObj = new Date();
    const currentDayOfWeek = todayObj.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const currentTimeStr = `${todayObj.getHours().toString().padStart(2, '0')}:${todayObj.getMinutes().toString().padStart(2, '0')}`;

    const timeouts: NodeJS.Timeout[] = [];

    habits.forEach(habit => {
      // Check if habit is scheduled for today
      if (habit.mode === 'selected_days' && !habit.selectedDays.includes(currentDayOfWeek)) {
        return;
      }

      const reminderTime = habit.reminderTime || settings.globalReminderTime;
      if (!reminderTime) return;

      const storageKey = `notified_${habit.id}_${todayStr}`;
      
      // If already notified today, skip
      if (localStorage.getItem(storageKey)) return;

      if (currentTimeStr >= reminderTime) {
        // It's past the reminder time for today, and we haven't notified yet (page was closed)
        // Show immediately
        showNotification(habit);
        localStorage.setItem(storageKey, 'true');
      } else {
        // Schedule for later today
        const [hours, minutes] = reminderTime.split(':').map(Number);
        const targetTime = new Date();
        targetTime.setHours(hours, minutes, 0, 0);
        
        const delay = targetTime.getTime() - Date.now();
        if (delay > 0) {
          const timeout = setTimeout(() => {
            showNotification(habit);
            localStorage.setItem(storageKey, 'true');
          }, delay);
          timeouts.push(timeout);
        }
      }
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [habits, settings]);

  const showNotification = (habit: Habit) => {
    new Notification('Habit Reminder', {
      body: `Don't forget to complete your habit: ${habit.title}`,
      icon: '/vite.svg',
    });
  };
}
