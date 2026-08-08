import Dexie, { Table } from 'dexie';
import { Habit, DayRecord, AppSettings } from '../types';
import {
  WorkoutPlan,
  WorkoutPlanVersion,
  WorkoutDailyRecord,
  WorkoutSetRecord,
  NutritionDailyRecord,
  NutritionFoodRecord,
  ExtraFoodRecord,
  WeeklyProgressRecord,
  WorkoutNutritionNote
} from '../types/workout';

export class HabitTrackerDB extends Dexie {
  habits!: Table<Habit, string>;
  dayRecords!: Table<DayRecord, string>;
  settings!: Table<AppSettings, string>;

  workoutPlans!: Table<WorkoutPlan, string>;
  workoutPlanVersions!: Table<WorkoutPlanVersion, string>;
  workoutDailyRecords!: Table<WorkoutDailyRecord, string>;
  workoutSetRecords!: Table<WorkoutSetRecord, string>;
  nutritionDailyRecords!: Table<NutritionDailyRecord, string>;
  nutritionFoodRecords!: Table<NutritionFoodRecord, string>;
  extraFoodRecords!: Table<ExtraFoodRecord, string>;
  weeklyProgressRecords!: Table<WeeklyProgressRecord, string>;
  workoutNutritionNotes!: Table<WorkoutNutritionNote, string>;

  constructor() {
    super('HabitTrackerDB');
    this.version(1).stores({
      habits: 'id, status, originalHabitId',
      dayRecords: 'id, habitId, date, [habitId+date]',
      settings: 'id'
    });

    this.version(2).stores({
      workoutPlans: 'id, status',
      workoutPlanVersions: 'id, planId',
      workoutDailyRecords: 'id, planId, date, [planId+date]',
      workoutSetRecords: 'id, dailyRecordId',
      nutritionDailyRecords: 'id, planId, date, [planId+date]',
      nutritionFoodRecords: 'id, dailyRecordId',
      extraFoodRecords: 'id, dailyRecordId',
      weeklyProgressRecords: 'id, date',
      workoutNutritionNotes: 'id, date'
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
