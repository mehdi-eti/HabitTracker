/** @format */

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Upload, Play, Archive, Trash2, Dumbbell, Edit } from "lucide-react";

import { db } from "@/src/lib/db";
import { WorkoutPlan } from "@/src/types/workout";
import { useI18n } from "@/src/contexts/I18nContext";
import { importPlanFromJson } from "@/src/utils/planImport";
import EditPlanModal from "./EditPlanModal";

export default function PlansManager() {
	const plans = useLiveQuery(() => db.workoutPlans.toArray()) || [];
	const { t } = useI18n();
	const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);

	const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = async (event) => {
			try {
				await importPlanFromJson(event.target?.result as string, false);
			} catch (error) {
				console.error("Failed to import plan", error);
			}
		};
		reader.readAsText(file);
		e.target.value = ""; // Reset
	};

	const activatePlan = async (plan: WorkoutPlan) => {
		const startDate = new Date().toISOString().split("T")[0];

		// Archive all currently active plans
		const activePlans = plans.filter((p) => p.status === "active");
		for (const p of activePlans) {
			await db.workoutPlans.update(p.id, { status: "archived" });
		}

		// Activate this plan
		await db.workoutPlans.update(plan.id, { status: "active", startDate });
	};

	const archivePlan = async (id: string) => {
		await db.workoutPlans.update(id, { status: "archived" });
	};

	const deletePlan = async (id: string) => {
		await db.workoutPlans.update(id, { status: "deleted" });
	};

	const activePlan = plans.find((p) => p.status === "active");
	const otherPlans = plans.filter((p) => p.status !== "deleted" && p.status !== "active");

	return (
		<div className='space-y-6'>
			<div className='flex justify-between items-center'>
				<h2 className='text-xl font-bold'>{t("plans" as any) || "Plans"}</h2>
				<div className='flex gap-2'>
					<label className='flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors text-sm font-medium'>
						<Upload size={18} />
						{t("import_json" as any) || "Import JSON"}
						<input type='file' accept='.json' className='hidden' onChange={handleImport} />
					</label>
				</div>
			</div>

			{activePlan && (
				<div className='bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-5'>
					<div className='flex justify-between items-start'>
						<div>
							<div className='flex items-center gap-2 mb-1'>
								<span className='bg-indigo-500 text-white text-xs px-2 py-0.5 rounded font-medium'>
									{t("active_plan" as any) || "Active"}
								</span>
								<h3 className='text-lg font-bold text-indigo-900 dark:text-indigo-100'>{activePlan.name}</h3>
							</div>
							<p className='text-indigo-700/80 dark:text-indigo-300 text-sm'>{activePlan.description}</p>
							<div className='text-xs text-indigo-600 dark:text-indigo-400 mt-3 font-medium'>
								Started: {activePlan.startDate} • Duration: {activePlan.durationDays} {t("days")}
							</div>
						</div>
						<div className='flex gap-2'>
							<button
								onClick={() => setEditingPlan(activePlan)}
								className='p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded-lg transition-colors'
								title='Edit Nutrition Plans'>
								<Edit size={18} />
							</button>
							<button
								onClick={() => archivePlan(activePlan.id)}
								className='p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded-lg transition-colors'
								title='Archive Plan'>
								<Archive size={18} />
							</button>
						</div>
					</div>
				</div>
			)}

			{otherPlans.length > 0 && (
				<div>
					<h3 className='text-lg font-semibold mb-3'>{t("other_plans" as any) || "Other Plans"}</h3>
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
						{otherPlans.map((plan) => (
							<div key={plan.id} className='border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col'>
								<h4 className='font-bold text-slate-800 dark:text-slate-100'>{plan.name}</h4>
								<p className='text-sm text-slate-500 dark:text-slate-400 mt-1 flex-1'>{plan.description || "No description"}</p>
								<div className='text-xs text-slate-400 dark:text-slate-500 mt-3 mb-4 font-medium'>
									Duration: {plan.durationDays} {t("days")}
								</div>
								<div className='flex justify-between items-center mt-auto border-t border-slate-100 dark:border-slate-800 pt-3'>
									<span className='text-xs font-medium text-slate-500 capitalize'>{plan.status}</span>
									<div className='flex gap-1'>
										<button
											onClick={() => setEditingPlan(plan)}
											className='p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md'
											title='Edit Plan'>
											<Edit size={16} />
										</button>
										<button
											onClick={() => activatePlan(plan)}
											className='p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md'
											title='Activate Plan'>
											<Play size={16} />
										</button>
										<button
											onClick={() => deletePlan(plan.id)}
											className='p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md'
											title='Delete Plan'>
											<Trash2 size={16} />
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{plans.filter((p) => p.status !== "deleted").length === 0 && (
				<div className='text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl'>
					<Dumbbell className='mx-auto text-slate-300 dark:text-slate-600 mb-3' size={48} />
					<h3 className='text-lg font-medium text-slate-700 dark:text-slate-300'>
						{t("no_workout_plans" as any) || "No workout plans yet"}
					</h3>
					<p className='text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto'>
						{t("import_plan_desc" as any) || "Import a plan using the JSON format to get started with your fitness journey."}
					</p>
				</div>
			)}
			
			{editingPlan && <EditPlanModal plan={editingPlan} onClose={() => setEditingPlan(null)} />}
		</div>
	);
}
