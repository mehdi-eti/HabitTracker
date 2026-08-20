/** @format */

import { X, Activity, Check } from "lucide-react";

import { getTodayStr } from "@/src/lib/utils";
import { Habit, DayRecord } from "@/src/types";
import { useI18n } from "@/src/contexts/I18nContext";

interface Props {
	records: DayRecord[];
	habits: Habit[];
	onClose: () => void;
	onActivityClick: (habit: Habit) => void;
}

export default function AllRecentActivityModal({ records, habits, onClose, onActivityClick }: Props) {
	const { t, dir } = useI18n();
	const todayStr = getTodayStr();

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm' dir={dir}>
			<div className='bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]'>
				<div className='p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50'>
					<h2 className='text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2'>
						<Activity size={20} className='text-blue-500' />
						{t("recent_activity")}
					</h2>
					<button
						onClick={onClose}
						className='w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors'>
						<X size={18} />
					</button>
				</div>
				<div className='p-6 overflow-y-auto space-y-4'>
					{records.length === 0 ? (
						<p className='text-sm font-medium text-slate-500 dark:text-slate-400 text-center py-4'>{t("no_recent_activity")}</p>
					) : (
						records.map((r) => {
							const h = habits.find((h) => h.id === r.habitId);
							if (!h) return null;
							return (
								<div
									key={r.id}
									onClick={() => {
										onActivityClick(h);
									}}
									className='flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800'>
									<div className='w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0'>
										<Check size={16} className='text-emerald-500' />
									</div>
									<div className='flex-1'>
										<p className='text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-1'>{h.title}</p>
										<p className='text-xs font-medium text-slate-400'>{r.date === todayStr ? t("today") : r.date}</p>
									</div>
								</div>
							);
						})
					)}
				</div>
			</div>
		</div>
	);
}
