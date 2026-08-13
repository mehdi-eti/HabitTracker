/** @format */

import { v4 as uuidv4 } from "uuid";
import { useLiveQuery } from "dexie-react-hooks";
import React, { useEffect, useRef, useState } from "react";

import { db } from "@/src/lib/db";
import { useI18n } from "@/src/contexts/I18nContext";
import { importPlanFromJson } from "@/src/utils/planImport";
import { parseLocalDate, getDaysDifference, formatDateStr } from "@/src/lib/utils";
import { Dumbbell, Utensils, CheckCircle, Circle, Plus, X, Upload, AlertCircle } from "lucide-react";
import { getDayDataFromPlan } from "@/src/utils/planData";

interface TodayTrackerProps {
	onNavigateToPlans?: () => void;
}

export default function TodayTracker({ onNavigateToPlans }: TodayTrackerProps) {
	const { t } = useI18n();

	const [showExtraInput, setShowExtraInput] = useState(false);
	const [extraFoodDesc, setExtraFoodDesc] = useState("");
	const [importError, setImportError] = useState("");

	const today = formatDateStr(new Date());
	const isInitializingRef = useRef(false);

	/*
    Important:
    undefined = query is still loading
    null = query finished but no active plan exists
  */
	const activePlan = useLiveQuery(async () => {
		const plan = await db.workoutPlans.where("status").equals("active").first();

		return plan ?? null;
	}, []);

	const planVersion = useLiveQuery(async () => {
		if (!activePlan?.id) {
			return null;
		}

		const version = await db.workoutPlanVersions.where("planId").equals(activePlan.id).last();

		return version ?? null;
	}, [activePlan?.id]);

	const workoutRecord = useLiveQuery(async () => {
		if (!activePlan?.id) {
			return null;
		}

		const record = await db.workoutDailyRecords
			.where({
				planId: activePlan.id,
				date: today,
			})
			.first();

		return record ?? null;
	}, [activePlan?.id, today]);

	const nutritionRecord = useLiveQuery(async () => {
		if (!activePlan?.id) {
			return null;
		}

		const record = await db.nutritionDailyRecords
			.where({
				planId: activePlan.id,
				date: today,
			})
			.first();

		return record ?? null;
	}, [activePlan?.id, today]);

	const setRecords = useLiveQuery(async () => {
		if (!workoutRecord?.id) {
			return [];
		}

		return db.workoutSetRecords.where("dailyRecordId").equals(workoutRecord.id).toArray();
	}, [workoutRecord?.id]);

	const foodRecords = useLiveQuery(async () => {
		if (!nutritionRecord?.id) {
			return [];
		}

		return db.nutritionFoodRecords.where("dailyRecordId").equals(nutritionRecord.id).toArray();
	}, [nutritionRecord?.id]);

	const extraFoods = useLiveQuery(async () => {
		if (!nutritionRecord?.id) {
			return [];
		}

		return db.extraFoodRecords.where("dailyRecordId").equals(nutritionRecord.id).toArray();
	}, [nutritionRecord?.id]);

	const startDate = activePlan?.startDate ? parseLocalDate(activePlan.startDate) : null;

	const currentDate = parseLocalDate(today);

	const dayIndex = startDate && activePlan ? getDaysDifference(startDate, currentDate) + 1 : 0;

	const dayData = planVersion ? getDayDataFromPlan(today, dayIndex, planVersion) : null;

	/*
    Create today's records only after all required data is available.
    This must not run directly inside render.
  */
	useEffect(() => {
		const initializeDailyRecords = async () => {
			if (
				!activePlan?.id ||
				!dayData ||
				workoutRecord === undefined ||
				nutritionRecord === undefined ||
				(workoutRecord && nutritionRecord) ||
				isInitializingRef.current
			) {
				return;
			}

			isInitializingRef.current = true;

			try {
				await db.transaction(
					"rw",
					db.workoutDailyRecords,
					db.workoutSetRecords,
					db.nutritionDailyRecords,
					db.nutritionFoodRecords,
					async () => {
						const existingWorkoutRecord = await db.workoutDailyRecords
							.where({
								planId: activePlan.id,
								date: today,
							})
							.first();

						const existingNutritionRecord = await db.nutritionDailyRecords
							.where({
								planId: activePlan.id,
								date: today,
							})
							.first();

						if (!existingWorkoutRecord) {
							const workoutDailyRecordId = uuidv4();

							await db.workoutDailyRecords.add({
								id: workoutDailyRecordId,
								planId: activePlan.id,
								date: today,
								completed: false,
								restDay: Boolean(dayData.restDay),
							});

							const exercises = dayData.workout?.exercises ?? [];

							for (const exercise of exercises) {
								for (let setIndex = 0; setIndex < (exercise.sets?.length ?? 0); setIndex += 1) {
									const set = exercise.sets[setIndex];

									await db.workoutSetRecords.add({
										id: `${workoutDailyRecordId}_${exercise.id}_${setIndex}`,
										dailyRecordId: workoutDailyRecordId,
										exerciseId: exercise.id,
										setIndex,
										plannedReps: set?.plannedReps ?? set?.targetReps ?? 0,
										actualReps: 0,
										plannedWeight: set?.plannedWeight ?? set?.targetWeightKg ?? set?.targetWeight ?? 0,
										actualWeight: 0,
									});
								}
							}
						} else {
							const exercises = dayData.workout?.exercises ?? [];
							for (const exercise of exercises) {
								for (let setIndex = 0; setIndex < (exercise.sets?.length ?? 0); setIndex += 1) {
									const set = exercise.sets[setIndex];
									const setId = `${existingWorkoutRecord.id}_${exercise.id}_${setIndex}`;
									const existingSet = await db.workoutSetRecords.get(setId);
									if (!existingSet) {
										await db.workoutSetRecords.add({
											id: setId,
											dailyRecordId: existingWorkoutRecord.id,
											exerciseId: exercise.id,
											setIndex,
											plannedReps: set?.plannedReps ?? set?.targetReps ?? 0,
											actualReps: 0,
											plannedWeight: set?.plannedWeight ?? set?.targetWeightKg ?? set?.targetWeight ?? 0,
											actualWeight: 0,
										});
									}
								}
							}
						}

						if (!existingNutritionRecord) {
							const nutritionDailyRecordId = uuidv4();

							await db.nutritionDailyRecords.add({
								id: nutritionDailyRecordId,
								planId: activePlan.id,
								date: today,
								completed: false,
							});

							const meals = dayData.nutrition?.meals ?? [];

							for (const meal of meals) {
								for (const food of meal.foods ?? []) {
									await db.nutritionFoodRecords.add({
										id: `${nutritionDailyRecordId}_${food.id}`,
										dailyRecordId: nutritionDailyRecordId,
										foodId: food.id,
										plannedQuantity: food.plannedQuantity ?? food.amount ?? 0,
										consumed: false,
										consumedMoreThanPlanned: false,
										planId: activePlan.id,
										planWeek: dayData.planWeek,
										nutritionCycle: dayData.nutritionCycle,
										date: today,
										mealId: meal.id || meal.name,
									});
								}
							}
						} else {
							const meals = dayData.nutrition?.meals ?? [];
							for (const meal of meals) {
								for (const food of meal.foods ?? []) {
									const foodId = `${existingNutritionRecord.id}_${food.id}`;
									const existingFood = await db.nutritionFoodRecords.get(foodId);
									if (!existingFood) {
										await db.nutritionFoodRecords.add({
											id: foodId,
											dailyRecordId: existingNutritionRecord.id,
											foodId: food.id,
											plannedQuantity: food.plannedQuantity ?? food.amount ?? 0,
											consumed: false,
											consumedMoreThanPlanned: false,
											planId: activePlan.id,
											planWeek: dayData.planWeek,
											nutritionCycle: dayData.nutritionCycle,
											date: today,
											mealId: meal.id || meal.name,
										});
									}
								}
							}
						}
					},
				);
			} catch (error) {
				console.error("Failed to initialize daily records:", error);
			} finally {
				isInitializingRef.current = false;
			}
		};

		void initializeDailyRecords();
	}, [activePlan?.id, today, dayData, workoutRecord, nutritionRecord]);

	const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];

		if (!file) {
			return;
		}

		setImportError("");

		const reader = new FileReader();

		reader.onload = async (loadEvent) => {
			try {
				await importPlanFromJson(loadEvent.target?.result as string, true, today);
			} catch (error) {
				console.error("Failed to import plan:", error);

				setImportError(error instanceof Error ? error.message : "Failed to import the plan. Please check the JSON file.");
			}
		};

		reader.readAsText(file);
		event.target.value = "";
	};

	const updateSet = async (id: string, field: "actualReps" | "actualWeight", value: number) => {
		const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;

		await db.workoutSetRecords.update(id, {
			[field]: safeValue,
		});
	};

	const toggleFood = async (id: string, consumed: boolean) => {
		await db.nutritionFoodRecords.update(id, {
			consumed: !consumed,
		});
	};

	const handleAddExtraFood = async (event: React.FormEvent) => {
		event.preventDefault();

		if (!extraFoodDesc.trim() || !nutritionRecord?.id) {
			return;
		}

		await db.extraFoodRecords.add({
			id: uuidv4(),
			dailyRecordId: nutritionRecord.id,
			description: extraFoodDesc.trim(),
			time: new Date().toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			}),
		});

		setExtraFoodDesc("");
		setShowExtraInput(false);
	};

	/*
    Loading state:
    Only undefined means that Dexie has not finished loading yet.
  */
	if (activePlan === undefined) {
		return <div className='text-center py-8 text-slate-500 dark:text-slate-400'>Loading...</div>;
	}

	/*
    Empty state:
    null means the query completed successfully but no active plan exists.
  */
	if (activePlan === null) {
		return (
			<div className='flex flex-col items-center justify-center py-16 px-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center'>
				<div className='w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6'>
					<Dumbbell className='text-slate-500 dark:text-slate-400' size={32} />
				</div>

				<h3 className='text-xl font-bold text-slate-800 dark:text-slate-100 mb-2'>
					{t("no_active_plan_yet" as any) || "You don't have an active plan yet."}
				</h3>

				<p className='text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8'>
					{t("no_active_plan_desc" as any) || "Create a new workout and nutrition plan or import an existing JSON plan to get started."}
				</p>

				{importError && (
					<div className='flex items-center gap-2 max-w-md mb-5 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm'>
						<AlertCircle size={18} />
						<span>{importError}</span>
					</div>
				)}

				<div className='flex flex-col sm:flex-row gap-3'>
					<button
						onClick={onNavigateToPlans}
						className='flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors'>
						<Plus size={18} />
						{t("create_plan" as any) || "Create Plan"}
					</button>

					<label className='flex items-center justify-center gap-2 px-6 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium rounded-lg cursor-pointer transition-colors'>
						<Upload size={18} />
						{t("import_json" as any) || "Import JSON Plan"}
						<input type='file' accept='.json,application/json' className='hidden' onChange={handleImport} />
					</label>
				</div>
			</div>
		);
	}

	if (planVersion === undefined) {
		return <div className='text-center py-8 text-slate-500 dark:text-slate-400'>Loading plan...</div>;
	}

	if (planVersion === null) {
		return (
			<div className='text-center py-12 px-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900'>
				<AlertCircle className='mx-auto text-amber-500 mb-3' size={32} />
				<h3 className='text-lg font-bold text-amber-800 dark:text-amber-300'>Plan version not found</h3>
				<p className='text-sm text-amber-700 dark:text-amber-400 mt-2'>This plan does not have valid workout and nutrition data.</p>
			</div>
		);
	}

	if (dayIndex < 1 || dayIndex > activePlan.durationDays) {
		const isFuture = dayIndex < 1;
		const diffDays = isFuture ? Math.abs(dayIndex) + 1 : 0;

		return (
			<div className='text-center py-12 px-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800'>
				<h3 className='text-xl font-bold text-slate-700 dark:text-slate-200'>
					{isFuture
						? `Your plan starts in ${diffDays} day${diffDays === 1 ? "" : "s"}`
						: t("out_of_plan_range" as any) || "Out of plan range"}
				</h3>

				<p className='text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto'>
					{isFuture
						? `This plan is scheduled to begin on ${startDate?.toLocaleDateString() || activePlan.startDate}. You can view the full schedule in the Calendar tab.`
						: t("out_of_plan_range_desc" as any) || "Today's date is outside the active plan's duration."}
				</p>
			</div>
		);
	}

	if (!dayData) {
		return (
			<div className='text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800'>
				<h3 className='text-xl font-bold text-slate-700 dark:text-slate-200'>No schedule found for today</h3>

				<p className='text-slate-500 dark:text-slate-400 mt-2'>There is no workout or nutrition schedule configured for Day {dayIndex}.</p>
			</div>
		);
	}

	if (
		workoutRecord === undefined ||
		nutritionRecord === undefined ||
		setRecords === undefined ||
		foodRecords === undefined ||
		extraFoods === undefined
	) {
		return <div className='text-center py-8 text-slate-500 dark:text-slate-400'>Initializing today&apos;s records...</div>;
	}

	return (
		<div className='space-y-8'>
			<div className='flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4'>
				<div>
					<h2 className='text-2xl font-bold text-slate-800 dark:text-white'>
						{t("day" as any) || "Day"} {dayIndex}
					</h2>

					<p className='text-slate-500 dark:text-slate-400 mt-1'>{currentDate.toLocaleDateString()}</p>
				</div>

				<div className='text-right'>
					<div className='text-sm font-medium text-indigo-600 dark:text-indigo-400'>{activePlan.name}</div>
					{dayData.planWeek && (
						<div className='text-xs text-slate-500 dark:text-slate-400 mt-0.5'>
							Week {dayData.planWeek} of {Math.ceil(activePlan.durationDays / 7)}
							{dayData.nutritionCycle ? ` (Nutrition Cycle ${dayData.nutritionCycle === 1 ? "A" : "B"})` : ""}
						</div>
					)}
					{dayData.restDay && (
						<div className='text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md mt-1 inline-block'>
							{t("rest_day" as any) || "Rest Day"}
						</div>
					)}
				</div>
			</div>

			<div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
				<div className='bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm'>
					<div className='flex items-center gap-3 mb-6'>
						<div className='p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl'>
							<Dumbbell size={24} />
						</div>

						<h3 className='text-xl font-bold text-slate-800 dark:text-white'>
							{dayData.workout?.title || t("workout" as any) || "Workout"}
						</h3>
					</div>

					{!dayData.workout?.exercises?.length ? (
						<div className='text-center py-6 text-slate-500 dark:text-slate-400'>
							{dayData.restDay
								? t("rest_day" as any) || "Rest Day"
								: t("no_workout_today" as any) || "No workout scheduled for today."}
						</div>
					) : (
						<div className='space-y-6'>
							{dayData.workout.exercises?.map((exercise: any) => (
								<div
									key={exercise.id}
									className='border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm'>
									<div className='bg-slate-100 dark:bg-slate-800 px-4 py-2 font-semibold text-slate-700 dark:text-slate-200'>
										{exercise.name}
									</div>

									<div className='p-4 space-y-3'>
										{exercise.sets?.map((set: any, index: number) => {
											const recordId = `${workoutRecord?.id}_${exercise.id}_${index}`;

											const setRecord = setRecords.find((record: any) => record.id === recordId);

											const plannedReps = set?.plannedReps ?? set?.targetReps ?? 0;

											const plannedWeight = set?.plannedWeight ?? set?.targetWeightKg ?? set?.targetWeight ?? 0;

											return (
												<div
													key={`${exercise.id}-${index}`}
													className='flex items-center justify-between text-sm gap-4'>
													<span className='font-medium text-slate-500 dark:text-slate-400 w-12'>
														Set {index + 1}
													</span>

													<div className='flex-1 flex gap-4 items-center'>
														<div className='flex flex-col gap-1 w-full max-w-[110px]'>
															<span className='text-[10px] text-slate-400'>Reps (Plan: {plannedReps})</span>

															<input
																type='number'
																min='0'
																className='w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-center focus:ring-2 focus:ring-blue-500 outline-none'
																value={setRecord?.actualReps ?? plannedReps}
																onChange={(event) =>
																	updateSet(recordId, "actualReps", Number(event.target.value))
																}
															/>
														</div>

														<div className='flex flex-col gap-1 w-full max-w-[110px]'>
															<span className='text-[10px] text-slate-400'>Kg (Plan: {plannedWeight})</span>

															<input
																type='number'
																min='0'
																step='0.5'
																className='w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-center focus:ring-2 focus:ring-blue-500 outline-none'
																value={setRecord?.actualWeight ?? plannedWeight}
																onChange={(event) =>
																	updateSet(recordId, "actualWeight", Number(event.target.value))
																}
															/>
														</div>
													</div>
												</div>
											);
										})}
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				<div className='bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm'>
					<div className='flex items-center gap-3 mb-6'>
						<div className='p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl'>
							<Utensils size={24} />
						</div>

						<h3 className='text-xl font-bold text-slate-800 dark:text-white'>
							{dayData.nutritionPlanName || dayData.nutrition?.name || t("nutrition" as any) || "Nutrition"}
						</h3>
					</div>

					{!dayData.nutrition?.meals?.length ? (
						<div className='text-center py-6 text-slate-500 dark:text-slate-400'>
							{t("no_meals_today" as any) || "No meals scheduled for today."}
						</div>
					) : (
						<div className='space-y-6'>
							{dayData.nutrition.meals?.map((meal: any) => (
								<div key={meal.id} className='space-y-2'>
									<h4 className='font-semibold text-slate-700 dark:text-slate-300'>
										{meal.name}
										{meal.time ? ` · ${meal.time}` : ""}
									</h4>

									<div className='space-y-2'>
										{meal.foods?.map((food: any) => {
											const recordId = `${nutritionRecord?.id}_${food.id}`;

											const foodRecord = foodRecords.find((record: any) => record.id === recordId);

											const isConsumed = foodRecord?.consumed ?? false;

											const quantity = food.plannedQuantity ?? food.amount ?? "";

											return (
												<button
													key={food.id}
													type='button'
													onClick={() => toggleFood(recordId, isConsumed)}
													className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${
														isConsumed
															? "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50"
															: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
													}`}>
													<div>
														<span
															className={`block font-medium ${
																isConsumed
																	? "text-green-800 dark:text-green-300 line-through opacity-70"
																	: "text-slate-800 dark:text-slate-200"
															}`}>
															{food.name}
														</span>

														<span className='text-xs text-slate-500 dark:text-slate-400'>
															{quantity} {food.unit ?? ""}
														</span>
													</div>

													<div className={isConsumed ? "text-green-500" : "text-slate-300 dark:text-slate-600"}>
														{isConsumed ? <CheckCircle size={20} /> : <Circle size={20} />}
													</div>
												</button>
											);
										})}
									</div>
								</div>
							))}
						</div>
					)}

					<div className='mt-8 pt-6 border-t border-slate-200 dark:border-slate-700'>
						<div className='flex justify-between items-center mb-4'>
							<h4 className='font-semibold text-slate-700 dark:text-slate-300'>{t("extra_food" as any) || "Extra Food"}</h4>

							<button
								type='button'
								onClick={() => setShowExtraInput(true)}
								className='flex items-center gap-1 text-sm bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg transition-colors'>
								<Plus size={16} />
								{t("add" as any) || "Add"}
							</button>
						</div>

						{showExtraInput && (
							<form onSubmit={handleAddExtraFood} className='mb-4 flex gap-2'>
								<input
									type='text'
									autoFocus
									required
									placeholder='Food description...'
									className='flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-indigo-500'
									value={extraFoodDesc}
									onChange={(event) => setExtraFoodDesc(event.target.value)}
								/>

								<button
									type='submit'
									className='bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors'>
									{t("save" as any) || "Save"}
								</button>

								<button
									type='button'
									onClick={() => setShowExtraInput(false)}
									className='bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg transition-colors'>
									<X size={16} />
								</button>
							</form>
						)}

						{extraFoods.length === 0 ? (
							<p className='text-sm text-slate-500 dark:text-slate-400 text-center py-2'>
								{t("no_extra_food" as any) || "No extra food recorded today."}
							</p>
						) : (
							<div className='space-y-2'>
								{extraFoods.map((extraFood: any) => (
									<div
										key={extraFood.id}
										className='flex justify-between bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 p-3 rounded-lg text-sm'>
										<span className='text-slate-700 dark:text-slate-200'>{extraFood.description}</span>

										<span className='text-slate-400'>{extraFood.time}</span>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
