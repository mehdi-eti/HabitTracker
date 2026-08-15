/** @format */

import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/src/lib/db";
import { Habit } from "@/src/types";

export function useHabits(status: "active" | "completed" | "deleted" | "archived" = "active") {
	const habits = useLiveQuery(() => db.habits.where("status").equals(status).toArray(), [status]);
	const dayRecords = useLiveQuery(() => db.dayRecords.toArray());

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
