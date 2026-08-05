/** @format */

import { addDays, parseISO, format, getDay } from "date-fns";

export function getHabitTargetDates(
	startDateStr: string,
	mode: "consecutive" | "selected_days",
	selectedDays: number[],
	totalDays: number = 21,
): string[] {
	const dates: string[] = [];
	let currentDate = parseISO(startDateStr);

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
