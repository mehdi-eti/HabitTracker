/** @format */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../contexts/I18nContext";

export default function Login() {
	const [username, setUsername] = useState("admin");
	const [password, setPassword] = useState("admin");
	const [error, setError] = useState("");
	const { login } = useAuth();
	const { t, dir } = useI18n();
	const navigate = useNavigate();

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (username === "admin" && password === "admin") {
			login();
			navigate("/");
		} else {
			setError(t("invalid_credentials"));
		}
	};

	return (
		<div className='min-h-screen flex items-center justify-center bg-[#F4F7FE] dark:bg-slate-950 p-4' dir={dir}>
			<div className='w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-50 dark:border-slate-800 p-8 space-y-8 relative overflow-hidden'>
				{/* Soft decorative background circles */}
				<div className='absolute top-0 left-0 w-full h-2 bg-indigo-600' />

				<div className='text-center space-y-2'>
					<div className='mx-auto p-5 w-fit rounded-2xl flex items-center justify-center'>
						<img src='/logo.png' alt='Reboot Reset' className='max-h-32 object-contain' />
					</div>
				</div>

				<form onSubmit={handleSubmit} className='space-y-6'>
					{error && (
						<div className='p-3 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium text-center'>
							{error}
						</div>
					)}

					<div className='space-y-4'>
						<div className='space-y-1.5'>
							<label className='text-sm font-medium text-slate-700 dark:text-slate-300'>{t("username")}</label>
							<input
								type='text'
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								className='w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all dark:text-white'
								dir='ltr'
							/>
						</div>

						<div className='space-y-1.5'>
							<label className='text-sm font-medium text-slate-700 dark:text-slate-300'>{t("password")}</label>
							<input
								type='password'
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className='w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all dark:text-white'
								dir='ltr'
							/>
						</div>
					</div>

					<button
						type='submit'
						className='w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all'>
						{t("login_btn")}
					</button>
				</form>
			</div>
		</div>
	);
}
