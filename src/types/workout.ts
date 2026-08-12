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
	data: PlanJsonData; // The JSON structure of the plan for this version
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

export interface PlanJsonExerciseSet {
	plannedReps?: number;
	targetReps?: number;
	plannedWeight?: number;
	targetWeight?: number;
	targetWeightKg?: number;
	durationMinutes?: number;
}

export interface PlanJsonExercise {
	id?: string;
	name?: string;
	type?: string;
	targetSets?: number;
	targetReps?: number;
	targetWeight?: number;
	targetWeightKg?: number;
	durationMinutes?: number;
	restSeconds?: number;
	sets?: PlanJsonExerciseSet[];
}

export interface PlanJsonFood {
	id?: string;
	name?: string;
	type?: string;
	plannedQuantity?: string;
	amount?: number | string;
	time?: string;
}

export interface PlanJsonWorkoutSchedule {
	monday?: PlanJsonExercise[];
	tuesday?: PlanJsonExercise[];
	wednesday?: PlanJsonExercise[];
	thursday?: PlanJsonExercise[];
	friday?: PlanJsonExercise[];
	saturday?: PlanJsonExercise[];
	sunday?: PlanJsonExercise[];
	[key: string]: PlanJsonExercise[] | undefined;
}

export interface PlanJsonNutritionSchedule {
	monday?: PlanJsonFood[];
	tuesday?: PlanJsonFood[];
	wednesday?: PlanJsonFood[];
	thursday?: PlanJsonFood[];
	friday?: PlanJsonFood[];
	saturday?: PlanJsonFood[];
	sunday?: PlanJsonFood[];
	[key: string]: PlanJsonFood[] | undefined;
}

export interface PlanJsonWeeklyWorkout {
	name?: string;
	schedule?: PlanJsonWorkoutSchedule;
}

export interface PlanJsonWeeklyNutrition {
	name?: string;
	schedule?: PlanJsonNutritionSchedule;
}

export interface PlanJsonWorkoutConfig {
	schedule?: PlanJsonWorkoutSchedule;
	weeklyPlans?: Record<string, PlanJsonWeeklyWorkout>;
}

export interface PlanJsonNutritionConfig {
	schedule?: PlanJsonNutritionSchedule;
	weeklyPlans?: Record<string, PlanJsonWeeklyNutrition>;
}

export interface PlanJsonDay {
	dayIndex: number;
	planWeek: number;
	nutritionCycle: number;
	nutritionPlanName: string;
	restDay: boolean;
	workoutPlanName?: string;
	workout?: {
		title: string;
		exercises: PlanJsonExercise[];
	};
	nutrition?: {
		name: string;
		meals?: any[]; // Keep any for meal groupings if applicable, or PlanJsonFood[] if flat
	};
}

export interface PlanJsonData {
	name?: string;
	description?: string;
	durationDays?: number;
	startDate?: string;
	workout?: PlanJsonWorkoutConfig;
	nutrition?: PlanJsonNutritionConfig;
	days?: PlanJsonDay[];
}

export interface PlanJsonExport {
	plan?: PlanJsonData;
	name?: string;
	description?: string;
	durationDays?: number;
	startDate?: string;
	workout?: PlanJsonWorkoutConfig;
	nutrition?: PlanJsonNutritionConfig;
	days?: PlanJsonDay[];
}
