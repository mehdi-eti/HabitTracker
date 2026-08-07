/** @format */

export type HabitMode = "consecutive" | "selected_days";
export type HabitStatus = "active" | "completed" | "deleted" | "archived";
export type HabitCategory = "health" | "work" | "personal" | "learning" | "finance" | "other";
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface HabitTask {
	id: string;
	title: string;
}

export interface Habit {
	id: string;
	title: string;
	description: string;
	createdAt: number;
	mode: HabitMode;
	selectedDays: DayOfWeek[];
	status: HabitStatus;
	category?: HabitCategory;
	version: number;
	originalHabitId?: string;
	reminderTime?: string; // HH:mm
	durationDays?: number; // Custom duration
	color?: string;
	hidden: boolean;
	currentStartDate: string; // YYYY-MM-DD
	completedAt?: number;
	tasks?: HabitTask[];
}

export interface DayRecord {
	id: string; // format: habitId_YYYY-MM-DD
	habitId: string;
	date: string; // YYYY-MM-DD
	completed: boolean;
	note?: string;
	updatedAt: number;
	taskCompletions?: Record<string, boolean>;
}

export interface AppSettings {
	id: "global";
	globalReminderTime: string; // HH:mm
	theme: string;
	language: "en" | "fa";
}
