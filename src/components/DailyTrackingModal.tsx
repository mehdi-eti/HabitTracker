/** @format */

import { useState, useEffect } from "react";
import { useI18n } from "../contexts/I18nContext";
import { Habit, DayRecord } from "../types";
import { X } from "lucide-react";
import { format, parseISO } from "date-fns";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface DailyTrackingModalProps {
	habit: Habit;
	date: string; // YYYY-MM-DD
	initialRecord?: DayRecord;
	onClose: () => void;
	onSave: (completed: boolean, note: string) => Promise<void>;
	isEditable: boolean;
}

export default function DailyTrackingModal({ habit, date, initialRecord, onClose, onSave, isEditable }: DailyTrackingModalProps) {
	const { t } = useI18n();
	const [completed, setCompleted] = useState(initialRecord?.completed || false);
	const [note, setNote] = useState(initialRecord?.note || "");

	useEffect(() => {
		setCompleted(initialRecord?.completed || false);
		setNote(initialRecord?.note || "");
	}, [initialRecord]);

	const handleSave = async () => {
		await onSave(completed, note);
		onClose();
	};

	const modules = {
		toolbar: [
			["bold", "italic", "underline", "strike"], // toggled buttons
			[{ list: "ordered" }, { list: "bullet" }],
			["clean"], // remove formatting button
		],
	};

	return (
		<div className='fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
			<div className='bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]'>
				<div className='p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 shrink-0'>
					<div>
						<h2 className='text-xl font-bold'>{habit.title}</h2>
						<p className='text-sm text-slate-500'>{format(parseISO(date), "MMMM d, yyyy")}</p>
					</div>
					<button
						onClick={onClose}
						className='p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0'>
						<X size={20} />
					</button>
				</div>

				<div className='p-6 overflow-y-auto space-y-6 flex-1'>
					<div className='flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800'>
						<span className='font-bold text-slate-700 dark:text-slate-300'>Completed</span>
						<button
							onClick={() => isEditable && setCompleted(!completed)}
							disabled={!isEditable}
							className={`w-14 h-8 rounded-full transition-colors relative ${completed ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"} ${!isEditable ? "opacity-50 cursor-not-allowed" : ""}`}>
							<div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${completed ? "right-1" : "left-1"}`} />
						</button>
					</div>

					<div className='space-y-3'>
						<label className='text-sm font-bold text-slate-500 dark:text-slate-400'>Note / Reflection</label>
						<div className='react-quill-wrapper relative'>
							<ReactQuill
								theme='snow'
								value={note}
								onChange={setNote}
								modules={modules}
								placeholder="How did it go today? What's on your mind?"
								readOnly={!isEditable}
								className='bg-white dark:bg-slate-900 rounded-xl overflow-hidden'
							/>
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
						Cancel
					</button>
					<button
						onClick={handleSave}
						className='px-6 py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors'>
						Save Entry
					</button>
				</div>
			</div>
		</div>
	);
}
