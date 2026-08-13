/** @format */

import { useState, useEffect } from "react";
import { X, Save, AlertCircle } from "lucide-react";

import { db } from "@/src/lib/db";
import { WorkoutPlan } from "@/src/types/workout";
import { useI18n } from "@/src/contexts/I18nContext";

function PreviewMeals({ schedule }: { schedule: any }) {
	if (!schedule) return <div className='text-sm text-slate-500'>No valid schedule format</div>;
	const days = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"];
	return (
		<div className='space-y-4 pb-12'>
			{days.map((day) => {
				const meals = schedule[day] || [];
				return (
					<div key={day} className='border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950'>
						<div className='bg-slate-100 dark:bg-slate-900 px-3 py-1.5 text-xs font-bold uppercase text-slate-600 dark:text-slate-400'>
							{day}
						</div>
						{meals.length === 0 ? (
							<div className='p-3 text-xs text-slate-400'>No meals</div>
						) : (
							<div className='divide-y divide-slate-100 dark:divide-slate-800'>
								{meals?.map((meal: any, idx: number) => (
									<div key={idx} className='p-3'>
										<div className='font-semibold text-sm'>
											{meal.name} {meal.time && <span className='text-slate-400 font-normal ml-1'>{meal.time}</span>}
										</div>
										<ul className='mt-1 space-y-1'>
											{meal.foods?.map((f: any, fIdx: number) => (
												<li key={fIdx} className='text-xs text-slate-600 dark:text-slate-400 flex justify-between'>
													<span>{f.name}</span>
													<span>
														{f.amount} {f.unit}
													</span>
												</li>
											))}
										</ul>
									</div>
								))}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

export default function EditPlanModal({ plan, onClose }: { plan: WorkoutPlan; onClose: () => void }) {
	const { t } = useI18n();
	const [planData, setPlanData] = useState<any>(null);
	const [versionId, setVersionId] = useState<string>("");
	const [week1Json, setWeek1Json] = useState("");
	const [week2Json, setWeek2Json] = useState("");
	const [activeTab, setActiveTab] = useState<"week1" | "week2">("week1");
	const [error, setError] = useState("");

	useEffect(() => {
		async function loadData() {
			const version = await db.workoutPlanVersions.where("planId").equals(plan.id).last();
			if (version) {
				setVersionId(version.id);
				setPlanData(version.data);

				const w1 = version.data?.nutrition?.weeklyPlans?.week1;
				const w2 = version.data?.nutrition?.weeklyPlans?.week2;

				const defaultPlan = {
					name: "Nutrition Plan",
					schedule: {
						saturday: [],
						sunday: [],
						monday: [],
						tuesday: [],
						wednesday: [],
						thursday: [],
						friday: [],
					},
				};

				if (w1) setWeek1Json(JSON.stringify(w1, null, 2));
				else if (version.data?.nutrition?.schedule) {
					// Fallback if they only had a schedule
					setWeek1Json(JSON.stringify({ name: "Nutrition Plan A", schedule: version.data.nutrition.schedule }, null, 2));
				} else {
					setWeek1Json(JSON.stringify({ ...defaultPlan, name: "Nutrition Plan A" }, null, 2));
				}

				if (w2) setWeek2Json(JSON.stringify(w2, null, 2));
				else setWeek2Json(JSON.stringify({ ...defaultPlan, name: "Nutrition Plan B" }, null, 2));
			}
		}
		loadData();
	}, [plan.id]);

	let startDate;
	if (plan.startDate) {
		const [y, m, d] = plan.startDate.split("-");
		startDate = new Date(Number(y), Number(m) - 1, Number(d));
	} else {
		startDate = new Date();
	}
	startDate.setHours(0, 0, 0, 0);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const dayIndex = Math.round((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
	const planWeek = dayIndex > 0 ? Math.floor((dayIndex - 1) / 7) + 1 : 1;
	const nutritionCycle = ((planWeek - 1) % 2) + 1;
	const activeWeekKey = nutritionCycle === 1 ? "week1" : "week2";

	const handleSave = async () => {
		try {
			const parsedW1 = JSON.parse(week1Json);
			const parsedW2 = JSON.parse(week2Json);

			const newData = { ...planData };
			if (!newData.nutrition) newData.nutrition = {};
			newData.nutrition.weeklyPlans = {
				week1: parsedW1,
				week2: parsedW2,
			};

			const weekDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

			if (newData.days) {
				newData.days = newData.days.map((day: any) => {
					if (day.dayIndex >= dayIndex) {
						const dayPlanWeek = Math.floor((day.dayIndex - 1) / 7) + 1;
						const dayCycle = ((dayPlanWeek - 1) % 2) + 1;

						const weekKey = dayCycle === 1 ? "week1" : "week2";
						const weeklyPlan = newData.nutrition.weeklyPlans[weekKey];

						const d = new Date(startDate);
						d.setDate(d.getDate() + day.dayIndex - 1);
						const dayOfWeek = weekDays[d.getDay()];

						const mealsForDay = weeklyPlan?.schedule?.[dayOfWeek] || [];

						return {
							...day,
							planWeek: dayPlanWeek,
							nutritionCycle: dayCycle,
							nutritionPlanName: weeklyPlan?.name || "",
							nutrition: {
								name: weeklyPlan?.name || "",
								meals: mealsForDay,
							},
						};
					}
					return day;
				});
			}

			await db.workoutPlanVersions.update(versionId, {
				data: newData,
			});

			onClose();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Invalid JSON");
		}
	};

	const safeParse = (str: string) => {
		try {
			return JSON.parse(str);
		} catch {
			return null;
		}
	};

	if (!planData) return null;

	return (
		<div className='fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4'>
			<div className='bg-white dark:bg-slate-900 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-xl'>
				<div className='flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800'>
					<div>
						<h2 className='text-xl font-bold'>Edit Nutrition Plans</h2>
						<p className='text-sm text-slate-500'>
							Currently active: {activeWeekKey === "week1" ? "Week 1 (Plan A)" : "Week 2 (Plan B)"}
						</p>
					</div>
					<button onClick={onClose} className='p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full'>
						<X size={20} />
					</button>
				</div>

				<div className='flex border-b border-slate-100 dark:border-slate-800'>
					<button
						onClick={() => setActiveTab("week1")}
						className={`flex-1 py-3 text-sm font-medium border-b-2 ${
							activeTab === "week1"
								? "border-indigo-600 text-indigo-600"
								: "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
						}`}>
						Week 1 (Plan A){" "}
						{activeWeekKey === "week1" && (
							<span className='ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full'>ACTIVE</span>
						)}
					</button>
					<button
						onClick={() => setActiveTab("week2")}
						className={`flex-1 py-3 text-sm font-medium border-b-2 ${
							activeTab === "week2"
								? "border-indigo-600 text-indigo-600"
								: "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
						}`}>
						Week 2 (Plan B){" "}
						{activeWeekKey === "week2" && (
							<span className='ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full'>ACTIVE</span>
						)}
					</button>
				</div>

				{error && (
					<div className='m-4 mb-0 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2 text-sm'>
						<AlertCircle size={16} />
						{error}
					</div>
				)}

				<div className='flex-1 overflow-hidden flex bg-slate-50 dark:bg-slate-900'>
					<div className='w-1/2 p-4 flex flex-col border-r border-slate-200 dark:border-slate-800'>
						<label className='text-xs font-bold text-slate-500 mb-2 uppercase'>JSON Editor</label>
						<textarea
							value={activeTab === "week1" ? week1Json : week2Json}
							onChange={(e) => (activeTab === "week1" ? setWeek1Json(e.target.value) : setWeek2Json(e.target.value))}
							className='flex-1 font-mono text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 focus:ring-2 focus:ring-indigo-500 outline-none resize-none'
							spellCheck={false}
						/>
					</div>
					<div className='w-1/2 p-4 flex flex-col overflow-auto bg-slate-100/50 dark:bg-slate-900/50'>
						<label className='text-xs font-bold text-slate-500 mb-2 uppercase'>Preview</label>
						<PreviewMeals schedule={safeParse(activeTab === "week1" ? week1Json : week2Json)?.schedule} />
					</div>
				</div>

				<div className='p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900 rounded-b-2xl'>
					<button
						onClick={onClose}
						className='px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg'>
						Cancel
					</button>
					<button
						onClick={handleSave}
						className='px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2'>
						<Save size={16} />
						Save Plans
					</button>
				</div>
			</div>
		</div>
	);
}
