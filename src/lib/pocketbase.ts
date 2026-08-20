import PocketBase from 'pocketbase';
import { db } from './db';

// This URL should be the URL of the PocketBase instance. 
// As an example, assuming local dev or environment variable.
export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090');

// Disable auto cancellation to allow concurrent requests during sync
pb.autoCancellation(false);

const collections = [
  'habits', 'dayRecords', 'settings', 'workoutPlans', 
  'workoutPlanVersions', 'workoutDailyRecords', 'workoutSetRecords', 
  'nutritionDailyRecords', 'nutritionFoodRecords', 'extraFoodRecords', 
  'weeklyProgressRecords', 'workoutNutritionNotes'
];

export async function syncDown() {
  if (!pb.authStore.isValid) return;

  const userId = pb.authStore.model?.id;
  if (!userId) return;

  try {
    const allData = {};
    for (const col of collections) {
      const records = await pb.collection(col).getFullList({
        filter: `user = "${userId}"`
      });
      allData[col] = records.map(r => {
        const { id, user, recordId, collectionId, collectionName, created, updated, expand, ...rest } = r;
        return { id: recordId, ...rest };
      });
    }

    await db.transaction('rw', collections.map(c => db[c as keyof typeof db]), async () => {
      // @ts-ignore
      db.ignoreSync = true;
      for (const col of collections) {
        // @ts-ignore
        await db[col].clear();
        // @ts-ignore
        await db[col].bulkAdd(allData[col]);
      }
    });
  } finally {
    // @ts-ignore
    db.ignoreSync = false;
  }
}
