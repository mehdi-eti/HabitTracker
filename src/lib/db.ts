import Dexie, { Table } from 'dexie';
import { Habit, DayRecord, AppSettings } from '../types';

export class HabitTrackerDB extends Dexie {
  habits!: Table<Habit, string>;
  dayRecords!: Table<DayRecord, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('HabitTrackerDB');
    this.version(1).stores({
      habits: 'id, status, originalHabitId',
      dayRecords: 'id, habitId, date, [habitId+date]',
      settings: 'id'
    });
  }
}

export const db = new HabitTrackerDB();

// Initialize default settings if they don't exist
db.on('populate', async () => {
  await db.settings.add({
    id: 'global',
    globalReminderTime: '20:00',
    theme: 'light',
    language: 'en'
  });
});
