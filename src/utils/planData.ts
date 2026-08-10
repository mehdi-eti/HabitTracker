/** @format */

export const getDayDataFromPlan = (dateString: string, dIndex: number, pVersion: any) => {
	if (!pVersion || !pVersion.data) return null;

	if (pVersion.data.days && pVersion.data.days.length > 0) {
		const found = pVersion.data.days.find((d: any) => d.dayIndex === dIndex);
		if (found) return found;
	}

	const [yy, mm, dd] = dateString.split("-");
	const currentDayDate = new Date(Number(yy), Number(mm) - 1, Number(dd));
	currentDayDate.setHours(0, 0, 0, 0);

	const planWeek = Math.floor((dIndex - 1) / 7) + 1;
	const nutritionCycle = ((planWeek - 1) % 2) + 1;

	const weekdayKeys = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"];
	const jsDay = currentDayDate.getDay();
	const satFirstIndex = (jsDay + 1) % 7;
	const weekdayKey = weekdayKeys[satFirstIndex];

	const workoutExercises = pVersion.data.workout?.schedule?.[weekdayKey] || [];

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
		workout: {
			title: workoutExercises.length > 0 ? "Workout" : "Rest Day",
			exercises: workoutExercises,
		},
		nutrition: {
			name: nutritionPlanName,
			meals: nutritionMeals,
		},
	};
};
