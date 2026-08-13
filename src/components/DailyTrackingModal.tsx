/** @format */

import { X } from "lucide-react";
import ReactQuill from "react-quill-new";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { parseLocalDate } from "@/src/lib/utils";

import { useI18n } from "@/src/contexts/I18nContext";
import { Habit, DayRecord } from "@/src/types";
import "react-quill-new/dist/quill.snow.css";

interface DailyTrackingModalProps {
	habit: Habit;
	date: string;
	initialRecord?: DayRecord;
	onClose: () => void;
	onSave: (completed: boolean, note: string, taskCompletions: Record<string, boolean>) => Promise<void>;
	isEditable: boolean;
}

export default function DailyTrackingModal({ habit, date, initialRecord, onClose, onSave, isEditable }: DailyTrackingModalProps) {
	const { t, dir } = useI18n();
	const [completed, setCompleted] = useState(initialRecord?.completed || false);
	const [note, setNote] = useState(initialRecord?.note || "");
	const [taskCompletions, setTaskCompletions] = useState<Record<string, boolean>>(initialRecord?.taskCompletions || {});

	useEffect(() => {
		setCompleted(initialRecord?.completed || false);
		setNote(initialRecord?.note || "");
	}, [initialRecord]);

	const handleSave = async () => {
		await onSave(completed, note, taskCompletions);
		onClose();
	};

	const modules = {
		toolbar: [
			[{ header: [1, 2, 3, false] }],
			["bold", "italic", "underline", "strike"],
			[{ list: "ordered" }, { list: "bullet" }],
			[{ direction: dir === "rtl" ? "rtl" : "ltr" }],
			["link"],
			["clean"],
		],
	};

	return (
		<div className='fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
			<div className='bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]'>
				<div className='p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 shrink-0'>
					<div>
						<h2 className='text-xl font-bold'>{habit.title}</h2>
						<p className='text-sm text-slate-500'>{format(parseLocalDate(date), "MMMM d, yyyy")}</p>
					</div>
					<button
						onClick={onClose}
						className='p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0'>
						<X size={20} />
					</button>
				</div>

				<div className='p-6 overflow-y-auto space-y-6 flex-1'>
					<div className='flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800'>
						<span className='font-bold text-slate-700 dark:text-slate-300'>{t("completed")}</span>
						<button
							onClick={() => {
								if (isEditable) {
									const newCompleted = !completed;
									setCompleted(newCompleted);

									if (habit.tasks && habit.tasks.length > 0) {
										const newCompletions = { ...taskCompletions };
										habit.tasks.forEach((t) => {
											newCompletions[t.id] = newCompleted;
										});
										setTaskCompletions(newCompletions);
									}
								}
							}}
							disabled={!isEditable}
							className={`w-14 h-8 rounded-full transition-colors relative ${completed ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"} ${!isEditable ? "opacity-50 cursor-not-allowed" : ""}`}>
							<div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${completed ? "right-1" : "left-1"}`} />
						</button>
					</div>

					{habit.tasks && habit.tasks.length > 0 && (
						<div className='space-y-3 mt-4'>
							<label className='text-sm font-bold text-slate-500 dark:text-slate-400'>Sub-Tasks</label>
							<div className='space-y-2'>
								{habit.tasks.map((task) => (
									<div
										key={task.id}
										className='flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800'>
										<button
											onClick={() => {
												if (isEditable) {
													setTaskCompletions((prev) => {
														const newCompletions = {
															...prev,
															[task.id]: !prev[task.id],
														};

														if (habit.tasks && habit.tasks.length > 0) {
															const allCompleted = habit.tasks.every((t) => newCompletions[t.id]);
															setCompleted(allCompleted);
														}

														return newCompletions;
													});
												}
											}}
											className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${taskCompletions[task.id] ? "bg-indigo-500 border-indigo-500 text-white" : "border-slate-300 dark:border-slate-600"}`}>
											{taskCompletions[task.id] && (
												<svg
													viewBox='0 0 24 24'
													fill='none'
													className='w-4 h-4'
													stroke='currentColor'
													strokeWidth='3'
													strokeLinecap='round'
													strokeLinejoin='round'>
													<polyline points='20 6 9 17 4 12'></polyline>
												</svg>
											)}
										</button>
										<span
											className={`text-sm font-medium ${taskCompletions[task.id] ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-300"}`}>
											{task.title}
										</span>
									</div>
								))}
							</div>
						</div>
					)}

					<div className='space-y-3'>
						<label className='text-sm font-bold text-slate-500 dark:text-slate-400'>{t("note_reflection")}</label>
						<div className='react-quill-wrapper relative'>
							<div className={`react-quill-wrapper relative ${dir === "rtl" ? "quill-rtl" : "quill-ltr"}`}>
								<ReactQuill
									theme='snow'
									value={note}
									onChange={setNote}
									modules={modules}
									placeholder={t("note_placeholder")}
									readOnly={!isEditable}
									className='bg-white dark:bg-slate-900 rounded-xl overflow-hidden'
								/>
							</div>
						</div>

						<style>{`
				.react-quill-wrapper .quill {
					border-radius: 0.75rem;
					overflow: hidden;
					border: 1px solid #f1f5f9;
				}
				.dark .react-quill-wrapper .quill {
					border: 1px solid #1e293b;
				}
				.react-quill-wrapper .ql-toolbar {
					border: none;
					border-bottom: 1px solid #f1f5f9;
					background-color: #f8fafc;
					border-top-left-radius: 0.75rem;
					border-top-right-radius: 0.75rem;
					padding: 0.5rem;
				}
				.dark .react-quill-wrapper .ql-toolbar {
					border-bottom: 1px solid #1e293b;
					background-color: #0f172a;
				}
				.react-quill-wrapper .ql-container {
					border: none;
					font-family: inherit;
					font-size: 1rem;
					border-bottom-left-radius: 0.75rem;
					border-bottom-right-radius: 0.75rem;
					background: white;
					min-height: 200px;
				}
				.dark .react-quill-wrapper .ql-container {
					background: #0f172a;
					color: #f8fafc;
				}
				.react-quill-wrapper .ql-editor {
					min-height: 200px;
					padding: 1rem;
				}
				.dark .react-quill-wrapper .ql-snow .ql-stroke {
					stroke: #94a3b8;
				}
				.dark .react-quill-wrapper .ql-snow .ql-fill {
					fill: #94a3b8;
				}
				.dark .react-quill-wrapper .ql-snow .ql-picker {
					color: #94a3b8;
				}
            `}</style>
					</div>
				</div>

				<div className='p-6 border-t border-slate-50 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900 shrink-0'>
					<button
						onClick={onClose}
						className='px-6 py-2.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors'>
						{t("cancel")}
					</button>
					<button
						onClick={handleSave}
						className='px-6 py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors'>
						{t("save_entry")}
					</button>
				</div>
			</div>
		</div>
	);
}
