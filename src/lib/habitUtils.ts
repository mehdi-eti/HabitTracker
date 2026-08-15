/** @format */

import { addDays, format, getDay } from "date-fns";
import { parseLocalDate } from "./utils";

import { DayRecord, Habit } from "../types";

export function getHabitTargetDates(
	startDateStr: string,
	mode: "consecutive" | "selected_days",
	selectedDays: number[],
	totalDays: number = 21,
): string[] {
	const dates: string[] = [];
	let currentDate = parseLocalDate(startDateStr);

	while (dates.length < totalDays) {
		if (mode === "consecutive") {
			dates.push(format(currentDate, "yyyy-MM-dd"));
		} else {
			const dayOfWeek = getDay(currentDate);
			if (selectedDays.includes(dayOfWeek)) {
				dates.push(format(currentDate, "yyyy-MM-dd"));
			}
		}
		currentDate = addDays(currentDate, 1);
	}

	return dates;
}

export function checkAndResetHabit(
	habit: any,
	dayRecords: any[],
	todayStr: string,
	yesterdayStr: string,
): { requiresReset: boolean; missedDate?: string } {
	const targetDates = getHabitTargetDates(habit.currentStartDate, habit.mode, habit.selectedDays, habit.durationDays || 21);
	const recordsMap = new Map(dayRecords.map((r) => [r.date, r]));

	// We only care about dates in the past up to the day before yesterday.
	// Because the user can still check 'today' and 'yesterday'.
	for (const date of targetDates) {
		// If this target date is in the future or today or yesterday, it's not a "miss" yet.
		if (date > yesterdayStr) {
			break;
		}

		// So the date is before yesterday (e.g. 2 days ago).
		// If it's not completed, the chain is broken.
		const record = recordsMap.get(date);
		if (!record || !record.completed) {
			return { requiresReset: true, missedDate: date };
		}
	}
	return { requiresReset: false };
}
export type HabitDateStatus = "completed" | "missed" | "pending" | "inactive";
export function getHabitDateStatus(
	habit: Habit,
	records: DayRecord[],
	dateStr: string,
	todayStr: string = format(new Date(), "yyyy-MM-dd"),
): HabitDateStatus {
	const targetDates = getHabitTargetDates(habit.currentStartDate, habit.mode, habit.selectedDays, habit.durationDays || 21);

	if (!targetDates.includes(dateStr)) return "inactive";
	if (dateStr > todayStr) return "pending";

	const record = records.find((r) => r.habitId === habit.id && r.date === dateStr);
	if (record?.completed) return "completed";

	// Past target day without completion = missed
	return "missed";
}

export const getDaysLeft = (habit: Habit, allRecords: DayRecord[]) => {
	const duration = habit.durationDays || 21;
	const targetDates = getHabitTargetDates(habit.currentStartDate, habit.mode, habit.selectedDays, duration);
	const completedCount = targetDates.filter((d) => allRecords.find((r) => r.habitId === habit.id && r.date === d)?.completed).length;
	return Math.max(0, duration - completedCount);
};
