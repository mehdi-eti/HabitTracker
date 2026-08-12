/** @format */

import { v4 as uuidv4 } from "uuid";

import { db } from "@/src/lib/db";
import { WorkoutPlan, PlanJsonExport, PlanJsonData, PlanJsonDay, PlanJsonFood } from "@/src/types/workout";

export async function importPlanFromJson(jsonString: string, makeActive: boolean = false, fallbackStartDate: string = "") {
	const json: PlanJsonExport = JSON.parse(jsonString);
	const planData: PlanJsonData = json.plan ?? (json as any as PlanJsonData);

	if (!planData.name) {
		throw new Error("Plan name is required.");
	}

	if (!planData.durationDays || Number(planData.durationDays) <= 0) {
		throw new Error("A valid durationDays value is required.");
	}

	const planId = uuidv4();
	const now = Date.now();

	const _t = new Date();
	const today = fallbackStartDate || `${_t.getFullYear()}-${String(_t.getMonth() + 1).padStart(2, "0")}-${String(_t.getDate()).padStart(2, "0")}`;
	const startDateStr = planData.startDate || today;

	let days: PlanJsonDay[] = json.days || planData.days || [];

	if (!days && (json.workout?.schedule || json.workout?.weeklyPlans || json.nutrition?.schedule || json.nutrition?.weeklyPlans)) {
		days = [];
		const durationDays = Number(planData.durationDays);
		const start = new Date(`${startDateStr}T00:00:00`);

		const weekDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

		for (let i = 1; i <= durationDays; i++) {
			const date = new Date(start);
			date.setDate(date.getDate() + (i - 1));
			const dayOfWeek = weekDays[date.getDay()];

			let workoutForDay = json.workout?.schedule?.[dayOfWeek];
			if (json.workout?.weeklyPlans) {
				const numWeeks = Object.keys(json.workout.weeklyPlans).length;
				const planWeek = Math.floor((i - 1) / 7) + 1;
				const workoutCycle = ((planWeek - 1) % numWeeks) + 1;
				const weekKey = "week" + workoutCycle;
				const weeklyPlan = json.workout.weeklyPlans[weekKey];
				if (weeklyPlan) {
					workoutForDay = weeklyPlan.schedule?.[dayOfWeek];
				}
			}

			const planWeek = Math.floor((i - 1) / 7) + 1;
			const nutritionCycle = ((planWeek - 1) % 2) + 1;

			let nutritionForDay: PlanJsonFood[] | undefined = [];
			let nutritionPlanName: string = "";

			if (json.nutrition?.weeklyPlans) {
				const weekKey = nutritionCycle === 1 ? "week1" : "week2";
				const weeklyPlan = json.nutrition.weeklyPlans[weekKey];
				if (weeklyPlan) {
					nutritionForDay = weeklyPlan.schedule?.[dayOfWeek];
					nutritionPlanName = weeklyPlan.name ?? "";
				}
			} else if (json.nutrition?.schedule) {
				nutritionForDay = json.nutrition.schedule[dayOfWeek];
			}

			const restDay = !workoutForDay || workoutForDay.length === 0;

			days.push({
				dayIndex: i,
				planWeek: planWeek,
				nutritionCycle: nutritionCycle,
				nutritionPlanName: nutritionPlanName,
				restDay: restDay,
				workout: {
					title: workoutForDay && workoutForDay?.length > 0 ? `Workout` : "Rest Day",
					exercises: workoutForDay || [],
				},
				nutrition: {
					name: nutritionPlanName ?? "",
					meals: nutritionForDay || [],
				},
			});
		}
	}

	const processedData = {
		...json,
		days: days || [],
	};

	await db.transaction("rw", db.workoutPlans, db.workoutPlanVersions, async () => {
		if (makeActive) {
			const currentActivePlans = await db.workoutPlans.where("status").equals("active").toArray();

			for (const currentPlan of currentActivePlans) {
				await db.workoutPlans.update(currentPlan.id, {
					status: "archived",
				});
			}
		}

		const plan: WorkoutPlan = {
			id: planId,
			name: planData.name ?? "Unnamed Plan",
			description: planData.description ?? "",
			createdAt: now,
			status: makeActive ? "active" : "archived",
			startDate: startDateStr,
			durationDays: Number(planData.durationDays),
			version: 1,
		};

		await db.workoutPlans.add(plan);

		await db.workoutPlanVersions.add({
			id: `${planId}_1`,
			planId,
			version: 1,
			createdAt: now,
			data: processedData,
		});
	});
}
