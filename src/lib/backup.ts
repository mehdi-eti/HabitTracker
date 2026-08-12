/** @format */

import { db } from "./db";

export const BACKUP_VERSION = 1;

export interface HabitTrackerBackup {
	backupVersion: number;
	exportedAt: string;
	database: string;
	tables: {
		habits: Awaited<ReturnType<typeof db.habits.toArray>>;
		dayRecords: Awaited<ReturnType<typeof db.dayRecords.toArray>>;
		settings: Awaited<ReturnType<typeof db.settings.toArray>>;
		workoutPlans: Awaited<ReturnType<typeof db.workoutPlans.toArray>>;
		workoutPlanVersions: Awaited<ReturnType<typeof db.workoutPlanVersions.toArray>>;
		workoutDailyRecords: Awaited<ReturnType<typeof db.workoutDailyRecords.toArray>>;
		workoutSetRecords: Awaited<ReturnType<typeof db.workoutSetRecords.toArray>>;
		nutritionDailyRecords: Awaited<ReturnType<typeof db.nutritionDailyRecords.toArray>>;
		nutritionFoodRecords: Awaited<ReturnType<typeof db.nutritionFoodRecords.toArray>>;
		extraFoodRecords: Awaited<ReturnType<typeof db.extraFoodRecords.toArray>>;
		weeklyProgressRecords: Awaited<ReturnType<typeof db.weeklyProgressRecords.toArray>>;
		workoutNutritionNotes: Awaited<ReturnType<typeof db.workoutNutritionNotes.toArray>>;
	};
}

export async function createFullBackup(): Promise<HabitTrackerBackup> {
	return db.transaction(
		"r",
		[
			db.habits,
			db.dayRecords,
			db.settings,
			db.workoutPlans,
			db.workoutPlanVersions,
			db.workoutDailyRecords,
			db.workoutSetRecords,
			db.nutritionDailyRecords,
			db.nutritionFoodRecords,
			db.extraFoodRecords,
			db.weeklyProgressRecords,
			db.workoutNutritionNotes,
		],
		async () => ({
			backupVersion: BACKUP_VERSION,
			exportedAt: new Date().toISOString(),
			database: "HabitTrackerDB",
			tables: {
				habits: await db.habits.toArray(),
				dayRecords: await db.dayRecords.toArray(),
				settings: await db.settings.toArray(),
				workoutPlans: await db.workoutPlans.toArray(),
				workoutPlanVersions: await db.workoutPlanVersions.toArray(),
				workoutDailyRecords: await db.workoutDailyRecords.toArray(),
				workoutSetRecords: await db.workoutSetRecords.toArray(),
				nutritionDailyRecords: await db.nutritionDailyRecords.toArray(),
				nutritionFoodRecords: await db.nutritionFoodRecords.toArray(),
				extraFoodRecords: await db.extraFoodRecords.toArray(),
				weeklyProgressRecords: await db.weeklyProgressRecords.toArray(),
				workoutNutritionNotes: await db.workoutNutritionNotes.toArray(),
			},
		}),
	);
}

export async function restoreFullBackup(backup: HabitTrackerBackup): Promise<void> {
	if (!backup.backupVersion) {
		throw new Error("Invalid backup format");
	}

	return db.transaction(
		"rw",
		[
			db.habits,
			db.dayRecords,
			db.settings,
			db.workoutPlans,
			db.workoutPlanVersions,
			db.workoutDailyRecords,
			db.workoutSetRecords,
			db.nutritionDailyRecords,
			db.nutritionFoodRecords,
			db.extraFoodRecords,
			db.weeklyProgressRecords,
			db.workoutNutritionNotes,
		],
		async () => {
			await clearAllData();

			if (backup.tables.habits) await db.habits.bulkAdd(backup.tables.habits as any);
			if (backup.tables.dayRecords) await db.dayRecords.bulkAdd(backup.tables.dayRecords as any);
			if (backup.tables.settings) await db.settings.bulkAdd(backup.tables.settings as any);
			if (backup.tables.workoutPlans) await db.workoutPlans.bulkAdd(backup.tables.workoutPlans as any);
			if (backup.tables.workoutPlanVersions) await db.workoutPlanVersions.bulkAdd(backup.tables.workoutPlanVersions as any);
			if (backup.tables.workoutDailyRecords) await db.workoutDailyRecords.bulkAdd(backup.tables.workoutDailyRecords as any);
			if (backup.tables.workoutSetRecords) await db.workoutSetRecords.bulkAdd(backup.tables.workoutSetRecords as any);
			if (backup.tables.nutritionDailyRecords) await db.nutritionDailyRecords.bulkAdd(backup.tables.nutritionDailyRecords as any);
			if (backup.tables.nutritionFoodRecords) await db.nutritionFoodRecords.bulkAdd(backup.tables.nutritionFoodRecords as any);
			if (backup.tables.extraFoodRecords) await db.extraFoodRecords.bulkAdd(backup.tables.extraFoodRecords as any);
			if (backup.tables.weeklyProgressRecords) await db.weeklyProgressRecords.bulkAdd(backup.tables.weeklyProgressRecords as any);
			if (backup.tables.workoutNutritionNotes) await db.workoutNutritionNotes.bulkAdd(backup.tables.workoutNutritionNotes as any);
		},
	);
}

export async function clearAllData(): Promise<void> {
	return db.transaction(
		"rw",
		[
			db.habits,
			db.dayRecords,
			db.settings,
			db.workoutPlans,
			db.workoutPlanVersions,
			db.workoutDailyRecords,
			db.workoutSetRecords,
			db.nutritionDailyRecords,
			db.nutritionFoodRecords,
			db.extraFoodRecords,
			db.weeklyProgressRecords,
			db.workoutNutritionNotes,
		],
		async () => {
			await db.habits.clear();
			await db.dayRecords.clear();
			await db.settings.clear();
			await db.workoutPlans.clear();
			await db.workoutPlanVersions.clear();
			await db.workoutDailyRecords.clear();
			await db.workoutSetRecords.clear();
			await db.nutritionDailyRecords.clear();
			await db.nutritionFoodRecords.clear();
			await db.extraFoodRecords.clear();
			await db.weeklyProgressRecords.clear();
			await db.workoutNutritionNotes.clear();
		},
	);
}
