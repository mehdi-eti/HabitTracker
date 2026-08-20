/** @format */

import { useLiveQuery } from "dexie-react-hooks";
import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subDays } from "date-fns";
import {
	Plus,
	Check,
	Calendar as CalendarIcon,
	CheckCircle2,
	Flame,
	Target,
	Trophy,
	TrendingUp,
	Activity,
	ArrowRight,
	Zap,
	Star,
	LayoutDashboard,
	BarChart2,
	Clock,
} from "lucide-react";

import { db } from "@/src/lib/db";
import { Habit, DayRecord } from "@/src/types";
import { useHabits } from "@/src/hooks/useHabits";
import { getDaysLeft } from "@/src/lib/habitUtils";
import { useI18n } from "@/src/contexts/I18nContext";
import CSSConfetti from "@/src/components/CSSConfetti";
import DashboardChart from "@/src/components/DashboardChart";
import { getTodayStr, getYesterdayStr, cn } from "@/src/lib/utils";
import DailyTrackingModal from "@/src/components/DailyTrackingModal";
import HabitModal, { CATEGORIES } from "@/src/components/HabitModal";
import HabitDetailModal from "@/src/components/HabitDetailModal";
import AllRecentActivityModal from "@/src/components/AllRecentActivityModal";
import WorkoutNutritionSummary from "@/src/components/WorkoutNutritionSummary";

const MOTIVATION_QUOTES = [
	"Small daily improvements over time lead to stunning results.",
	"Success is the product of daily habits—not once-in-a-lifetime transformations.",
	"You do not rise to the level of your goals. You fall to the level of your systems.",
	"The secret of your future is hidden in your daily routine.",
	"Every action you take is a vote for the type of person you wish to become.",
	"Don't stop when you're tired. Stop when you're done.",
	"Motivation is what gets you started. Habit is what keeps you going.",
	"Great things are not done by impulse, but by a series of small things brought together.",
	"It does not matter how slowly you go as long as you do not stop.",
	"The only bad workout is the one that didn't happen.",
];

export default function Dashboard() {
	const { t, dir } = useI18n();
	const navigate = useNavigate();
	const { habits, dayRecords } = useHabits("active");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [showAllActivityModal, setShowAllActivityModal] = useState(false);
	const [detailHabit, setDetailHabit] = useState<Habit | undefined>(undefined);
	const [currentTime, setCurrentTime] = useState(new Date());

	const [trackingDate, setTrackingDate] = useState<string | null>(null);
	const [trackingHabit, setTrackingHabit] = useState<Habit | null>(null);
	const [showConfetti, setShowConfetti] = useState(false);

	const [viewingDate, setViewingDate] = useState<"today" | "yesterday">("today");

	const allRecords = useLiveQuery(() => db.dayRecords.toArray(), []) || [];
	const allHabits = useLiveQuery(() => db.habits.toArray(), []) || [];
	const completedHabitsAll = allHabits.filter((h) => h.status === "completed");

	useEffect(() => {
		const timer = setInterval(() => setCurrentTime(new Date()), 60000);
		return () => clearInterval(timer);
	}, []);

	const todayStr = getTodayStr();
	const yesterdayStr = getYesterdayStr();
	const activeDateStr = viewingDate === "today" ? todayStr : yesterdayStr;
	const activeDateObj = viewingDate === "today" ? new Date() : subDays(new Date(), 1);
	const activeDayOfWeek = activeDateObj.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;

	const activeHabitsForDate =
		habits?.filter((habit) => {
			if (habit.mode === "consecutive") return true;
			return (habit.selectedDays || []).includes(activeDayOfWeek);
		}) || [];

	const completedActiveHabits: Habit[] = [];
	const pendingActiveHabits: Habit[] = [];

	activeHabitsForDate.forEach((habit) => {
		const record = dayRecords?.find((r) => r.habitId === habit.id && r.date === activeDateStr);
		if (record && record.completed) {
			completedActiveHabits.push(habit);
		} else {
			pendingActiveHabits.push(habit);
		}
	});

	const activeTasks = activeHabitsForDate.length;
	const activeCompleted = completedActiveHabits.length;
	const activeRemaining = pendingActiveHabits.length;
	const successRate = activeTasks > 0 ? Math.round((activeCompleted / activeTasks) * 100) : 0;

	// Calculate some stats
	const activeHabitsCount = habits?.length || 0;

	// Calculate global streak and achievements
	const { bestStreak, achievements } = useMemo(() => {
		const totalCompletions = allRecords.filter((r) => r.completed).length;

		// Calculate best streak (simplified, consecutive days only)
		const recordsByDate: Record<string, number> = allRecords
			.filter((r) => r.completed)
			.reduce(
				(acc, r) => {
					acc[r.date] = (acc[r.date] || 0) + 1;
					return acc;
				},
				{} as Record<string, number>,
			);

		const dates = Object.keys(recordsByDate).sort();
		let currentGlobalStreak = 1;
		let globalMaxStreak = dates.length > 0 ? 1 : 0;
		for (let i = 1; i < dates.length; i++) {
			const prevDate = new Date(dates[i - 1]);
			const currDate = new Date(dates[i]);
			const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
			if (diffDays === 1) {
				currentGlobalStreak++;
				globalMaxStreak = Math.max(globalMaxStreak, currentGlobalStreak);
			} else {
				currentGlobalStreak = 1;
			}
		}

		const perfectDayAchieved = Object.values(recordsByDate).some((count: number) => count >= 3);

		return {
			bestStreak: globalMaxStreak,
			achievements: [
				{
					id: "first_step",
					title: t("first_step"),
					description: t("complete_1_habit"),
					icon: <CheckCircle2 size={24} className={totalCompletions >= 1 ? "text-emerald-500" : "text-slate-300"} />,
					achieved: totalCompletions >= 1,
					bg: totalCompletions >= 1 ? "bg-emerald-50 dark:bg-emerald-900/30" : "bg-slate-50 dark:bg-slate-800",
					border:
						totalCompletions >= 1
							? "border-emerald-200 dark:border-emerald-800/50 border-2"
							: "border-slate-100 dark:border-slate-800 border",
				},
				{
					id: "streak_3",
					title: t("streak_3"),
					description: t("complete_3_day_streak"),
					icon: <Flame size={24} className={globalMaxStreak >= 3 ? "text-orange-500" : "text-slate-300"} />,
					achieved: globalMaxStreak >= 3,
					bg: globalMaxStreak >= 3 ? "bg-orange-50 dark:bg-orange-900/30" : "bg-slate-50 dark:bg-slate-800",
					border:
						globalMaxStreak >= 3
							? "border-orange-200 dark:border-orange-800/50 border-2"
							: "border-slate-100 dark:border-slate-800 border",
				},
				{
					id: "streak_7",
					title: t("streak_7"),
					description: t("complete_7_day_streak"),
					icon: <Trophy size={24} className={globalMaxStreak >= 7 ? "text-amber-500" : "text-slate-300"} />,
					achieved: globalMaxStreak >= 7,
					bg: globalMaxStreak >= 7 ? "bg-amber-50 dark:bg-amber-900/30" : "bg-slate-50 dark:bg-slate-800",
					border:
						globalMaxStreak >= 7
							? "border-amber-200 dark:border-amber-800/50 border-2"
							: "border-slate-100 dark:border-slate-800 border",
				},
				{
					id: "perfect_day",
					title: t("perfect_day"),
					description: t("complete_3_habits"),
					icon: <Target size={24} className={perfectDayAchieved ? "text-indigo-500" : "text-slate-300"} />,
					achieved: perfectDayAchieved,
					bg: perfectDayAchieved ? "bg-indigo-50 dark:bg-indigo-900/30" : "bg-slate-50 dark:bg-slate-800",
					border: perfectDayAchieved
						? "border-indigo-200 dark:border-indigo-800/50 border-2"
						: "border-slate-100 dark:border-slate-800 border",
				},
				{
					id: "century",
					title: t("century"),
					description: t("complete_100_habits"),
					icon: <Star size={24} className={totalCompletions >= 100 ? "text-purple-500" : "text-slate-300"} />,
					achieved: totalCompletions >= 100,
					bg: totalCompletions >= 100 ? "bg-purple-50 dark:bg-purple-900/30" : "bg-slate-50 dark:bg-slate-800",
					border:
						totalCompletions >= 100
							? "border-purple-200 dark:border-purple-800/50 border-2"
							: "border-slate-100 dark:border-slate-800 border",
				},
			],
		};
	}, [allRecords]);

	const handleToggle = async (habit: Habit, completed: boolean) => {
		const recordId = `${habit.id}_${activeDateStr}`;
		const existing = dayRecords?.find((r) => r.habitId === habit.id && r.date === activeDateStr);

		if (existing) {
			await db.dayRecords.update(recordId, { completed, updatedAt: Date.now() });
		} else {
			await db.dayRecords.put({
				id: recordId,
				habitId: habit.id,
				date: activeDateStr,
				completed,
				note: "",
				updatedAt: Date.now(),
			});
		}

		if (completed) {
			if (activeCompleted + 1 >= activeTasks && activeTasks > 0) {
				setShowConfetti(true);
			}
		}
	};

	const handleSaveRecord = async (completed: boolean, note: string) => {
		if (!trackingHabit || !trackingDate) return;
		const recordId = `${trackingHabit.id}_${trackingDate}`;

		if (!completed && !note.trim()) {
			await db.dayRecords.delete(recordId);
		} else {
			await db.dayRecords.put({
				id: recordId,
				habitId: trackingHabit.id,
				date: trackingDate,
				completed,
				note,
				updatedAt: Date.now(),
			});
		}

		if (completed && trackingDate === activeDateStr) {
			const wasCompleted = !!dayRecords?.find((r) => r.habitId === trackingHabit.id && r.date === trackingDate)?.completed;
			if (!wasCompleted && activeCompleted + 1 >= activeTasks && activeTasks > 0) {
				setShowConfetti(true);
			}
		}

		setTrackingDate(null);
		setTrackingHabit(null);
	};

	// Recent Activity logic
	const allRecentRecords = allRecords.filter((r) => r.completed).sort((a, b) => b.updatedAt - a.updatedAt);
	const recentRecords = allRecentRecords.slice(0, 3);

	return (
		<div className='space-y-6 md:space-y-8 animate-in fade-in duration-300 pb-20' dir={dir}>
			{/* Top Header / Greeting */}
			<div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
				<div>
					<h1 className='text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-slate-100 leading-tight tracking-tight'>
						Happy {format(currentTime, "EEEE")} <span className='text-2xl'>👋</span>
					</h1>
					<p className='text-sm font-medium text-slate-500 dark:text-slate-400 mt-1'>
						{format(currentTime, "dd MMMM yyyy")} • {t("what_is_your_focus_today")}
					</p>
				</div>
				<div className='flex items-center gap-3 w-full md:w-auto'>
					<button
						onClick={() => setIsModalOpen(true)}
						className='flex-1 md:flex-none py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2'>
						<Plus size={18} strokeWidth={3} /> {t("create_habit")}
					</button>
				</div>
			</div>

			{/* Top Summary Row */}
			<div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4'>
				<StatCard
					icon={<Target size={18} className='text-indigo-500' />}
					label={t("active_habits")}
					value={activeHabitsCount}
					bg='bg-indigo-50 dark:bg-indigo-900/20'
				/>
				<StatCard
					icon={<CheckCircle2 size={18} className='text-emerald-500' />}
					label={t("completed_habits")}
					value={completedHabitsAll.length}
					bg='bg-emerald-50 dark:bg-emerald-900/20'
				/>
				<StatCard
					icon={<TrendingUp size={18} className='text-blue-500' />}
					label={t("today_label")}
					value={`${successRate}%`}
					bg='bg-blue-50 dark:bg-blue-900/20'
				/>
				<StatCard
					icon={<Flame size={18} className='text-orange-500' />}
					label={t("best_streak")}
					value={`${bestStreak}d`}
					bg='bg-orange-50 dark:bg-orange-900/20'
				/>
				<StatCard
					icon={<Zap size={18} className='text-amber-500' />}
					label={t("remaining_today")}
					value={activeRemaining}
					bg='bg-amber-50 dark:bg-amber-900/20'
				/>
			</div>

			{/* Achievements Section */}
			<div className='bg-white dark:bg-slate-900 rounded-4xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-800 lg:col-span-12 mt-6'>
				<div className='flex items-center justify-between mb-6'>
					<div>
						<h3 className='font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2'>
							<Trophy size={20} className='text-amber-500' />
							{t("achievements")}
						</h3>
						<p className='text-sm text-slate-500 dark:text-slate-400 mt-1'>{t("unlock_badges")}</p>
					</div>
					<div className='bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-xs font-bold text-slate-500 dark:text-slate-400'>
						{achievements.filter((a) => a.achieved).length} / {achievements.length} {t("unlocked")}
					</div>
				</div>

				<div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4'>
					{achievements.map((badge) => (
						<div
							key={badge.id}
							className={`rounded-2xl p-4 flex flex-col items-center text-center transition-all duration-300 ${badge.bg} ${badge.border} ${badge.achieved ? "shadow-sm opacity-100 scale-100" : "opacity-60 grayscale hover:grayscale-0 cursor-pointer"}`}>
							<div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 bg-white dark:bg-slate-950 shadow-sm`}>
								{badge.icon}
							</div>
							<h4 className={`font-bold text-sm mb-1 ${badge.achieved ? "text-slate-800 dark:text-slate-100" : "text-slate-500"}`}>
								{badge.title}
							</h4>
							<p className='text-xs text-slate-500 dark:text-slate-400 font-medium leading-tight'>{badge.description}</p>
						</div>
					))}
				</div>
			</div>

			<div className='grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8'>
				{/* Left Column (3) - Quick Actions, Motivation, Recent Activity */}
				<div className='lg:col-span-3 space-y-6'>
					<div className='bg-linear-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-md shadow-indigo-500/20 relative overflow-hidden'>
						<div className='absolute -right-4 -top-4 opacity-10'>
							<Star size={100} />
						</div>
						<h3 className='font-bold text-lg mb-2 relative z-10'>{t("quote_of_the_day")}</h3>
						<p className='text-indigo-100 text-sm font-medium relative z-10 leading-relaxed italic'>
							"{MOTIVATION_QUOTES[Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24)) % MOTIVATION_QUOTES.length]}"
						</p>
					</div>

					<div className='bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800'>
						<h3 className='font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2'>
							<Zap size={18} className='text-amber-500' /> {t("quick_actions")}
						</h3>
						<div className='space-y-2'>
							<QuickActionButton icon={<CalendarIcon size={16} />} label={t("view_calendar")} onClick={() => navigate("/calendar")} />
							<QuickActionButton icon={<BarChart2 size={16} />} label={t("analytics_stats")} onClick={() => navigate("/stats")} />
							<QuickActionButton
								icon={<LayoutDashboard size={16} />}
								label={t("browse_all_habits")}
								onClick={() => navigate("/habits")}
							/>
						</div>
					</div>

					<div className='bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800'>
						<div className='flex items-center justify-between mb-4'>
							<h3 className='font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2'>
								<Activity size={18} className='text-blue-500' /> {t("recent_activity")}
							</h3>
						</div>
						<div className='space-y-4'>
							{recentRecords.length === 0 ? (
								<p className='text-sm font-medium text-slate-500 dark:text-slate-400'>{t("no_recent_activity")}</p>
							) : (
								<>
									{recentRecords.map((r) => {
										const h = allHabits.find((h) => h.id === r.habitId);
										if (!h) return null;
										return (
											<div
												key={r.id}
												onClick={() => setDetailHabit(h)}
												className='flex items-start gap-3 p-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors'>
												<div className='w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0'>
													<Check size={14} className='text-emerald-500' />
												</div>
												<div>
													<p className='text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-1'>
														{h.title}
													</p>
													<p className='text-xs font-medium text-slate-400'>
														{r.date === todayStr ? t("today") : r.date}
													</p>
												</div>
											</div>
										);
									})}
									<button
										onClick={() => setShowAllActivityModal(true)}
										className='w-full py-2.5 mt-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2'>
										{t("view_all") || "View All"}
									</button>
								</>
							)}
						</div>
					</div>
				</div>

				{/* Center Column (5) - Today's Todos */}
				<div className='lg:col-span-4 space-y-6'>
					<div className='bg-white dark:bg-slate-900 rounded-4xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-800 h-full flex flex-col'>
						<div className='flex justify-between items-center mb-6'>
							<div>
								<div className='flex items-center gap-2 mb-2'>
									<button
										onClick={() => setViewingDate("yesterday")}
										className={cn(
											"px-3 py-1 text-xs font-bold rounded-lg transition-colors",
											viewingDate === "yesterday"
												? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
												: "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700",
										)}>
										{t("yesterday")}
									</button>
									<button
										onClick={() => setViewingDate("today")}
										className={cn(
											"px-3 py-1 text-xs font-bold rounded-lg transition-colors",
											viewingDate === "today"
												? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
												: "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700",
										)}>
										{t("today")}
									</button>
								</div>
								<h2 className='text-xl font-bold text-slate-800 dark:text-slate-100'>
									{viewingDate === "today" ? t("todays_todos") : t("yesterday")}
								</h2>
								<p className='text-sm text-slate-500 font-medium mt-1'>
									{activeTasks} {t("tasks_scheduled")}
								</p>
							</div>
							<div className='w-12 h-12 rounded-full border-4 border-indigo-50 dark:border-indigo-900/30 flex items-center justify-center relative'>
								<svg className='w-full h-full absolute inset-0 -rotate-90' viewBox='0 0 36 36'>
									<path
										className='text-indigo-500'
										strokeDasharray={`${successRate}, 100`}
										d='M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831'
										fill='none'
										stroke='currentColor'
										strokeWidth='4'
									/>
								</svg>
								<span className='text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400'>{successRate}%</span>
							</div>
						</div>

						<div className='flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2 pb-2'>
							{activeHabitsForDate.length === 0 ? (
								<div className='text-center py-12 flex flex-col items-center justify-center h-full border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl'>
									<div className='w-16 h-16 mx-auto bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4'>
										<CheckCircle2 className='text-slate-300 dark:text-slate-600' size={32} />
									</div>
									<p className='text-slate-500 dark:text-slate-400 font-medium'>{t("clear_day")}</p>
								</div>
							) : (
								<>
									{pendingActiveHabits.length > 0 && (
										<div className='space-y-3'>
											<h4 className='text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2'>
												{t("pending")} ({pendingActiveHabits.length})
											</h4>
											{pendingActiveHabits.map((habit) => (
												<TodoItem
													key={habit.id}
													habit={habit}
													isCompleted={false}
													onToggle={(c) => handleToggle(habit, c)}
													onClick={() => {
														setTrackingHabit(habit);
														setTrackingDate(activeDateStr);
													}}
												/>
											))}
										</div>
									)}

									{completedActiveHabits.length > 0 && (
										<div className='space-y-3 mt-6'>
											<h4 className='text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2'>
												{t("completed")} ({completedActiveHabits.length})
											</h4>
											{completedActiveHabits.map((habit) => (
												<TodoItem
													key={habit.id}
													habit={habit}
													isCompleted={true}
													onToggle={(c) => handleToggle(habit, c)}
													onClick={() => {
														setTrackingHabit(habit);
														setTrackingDate(activeDateStr);
													}}
												/>
											))}
										</div>
									)}
								</>
							)}
						</div>
					</div>
				</div>

				{/* Right Column (4) - Calendar & Analytics */}
				<div className='lg:col-span-5 space-y-6'>
					<MiniCalendarWidget habits={habits || []} dayRecords={allRecords || []} />
				</div>
			</div>
			<div className='bg-white dark:bg-slate-900 rounded-4xl p-6 shadow-sm border border-slate-100 dark:border-slate-800'>
				<div className='flex items-center justify-between mb-4'>
					<h3 className='font-bold text-slate-800 dark:text-slate-100'>{t("activity_trend")}</h3>
					<span className='text-[10px] font-extrabold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-1 rounded-md uppercase tracking-wider'>
						{t("last_7_days")}
					</span>
				</div>
				<div className='-mx-2'>
					<DashboardChart />
				</div>
			</div>

			<WorkoutNutritionSummary />

			{showConfetti && <CSSConfetti active={showConfetti} onComplete={() => setShowConfetti(false)} />}

			{isModalOpen && <HabitModal onClose={() => setIsModalOpen(false)} />}

			{trackingDate && trackingHabit && (
				<DailyTrackingModal
					habit={trackingHabit}
					date={trackingDate}
					initialRecord={dayRecords?.find((r) => r.habitId === trackingHabit.id && r.date === trackingDate)}
					isEditable={true}
					onClose={() => {
						setTrackingDate(null);
						setTrackingHabit(null);
					}}
					onSave={handleSaveRecord}
				/>
			)}

			{showAllActivityModal && (
				<AllRecentActivityModal
					records={allRecentRecords}
					habits={allHabits}
					onClose={() => setShowAllActivityModal(false)}
					onActivityClick={(habit) => {
						setShowAllActivityModal(false);
						setDetailHabit(habit);
					}}
				/>
			)}
			{detailHabit && <HabitDetailModal habit={detailHabit} onClose={() => setDetailHabit(undefined)} />}
		</div>
	);
}

// Subcomponents

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string | number; bg: string }) {
	return (
		<div className='bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 transition-all hover:shadow-md'>
			<div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", bg)}>{icon}</div>
			<div>
				<p className='text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider'>{label}</p>
				<p className='text-lg font-extrabold text-slate-800 dark:text-slate-100'>{value}</p>
			</div>
		</div>
	);
}

function QuickActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
	return (
		<button
			onClick={onClick}
			className='w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-slate-700 dark:text-slate-300 font-bold text-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 group'>
			<div className='flex items-center gap-3'>
				<div className='text-slate-400 group-hover:text-indigo-500 transition-colors'>{icon}</div>
				{label}
			</div>
			<ArrowRight size={16} className='text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors' />
		</button>
	);
}

function TodoItem({
	habit,
	isCompleted,
	onToggle,
	onClick,
}: {
	habit: Habit;
	isCompleted: boolean;
	onToggle: (c: boolean) => void | Promise<void>;
	onClick: () => void;
	key?: any;
}) {
	const { t } = useI18n();
	const catDef = CATEGORIES.find((c) => c.id === habit.category) || CATEGORIES[CATEGORIES.length - 1];
	const baseColor = habit.color || "#6366f1";
	const [viewingDate, setViewingDate] = useState<"today" | "yesterday">("today");

	const allRecords = useLiveQuery(() => db.dayRecords.toArray(), []) || [];

	const daysLeft = useMemo(() => getDaysLeft(habit, allRecords), [habit, allRecords]);

	return (
		<div
			className={cn(
				"group flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer",
				isCompleted
					? "bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800"
					: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm hover:shadow",
			)}
			onClick={(e) => {
				if ((e.target as HTMLElement).closest("button")) return;
				onClick();
			}}>
			<div className='flex items-center gap-4'>
				<div className='w-1.5 h-10 rounded-full' style={{ backgroundColor: isCompleted ? "#cbd5e1" : baseColor }} />
				<div>
					<h4
						className={cn(
							"font-bold text-[15px] transition-colors line-clamp-1",
							isCompleted
								? "text-slate-400 dark:text-slate-500 line-through decoration-slate-300 dark:decoration-slate-700"
								: "text-slate-800 dark:text-slate-100",
						)}>
						{habit.title}
						<span className='ml-1 text-[10px] text-gray-500'>({daysLeft} days left)</span>
					</h4>
					<div className='flex items-center gap-2 mt-1 opacity-80'>
						<span className='text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1'>
							<Clock size={12} /> {habit.reminderTime || "Anytime"}
						</span>
						<span className='text-[10px] text-slate-300 dark:text-slate-700'>•</span>
						<span className='text-xs font-bold text-slate-500 dark:text-slate-400'>{t(catDef.label as any)}</span>
					</div>
				</div>
			</div>

			<button
				onClick={(e) => {
					e.stopPropagation();
					onToggle(!isCompleted);
				}}
				className={cn(
					"w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0",
					isCompleted
						? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
						: "border-2 border-slate-200 dark:border-slate-600 text-transparent hover:border-emerald-400 hover:text-emerald-100 dark:hover:border-emerald-600",
				)}>
				<Check size={18} strokeWidth={3} />
			</button>
		</div>
	);
}

function MiniCalendarWidget({ habits, dayRecords }: { habits: Habit[]; dayRecords: DayRecord[] }) {
	const today = new Date();
	const { t } = useI18n();
	const currentMonth = startOfMonth(today);
	const daysInMonth = eachDayOfInterval({ start: currentMonth, end: endOfMonth(currentMonth) });
	const todayStr = getTodayStr();

	// Create padding for the first day
	const startPadding = Array.from({ length: currentMonth.getDay() }).fill(null);

	return (
		<div className='bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 h-full'>
			<div className='flex justify-between items-center mb-6'>
				<div>
					<h3 className='font-bold text-lg text-slate-800 dark:text-slate-100'>{format(today, "MMMM yyyy")}</h3>
					<p className='text-[11px] font-extrabold text-emerald-500 flex items-center gap-1 mt-0.5 uppercase tracking-wider'>
						<TrendingUp size={12} strokeWidth={3} /> {t("on_track")}
					</p>
				</div>
				<Link
					to='/calendar'
					className='p-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors'>
					<CalendarIcon size={18} />
				</Link>
			</div>

			<div className='grid grid-cols-7 gap-y-3 gap-x-1 text-center'>
				{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
					<div key={i} className='text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider'>
						{d}
					</div>
				))}
				{startPadding.map((_, i) => (
					<div key={`empty-${i}`} className='h-8' />
				))}
				{daysInMonth.map((day, i) => {
					const dateStr = format(day, "yyyy-MM-dd");
					const isTodayFlag = dateStr === todayStr;

					// Get habits for this day
					const dayHabits = habits.filter((h) => {
						const isSelectedDay = h.mode === "consecutive" || (h.selectedDays || []).includes(day.getDay() as any);
						return isSelectedDay && dateStr >= (h.currentStartDate || "9999-99-99");
					});

					// Check if all are completed
					let allDone = false;
					let someDone = false;
					if (dayHabits.length > 0 && dateStr <= todayStr) {
						const completedCount = dayHabits.filter((h) => {
							return dayRecords.find((r) => r.habitId === h.id && r.date === dateStr)?.completed;
						}).length;

						allDone = completedCount === dayHabits.length;
						someDone = completedCount > 0 && completedCount < dayHabits.length;
					}

					return (
						<div key={i} className='flex justify-center relative'>
							<div
								className={cn(
									"w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold transition-all relative z-10",
									isTodayFlag
										? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
										: "text-slate-700 dark:text-slate-300",
								)}>
								{format(day, "d")}
							</div>

							{/* Activity Indicators */}
							{(allDone || someDone) && !isTodayFlag && (
								<div
									className={cn(
										"absolute inset-0 rounded-full scale-75 opacity-20",
										allDone ? "bg-emerald-500" : "bg-amber-500",
									)}
								/>
							)}
							{allDone && !isTodayFlag && <div className='absolute -bottom-1 w-1 h-1 rounded-full bg-emerald-500' />}
							{someDone && !isTodayFlag && <div className='absolute -bottom-1 w-1 h-1 rounded-full bg-amber-500' />}
						</div>
					);
				})}
			</div>
		</div>
	);
}
