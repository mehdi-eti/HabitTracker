/** @format */

import { parseLocalDate } from "@/src/lib/utils";
import { PlanJsonExercise } from "@/src/types/workout";

const normalizeExercises = (exercises: PlanJsonExercise[] | any[]): PlanJsonExercise[] => {
	if (!Array.isArray(exercises)) return [];
	return exercises.map((ex) => {
		if (!ex.sets && ex.targetSets) {
			return {
				...ex,
				sets: Array.from({ length: ex.targetSets }).map(() => ({
					plannedReps: ex.targetReps || 0,
					plannedWeight: ex.targetWeight || ex.targetWeightKg || 0,
					targetReps: ex.targetReps || 0,
					targetWeight: ex.targetWeight || ex.targetWeightKg || 0,
				})),
			};
		}
		if (!ex.sets && !ex.targetSets && ex.durationMinutes) {
			return {
				...ex,
				sets: [
					{
						plannedReps: 1,
						targetReps: 1,
						plannedWeight: 0,
						targetWeight: 0,
						durationMinutes: ex.durationMinutes,
					},
				],
			};
		}
		return {
			...ex,
			sets: ex.sets || [],
		};
	});
};
export const getDayDataFromPlan = (dateString: string, dIndex: number, pVersion: any) => {
	if (!pVersion || !pVersion.data) return null;

	if (pVersion.data.days && pVersion.data.days.length > 0) {
		const found = pVersion.data.days.find((d: any) => d.dayIndex === dIndex);
		if (found) {
			const result = { ...found };
			if (result.workout) {
				result.workout = {
					...result.workout,
					exercises: result.workout.exercises ? normalizeExercises(result.workout.exercises) : [],
				};
			}
			return result;
		}
	}
	const currentDayDate = parseLocalDate(dateString);
	currentDayDate.setHours(0, 0, 0, 0);

	const planWeek = Math.floor((dIndex - 1) / 7) + 1;
	const nutritionCycle = ((planWeek - 1) % 2) + 1;

	const weekdayKeys = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"];
	const jsDay = currentDayDate.getDay();
	const satFirstIndex = (jsDay + 1) % 7;
	const weekdayKey = weekdayKeys[satFirstIndex];

	let workoutExercises = pVersion.data.workout?.schedule?.[weekdayKey] || [];
	let workoutPlanName = "";
	if (pVersion.data.workout?.weeklyPlans) {
		const numWeeks = Object.keys(pVersion.data.workout.weeklyPlans).length;
		const workoutCycle = ((planWeek - 1) % numWeeks) + 1;
		const weekKey = "week" + workoutCycle;
		const weeklyPlan = pVersion.data.workout.weeklyPlans[weekKey];
		if (weeklyPlan) {
			workoutExercises = weeklyPlan.schedule?.[weekdayKey] || [];
			workoutPlanName = weeklyPlan.name || "";
		}
	}

	let nutritionMeals = [];
	let nutritionPlanName = "";
	if (pVersion.data.nutrition?.weeklyPlans) {
		const nutritionPlan = nutritionCycle === 1 ? pVersion.data.nutrition.weeklyPlans.week1 : pVersion.data.nutrition.weeklyPlans.week2;
		nutritionMeals = nutritionPlan?.schedule?.[weekdayKey] || [];
		nutritionPlanName = nutritionPlan?.name || "";
	} else if (pVersion.data.nutrition?.schedule) {
		nutritionMeals = pVersion.data.nutrition.schedule[weekdayKey] || [];
	}

	return {
		dayIndex: dIndex,
		planWeek,
		nutritionCycle,
		nutritionPlanName,
		restDay: workoutExercises.length === 0,
		workoutPlanName,
		workout: {
			title: workoutExercises.length > 0 ? "Workout" : "Rest Day",
			exercises: normalizeExercises(workoutExercises),
		},
		nutrition: {
			name: nutritionPlanName,
			meals: nutritionMeals,
		},
	};
};
