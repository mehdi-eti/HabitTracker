/** @format */

import { useMemo } from "react";
import { useI18n } from "../contexts/I18nContext";
import { useHabits } from "../hooks/useHabits";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { subDays, format } from "date-fns";
import { getHabitTargetDates } from "../lib/habitUtils";

export default function DashboardChart() {
	const { t } = useI18n();
	const { habits, dayRecords } = useHabits("active");

	const chartData = useMemo(() => {
		if (!habits || !dayRecords) return [];

		const data = [];
		const today = new Date();

		// Look back 7 days
		for (let i = 6; i >= 0; i--) {
			const date = subDays(today, i);
			const dateStr = format(date, "yyyy-MM-dd");

			let totalExpected = 0;
			let totalCompleted = 0;

			habits.forEach((habit) => {
				const targetDates = getHabitTargetDates(habit.currentStartDate, habit.mode, habit.selectedDays, habit.durationDays || 21);
				if (targetDates.includes(dateStr)) {
					totalExpected++;
					const record = dayRecords.find((r) => r.habitId === habit.id && r.date === dateStr);
					if (record && record.completed) {
						totalCompleted++;
					}
				}
			});

			let rate = 0;
			if (totalExpected > 0) {
				rate = Math.round((totalCompleted / totalExpected) * 100);
			}

			data.push({
				name: format(date, "MMM d"),
				rate: rate,
				completed: totalCompleted,
				expected: totalExpected,
			});
		}

		return data;
	}, [habits, dayRecords]);

	if (!habits || habits.length === 0) return null;

	return (
		<div className='bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-50 dark:border-slate-800 shadow-sm mt-6'>
			<div className='flex justify-between items-center mb-6'>
				<h3 className='text-lg font-bold'>{t("success_trends" as any)}</h3>
			</div>
			<div className='h-64'>
				<ResponsiveContainer width='100%' height='100%'>
					<AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
						<defs>
							<linearGradient id='colorRate' x1='0' y1='0' x2='0' y2='1'>
								<stop offset='5%' stopColor='#4f46e5' stopOpacity={0.3} />
								<stop offset='95%' stopColor='#4f46e5' stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#f1f5f9' className='dark:stroke-slate-800' />
						<XAxis dataKey='name' axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} dy={10} />
						<YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
						<Tooltip
							contentStyle={{
								borderRadius: "12px",
								border: "none",
								boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
								backgroundColor: "var(--tw-colors-white)",
							}}
							itemStyle={{ color: "#4f46e5", fontWeight: "bold" }}
							labelStyle={{ color: "#64748b", marginBottom: "4px" }}
						/>
						<Area
							type='monotone'
							dataKey='rate'
							stroke='#4f46e5'
							strokeWidth={3}
							fillOpacity={1}
							fill='url(#colorRate)'
							name={t("success_rate_percent" as any)}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
