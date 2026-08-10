/** @format */

export interface WorkoutPlan {
	id: string;
	name: string;
	description: string;
	createdAt: number;
	status: "active" | "archived" | "deleted";
	durationDays: number;
	startDate?: string; // YYYY-MM-DD
	version: number;
}

export interface WorkoutPlanVersion {
	id: string; // planId_version
	planId: string;
	version: number;
	createdAt: number;
	data: any; // The JSON structure of the plan for this version
}

export interface WorkoutDailyRecord {
	id: string; // planId_YYYY-MM-DD
	planId: string;
	date: string; // YYYY-MM-DD
	completed: boolean;
	restDay: boolean;
}

export interface WorkoutSetRecord {
	id: string; // recordId_exerciseId_setIndex
	dailyRecordId: string;
	exerciseId: string;
	setIndex: number;
	plannedReps: number;
	actualReps: number;
	plannedWeight: number;
	actualWeight: number;
}

export interface NutritionDailyRecord {
	id: string; // planId_YYYY-MM-DD
	planId: string;
	date: string; // YYYY-MM-DD
	completed: boolean;
}

export interface NutritionFoodRecord {
	id: string; // dailyRecordId_foodId
	dailyRecordId: string;
	foodId: string;
	plannedQuantity: string;
	consumed: boolean;
	consumedMoreThanPlanned?: boolean;
	planId?: string;
	planWeek?: number;
	nutritionCycle?: number;
	date?: string;
	mealId?: string;
}

export interface ExtraFoodRecord {
	id: string;
	dailyRecordId: string;
	description: string;
	time: string; // HH:mm
}

export interface WeeklyProgressRecord {
	id: string; // YYYY-MM-DD (typically end of week)
	date: string;
	weight: number;
	chest: number;
	waist: number;
	hips: number;
	arms: number;
	legs: number;
}

export interface WorkoutNutritionNote {
	id: string; // YYYY-MM-DD
	date: string;
	note: string;
}
