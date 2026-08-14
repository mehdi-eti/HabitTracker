/** @format */

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CalendarDays, Dumbbell, Utensils, ChevronLeft, ChevronRight, Upload, Plus, TrendingUp, Flame, Target } from "lucide-react";

import { db } from "@/src/lib/db";
import { useI18n } from "@/src/contexts/I18nContext";
import { importPlanFromJson } from "@/src/utils/planImport";
import DailyProgressModal from "./DailyProgressModal";
import { getDayDataFromPlan } from "@/src/utils/planData";
import { parseLocalDate, formatDateStr, getNormalizedToday, getDaysDifference } from "@/src/lib/utils";

export default function WorkoutCalendar({ onNavigateToPlans }: { onNavigateToPlans?: () => void }) {
	const activePlan = useLiveQuery(() => db.workoutPlans.where("status").equals("active").first());
	const planVersion = useLiveQuery(
		() => (activePlan ? db.workoutPlanVersions.where("planId").equals(activePlan.id).last() : undefined),
		[activePlan?.id],
	);
	const workoutRecords = useLiveQuery(
		() => (activePlan ? db.workoutDailyRecords.where("planId").equals(activePlan.id).toArray() : []),
		[activePlan?.id],
	);
	const nutritionRecords = useLiveQuery(
		() => (activePlan ? db.nutritionDailyRecords.where("planId").equals(activePlan.id).toArray() : []),
		[activePlan?.id],
	);

	const { t } = useI18n();

	const [currentDate, setCurrentDate] = useState(new Date());
	const [selectedReportDate, setSelectedReportDate] = useState<string | null>(null);

	const prevMonth = React.useCallback(() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)), [currentDate]);
	const nextMonth = React.useCallback(() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)), [currentDate]);
	const goToToday = React.useCallback(() => setCurrentDate(new Date()), []);

	const handleImport = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = async (event) => {
			try {
				await importPlanFromJson(event.target?.result as string, true);
			} catch (error) {
				console.error("Failed to import plan", error);
			}
		};
		reader.readAsText(file);
		e.target.value = "";
	}, []);

	const days = React.useMemo(() => Array.from({ length: activePlan?.durationDays ?? 0 }, (_, i) => i + 1), [activePlan?.durationDays]);
	const startDate = React.useMemo(() => (activePlan?.startDate ? parseLocalDate(activePlan.startDate) : getNormalizedToday()), [activePlan?.startDate]);
	const date = React.useMemo(() => new Date(startDate), [startDate]);

	const firstDayOfWeek = React.useMemo(() => startDate.getDay(), [startDate]);
	const blanks = React.useMemo(() => Array.from({ length: firstDayOfWeek }, (_, i) => i), [firstDayOfWeek]);

	// Weekly stats computation
	const today = React.useMemo(() => getNormalizedToday(), []);

	const weeklyStats = React.useMemo(() => {
		const daysPassed = Math.max(0, getDaysDifference(startDate, today));
		const currentWeekIndex = Math.floor(daysPassed / 7);
		const weekStartDay = currentWeekIndex * 7 + 1;
		const weekEndDay = Math.min((currentWeekIndex + 1) * 7, activePlan?.durationDays ?? 0);

		let plannedWorkouts = 0;
		let doneWorkouts = 0;
		let plannedNutrition = 0;
		let doneNutrition = 0;
		let restDays = 0;

		for (let d = weekStartDay; d <= weekEndDay; d++) {
			const dDate = new Date(startDate);
			dDate.setDate(dDate.getDate() + d - 1);
			const dStr = formatDateStr(dDate);
			const dData = getDayDataFromPlan(dStr, d, planVersion);
			const dW = workoutRecords?.find((r) => r.date === dStr);
			const dN = nutritionRecords?.find((r) => r.date === dStr);

			if (dData?.restDay) {
				restDays++;
			} else {
				if (dData?.workout) {
					plannedWorkouts++;
					if (dW) doneWorkouts++;
				}
				if (dData?.nutrition) {
					plannedNutrition++;
					if (dN) doneNutrition++;
				}
			}
		}

		return {
			currentWeekIndex,
			weekStartDay,
			weekEndDay,
			plannedWorkouts,
			doneWorkouts,
			plannedNutrition,
			doneNutrition,
			restDays,
		};
	}, [startDate, today, activePlan?.durationDays, planVersion, workoutRecords, nutritionRecords]);

	// Streak calculation
	const streak = React.useMemo(() => {
		const daysPassed = Math.max(0, getDaysDifference(startDate, today));
		let streakCount = 0;
		for (let d = daysPassed; d >= 1; d--) {
			const dDate = new Date(startDate);
			dDate.setDate(dDate.getDate() + d - 1);
			const dStr = formatDateStr(dDate);
			const dW = workoutRecords?.find((r) => r.date === dStr);
			const dN = nutritionRecords?.find((r) => r.date === dStr);
			const dData = getDayDataFromPlan(dStr, d, planVersion);

			// Rest days don't break streak but don't count either
			if (dData?.restDay) continue;

			// Check if day was planned for anything
			const hasPlannedWorkout = !!dData?.workout;
			const hasPlannedNutrition = !!dData?.nutrition;

			// If nothing planned, streak breaks (unplanned day = missed)
			if (!hasPlannedWorkout && !hasPlannedNutrition) break;

			// Day is "done" if all planned items have records
			const workoutDone = !hasPlannedWorkout || !!dW;
			const nutritionDone = !hasPlannedNutrition || !!dN;

			if (workoutDone && nutritionDone) {
				streakCount++;
			} else {
				break;
			}
		}
		return streakCount;
	}, [startDate, today, planVersion, workoutRecords, nutritionRecords]);

	// Destructure for JSX usage
	const { currentWeekIndex, weekStartDay, weekEndDay, plannedWorkouts, doneWorkouts, plannedNutrition, doneNutrition, restDays } = weeklyStats;

	if (!activePlan) {
		const today = new Date();
		const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
		const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
		const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
		const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

		return (
			<div className='space-y-6'>
				<div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4'>
					<div>
						<h2 className='text-2xl font-bold text-slate-800 dark:text-white'>{t("plan_calendar") || "Plan Calendar"}</h2>
						<p className='text-slate-500 dark:text-slate-400 mt-1'>
							{currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
						</p>
					</div>

					<div className='flex items-center gap-2' dir='ltr'>
						<button
							onClick={prevMonth}
							className='p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors'>
							<ChevronLeft size={20} />
						</button>
						<button
							onClick={goToToday}
							className='px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 transition-colors'>
							{t("today")}
						</button>
						<button
							onClick={nextMonth}
							className='p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors'>
							<ChevronRight size={20} />
						</button>
					</div>
				</div>

				<div className='flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700'>
					<div className='flex items-center gap-3 text-slate-600 dark:text-slate-300'>
						<CalendarDays className='text-slate-400' size={24} />
						<p className='text-sm font-medium'>{t("no_active_plan_calendar_desc")}</p>
					</div>
					<div className='flex gap-2 w-full md:w-auto'>
						<button
							onClick={onNavigateToPlans}
							className='flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors'>
							<Plus size={16} />
							{t("create_plan")}
						</button>
						<label className='flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-sm font-medium rounded-lg cursor-pointer transition-colors'>
							<Upload size={16} />
							{t("import_json")}
							<input type='file' accept='.json' className='hidden' onChange={handleImport} />
						</label>
					</div>
				</div>

				<div className='grid grid-cols-7 gap-3'>
					{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
						<div key={day} className='text-center text-xs font-bold text-slate-400 uppercase py-2'>
							{day}
						</div>
					))}

					{blanks.map((blank) => (
						<div key={`blank-${blank}`} className='h-24 md:h-32 rounded-xl opacity-0'></div>
					))}

					{days.map((dayIndex) => {
						const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayIndex);
						const isToday = date.toDateString() === today.toDateString();

						return (
							<div
								key={dayIndex}
								className={`border bg-slate-50/50 dark:bg-slate-900/50 rounded-xl p-2 md:p-3 flex flex-col h-24 md:h-32 opacity-70 transition-colors ${
									isToday
										? "border-indigo-300 dark:border-indigo-700 bg-indigo-50/30 dark:bg-indigo-900/10"
										: "border-slate-200 dark:border-slate-700"
								}`}>
								<div className='flex justify-start items-start mb-2'>
									<span
										className={`text-xs md:text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${
											isToday ? "bg-indigo-600 text-white" : "text-slate-500 dark:text-slate-400"
										}`}>
										{dayIndex}
									</span>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		);
	}

	return (
		<div className='space-y-6'>
			<div className='flex justify-between border-b border-slate-100 dark:border-slate-800 pb-4'>
				<div>
					<h2 className='text-2xl font-bold text-slate-800 dark:text-white'>{t("plan_calendar") || "Plan Calendar"}</h2>
					<p className='text-slate-500 dark:text-slate-400 mt-1 text-xs'>
						{activePlan.name} ({activePlan.durationDays} {t("days")})
					</p>
				</div>
				<div className='w-2/3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4'>
					<div className='flex items-center justify-between'>
						<h3 className='text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2'>
							<TrendingUp size={16} className='text-indigo-500' />
							{t("this_week") || "This Week"} {currentWeekIndex + 1}
						</h3>
						{streak > 0 && (
							<div className='flex items-center gap-1.5 text-xs font-semibold text-orange-500 bg-orange-50 dark:bg-orange-950/30 px-2.5 py-1 rounded-full'>
								<Flame size={14} />
								{streak} {streak === 1 ? t("day") || "day" : t("days") || "days"} streak
							</div>
						)}
					</div>

					<div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
						<div className='rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 space-y-1.5'>
							<div className='flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400'>
								<Dumbbell size={12} />
								<span>{t("workouts") || "Workouts"}</span>
							</div>
							<div className='flex items-baseline gap-1'>
								<span className='text-xl font-bold text-slate-800 dark:text-white'>{doneWorkouts}</span>
								<span className='text-xs text-slate-400'>/ {plannedWorkouts}</span>
							</div>
							<div className='h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden'>
								<div
									className='h-full rounded-full bg-blue-500 transition-all duration-500'
									style={{ width: plannedWorkouts > 0 ? `${(doneWorkouts / plannedWorkouts) * 100}%` : "0%" }}
								/>
							</div>
						</div>

						<div className='rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 space-y-1.5'>
							<div className='flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400'>
								<Utensils size={12} />
								<span>{t("nutrition") || "Nutrition"}</span>
							</div>
							<div className='flex items-baseline gap-1'>
								<span className='text-xl font-bold text-slate-800 dark:text-white'>{doneNutrition}</span>
								<span className='text-xs text-slate-400'>/ {plannedNutrition}</span>
							</div>
							<div className='h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden'>
								<div
									className='h-full rounded-full bg-emerald-500 transition-all duration-500'
									style={{ width: plannedNutrition > 0 ? `${(doneNutrition / plannedNutrition) * 100}%` : "0%" }}
								/>
							</div>
						</div>

						<div className='rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 space-y-1.5'>
							<div className='flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400'>
								<Target size={12} />
								<span>{t("rest_days") || "Rest Days"}</span>
							</div>
							<div className='flex items-baseline gap-1'>
								<span className='text-xl font-bold text-slate-800 dark:text-white'>{restDays}</span>
								<span className='text-xs text-slate-400'>/ {weekEndDay - weekStartDay + 1}</span>
							</div>
							<div className='h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden'>
								<div
									className='h-full rounded-full bg-slate-400 transition-all duration-500'
									style={{ width: `${(restDays / Math.max(1, weekEndDay - weekStartDay + 1)) * 100}%` }}
								/>
							</div>
						</div>

						<div className='rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 space-y-1.5'>
							<div className='flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400'>
								<TrendingUp size={12} />
								<span>{t("overall") || "Overall"}</span>
							</div>
							<div className='flex items-baseline gap-1'>
								<span className='text-xl font-bold text-slate-800 dark:text-white'>
									{plannedWorkouts + plannedNutrition > 0
										? Math.round(((doneWorkouts + doneNutrition) / (plannedWorkouts + plannedNutrition)) * 100)
										: 0}
									%
								</span>
							</div>
							<div className='h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden'>
								<div
									className='h-full rounded-full bg-indigo-500 transition-all duration-500'
									style={{
										width:
											plannedWorkouts + plannedNutrition > 0
												? `${((doneWorkouts + doneNutrition) / (plannedWorkouts + plannedNutrition)) * 100}%`
												: "0%",
									}}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className='w-full overflow-x-auto pb-4'>
				<div className='min-w-200'>
					<div className='grid grid-cols-7 gap-3'>
						{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
							<div key={day} className='text-center text-xs font-bold text-slate-400 uppercase py-2'>
								{day}
							</div>
						))}

						{blanks.map((blank, index) => (
							<div
								key={`blank-${blank}-${index}`}
								className='text-end p-2 h-full bg-slate-50/50 dark:bg-slate-800/30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors duration-200 flex flex-col justify-between'>
								<span className='text-[10px] text-slate-400 dark:text-slate-500 font-medium'>
									{date.toLocaleDateString([], { month: "short", day: "numeric" })}
								</span>
								<div className='w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700 self-end' />
							</div>
						))}

						{days.map((dayIndex) => {
							const date = new Date(startDate);
							date.setDate(date.getDate() + dayIndex - 1);
							const dateStr = formatDateStr(date);
							const dayData = getDayDataFromPlan(dateStr, dayIndex, planVersion);
							const wRecord = workoutRecords?.find((r) => r.date === dateStr);
							const nRecord = nutritionRecords?.find((r) => r.date === dateStr);

							const todayStr = formatDateStr(new Date());
							const isToday = dateStr === todayStr;
							const isPast = date < getNormalizedToday();
							const isFuture = !isToday && !isPast;

							return (
								<div
									key={dayIndex}
									onClick={() => {
										if (!isFuture) setSelectedReportDate(dateStr);
									}}
									className={`border rounded-xl p-3 flex flex-col h-32 transition-colors ${
										isFuture
											? "opacity-50 cursor-not-allowed"
											: "cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600"
									} ${
										isToday
											? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10 shadow-sm"
											: isPast
												? "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
												: "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
									}`}>
									<div className='flex justify-between items-start mb-2'>
										<span
											className={`text-xs font-bold ${isToday ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500"}`}>
											{t("day")} {dayIndex}
										</span>
										<span className='text-[10px] text-slate-400'>
											{date.toLocaleDateString([], { month: "short", day: "numeric" })}
										</span>
									</div>

									<div className='flex-1 overflow-hidden'>
										{dayData?.restDay ? (
											<div className='text-xs text-slate-400 font-medium h-full flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-lg'>
												{t("rest_day") || "Rest"}
											</div>
										) : (
											<div className='space-y-1.5 mt-1'>
												{dayData?.workout && (
													<div
														className={
															"flex items-center gap-1.5 text-[10px] sm:text-xs " +
															(wRecord
																? "text-green-600 dark:text-green-500"
																: isPast
																	? "text-red-500 dark:text-red-400 opacity-70 line-through"
																	: "text-slate-600 dark:text-slate-400")
														}>
														<Dumbbell
															size={12}
															className={`shrink-0 ${wRecord ? "text-green-500" : isPast ? "text-red-500" : ""}`}
														/>
														<span className='truncate font-medium'>
															{`${dayData.workout.exercises.length} ${dayData.workout.title}`}
														</span>
													</div>
												)}
												{dayData?.nutrition && (
													<div
														className={
															"flex items-center gap-1.5 text-[10px] sm:text-xs " +
															(nRecord
																? "text-green-600 dark:text-green-500"
																: isPast
																	? "text-red-500 dark:text-red-400 opacity-70 line-through"
																	: "text-slate-600 dark:text-slate-400")
														}>
														<Utensils
															size={12}
															className={`shrink-0 ${nRecord ? "text-green-500" : isPast ? "text-red-500" : ""}`}
														/>
														<span className='truncate font-medium'>
															{dayData.nutrition.name || `${dayData.nutrition.meals?.length || 0} meals`}
														</span>
													</div>
												)}
											</div>
										)}
									</div>
									<div className='bottom-0 left-0 right-0 h-0.75 rounded-b-xl overflow-hidden bg-slate-100 dark:bg-slate-800'>
										<div
											className={`h-full transition-all duration-500 ${
												dayData?.restDay
													? "bg-slate-300 dark:bg-slate-600"
													: isPast
														? wRecord
															? "bg-emerald-500"
															: "bg-red-400"
														: isToday
															? wRecord
																? "bg-emerald-500"
																: "bg-amber-400"
															: "bg-indigo-200 dark:bg-indigo-900/40"
											}`}
											style={{
												width: dayData?.restDay
													? "100%"
													: isPast
														? wRecord
															? "100%"
															: "100%"
														: isToday
															? wRecord
																? "100%"
																: "55%"
															: "30%",
											}}
										/>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			{selectedReportDate && (
				<DailyProgressModal
					plan={activePlan}
					planVersion={planVersion}
					selectedDate={selectedReportDate}
					onClose={() => setSelectedReportDate(null)}
					onSelectDate={(dateStr) => setSelectedReportDate(dateStr)}
				/>
			)}
		</div>
	);
}
