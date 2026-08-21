import { pb } from './pocketbase';
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

  // Prevent IndexedDB -> PocketBase hooks while syncing PocketBase -> IndexedDB.
  ignoreSync = false;

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

db.on('populate', async () => {
  await db.settings.add({
    id: 'global',
    globalReminderTime: '20:00',
    theme: 'light',
    language: 'en'
  });
});

const collectionsToSync = [
  'habits',
  'dayRecords',
  'settings',
  'workoutPlans',
  'workoutPlanVersions',
  'workoutDailyRecords',
  'workoutSetRecords',
  'nutritionDailyRecords',
  'nutritionFoodRecords',
  'extraFoodRecords',
  'weeklyProgressRecords',
  'workoutNutritionNotes'
] as const;

collectionsToSync.forEach((collectionName) => {
  // IndexedDB -> PocketBase: keep remote data in sync with local writes.
  // @ts-ignore Dexie dynamic table access
  db[collectionName].hook('creating', (primKey: string, obj: Record<string, unknown>) => {
    if (!pb.authStore.isValid || db.ignoreSync) return;

    const payload = {
      ...obj,
      recordId: primKey,
      user: pb.authStore.model?.id
    };
    delete payload.id;

    void pb.collection(collectionName).create(payload).catch(console.error);
  });

  // @ts-ignore Dexie dynamic table access
  db[collectionName].hook('updating', (mods: Record<string, unknown>, primKey: string) => {
    if (!pb.authStore.isValid || db.ignoreSync) return;

    void pb
      .collection(collectionName)
      .getFirstListItem(`recordId="${primKey}"`)
      .then((record) => pb.collection(collectionName).update(record.id, mods))
      .catch(console.error);
  });

  // @ts-ignore Dexie dynamic table access
  db[collectionName].hook('deleting', (primKey: string) => {
    if (!pb.authStore.isValid || db.ignoreSync) return;

    void pb
      .collection(collectionName)
      .getFirstListItem(`recordId="${primKey}"`)
      .then((record) => pb.collection(collectionName).delete(record.id))
      .catch(console.error);
  });
});
