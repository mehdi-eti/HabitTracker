/** @format */

import { useState } from "react";
import { Dumbbell, CalendarDays, LineChart, FileText } from "lucide-react";

import { cn } from "@/src/lib/utils";
import { useI18n } from "@/src/contexts/I18nContext";
import PlansManager from "./components/PlansManager";
import TodayTracker from "./components/TodayTracker";
import WorkoutCalendar from "./components/WorkoutCalendar";
import WeeklyProgress from "./components/WeeklyProgress";

type Tab = "today" | "calendar" | "progress" | "plans";

export default function WorkoutNutrition() {
	const { t } = useI18n();
	const [activeTab, setActiveTab] = useState<Tab>("today");

	const tabs = [
		{ id: "today" as Tab, label: t("today" as any) || "Today", icon: Dumbbell },
		{ id: "calendar" as Tab, label: t("calendar" as any) || "Calendar", icon: CalendarDays },
		{ id: "progress" as Tab, label: t("progress" as any) || "Progress", icon: LineChart },
		{ id: "plans" as Tab, label: t("plans" as any) || "Plans", icon: FileText },
	];

	return (
		<div className='space-y-6'>
			<div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
				<div>
					<h1 className='text-2xl font-bold text-slate-800 dark:text-white'>{t("workout_nutrition" as any) || "Workout & Nutrition"}</h1>
					<p className='text-slate-500 dark:text-slate-400 mt-1'>
						{t("workout_nutrition_desc" as any) || "Manage your workout plans and track nutrition"}
					</p>
				</div>
			</div>

			<div className='bg-white dark:bg-slate-900 rounded-xl p-1 shadow-sm border border-slate-100 dark:border-slate-800 overflow-x-auto'>
				<div className='flex items-center min-w-max'>
					{tabs.map((tab) => {
						const Icon = tab.icon;
						const isActive = activeTab === tab.id;
						return (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={cn(
									"flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
									isActive
										? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800",
								)}>
								<Icon size={18} />
								{tab.label}
							</button>
						);
					})}
				</div>
			</div>

			<div className='bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6'>
				{activeTab === "today" && <TodayTracker onNavigateToPlans={() => setActiveTab("plans")} />}
				{activeTab === "calendar" && <WorkoutCalendar onNavigateToPlans={() => setActiveTab("plans")} />}
				{activeTab === "progress" && <WeeklyProgress />}
				{activeTab === "plans" && <PlansManager />}
			</div>
		</div>
	);
}
