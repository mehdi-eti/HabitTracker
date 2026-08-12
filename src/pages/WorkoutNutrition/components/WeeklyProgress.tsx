/** @format */

import { v4 as uuidv4 } from "uuid";
import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { LineChart, Trash2 } from "lucide-react";

import { db } from "@/src/lib/db";
import { useI18n } from "@/src/contexts/I18nContext";

export default function WeeklyProgress() {
	const records = useLiveQuery(() => db.weeklyProgressRecords.orderBy("date").toArray()) || [];
	const { t } = useI18n();

	const [date, setDate] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`);
	const [weight, setWeight] = useState("");
	const [chest, setChest] = useState("");
	const [waist, setWaist] = useState("");
	const [hips, setHips] = useState("");
	const [arms, setArms] = useState("");
	const [legs, setLegs] = useState("");

	const handleAdd = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!weight) return;

		await db.weeklyProgressRecords.add({
			id: uuidv4(),
			date,
			weight: Number(weight),
			chest: Number(chest) || 0,
			waist: Number(waist) || 0,
			hips: Number(hips) || 0,
			arms: Number(arms) || 0,
			legs: Number(legs) || 0,
		});

		setWeight("");
		setChest("");
		setWaist("");
		setHips("");
		setArms("");
		setLegs("");
	};

	const deleteRecord = async (id: string) => {
		await db.weeklyProgressRecords.delete(id);
	};

	return (
		<div className='space-y-8'>
			<div className='flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4'>
				<div>
					<h2 className='text-2xl font-bold text-slate-800 dark:text-white'>{t("weekly_progress" as any) || "Weekly Progress"}</h2>
					<p className='text-slate-500 dark:text-slate-400 mt-1'>{t("track_measurements" as any) || "Track your body measurements"}</p>
				</div>
			</div>

			<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
				<div className='bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm lg:col-span-1'>
					<h3 className='font-bold text-slate-800 dark:text-slate-200 mb-4'>{t("add_measurement" as any) || "Add Measurement"}</h3>
					<form onSubmit={handleAdd} className='space-y-4'>
						<div>
							<label className='block text-xs font-medium text-slate-500 mb-1'>{t("date" as any) || "Date"}</label>
							<input
								type='date'
								required
								value={date}
								onChange={(e) => setDate(e.target.value)}
								className='w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500'
							/>
						</div>
						<div>
							<label className='block text-xs font-medium text-slate-500 mb-1'>{t("weight_kg" as any) || "Weight (kg)"} *</label>
							<input
								type='number'
								step='0.1'
								required
								value={weight}
								onChange={(e) => setWeight(e.target.value)}
								className='w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500'
							/>
						</div>
						<div className='grid grid-cols-2 gap-4'>
							<div>
								<label className='block text-xs font-medium text-slate-500 mb-1'>{t("chest_cm" as any) || "Chest (cm)"}</label>
								<input
									type='number'
									step='0.1'
									value={chest}
									onChange={(e) => setChest(e.target.value)}
									className='w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500'
								/>
							</div>
							<div>
								<label className='block text-xs font-medium text-slate-500 mb-1'>{t("waist_cm" as any) || "Waist (cm)"}</label>
								<input
									type='number'
									step='0.1'
									value={waist}
									onChange={(e) => setWaist(e.target.value)}
									className='w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500'
								/>
							</div>
							<div>
								<label className='block text-xs font-medium text-slate-500 mb-1'>{t("hips_cm" as any) || "Hips (cm)"}</label>
								<input
									type='number'
									step='0.1'
									value={hips}
									onChange={(e) => setHips(e.target.value)}
									className='w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500'
								/>
							</div>
							<div>
								<label className='block text-xs font-medium text-slate-500 mb-1'>{t("arms_cm" as any) || "Arms (cm)"}</label>
								<input
									type='number'
									step='0.1'
									value={arms}
									onChange={(e) => setArms(e.target.value)}
									className='w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500'
								/>
							</div>
							<div>
								<label className='block text-xs font-medium text-slate-500 mb-1'>{t("legs_cm" as any) || "Legs (cm)"}</label>
								<input
									type='number'
									step='0.1'
									value={legs}
									onChange={(e) => setLegs(e.target.value)}
									className='w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500'
								/>
							</div>
						</div>
						<button
							type='submit'
							className='w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium transition-colors mt-2'>
							{t("save_record" as any) || "Save Record"}
						</button>
					</form>
				</div>

				<div className='lg:col-span-2'>
					{records.length === 0 ? (
						<div className='bg-slate-50 dark:bg-slate-800/50 rounded-xl p-8 border border-slate-100 dark:border-slate-700 text-center text-slate-500 h-full flex flex-col justify-center'>
							<LineChart className='mx-auto text-slate-400 mb-4' size={48} />
							<p>{t("no_progress_records" as any) || "No progress records yet."}</p>
						</div>
					) : (
						<div className='space-y-3'>
							{records.map((r) => (
								<div
									key={r.id}
									className='bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between shadow-sm'>
									<div>
										<div className='font-bold text-slate-800 dark:text-slate-200'>{r.date}</div>
										<div className='text-sm text-slate-500 flex gap-3 mt-1 flex-wrap'>
											<span>
												{t("weight" as any) || "Weight"}:{" "}
												<strong className='text-slate-700 dark:text-slate-300'>{r.weight}kg</strong>
											</span>
											{r.chest > 0 && (
												<span>
													{t("chest" as any) || "Chest"}: {r.chest}
												</span>
											)}
											{r.waist > 0 && (
												<span>
													{t("waist" as any) || "Waist"}: {r.waist}
												</span>
											)}
											{r.hips > 0 && (
												<span>
													{t("hips" as any) || "Hips"}: {r.hips}
												</span>
											)}
											{r.arms > 0 && (
												<span>
													{t("arms" as any) || "Arms"}: {r.arms}
												</span>
											)}
											{r.legs > 0 && (
												<span>
													{t("legs" as any) || "Legs"}: {r.legs}
												</span>
											)}
										</div>
									</div>
									<button
										onClick={() => deleteRecord(r.id)}
										className='p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg'>
										<Trash2 size={18} />
									</button>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
