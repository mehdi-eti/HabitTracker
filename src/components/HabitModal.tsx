/** @format */

import { useState } from "react";
import { X, AlertTriangle, Calendar, Settings, Bell, Type, Tag, Target, Trash2, Plus, ListTodo } from "lucide-react";

import { db } from "@/src/lib/db";
import { getTodayStr, cn } from "@/src/lib/utils";
import { useI18n } from "@/src/contexts/I18nContext";
import { Habit, DayOfWeek, HabitMode, HabitCategory } from "../types";

interface HabitModalProps {
	habit?: Habit;
	onClose: () => void;
}

export const CATEGORIES: { id: HabitCategory; label: string; color: string }[] = [
	{ id: "health", label: "cat_health", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
	{ id: "work", label: "cat_work", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
	{ id: "personal", label: "cat_personal", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
	{ id: "learning", label: "cat_learning", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
	{ id: "finance", label: "cat_finance", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
	{ id: "other", label: "cat_other", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
];

export default function HabitModal({ habit, onClose }: HabitModalProps) {
	const { t, dir } = useI18n();
	const isEditing = !!habit;

	const [title, setTitle] = useState(habit?.title || "");
	const [description, setDescription] = useState(habit?.description || "");
	const [mode, setMode] = useState<HabitMode>(habit?.mode || "consecutive");
	const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(habit?.selectedDays || []);
	const [startDate, setStartDate] = useState(habit?.currentStartDate || getTodayStr());
	const [durationDays, setDurationDays] = useState<number>(habit?.durationDays || 21);
	const [category, setCategory] = useState<HabitCategory>(habit?.category || "other");
	const [color, setColor] = useState<string>(habit?.color || "#6366f1");

	const [useCustomReminder, setUseCustomReminder] = useState(!!habit?.reminderTime);
	const [reminderTime, setReminderTime] = useState(habit?.reminderTime || "20:00");
	const [tasks, setTasks] = useState<{ id: string; title: string }[]>(habit?.tasks || []);

	const [showConfirm, setShowConfirm] = useState(false);
	const [isAttemptingSave, setIsAttemptingSave] = useState(false);

	const daysList: { id: DayOfWeek; label: string }[] = [
		{ id: 6, label: "sat" },
		{ id: 0, label: "sun" },
		{ id: 1, label: "mon" },
		{ id: 2, label: "tue" },
		{ id: 3, label: "wed" },
		{ id: 4, label: "thu" },
		{ id: 5, label: "fri" },
	];

	const handleToggleDay = (day: DayOfWeek) => {
		setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
	};

	const isFormValid = title.trim().length > 0 && (mode !== "selected_days" || selectedDays.length > 0);

	const handleSave = async (forceReset = false) => {
		setIsAttemptingSave(true);
		if (!isFormValid) {
			return;
		}

		if (isEditing && !forceReset) {
			// Check if critical fields changed
			const dateChanged = startDate !== habit.currentStartDate;
			const modeChanged = mode !== habit.mode;
			const daysChanged = mode === "selected_days" && JSON.stringify(selectedDays.sort()) !== JSON.stringify(habit.selectedDays.sort());
			const durationChanged = durationDays !== habit.durationDays;

			if (dateChanged || modeChanged || daysChanged || durationChanged) {
				setShowConfirm(true);
				return;
			}
		}

		const habitData = {
			title: title.trim(),
			description: description.trim(),
			mode,
			selectedDays,
			reminderTime: useCustomReminder ? reminderTime : undefined,
			currentStartDate: startDate,
			durationDays,
			category,
			color,
			tasks,
		};

		if (isEditing) {
			await db.habits.update(habit.id, habitData);
		} else {
			await db.habits.add({
				id: crypto.randomUUID(),
				...habitData,
				createdAt: Date.now(),
				status: "active",
				version: 1,
				hidden: false,
			});
		}

		onClose();
	};

	if (showConfirm) {
		return (
			<div
				className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200'
				dir={dir}>
				<div className='bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200'>
					<div className='flex flex-col items-center text-center space-y-4'>
						<div className='w-16 h-16 bg-red-50 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-2'>
							<AlertTriangle size={32} />
						</div>
						<h3 className='text-xl font-bold'>{t("confirm_reset_title")}</h3>
						<p className='text-slate-500 dark:text-slate-400 font-medium'>
							{t("confirm_reset_desc")}
							<br />
							<br />
							{t("schedule_change_notice")}
						</p>
						<div className='flex w-full gap-3 mt-6'>
							<button
								onClick={() => setShowConfirm(false)}
								className='flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors'>
								{t("cancel")}
							</button>
							<button
								onClick={() => handleSave(true)}
								className='flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-500/20'>
								{t("yes_reset")}
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200'
			dir={dir}>
			<div className='bg-white dark:bg-slate-900 rounded-4xl w-full max-w-2xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200'>
				{/* Header */}
				<div className='flex justify-between items-center p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 shrink-0'>
					<div>
						<h2 className='text-2xl font-extrabold text-slate-800 dark:text-slate-100'>
							{isEditing ? t("edit_habit") : t("create_habit")}
						</h2>
						<p className='text-slate-500 dark:text-slate-400 mt-1 font-medium text-sm'>
							{isEditing ? t("edit_habit_subtitle") : t("create_habit_subtitle")}
						</p>
					</div>
					<button
						onClick={onClose}
						className='w-10 h-10 flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 rounded-full transition-colors'>
						<X size={20} />
					</button>
				</div>

				{/* Content */}
				<div className='p-6 md:p-8 overflow-y-auto space-y-8 custom-scrollbar'>
					{/* Section: Basic Info */}
					<div className='space-y-6'>
						<h3 className='text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2'>
							<Type size={14} /> {t("basic_information")}
						</h3>

						<div className='space-y-4'>
							<div className='space-y-2'>
								<label className='text-sm font-bold text-slate-700 dark:text-slate-300'>{t("title")} *</label>
								<input
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder='e.g. Read 10 pages, Drink water'
									className={cn(
										"w-full px-5 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white font-medium",
										isAttemptingSave && !title.trim()
											? "border-red-300 focus:border-red-500 bg-red-50/50 dark:border-red-900/50"
											: "border-slate-200 dark:border-slate-800 focus:border-indigo-500",
									)}
								/>
								{isAttemptingSave && !title.trim() && (
									<p className='text-xs font-bold text-red-500 mt-1'>{t("habit_name_required")}</p>
								)}
							</div>

							<div className='space-y-2'>
								<label className='text-sm font-bold text-slate-700 dark:text-slate-300'>{t("description")}</label>
								<textarea
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									placeholder='Add notes, motivation, or specific rules for this habit...'
									className='w-full px-5 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none h-24 dark:text-white font-medium'
								/>
							</div>

							<div className='space-y-3'>
								<label className='text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2'>
									<Tag size={16} className='text-slate-400' /> {t("category") || "Category"}
								</label>
								<div className='flex flex-wrap gap-2'>
									{CATEGORIES.map((cat) => (
										<button
											key={cat.id}
											onClick={() => setCategory(cat.id)}
											className={cn(
												"px-4 py-2.5 rounded-xl text-sm font-bold transition-all border",
												category === cat.id
													? cn("border-transparent shadow-sm", cat.color)
													: "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800",
											)}>
											{t(cat.label as any) || cat.label.replace("cat_", "")}
										</button>
									))}
								</div>
							</div>
							<div className='space-y-3'>
								<label className='text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2'>
									<div
										className='w-4 h-4 rounded-full border border-slate-200 dark:border-slate-700'
										style={{ backgroundColor: color }}
									/>{" "}
									{t("color") || "Color"}
								</label>
								<div className='flex items-center gap-4'>
									<input
										type='color'
										value={color}
										onChange={(e) => setColor(e.target.value)}
										className='w-12 h-12 rounded-xl cursor-pointer bg-transparent border-0 p-0'
									/>
									<div className='text-sm font-medium text-slate-500 uppercase tracking-wider'>{color}</div>
								</div>
							</div>
						</div>
					</div>

					<div className='h-px bg-slate-100 dark:bg-slate-800 w-full' />

					{/* Section: Schedule */}
					<div className='space-y-6'>
						<h3 className='text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2'>
							<Calendar size={14} /> {t("schedule_mode")}
						</h3>

						<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
							<div className='space-y-2'>
								<label className='text-sm font-bold text-slate-700 dark:text-slate-300'>{t("start_date")}</label>
								<input
									type='date'
									value={startDate}
									onChange={(e) => setStartDate(e.target.value)}
									className='w-full px-5 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white font-medium'
								/>
							</div>

							<div className='space-y-2'>
								<label className='text-sm font-bold text-slate-700 dark:text-slate-300'>
									{t("duration_days") || "Duration (Days)"}
								</label>
								<div className='flex gap-2 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-800'>
									<input
										type='number'
										min='1'
										max='365'
										value={durationDays}
										onChange={(e) => {
											const val = parseInt(e.target.value);
											if (!isNaN(val) && val > 0) setDurationDays(val);
										}}
										className='w-full px-5 py-3 rounded-lg bg-transparent border-none outline-none focus:ring-0 dark:text-white font-medium text-center'
									/>
									<div className='flex items-center px-3 text-slate-400 font-medium'>{t("days") || "days"}</div>
								</div>
							</div>

							<div className='space-y-2'>
								<label className='text-sm font-bold text-slate-700 dark:text-slate-300'>{t("mode")}</label>
								<div className='flex gap-2 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-800'>
									<button
										onClick={() => setMode("consecutive")}
										className={cn(
											"flex-1 py-2.5 rounded-lg text-xs font-bold transition-all",
											mode === "consecutive"
												? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
												: "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
										)}>
										{t("every_day")}
									</button>
									<button
										onClick={() => setMode("selected_days")}
										className={cn(
											"flex-1 py-2.5 rounded-lg text-xs font-bold transition-all",
											mode === "selected_days"
												? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
												: "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
										)}>
										{t("specific_days")}
									</button>
								</div>
							</div>
						</div>

						{mode === "selected_days" && (
							<div className='space-y-3 p-5 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 animate-in slide-in-from-top-2 duration-200'>
								<label className='text-sm font-bold text-indigo-900 dark:text-indigo-300 flex items-center justify-between'>
									<span>{t("days_of_week")} *</span>
									{isAttemptingSave && selectedDays.length === 0 && (
										<span className='text-xs text-red-500'>{t("select_one_day")}</span>
									)}
								</label>
								<div className='flex flex-wrap gap-2'>
									{daysList.map((day) => (
										<button
											key={day.id}
											onClick={() => handleToggleDay(day.id)}
											className={cn(
												"w-11 h-11 rounded-xl text-sm font-bold transition-all flex items-center justify-center",
												selectedDays.includes(day.id)
													? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
													: "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700",
											)}>
											{String(t(day.label as any) || day.label)
												.slice(0, 1)
												.toUpperCase()}
										</button>
									))}
								</div>
							</div>
						)}
					</div>

					<div className='h-px bg-slate-100 dark:bg-slate-800 w-full' />

					<div className='space-y-6'>
						<h3 className='text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2'>
							<ListTodo size={14} /> {t("sub_tasks")}
						</h3>
						<div className='space-y-3'>
							{tasks.map((task, index) => (
								<div key={task.id} className='flex gap-2 items-center'>
									<input
										value={task.title}
										onChange={(e) => {
											const newTasks = [...tasks];
											newTasks[index].title = e.target.value;
											setTasks(newTasks);
										}}
										placeholder={t("task_placeholder")}
										className='flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 transition-all dark:text-white font-medium'
									/>
									<button
										onClick={() => setTasks(tasks.filter((t) => t.id !== task.id))}
										className='p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors shrink-0'>
										<Trash2 size={18} />
									</button>
								</div>
							))}
							<button
								onClick={() => setTasks([...tasks, { id: Date.now().toString(), title: "" }])}
								className='w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors flex items-center justify-center gap-2'>
								<Plus size={18} /> {t("add_task")}
							</button>
						</div>
					</div>
					<div className='h-px bg-slate-100 dark:bg-slate-800 w-full' />

					{/* Section: Reminders */}
					<div className='space-y-6'>
						<h3 className='text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2'>
							<Bell size={14} /> {t("notifications")}
						</h3>

						<div className='flex items-start justify-between bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800'>
							<div className='pr-4'>
								<label className='text-sm font-bold text-slate-700 dark:text-slate-200'>{t("reminder_time")}</label>
								<p className='text-xs font-medium text-slate-500 dark:text-slate-400 mt-1'>
									{useCustomReminder ? t("habit_reminder_custom") : t("habit_reminder_global")}
								</p>
							</div>
							<button
								onClick={() => setUseCustomReminder(!useCustomReminder)}
								className={cn(
									"w-12 h-6 rounded-full transition-colors relative shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900",
									useCustomReminder ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600",
								)}
								aria-pressed={useCustomReminder}>
								<div
									className={cn(
										"absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
										useCustomReminder ? (dir === "rtl" ? "left-1" : "left-7") : dir === "rtl" ? "left-7" : "left-1",
									)}
								/>
							</button>
						</div>

						{useCustomReminder && (
							<div className='animate-in slide-in-from-top-2 duration-200 pl-4 border-l-2 border-indigo-500'>
								<label className='text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2'>Custom Time</label>
								<input
									type='time'
									value={reminderTime}
									onChange={(e) => setReminderTime(e.target.value)}
									className='px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white font-bold'
								/>
							</div>
						)}
					</div>
				</div>

				{/* Footer Actions */}
				<div className='p-6 md:p-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-end gap-3 shrink-0 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-4xl'>
					<button
						onClick={onClose}
						className='px-6 py-3.5 rounded-xl font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors w-full sm:w-auto'>
						{t("cancel")}
					</button>
					<button
						onClick={() => handleSave(false)}
						className='flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-lg shadow-indigo-500/20 w-full sm:w-auto active:scale-[0.98]'>
						{isEditing ? (
							<>
								<Settings size={18} /> {t("edit_habit")}
							</>
						) : (
							<>
								<Target size={18} /> {t("create_habit")}
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
