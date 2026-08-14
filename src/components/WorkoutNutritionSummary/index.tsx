/** @format */

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/src/lib/db";
import { useI18n } from "@/src/contexts/I18nContext";
import { getDayDataFromPlan } from "@/src/utils/planData";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Dumbbell, Utensils, Activity, TrendingUp } from "lucide-react";

export default function WorkoutNutritionSummary() {
	const { t } = useI18n();

	const allPlans = useLiveQuery(async () => {
		const plans = await db.workoutPlans.toArray();
		return plans.filter((p) => p.status !== "deleted").sort((a, b) => b.createdAt - a.createdAt);
	});

	const allPlanVersions = useLiveQuery(() => db.workoutPlanVersions.toArray());
	const workoutRecords = useLiveQuery(() => db.workoutDailyRecords.toArray());
	const nutritionRecords = useLiveQuery(() => db.nutritionDailyRecords.toArray());

	if (!allPlans || !allPlanVersions || !workoutRecords || !nutritionRecords) {
		return null;
	}

	return (
		<div className='space-y-6 mt-8 animate-in fade-in'>
			<h3 className='text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2'>
				<Dumbbell className='text-indigo-500' /> {t("workout_nutrition_overview") || "Workout & Nutrition Programs"}
			</h3>
			{allPlans.length === 0 ? (
				<div className='bg-white dark:bg-slate-900 rounded-3xl p-6 text-center text-slate-500 font-medium border border-slate-100 dark:border-slate-800 shadow-sm'>
					{t("no_active_plan_calendar_desc") || "No active plans found."}
				</div>
			) : (
				<GlobalSummaryCard
					plans={allPlans}
					planVersions={allPlanVersions}
					workoutRecords={workoutRecords}
					nutritionRecords={nutritionRecords}
				/>
			)}
		</div>
	);
}

function GlobalSummaryCard({ plans, planVersions, workoutRecords, nutritionRecords }: any) {
	const { t } = useI18n();

	const todayObj = new Date();
	todayObj.setHours(0, 0, 0, 0);

	const { chartData, stats } = useMemo(() => {
		let totalW = 0,
			completedW = 0;
		let totalN = 0,
			completedN = 0;

		if (plans.length === 0) return { chartData: [], stats: { totalW: 0, completedW: 0, wPercent: 0, totalN: 0, completedN: 0, nPercent: 0 } };

		let minDate = new Date();
		minDate.setHours(0, 0, 0, 0);

		plans.forEach((plan: any) => {
			if (plan.startDate) {
				const [y, m, d] = plan.startDate.split("-");
				const pStart = new Date(Number(y), Number(m) - 1, Number(d));
				if (pStart < minDate) {
					minDate = pStart;
				}
			}
		});

		const chart = [];
		const daysPassed = Math.floor((todayObj.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

		for (let i = 0; i < daysPassed; i++) {
			const dDate = new Date(minDate);
			dDate.setDate(dDate.getDate() + i);
			const dStr = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, "0")}-${String(dDate.getDate()).padStart(2, "0")}`;

			let dayTotalW = 0,
				dayCompletedW = 0;
			let dayTotalN = 0,
				dayCompletedN = 0;

			plans.forEach((plan: any) => {
				let pStartDate: Date;
				if (plan.startDate) {
					const [y, m, d] = plan.startDate.split("-");
					pStartDate = new Date(Number(y), Number(m) - 1, Number(d));
				} else {
					pStartDate = new Date(plan.createdAt);
				}
				pStartDate.setHours(0, 0, 0, 0);

				const pEndDate = new Date(pStartDate);
				pEndDate.setDate(pEndDate.getDate() + plan.durationDays - 1);

				if (dDate >= pStartDate && dDate <= pEndDate) {
					const planDayIndex = Math.floor((dDate.getTime() - pStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
					const pVersion = planVersions.find((pv: any) => pv.planId === plan.id);

					const dayData = getDayDataFromPlan(dStr, planDayIndex, pVersion);
					const wRecord = workoutRecords.find((r: any) => r.planId === plan.id && r.date === dStr);
					const nRecord = nutritionRecords.find((r: any) => r.planId === plan.id && r.date === dStr);

					const hasWorkout = !dayData?.restDay && !!dayData?.workout;
					const hasNutrition = !dayData?.restDay && !!dayData?.nutrition;

					if (hasWorkout) {
						dayTotalW++;
						totalW++;
						if (wRecord) dayCompletedW++;
					}

					if (hasNutrition) {
						dayTotalN++;
						totalN++;
						if (nRecord) dayCompletedN++;
					}
				}
			});

			if (dayTotalW > 0 || dayTotalN > 0) {
				chart.push({
					day: dStr,
					workout: dayTotalW > 0 ? Math.round((dayCompletedW / dayTotalW) * 100) : null,
					nutrition: dayTotalN > 0 ? Math.round((dayCompletedN / dayTotalN) * 100) : null,
				});
			}
		}

		return {
			chartData: chart,
			stats: {
				totalW,
				completedW,
				wPercent: totalW > 0 ? Math.round((completedW / totalW) * 100) : 0,
				totalN,
				completedN,
				nPercent: totalN > 0 ? Math.round((completedN / totalN) * 100) : 0,
			},
		};
	}, [plans, planVersions, workoutRecords, nutritionRecords]);

	return (
		<div className='bg-white dark:bg-slate-900 rounded-4xl p-6 shadow-sm border border-slate-100 dark:border-slate-800'>
			<div className='grid grid-cols-2 md:grid-cols-3 gap-4 mb-8'>
				<StatCard
					icon={<Dumbbell className='text-blue-500' size={18} />}
					label='Workout Progress'
					value={`${stats.completedW} / ${stats.totalW}`}
					subtitle={`${stats.wPercent}% completed`}
					bg='bg-blue-50 dark:bg-blue-900/20'
				/>
				<StatCard
					icon={<Utensils className='text-orange-500' size={18} />}
					label='Diet Progress'
					value={`${stats.completedN} / ${stats.totalN}`}
					subtitle={`${stats.nPercent}% completed`}
					bg='bg-orange-50 dark:bg-orange-900/20'
				/>
				<StatCard
					icon={<Activity className='text-emerald-500' size={18} />}
					label='Total Adherence'
					value={`${Math.round((stats.wPercent + stats.nPercent) / 2)}%`}
					bg='bg-emerald-50 dark:bg-emerald-900/20'
				/>
			</div>
			{chartData.length > 0 ? (
				<div>
					<h5 className='text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2'>
						<TrendingUp size={16} /> Performance Over Time
					</h5>
					<div className='h-64 w-full'>
						<ResponsiveContainer width='100%' height='100%'>
							<AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
								<defs>
									<linearGradient id='colorWorkout' x1='0' y1='0' x2='0' y2='1'>
										<stop offset='5%' stopColor='#3b82f6' stopOpacity={0.3} />
										<stop offset='95%' stopColor='#3b82f6' stopOpacity={0} />
									</linearGradient>
									<linearGradient id='colorNutrition' x1='0' y1='0' x2='0' y2='1'>
										<stop offset='5%' stopColor='#f97316' stopOpacity={0.3} />
										<stop offset='95%' stopColor='#f97316' stopOpacity={0} />
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' />
								<XAxis dataKey='day' axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} minTickGap={20} />
								<YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
								<Tooltip
									contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
									formatter={(value: any, name: any) => [`${value}%`, name === "workout" ? "Workout" : "Nutrition"]}
								/>
								<Area
									type='monotone'
									dataKey='workout'
									stroke='#3b82f6'
									strokeWidth={3}
									fillOpacity={1}
									fill='url(#colorWorkout)'
									connectNulls
								/>
								<Area
									type='monotone'
									dataKey='nutrition'
									stroke='#f97316'
									strokeWidth={3}
									fillOpacity={1}
									fill='url(#colorNutrition)'
									connectNulls
								/>
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</div>
			) : (
				<div className='h-64 flex flex-col items-center justify-center text-slate-400'>
					<Activity size={32} className='mb-2 opacity-50' />
					<p className='text-sm'>Not enough data to display charts yet.</p>
				</div>
			)}
		</div>
	);
}

function StatCard({ icon, label, value, subtitle, bg }: any) {
	return (
		<div className='bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50'>
			<div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${bg}`}>{icon}</div>
			<p className='text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1'>{label}</p>
			<p className='text-xl font-extrabold text-slate-800 dark:text-slate-100'>{value}</p>
			{subtitle && <p className='text-[10px] font-bold text-slate-500 mt-1'>{subtitle}</p>}
		</div>
	);
}
