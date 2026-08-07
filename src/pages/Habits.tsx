/** @format */

import { useState } from "react";
import { useI18n } from "../contexts/I18nContext";
import { useHabits } from "../hooks/useHabits";
import { Habit } from "../types";
import { db } from "../lib/db";
import { Play, EyeOff, Trash2, RotateCcw, Archive, ArchiveRestore, Edit2, ListTodo, Trophy, Trash, CalendarDays } from "lucide-react";
import HabitModal, { CATEGORIES } from "../components/HabitModal";
import HabitDetailModal from "../components/HabitDetailModal";
import { getTodayStr, cn } from "../lib/utils";

export default function Habits() {
	const { t } = useI18n();
	const { habits: activeHabits } = useHabits("active");
	const { habits: completedHabits } = useHabits("completed");
	const { habits: deletedHabits } = useHabits("deleted");
	const { habits: archivedHabits } = useHabits("archived");

	const [activeTab, setActiveTab] = useState<"active" | "completed" | "archived" | "deleted">("active");
	const [selectedHabit, setSelectedHabit] = useState<Habit | undefined>(undefined);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [detailHabit, setDetailHabit] = useState<Habit | undefined>(undefined);

	const tabs = [
		{ id: "active", label: t("active_habits") || "Active" },
		{ id: "completed", label: t("completed_habits") || "Completed" },
		{ id: "archived", label: t("archived_habits" as any) || "Archived" },
		{ id: "deleted", label: t("deleted_habits") || "Deleted" },
	] as const;

	const currentHabits =
		activeTab === "active" ? activeHabits : activeTab === "completed" ? completedHabits : activeTab === "archived" ? archivedHabits : deletedHabits;
	const visibleHabits = currentHabits?.filter((h) => !h.hidden) || [];

	const handleEdit = (habit: Habit) => {
		setSelectedHabit(habit);
		setIsModalOpen(true);
	};

	const handleDelete = async (id: string, hard = false) => {
		if (hard) {
			if (confirm("Are you sure you want to permanently delete this habit and all its records?")) {
				await db.habits.delete(id);
				const records = await db.dayRecords.where("habitId").equals(id).toArray();
				await db.dayRecords.bulkDelete(records.map((r) => r.id));
			}
		} else {
			await db.habits.update(id, { status: "deleted" });
		}
	};

	const handleArchive = async (id: string) => {
		await db.habits.update(id, { status: "archived" });
	};

	const handleUnarchive = async (id: string) => {
		await db.habits.update(id, { status: "active" });
	};

	const handleRestore = async (id: string) => {
		await db.habits.update(id, { status: "active" });
	};

	const handleRestart = async (habit: Habit) => {
		const newVersion = habit.version + 1;
		const newTitle = `${habit.title.replace(/\s*\(v\d+\)$/i, "")} (v${newVersion})`;

		// Create new active instance
		await db.habits.add({
			id: crypto.randomUUID(),
			title: newTitle,
			description: habit.description,
			category: habit.category,
			createdAt: Date.now(),
			mode: habit.mode,
			selectedDays: habit.selectedDays,
			status: "active",
			version: newVersion,
			originalHabitId: habit.originalHabitId || habit.id,
			reminderTime: habit.reminderTime,
			hidden: false,
			currentStartDate: getTodayStr(),
		});
	};

	const handleHide = async (id: string) => {
		await db.habits.update(id, { hidden: true });
	};

	const getEmptyStateIcon = () => {
		switch (activeTab) {
			case "active":
				return <ListTodo className='text-slate-300 dark:text-slate-600' size={48} strokeWidth={1.5} />;
			case "completed":
				return <Trophy className='text-slate-300 dark:text-slate-600' size={48} strokeWidth={1.5} />;
			case "archived":
				return <Archive className='text-slate-300 dark:text-slate-600' size={48} strokeWidth={1.5} />;
			case "deleted":
				return <Trash className='text-slate-300 dark:text-slate-600' size={48} strokeWidth={1.5} />;
		}
	};

	const getEmptyStateText = () => {
		switch (activeTab) {
			case "active":
				return t("no_active_habits");
			case "completed":
				return t("no_completed_habits");
			case "archived":
				return t("no_archived_habits");
			case "deleted":
				return t("trash_is_empty");
		}
	};

	return (
		<div className='max-w-5xl mx-auto space-y-8 pb-12'>
			{/* Page Header */}
			<div className='mb-8'>
				<h2 className='text-3xl font-extrabold text-slate-800 dark:text-slate-100'>{t("habits")}</h2>
				<p className='text-slate-500 dark:text-slate-400 mt-2 font-medium'>{t("manage_habits")}</p>
			</div>

			{/* Tabs */}
			<div className='flex overflow-x-auto custom-scrollbar pb-2 -mb-2'>
				<div className='flex bg-white dark:bg-slate-900/80 rounded-2xl p-1.5 shadow-sm border border-slate-100 dark:border-slate-800 min-w-max'>
					{tabs.map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id as any)}
							className={cn(
								"px-6 py-2.5 text-sm font-bold rounded-xl transition-all relative flex items-center justify-center gap-2",
								activeTab === tab.id
									? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm"
									: "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50",
							)}>
							{tab.label}
							{activeTab === tab.id && (
								<span className='absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-slate-800 dark:bg-slate-400 rounded-full' />
							)}
						</button>
					))}
				</div>
			</div>

			{/* Habit List */}
			<div className='space-y-4 mt-6'>
				{visibleHabits.length > 0 ? (
					visibleHabits.map((habit) => {
						const catDef = CATEGORIES.find((c) => c.id === habit.category) || CATEGORIES[CATEGORIES.length - 1];

						return (
							<div
								key={habit.id}
								className='bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm hover:shadow-md transition-shadow group'>
								<div className='flex items-start gap-4'>
									<div
										className={cn(
											"w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-1",
											catDef.color.replace("text-", "text-opacity-80 text-"),
											"bg-slate-50 dark:bg-slate-800",
										)}>
										{activeTab === "completed" ? <Trophy size={24} className='text-emerald-500' /> : <ListTodo size={24} />}
									</div>
									<div>
										<h3 className='text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-3'>
											{habit.title}
											<span className='text-[10px] uppercase tracking-widest px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full font-bold'>
												v{habit.version}
											</span>
										</h3>
										{habit.description && (
											<p className='text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 max-w-xl'>
												{habit.description}
											</p>
										)}
									</div>
								</div>

								<div className='flex gap-2 flex-wrap items-center'>
									{activeTab === "active" && (
										<>
											<button
												onClick={(e) => {
													e.stopPropagation();
													setDetailHabit(habit);
												}}
												className='p-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors tooltip'
												title={"View Details"}>
												<CalendarDays size={18} />
											</button>
											<button
												onClick={() => handleEdit(habit)}
												className='p-2.5 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors tooltip'
												title={t("edit_habit" as any) || "Edit"}>
												<Edit2 size={18} />
											</button>
											<button
												onClick={() => handleArchive(habit.id)}
												className='p-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 rounded-xl font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors tooltip'
												title={t("archive" as any) || "Archive"}>
												<Archive size={18} />
											</button>
											<button
												onClick={() => handleDelete(habit.id)}
												className='p-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors tooltip'
												title={t("delete" as any) || "Delete"}>
												<Trash2 size={18} />
											</button>
										</>
									)}

									{activeTab === "archived" && (
										<>
											{" "}
											<button
												onClick={(e) => {
													e.stopPropagation();
													setDetailHabit(habit);
												}}
												className='p-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors tooltip'
												title={"View Details"}>
												<CalendarDays size={18} />
											</button>
											<button
												onClick={() => handleUnarchive(habit.id)}
												className='flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors'>
												<ArchiveRestore size={18} /> {t("unarchive" as any) || "Unarchive"}
											</button>
											<button
												onClick={() => handleDelete(habit.id)}
												className='p-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors'>
												<Trash2 size={18} />
											</button>
										</>
									)}

									{activeTab === "completed" && (
										<>
											{" "}
											<button
												onClick={(e) => {
													e.stopPropagation();
													setDetailHabit(habit);
												}}
												className='p-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors tooltip'
												title={"View Details"}>
												<CalendarDays size={18} />
											</button>
											<button
												onClick={() => handleRestart(habit)}
												className='flex items-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors'>
												<Play size={18} /> {t("restart" as any) || "Restart"}
											</button>
											<button
												onClick={() => handleHide(habit.id)}
												className='p-2.5 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors'
												title={t("hide" as any) || "Hide"}>
												<EyeOff size={18} />
											</button>
										</>
									)}

									{activeTab === "deleted" && (
										<>
											<button
												onClick={() => handleRestore(habit.id)}
												className='flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors'>
												<RotateCcw size={18} /> {t("restore" as any) || "Restore"}
											</button>
											<button
												onClick={() => handleDelete(habit.id, true)}
												className='flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors'>
												<Trash2 size={18} /> Delete Forever
											</button>
										</>
									)}
								</div>
							</div>
						);
					})
				) : (
					<div className='bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-sm'>
						<div className='w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6'>
							{getEmptyStateIcon()}
						</div>
						<h3 className='text-xl font-bold text-slate-800 dark:text-slate-100 mb-2'>{t("quiet_here")}</h3>
						<p className='text-slate-500 dark:text-slate-400 font-medium max-w-sm'>{getEmptyStateText()}</p>
					</div>
				)}
			</div>

			{isModalOpen && (
				<HabitModal
					habit={selectedHabit}
					onClose={() => {
						setIsModalOpen(false);
						setSelectedHabit(undefined);
					}}
				/>
			)}
			{detailHabit && <HabitDetailModal habit={detailHabit} onClose={() => setDetailHabit(undefined)} />}
		</div>
	);
}
