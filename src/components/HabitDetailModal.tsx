/** @format */

import { useState } from "react";
import DOMPurify from "dompurify";
import { useLiveQuery } from "dexie-react-hooks";
import { X, CalendarDays, History as HistoryIcon, CheckCircle2, XCircle, Check, FileText } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths } from "date-fns";

import { db } from "@/src/lib/db";
import { Habit } from "@/src/types";
import { CATEGORIES } from "./HabitModal";
import { cn, getTodayStr } from "@/src/lib/utils";

interface HabitDetailModalProps {
	habit: Habit;
	onClose: () => void;
}

export default function HabitDetailModal({ habit, onClose }: HabitDetailModalProps) {
	if (!habit)
		return (
			<div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50'>
				<div className='bg-white p-6 rounded-xl'>
					<p>Habit not found.</p>
					<button onClick={onClose} className='mt-4 px-4 py-2 bg-indigo-500 text-white rounded-lg'>
						Close
					</button>
				</div>
			</div>
		);
	const [currentMonth, setCurrentMonth] = useState(new Date());

	const records = useLiveQuery(() => db.dayRecords.where("habitId").equals(habit.id).toArray(), [habit.id]) || [];

	const catDef = CATEGORIES.find((c) => c.id === habit.category) || CATEGORIES[CATEGORIES.length - 1];
	const todayStr = getTodayStr();

	// Calendar logic
	const monthStart = startOfMonth(currentMonth);
	const monthEnd = endOfMonth(monthStart);

	// Pad beginning of month to start on Sunday or Monday (depends on locale, using Sunday here for simplicity)
	const startDate = new Date(monthStart);
	startDate.setDate(startDate.getDate() - startDate.getDay());

	const endDate = new Date(monthEnd);
	if (endDate.getDay() !== 6) {
		endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
	}

	const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

	const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
	const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

	// Determine status for a specific date
	const getDayStatus = (dateStr: string) => {
		const record = records.find((r) => r.date === dateStr);
		const dateObj = parseISO(dateStr);
		const isDayFuture = dateStr > todayStr;
		const isSelectedDay = habit.mode === "consecutive" || (habit.selectedDays || []).includes(dateObj.getDay() as any);

		// Not applicable: either not selected, or before habit start date
		if (!isSelectedDay || dateStr < (habit.currentStartDate || "9999-99-99")) return "inactive";

		if (record?.completed) return "completed";
		if (isDayFuture) return "future";

		// Past selected day, no completion record
		return "missed";
	};

	const getStatusColor = (status: string, isTodayFlag: boolean = false) => {
		if (status === "completed") return "bg-emerald-500 text-white shadow-sm";
		if (status === "missed") return "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400";
		if (status === "future") return "bg-transparent text-slate-300 dark:text-slate-600";
		if (status === "inactive") return "bg-slate-50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 opacity-50";
		// Default (e.g. today not done yet)
		return isTodayFlag
			? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500"
			: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400";
	};

	// Generate chronological history of all applicable days up to today
	const allHistoryDays: { date: string; status: string; note?: string }[] = [];

	if (habit.currentStartDate) {
		const startDate = parseISO(habit.currentStartDate);
		const endDate = parseISO(todayStr);

		if (startDate <= endDate) {
			const daysInterval = eachDayOfInterval({ start: startDate, end: endDate });
			daysInterval.forEach((day) => {
				const dateStr = format(day, "yyyy-MM-dd");
				const status = getDayStatus(dateStr);
				const record = records.find((r) => r.date === dateStr);

				if (status !== "inactive") {
					allHistoryDays.push({
						date: dateStr,
						status,
						note: record?.note,
					});
				}
			});
		}
	}

	// Sort newest first
	const historyList = allHistoryDays.sort((a, b) => b.date.localeCompare(a.date));

	return (
		<div className='fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
			<div className='bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-5xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200'>
				{/* Header */}
				<div className='flex items-center justify-between p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 shrink-0'>
					<div className='flex items-center gap-4'>
						<div
							className={cn(
								"w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
								catDef.color.replace("text-", "text-opacity-80 text-"),
								"bg-slate-50 dark:bg-slate-800",
							)}>
							<CalendarDays size={24} />
						</div>
						<div>
							<h2 className='text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-3'>{habit.title}</h2>
							<p className='text-sm font-medium text-slate-500 dark:text-slate-400'>
								Started {habit.currentStartDate ? format(parseISO(habit.currentStartDate), "MMM d, yyyy") : "Unknown"}
							</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className='w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors'>
						<X size={20} />
					</button>
				</div>

				{/* Content Body - Scrolling area */}
				<div className='flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar'>
					<div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
						{/* Left Col: Calendar */}
						<div className='space-y-6'>
							<div className='flex items-center justify-between'>
								<h3 className='text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2'>
									<CalendarDays size={20} className='text-indigo-500' />
									Monthly View
								</h3>
								<div className='flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-100 dark:border-slate-700/50'>
									<button
										onClick={prevMonth}
										className='p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors'>
										<span className='sr-only'>Previous month</span>
										&larr;
									</button>
									<span className='text-sm font-bold text-slate-700 dark:text-slate-200 min-w-[100px] text-center'>
										{format(currentMonth, "MMMM yyyy")}
									</span>
									<button
										onClick={nextMonth}
										className='p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors'>
										<span className='sr-only'>Next month</span>
										&rarr;
									</button>
								</div>
							</div>

							<div className='bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm'>
								<div className='grid grid-cols-7 gap-1 mb-2'>
									{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
										<div key={d} className='text-center text-xs font-bold text-slate-400 dark:text-slate-500 py-2'>
											{d}
										</div>
									))}
								</div>
								<div className='grid grid-cols-7 gap-1 md:gap-2'>
									{calendarDays.map((day, idx) => {
										const dateStr = format(day, "yyyy-MM-dd");
										const isCurrentMonth = isSameMonth(day, currentMonth);
										const status = getDayStatus(dateStr);
										const isTodayFlag = dateStr === todayStr;

										return (
											<div
												key={idx}
												className={cn(
													"aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all",
													getStatusColor(status, isTodayFlag),
													!isCurrentMonth && "opacity-20",
												)}
												title={format(day, "MMM d, yyyy")}>
												<span className='text-sm font-bold'>{format(day, "d")}</span>
												{status === "completed" && <Check size={12} className='absolute bottom-1' strokeWidth={3} />}
												{records.find((r) => r.date === dateStr)?.note && (
													<div className='absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400' />
												)}
											</div>
										);
									})}
								</div>
							</div>

							{/* Legend */}
							<div className='flex flex-wrap gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 justify-center'>
								<div className='flex items-center gap-1.5'>
									<div className='w-3 h-3 rounded bg-emerald-500'></div> Completed
								</div>
								<div className='flex items-center gap-1.5'>
									<div className='w-3 h-3 rounded bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800'></div>{" "}
									Missed
								</div>
								<div className='flex items-center gap-1.5'>
									<div className='w-3 h-3 rounded bg-slate-100 dark:bg-slate-800 ring-2 ring-indigo-500'></div> Today
								</div>
								<div className='flex items-center gap-1.5'>
									<div className='w-3 h-3 rounded bg-slate-50 dark:bg-slate-800/50 opacity-50'></div> Inactive
								</div>
							</div>
						</div>

						{/* Right Col: History */}
						<div className='space-y-6'>
							<h3 className='text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2'>
								<HistoryIcon size={20} className='text-indigo-500' />
								Daily History
							</h3>

							<div className='bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-inner h-[400px] overflow-y-auto custom-scrollbar'>
								{historyList.length === 0 ? (
									<div className='h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-3'>
										<HistoryIcon size={32} className='opacity-50' />
										<p className='font-medium text-sm'>No activity recorded yet.</p>
									</div>
								) : (
									<div className='space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-700 before:to-transparent'>
										{historyList.map((record, index) => {
											const isCompleted = record.status === "completed";
											const hasNote = !!record.note?.trim();

											return (
												<div
													key={record.date}
													className='relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active'>
													<div className='flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 dark:border-slate-900 bg-white dark:bg-slate-800 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 text-indigo-500'>
														{isCompleted ? (
															<CheckCircle2 className='text-emerald-500' size={18} />
														) : (
															<XCircle className='text-red-500' size={18} />
														)}
													</div>

													<div className='w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm'>
														<div className='flex items-center justify-between mb-1'>
															<span className='text-sm font-bold text-slate-700 dark:text-slate-200'>
																{format(parseISO(record.date), "MMMM d, yyyy")}
															</span>
															<span className='text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full'>
																{isCompleted ? "Completed" : "Missed"}
															</span>
														</div>
														{hasNote && (
															<div className='mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50'>
																<div className='flex gap-2 items-start text-sm text-slate-600 dark:text-slate-400'>
																	<FileText size={14} className='mt-0.5 shrink-0' />
																	<div
																		className='prose prose-sm dark:prose-invert max-w-none'
																		dangerouslySetInnerHTML={{
																			__html: DOMPurify.sanitize(record.note || ""),
																		}}
																	/>
																</div>
															</div>
														)}
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
