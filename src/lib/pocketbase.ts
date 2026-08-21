import PocketBase from 'pocketbase';
import { db } from './db';

export const pb = new PocketBase(
  import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090'
);

pb.autoCancellation(false);

export const collections = [
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

type CollectionName = (typeof collections)[number];

const getLocalTable = (collection: CollectionName) =>
  (db as unknown as Record<CollectionName, { clear: () => Promise<void>; bulkPut: (items: unknown[]) => Promise<void> }>)[collection];

/**
 * Pull the authenticated user's PocketBase data into IndexedDB.
 * The UI can then read from Dexie/useLiveQuery instead of requesting PocketBase directly.
 */
export async function syncDown(): Promise<void> {
  if (!pb.authStore.isValid) return;

  const userId = pb.authStore.model?.id;
  if (!userId) return;

  const remoteData = new Map<CollectionName, unknown[]>();

  for (const collectionName of collections) {
    const records = await pb.collection(collectionName).getFullList({
      filter: `user = "${userId}"`
    });

    remoteData.set(
      collectionName,
      records.map((record) => {
        const {
          id: _id,
          user: _user,
          recordId,
          collectionId: _collectionId,
          collectionName: _collectionName,
          created: _created,
          updated: _updated,
          expand: _expand,
          ...data
        } = record;

        return {
          id: recordId,
          ...data
        };
      })
    );
  }

  db.ignoreSync = true;

  try {
    await db.transaction(
      'rw',
      collections.map((collectionName) => getLocalTable(collectionName)),
      async () => {
        for (const collectionName of collections) {
          const table = getLocalTable(collectionName);
          await table.clear();
          await table.bulkPut(remoteData.get(collectionName) ?? []);
        }
      }
    );
  } finally {
    db.ignoreSync = false;
  }
}
