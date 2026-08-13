/** @format */

import { useNavigate } from "react-router-dom";
import React, { useState, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BellOff, Download, Upload, Globe, Bell, Database, LogOut, AlertTriangle, ChevronDown } from "lucide-react";

import { db } from "@/src/lib/db";
import { cn } from "@/src/lib/utils";
import { useI18n } from "@/src/contexts/I18nContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { subscribeToPush, unsubscribeFromPush } from "@/src/lib/push";
import { useTheme, AVAILABLE_THEMES } from "@/src/contexts/ThemeContext";
import { createFullBackup, restoreFullBackup, clearAllData } from "@/src/lib/backup";

export default function Settings() {
	const { t, lang, setLang } = useI18n();
	const { theme, setTheme } = useTheme();
	const { logout } = useAuth();
	const navigate = useNavigate();
	const settings = useLiveQuery(() => db.settings.get("global"));
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [showAdvancedExport, setShowAdvancedExport] = useState(false);

	const handleExportFull = async () => {
		const backup = await createFullBackup();
		const blob = new Blob([JSON.stringify(backup, null, 2)], {
			type: "application/json",
		});

		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");

		a.href = url;
		a.download = `habit21-backup-${backup.exportedAt.slice(0, 10)}.json`;
		a.click();

		URL.revokeObjectURL(url);
	};

	const handleExportActive = async () => {
		const habits = await db.habits.where("status").equals("active").toArray();
		const habitIds = habits.map((h) => h.id);
		const records = await db.dayRecords.where("habitId").anyOf(habitIds).toArray();

		const data = { habits, records };
		const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `habit21-active-export.json`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = async (event) => {
			try {
				const data = JSON.parse(event.target?.result as string);
				if (data.backupVersion) {
					// It's a full backup
					await restoreFullBackup(data);
				} else {
					// Legacy backup
					if (data.habits) await db.habits.bulkPut(data.habits);
					if (data.records) await db.dayRecords.bulkPut(data.records);
					if (data.settings) await db.settings.bulkPut(data.settings);
				}
				alert(t("import_success"));
			} catch (err) {
				console.error(err);
				alert(t("import_error"));
			}
		};
		reader.readAsText(file);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleTimeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		await db.settings.update("global", { globalReminderTime: e.target.value });
	};

	const handleLogout = () => {
		if (confirm("Are you sure you want to log out?")) {
			logout();
			navigate("/login");
		}
	};

	const handleResetData = async () => {
		if (
			confirm(
				"WARNING: This will permanently delete all your data including habits, records, workout plans, and nutrition logs. Are you absolutely sure?",
			)
		) {
			await clearAllData();
			alert("All data has been erased.");
		}
	};

	return (
		<div className='max-w-5xl mx-auto space-y-8'>
			{/* Page Header */}
			<div className='mb-8'>
				<h2 className='text-3xl font-extrabold text-slate-800 dark:text-slate-100'>{t("settings")}</h2>
				<p className='text-slate-500 dark:text-slate-400 mt-2 font-medium'>Manage your app preferences and data</p>
			</div>

			<div className='grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8'>
				{/* LEFT COLUMN */}
				<div className='space-y-6 lg:space-y-8'>
					{/* Preferences Card */}
					<div className='bg-white dark:bg-slate-900 rounded-4xl p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm'>
						<div className='flex items-center gap-3 mb-6'>
							<div className='w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-xl flex items-center justify-center'>
								<Globe size={20} />
							</div>
							<h3 className='text-xl font-bold text-slate-800 dark:text-slate-100'>Preferences</h3>
						</div>

						<div className='space-y-6'>
							{/* Language Toggle */}
							<div>
								<label className='block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3'>
									{t("language" as any) || "Language"}
								</label>
								<div className='flex bg-slate-50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-100 dark:border-slate-700/50'>
									<button
										onClick={() => setLang("en")}
										className={cn(
											"flex-1 py-2.5 text-sm font-bold rounded-lg transition-all",
											lang === "en"
												? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
												: "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
										)}>
										English
									</button>
									<button
										onClick={() => setLang("fa")}
										className={cn(
											"flex-1 py-2.5 text-sm font-bold rounded-lg transition-all",
											lang === "fa"
												? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
												: "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
										)}>
										فارسی
									</button>
								</div>
							</div>

							{/* Theme Picker */}
							<div>
								<label className='block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3'>
									{t("theme" as any) || "Theme"}
								</label>
								<div className='grid grid-cols-2 gap-2'>
									{AVAILABLE_THEMES.map((themeOption) => (
										<button
											key={themeOption.key}
											onClick={() => setTheme(themeOption.key)}
											className={cn(
												"flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
												theme === themeOption.key
													? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-500"
													: "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700",
											)}>
											<div className='flex-1 text-sm font-bold'>{themeOption.label}</div>
											{theme === themeOption.key && (
												<div className='w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]'></div>
											)}
										</button>
									))}
								</div>
							</div>
						</div>
					</div>

					{/* Reminder Settings Card */}
					<div className='bg-white dark:bg-slate-900 rounded-4xl p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm'>
						<div className='flex items-center gap-3 mb-6'>
							<div className='w-10 h-10 bg-amber-50 dark:bg-amber-900/30 text-amber-500 rounded-xl flex items-center justify-center'>
								<Bell size={20} />
							</div>
							<h3 className='text-xl font-bold text-slate-800 dark:text-slate-100'>{t("global_reminder")}</h3>
						</div>

						<div className='space-y-4'>
							<div className='relative'>
								<input
									type='time'
									value={settings?.globalReminderTime || "20:00"}
									onChange={handleTimeChange}
									className='w-full px-5 py-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white font-bold text-lg'
								/>
							</div>
							<p className='text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed'>
								This default time is used for notifications if a habit doesn't have a custom reminder set. You can override this
								setting individually when creating or editing a habit.
							</p>
						</div>
					</div>
					{/* Push Notifications Card */}
					<div className='bg-white dark:bg-slate-900 rounded-4xl p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm'>
						<div className='flex items-center gap-3 mb-6'>
							<div className='w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-xl flex items-center justify-center'>
								<Bell size={20} />
							</div>
							<h3 className='text-xl font-bold text-slate-800 dark:text-slate-100'>Push Notifications</h3>
						</div>

						<div className='space-y-4'>
							<p className='text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed'>
								Enable background push notifications to receive habit reminders even when the app is closed.
							</p>
							<div className='flex gap-3'>
								<button
									onClick={async () => {
										const sub = await subscribeToPush();
										alert(sub ? "Push notifications enabled!" : "Failed to enable. Check browser permissions.");
									}}
									className='flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/20'>
									<Bell size={18} /> Enable Push
								</button>
								<button
									onClick={async () => {
										await unsubscribeFromPush();
										alert("Push notifications disabled.");
									}}
									className='flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700'>
									<BellOff size={18} /> Disable
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* RIGHT COLUMN */}
				<div className='space-y-6 lg:space-y-8'>
					{/* Data Management Card */}
					<div className='bg-white dark:bg-slate-900 rounded-4xl p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm'>
						<div className='flex items-center gap-3 mb-6'>
							<div className='w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 rounded-xl flex items-center justify-center'>
								<Database size={20} />
							</div>
							<h3 className='text-xl font-bold text-slate-800 dark:text-slate-100'>{t("export_import")}</h3>
						</div>

						<p className='text-sm font-medium text-slate-500 dark:text-slate-400 mb-6'>
							Backup your habit tracking data to a file, or restore from a previous backup.
						</p>

						<div className='space-y-4'>
							<button
								onClick={handleExportFull}
								className='w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/20 active:scale-95'>
								<Download size={20} />
								{t("export_full")}
							</button>

							<div className='relative'>
								<input type='file' accept='.json' onChange={handleImport} ref={fileInputRef} className='hidden' id='import-file' />
								<label
									htmlFor='import-file'
									className='w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700'>
									<Upload size={20} />
									{t("import_data")}
								</label>
							</div>

							{/* Advanced Export */}
							<div className='pt-4 mt-4 border-t border-slate-100 dark:border-slate-800'>
								<button
									onClick={() => setShowAdvancedExport(!showAdvancedExport)}
									className='flex items-center justify-between w-full text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors'>
									Advanced Options
									<ChevronDown size={16} className={cn("transition-transform", showAdvancedExport ? "rotate-180" : "")} />
								</button>

								{showAdvancedExport && (
									<div className='mt-4'>
										<button
											onClick={handleExportActive}
											className='w-full flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-sm font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors'>
											<Download size={18} />
											{t("export_active")}
										</button>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Account & Danger Zone Card */}
					<div className='bg-white dark:bg-slate-900 rounded-4xl p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm'>
						<h3 className='text-xl font-bold text-slate-800 dark:text-slate-100 mb-6'>Account</h3>

						<div className='space-y-4'>
							<button
								onClick={handleLogout}
								className='w-full flex items-center justify-between px-5 py-4 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group'>
								<div className='flex items-center gap-3'>
									<div className='w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-slate-600 transition-colors'>
										<LogOut size={16} className='text-slate-500 dark:text-slate-400' />
									</div>
									{t("logout" as any) || "Log Out"}
								</div>
							</button>

							<div className='pt-4 mt-2 border-t border-slate-100 dark:border-slate-800'>
								<h4 className='text-sm font-bold text-red-500 mb-3 flex items-center gap-2'>
									<AlertTriangle size={16} /> Danger Zone
								</h4>
								<button
									onClick={handleResetData}
									className='w-full flex items-center justify-between px-5 py-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors border border-red-100 dark:border-red-900/30'>
									<div className='flex flex-col items-start'>
										<span>Reset All Data</span>
										<span className='text-xs font-medium text-red-400/80 dark:text-red-500/80'>
											Permanently delete all habits and history
										</span>
									</div>
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
