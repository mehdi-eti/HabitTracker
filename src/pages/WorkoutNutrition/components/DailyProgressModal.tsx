/** @format */

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { db } from "@/src/lib/db";
import { X, TrendingUp, TrendingDown, Minus, Dumbbell, Utensils, Calendar } from "lucide-react";
import { WorkoutPlan, WorkoutSetRecord, NutritionFoodRecord, ExtraFoodRecord } from "@/src/types/workout";
import { getDayDataFromPlan } from "@/src/utils/planData";
import { parseLocalDate, getDaysDifference, getNormalizedToday, addDaysToDate, formatDateStr } from "@/src/lib/utils";

interface DailyProgressModalProps {
	plan: WorkoutPlan;
	planVersion: any; // the actual plan data object
	selectedDate: string; // YYYY-MM-DD
	onClose: () => void;
	onSelectDate: (date: string) => void;
}

export default function DailyProgressModal({ plan, planVersion, selectedDate, onClose, onSelectDate }: DailyProgressModalProps) {
	const startDate = parseLocalDate(plan.startDate as string);
	const selectedDateObj = parseLocalDate(selectedDate);
	const today = getNormalizedToday();

	const dayIndex = getDaysDifference(startDate, selectedDateObj) + 1;
	const daysPassed = getDaysDifference(startDate, today) + 1;
	// Fetch all records for the plan up to the selected date
	const workoutRecords = useLiveQuery(async () => {
		const records = await db.workoutDailyRecords.where("planId").equals(plan.id).toArray();
		return records.filter((r) => r.date <= selectedDate);
	}, [plan.id, selectedDate]);

	const nutritionRecords = useLiveQuery(async () => {
		const records = await db.nutritionDailyRecords.where("planId").equals(plan.id).toArray();
		return records.filter((r) => r.date <= selectedDate);
	}, [plan.id, selectedDate]);

	const [setRecords, setSetRecords] = useState<WorkoutSetRecord[]>([]);
	const [foodRecords, setFoodRecords] = useState<NutritionFoodRecord[]>([]);
	const [extraFoods, setExtraFoods] = useState<ExtraFoodRecord[]>([]);

	useEffect(() => {
		async function loadDetails() {
			if (workoutRecords && workoutRecords.length > 0) {
				const wIds = workoutRecords.map((r) => r.id);
				const sRecords = await db.workoutSetRecords.where("dailyRecordId").anyOf(wIds).toArray();
				setSetRecords(sRecords);
			} else {
				setSetRecords([]);
			}

			if (nutritionRecords && nutritionRecords.length > 0) {
				const nIds = nutritionRecords.map((r) => r.id);
				const fRecords = await db.nutritionFoodRecords.where("dailyRecordId").anyOf(nIds).toArray();
				const eRecords = await db.extraFoodRecords.where("dailyRecordId").anyOf(nIds).toArray();
				setFoodRecords(fRecords);
				setExtraFoods(eRecords);
			} else {
				setFoodRecords([]);
				setExtraFoods([]);
			}
		}
		loadDetails();
	}, [workoutRecords, nutritionRecords]);

	// Handle escape key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	if (!workoutRecords || !nutritionRecords) {
		return (
			<div className='fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4'>
				<div className='bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-xl'>Loading...</div>
			</div>
		);
	}

	// Generate a list of dates to show in timeline
	const timelineDates: string[] = [];
	const todayStr = formatDateStr(new Date());

	for (let i = 0; i < (plan.durationDays || 30); i++) {
		const d = addDaysToDate(startDate, i);
		const dateStr = formatDateStr(d);
		if (dateStr <= todayStr || dateStr <= selectedDate) {
			timelineDates.push(dateStr);
		}
	}

	// Ensure selectedDate is always in the timeline if it somehow got missed
	if (!timelineDates.includes(selectedDate)) {
		timelineDates.push(selectedDate);
		timelineDates.sort();
	}

	// Compute daily metrics for all timeline dates
	const dailyMetrics = timelineDates.map((dateStr, idx) => {
		const dIndex = idx + 1;
		const dayData = getDayDataFromPlan(dateStr, dIndex, planVersion);

		// Workout adherence
		const wRecord = workoutRecords.find((r) => r.date === dateStr);
		let plannedEx = 0;
		let completedEx = 0;
		let plannedSets = 0;
		let completedSets = 0;
		let wStatus = dayData?.restDay ? "Rest Day" : "Missed";
		let wAdherence = 0;

		if (wRecord) {
			const daySets = setRecords.filter((s) => s.dailyRecordId === wRecord.id);
			plannedSets = daySets.length;

			const exMap = new Map<string, { total: number; done: number }>();
			daySets.forEach((s) => {
				if (!exMap.has(s.exerciseId)) exMap.set(s.exerciseId, { total: 0, done: 0 });
				const ex = exMap.get(s.exerciseId);
				if (!ex) return;
				ex.total++;
				if (s.actualReps > 0 || s.actualWeight > 0) {
					ex.done++;
					completedSets++;
				}
			});

			plannedEx = exMap.size;
			completedEx = Array.from(exMap.values()).filter((v) => v.done === v.total).length;

			if (plannedSets > 0) {
				wAdherence = (completedSets / plannedSets) * 100;
				if (completedSets === plannedSets) wStatus = "Completed";
				else if (completedSets > 0) wStatus = "Partially Completed";
				else wStatus = "Missed";
			} else if (dayData?.restDay) {
				wStatus = "Rest Day";
				wAdherence = 100;
			}
		} else if (dayData?.restDay) {
			wStatus = "Rest Day";
			wAdherence = 100; // Rest day counts as 100% adherence if nothing planned
		}

		// Nutrition adherence
		const nRecord = nutritionRecords.find((r) => r.date === dateStr);
		let plannedFoods = 0;
		let consumedFoods = 0;
		let extraFoodsCount = 0;
		let nStatus = "Not Followed";
		let nAdherence = 0;

		if (nRecord) {
			const dayFoods = foodRecords.filter((f) => f.dailyRecordId === nRecord.id);
			plannedFoods = dayFoods.length;
			consumedFoods = dayFoods.filter((f) => f.consumed).length;

			const dayExtra = extraFoods.filter((e) => e.dailyRecordId === nRecord.id);
			extraFoodsCount = dayExtra.length;

			if (plannedFoods > 0) {
				nAdherence = (consumedFoods / plannedFoods) * 100;
				if (consumedFoods === plannedFoods) nStatus = "Fully Followed";
				else if (consumedFoods > 0) nStatus = "Partially Followed";
				else nStatus = "Not Followed";
			} else {
				nStatus = "No nutrition data";
			}
		} else {
			nStatus = "No nutrition data";
		}

		return {
			date: dateStr,
			dayIndex: dIndex,
			dayData,
			wStatus,
			wAdherence,
			nStatus,
			nAdherence,
			plannedEx,
			completedEx,
			plannedSets,
			completedSets,
			plannedFoods,
			consumedFoods,
			extraFoodsCount,
		};
	});

	const selectedMetrics = dailyMetrics.find((m) => m.date === selectedDate);
	const reportMetrics = dailyMetrics.filter((m) => m.date <= selectedDate);

	// Calculate Streaks & Summaries
	let currentWStreak = 0;
	let maxWStreak = 0;
	let currentNStreak = 0;
	let maxNStreak = 0;

	let fullWDays = 0;
	let partialWDays = 0;
	let missedWDays = 0;
	let restDays = 0;

	let totalWAdherence = 0;
	let wDaysCount = 0;
	let totalNAdherence = 0;
	let nDaysCount = 0;

	reportMetrics.forEach((m) => {
		if (m.wStatus === "Completed") {
			currentWStreak++;
			maxWStreak = Math.max(maxWStreak, currentWStreak);
			fullWDays++;
			totalWAdherence += m.wAdherence;
			wDaysCount++;
		} else if (m.wStatus === "Partially Completed") {
			currentWStreak = 0;
			partialWDays++;
			totalWAdherence += m.wAdherence;
			wDaysCount++;
		} else if (m.wStatus === "Missed") {
			currentWStreak = 0;
			missedWDays++;
			totalWAdherence += m.wAdherence;
			wDaysCount++;
		} else if (m.wStatus === "Rest Day") {
			restDays++;
			// Don't break streak for rest day, optionally count it as 100% adherence or skip
		}

		if (m.nStatus === "Fully Followed") {
			currentNStreak++;
			maxNStreak = Math.max(maxNStreak, currentNStreak);
			totalNAdherence += m.nAdherence;
			nDaysCount++;
		} else if (m.nStatus === "Partially Followed") {
			currentNStreak = 0;
			totalNAdherence += m.nAdherence;
			nDaysCount++;
		} else if (m.nStatus === "Not Followed") {
			currentNStreak = 0;
			totalNAdherence += m.nAdherence;
			nDaysCount++;
		}
	});

	const avgWAdherence = wDaysCount > 0 ? totalWAdherence / wDaysCount : 0;
	const avgNAdherence = nDaysCount > 0 ? totalNAdherence / nDaysCount : 0;

	// Selected Day Exercise details
	const selectedWRecord = workoutRecords.find((r) => r.date === selectedDate);
	let selectedExercises: any[] = [];

	let totalImproving = 0;
	let totalStable = 0;
	let totalRegressing = 0;

	if (selectedWRecord) {
		const daySets = setRecords.filter((s) => s.dailyRecordId === selectedWRecord.id);
		const exMap = new Map<string, any>();

		// Group sets by exercise
		daySets.forEach((s) => {
			if (!exMap.has(s.exerciseId)) {
				const exName = selectedMetrics?.dayData?.workout?.exercises?.find((e: any) => e.id === s.exerciseId)?.name || "Unknown";
				exMap.set(s.exerciseId, {
					id: s.exerciseId,
					name: exName,
					sets: [],
					bestWeight: 0,
					bestReps: 0,
					plannedWeight: s.plannedWeight || 0,
					plannedReps: s.plannedReps || 0,
				});
			}
			const ex = exMap.get(s.exerciseId);
			if (!ex) return;
			ex.sets.push(s);
			if (s.actualWeight > ex.bestWeight || (s.actualWeight === ex.bestWeight && s.actualReps > ex.bestReps)) {
				ex.bestWeight = s.actualWeight;
				ex.bestReps = s.actualReps;
			}
		});

		selectedExercises = Array.from(exMap.values());

		// Compare with previous and first
		selectedExercises.forEach((ex) => {
			// find all sets for this exercise prior to selectedDate
			const allPrevSets = setRecords.filter(
				(s) => s.exerciseId === ex.id && workoutRecords.find((wr) => wr.id === s.dailyRecordId)!.date < selectedDate,
			);

			const prevDates = Array.from(new Set(allPrevSets.map((s) => workoutRecords.find((wr) => wr.id === s.dailyRecordId)!.date))).sort();

			if (prevDates.length > 0) {
				const firstDate = prevDates[0];
				const lastDate = prevDates[prevDates.length - 1];

				const firstSets = allPrevSets.filter((s) => workoutRecords.find((wr) => wr.id === s.dailyRecordId)!.date === firstDate);
				const lastSets = allPrevSets.filter((s) => workoutRecords.find((wr) => wr.id === s.dailyRecordId)!.date === lastDate);

				let firstBestW = 0,
					firstBestR = 0;
				firstSets.forEach((s) => {
					if (s.actualWeight > firstBestW || (s.actualWeight === firstBestW && s.actualReps > firstBestR)) {
						firstBestW = s.actualWeight;
						firstBestR = s.actualReps;
					}
				});

				let prevBestW = 0,
					prevBestR = 0;
				lastSets.forEach((s) => {
					if (s.actualWeight > prevBestW || (s.actualWeight === prevBestW && s.actualReps > prevBestR)) {
						prevBestW = s.actualWeight;
						prevBestR = s.actualReps;
					}
				});

				ex.firstW = firstBestW;
				ex.prevW = prevBestW;
				ex.firstR = firstBestR;
				ex.prevR = prevBestR;

				// Status Logic
				if (ex.bestWeight > prevBestW || (ex.bestWeight === prevBestW && ex.bestReps > prevBestR)) {
					ex.status = "Improving";
					totalImproving++;
				} else if (ex.bestWeight < prevBestW || (ex.bestWeight === prevBestW && ex.bestReps < prevBestR)) {
					ex.status = "Regressing";
					totalRegressing++;
				} else {
					ex.status = "Stable";
					totalStable++;
				}
			} else {
				ex.status = "No Data";
			}
		});
	}

	// Selected Day Nutrition details
	const selectedNRecord = nutritionRecords.find((r) => r.date === selectedDate);
	const selectedDayExtraFoods = selectedNRecord ? extraFoods.filter((e) => e.dailyRecordId === selectedNRecord.id) : [];

	const getStatusColor = (status: string) => {
		switch (status) {
			case "Completed":
			case "Fully Followed":
			case "Improving":
				return "text-green-600 bg-green-50 dark:bg-green-900/30";
			case "Partially Completed":
			case "Partially Followed":
				return "text-amber-600 bg-amber-50 dark:bg-amber-900/30";
			case "Missed":
			case "Not Followed":
			case "Regressing":
				return "text-red-600 bg-red-50 dark:bg-red-900/30";
			case "Stable":
				return "text-blue-600 bg-blue-50 dark:bg-blue-900/30";
			default:
				return "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300";
		}
	};

	const getTextColor = (status: string) => {
		switch (status) {
			case "Completed":
			case "Fully Followed":
			case "Improving":
				return "text-green-600 dark:text-green-400";
			case "Partially Completed":
			case "Partially Followed":
				return "text-amber-600 dark:text-amber-400";
			case "Missed":
			case "Not Followed":
			case "Regressing":
				return "text-red-600 dark:text-red-400";
			case "Stable":
				return "text-blue-600 dark:text-blue-400";
			default:
				return "text-slate-600 dark:text-slate-400";
		}
	};

	return (
		<div className='fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4' onClick={onClose}>
			<div
				className='bg-white dark:bg-slate-900 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-xl'
				onClick={(e) => e.stopPropagation()}>
				<div className='flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 shrink-0'>
					<div>
						<h2 className='text-2xl font-bold flex items-center gap-2'>
							<Calendar className='text-indigo-600 dark:text-indigo-400' />
							Report for {selectedDateObj.toLocaleDateString()}
						</h2>
						<div className='flex gap-4 text-sm text-slate-500 mt-1'>
							<span>
								Day {dayIndex} of {plan.durationDays}
							</span>
							<span>•</span>
							<span>{plan.name}</span>
						</div>
					</div>
					<button
						onClick={onClose}
						className='p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors'>
						<X size={24} />
					</button>
				</div>

				<div className='flex-1 overflow-y-auto p-6 space-y-8'>
					{/* Summary Section */}
					<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
						<div className='bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center'>
							<div className='text-sm font-medium text-slate-500'>Workout Adherence</div>
							<div className='text-2xl font-bold text-slate-800 dark:text-white mt-1'>{avgWAdherence.toFixed(0)}%</div>
						</div>
						<div className='bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center'>
							<div className='text-sm font-medium text-slate-500'>Nutrition Adherence</div>
							<div className='text-2xl font-bold text-slate-800 dark:text-white mt-1'>{avgNAdherence.toFixed(0)}%</div>
						</div>
						<div className='bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center'>
							<div className='text-sm font-medium text-slate-500'>Best Workout Streak</div>
							<div className='text-2xl font-bold text-slate-800 dark:text-white mt-1'>{maxWStreak} Days</div>
						</div>
						<div className='bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center'>
							<div className='text-sm font-medium text-slate-500'>Workouts Completed</div>
							<div className='text-2xl font-bold text-green-600 dark:text-green-400 mt-1'>
								{fullWDays} / {wDaysCount}
							</div>
						</div>
					</div>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
						{/* Workout Daily Report */}
						<div className='space-y-4'>
							<div className='flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800'>
								<Dumbbell className='text-blue-500' />
								<h3 className='text-xl font-bold'>Workout Status</h3>
							</div>

							{!selectedMetrics ? (
								<div className='text-slate-500 italic'>No workout data for this day</div>
							) : (
								<>
									<div
										className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedMetrics.wStatus)}`}>
										{selectedMetrics.wStatus}
									</div>

									<div className='grid grid-cols-2 gap-4 mt-4'>
										<div className='bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg text-center'>
											<div className='text-xs text-slate-500'>Exercises</div>
											<div className='font-bold text-lg'>
												{selectedMetrics.completedEx} / {selectedMetrics.plannedEx}
											</div>
										</div>
										<div className='bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg text-center'>
											<div className='text-xs text-slate-500'>Sets</div>
											<div className='font-bold text-lg'>
												{selectedMetrics.completedSets} / {selectedMetrics.plannedSets}
											</div>
										</div>
									</div>

									{selectedExercises.length > 0 && (
										<div className='mt-6 space-y-3'>
											<div className='flex items-center justify-between'>
												<h4 className='font-semibold text-sm text-slate-600 dark:text-slate-400'>Exercise Progress</h4>
												<div className='flex gap-2 text-xs font-medium'>
													{totalImproving > 0 && (
														<span className='text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded'>
															+{totalImproving} Improved
														</span>
													)}
													{totalRegressing > 0 && (
														<span className='text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded'>
															-{totalRegressing} Regressed
														</span>
													)}
													{totalStable > 0 && (
														<span className='text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded'>
															{totalStable} Stable
														</span>
													)}
												</div>
											</div>
											{selectedExercises.map((ex, idx) => (
												<div
													key={idx}
													className='bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm text-sm flex flex-col gap-2'>
													<div className='flex justify-between font-bold'>
														<span>{ex.name}</span>
														<span className={getTextColor(ex.status)}>
															{ex.status === "Improving" && <TrendingUp size={16} className='inline mr-1' />}
															{ex.status === "Regressing" && (
																<TrendingDown size={16} className='inline mr-1' />
															)}
															{ex.status === "Stable" && <Minus size={16} className='inline mr-1' />}
															{ex.status}
														</span>
													</div>

													<div className='flex justify-between text-xs mt-2'>
														<div className='text-slate-500'>
															Today:{" "}
															<strong className='text-slate-800 dark:text-slate-200'>
																{ex.bestWeight > 0 || ex.bestReps > 0
																	? `${ex.bestWeight}kg x ${ex.bestReps}`
																	: `${ex.plannedWeight}kg x ${ex.plannedReps} (Plan)`}
															</strong>
														</div>
														{ex.status !== "No Data" && (
															<div className='text-slate-500'>
																Prev:{" "}
																<strong className='text-slate-800 dark:text-slate-200'>
																	{ex.prevW}kg x {ex.prevR}
																</strong>
															</div>
														)}
														{ex.status !== "No Data" && (
															<div className='text-slate-500'>
																First:{" "}
																<strong className='text-slate-800 dark:text-slate-200'>
																	{ex.firstW}kg x {ex.firstR}
																</strong>
															</div>
														)}
													</div>
												</div>
											))}
										</div>
									)}
								</>
							)}
						</div>

						{/* Nutrition Daily Report */}
						<div className='space-y-4'>
							<div className='flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800'>
								<Utensils className='text-green-500' />
								<h3 className='text-xl font-bold'>Nutrition Adherence</h3>
							</div>

							{!selectedMetrics ? (
								<div className='text-slate-500 italic'>No nutrition data for this day</div>
							) : (
								<>
									<div
										className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedMetrics.nStatus)}`}>
										{selectedMetrics.nStatus}
									</div>

									<div className='grid grid-cols-2 gap-4 mt-4'>
										<div className='bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg text-center'>
											<div className='text-xs text-slate-500'>Planned Foods Eaten</div>
											<div className='font-bold text-lg'>
												{selectedMetrics.consumedFoods} / {selectedMetrics.plannedFoods}
											</div>
										</div>
										<div className='bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg text-center'>
											<div className='text-xs text-slate-500'>Extra Foods</div>
											<div className='font-bold text-lg'>{selectedMetrics.extraFoodsCount}</div>
										</div>
									</div>

									{selectedDayExtraFoods.length > 0 && (
										<div className='mt-6'>
											<h4 className='font-semibold text-sm text-slate-600 dark:text-slate-400 mb-2'>
												Extra Foods Consumed
											</h4>
											<ul className='space-y-2'>
												{selectedDayExtraFoods.map((f, idx) => (
													<li
														key={idx}
														className='bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg text-sm border border-slate-100 dark:border-slate-700'>
														{f.description} <span className='text-slate-400 ml-2'>{f.time}</span>
													</li>
												))}
											</ul>
										</div>
									)}
								</>
							)}
						</div>
					</div>

					{/* Charts */}
					<div className='mt-8 border-t border-slate-100 dark:border-slate-800 pt-8'>
						<h3 className='text-xl font-bold mb-6'>Progress Overview (Day 1 to {selectedDateObj.toLocaleDateString()})</h3>
						<div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
							<div className='h-64'>
								<h4 className='text-center text-sm font-semibold mb-2'>Workout Adherence %</h4>
								<ResponsiveContainer width='100%' height='100%'>
									<BarChart data={reportMetrics}>
										<CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' />
										<XAxis dataKey='dayIndex' tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
										<YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
										<Tooltip
											cursor={{ fill: "transparent" }}
											contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
										/>
										<Bar dataKey='wAdherence' name='Adherence %' fill='#4f46e5' radius={[4, 4, 0, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
							<div className='h-64'>
								<h4 className='text-center text-sm font-semibold mb-2'>Nutrition Adherence %</h4>
								<ResponsiveContainer width='100%' height='100%'>
									<BarChart data={reportMetrics}>
										<CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' />
										<XAxis dataKey='dayIndex' tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
										<YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
										<Tooltip
											cursor={{ fill: "transparent" }}
											contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
										/>
										<Bar dataKey='nAdherence' name='Adherence %' fill='#16a34a' radius={[4, 4, 0, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
						</div>
					</div>

					{/* Timeline */}
					<div className='mt-8 border-t border-slate-100 dark:border-slate-800 pt-8'>
						<h3 className='text-xl font-bold mb-4'>Daily History</h3>
						<div className='overflow-x-auto'>
							<table className='w-full text-sm text-left'>
								<thead className='bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase'>
									<tr>
										<th className='px-4 py-3 rounded-tl-lg rounded-bl-lg'>Date</th>
										<th className='px-4 py-3'>Day</th>
										<th className='px-4 py-3'>Workout</th>
										<th className='px-4 py-3'>W Adherence</th>
										<th className='px-4 py-3'>Nutrition</th>
										<th className='px-4 py-3 rounded-tr-lg rounded-br-lg'>N Adherence</th>
									</tr>
								</thead>
								<tbody className='divide-y divide-slate-100 dark:divide-slate-800'>
									{dailyMetrics
										.slice()
										.reverse()
										.map((m, idx) => (
											<tr
												key={idx}
												onClick={() => onSelectDate(m.date)}
												className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${m.date === selectedDate ? "bg-indigo-50/50 dark:bg-indigo-900/20" : ""}`}>
												<td className='px-4 py-3 font-medium whitespace-nowrap'>{m.date}</td>
												<td className='px-4 py-3'>{m.dayIndex}</td>
												<td className={`px-4 py-3 font-medium ${getTextColor(m.wStatus)}`}>{m.wStatus}</td>
												<td className='px-4 py-3'>{m.wAdherence.toFixed(0)}%</td>
												<td className={`px-4 py-3 font-medium ${getTextColor(m.nStatus)}`}>{m.nStatus}</td>
												<td className='px-4 py-3'>{m.nAdherence.toFixed(0)}%</td>
											</tr>
										))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
