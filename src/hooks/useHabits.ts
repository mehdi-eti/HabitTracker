/** @format */

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/src/lib/db";
import { Habit } from "@/src/types";
import { checkAndResetHabit } from "@/src/lib/habitUtils";
import { getTodayStr, getYesterdayStr } from "@/src/lib/utils";

export function useHabits(status: "active" | "completed" | "deleted" | "archived" = "active") {
	const habits = useLiveQuery(() => db.habits.where("status").equals(status).toArray(), [status]);
	const dayRecords = useLiveQuery(() => db.dayRecords.toArray());

	// Background check for resets
	useEffect(() => {
		if (!habits || !dayRecords) return;

		const todayStr = getTodayStr();
		const yesterdayStr = getYesterdayStr();

		habits.forEach(async (habit) => {
			if (habit.status === "active") {
				const recordsForHabit = dayRecords.filter((r) => r.habitId === habit.id);
				const { requiresReset } = checkAndResetHabit(habit, recordsForHabit, todayStr, yesterdayStr);

				if (requiresReset) {
					// Reset the habit
					await db.habits.update(habit.id, {
						currentStartDate: todayStr,
					});
					// Could trigger a notification or alert here, but UI should reflect it.
				}
			}
		});
	}, [habits, dayRecords]);

	return { habits, dayRecords };
}

export async function toggleDay(habit: Habit, date: string, completed: boolean) {
	const recordId = `${habit.id}_${date}`;
	if (completed) {
		await db.dayRecords.put({
			id: recordId,
			habitId: habit.id,
			date,
			completed,
			updatedAt: Date.now(),
		});
	} else {
		await db.dayRecords.delete(recordId);
	}
}
