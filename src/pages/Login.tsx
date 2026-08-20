/** @format */

import React, { useState } from "react";
import { LogIn, UserPlus, Mail, Lock, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../contexts/I18nContext";

export default function Login() {
	const { login, register, isLoading } = useAuth();
	const { t, dir } = useI18n();

	const [email, setEmail] = useState("");
	const [pass, setPass] = useState("");
	const [isRegister, setIsRegister] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		try {
			if (isRegister) {
				await register(email, pass);
			} else {
				await login(email, pass);
			}
		} catch (err: any) {
			setError(err?.message || t("error_occurred"));
		}
	};

	return (
		<div dir={dir} className='flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 transition-colors dark:bg-slate-950'>
			<div className='w-full max-w-md'>
				{/* Brand */}
				<div className='mb-8 text-center'>
					<div className='mx-auto mb-5 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-600/25'>
						<img src='/logo.png' alt={t("app_name")} className='h-full w-full object-cover' />
					</div>

					<h1 className='text-2xl font-bold tracking-tight text-slate-900 dark:text-white'>{t("app_name")}</h1>

					<p className='mt-2 text-sm text-slate-500 dark:text-slate-400'>
						{isRegister ? t("login_register_description") : t("login_welcome_description")}
					</p>
				</div>

				{/* Card */}
				<div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 sm:p-8'>
					<div className='mb-7'>
						<h2 className='text-xl font-semibold text-slate-900 dark:text-white'>
							{isRegister ? t("create_account") : t("welcome_back")}
						</h2>

						<p className='mt-1 text-sm text-slate-500 dark:text-slate-400'>
							{isRegister ? t("register_description") : t("login_description")}
						</p>
					</div>

					<form onSubmit={handleSubmit} className='space-y-5'>
						{error && (
							<div className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400'>
								{error}
							</div>
						)}

						{/* Email */}
						<div>
							<label htmlFor='email' className='mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300'>
								{t("email")}
							</label>

							<div className='relative'>
								<Mail
									size={18}
									className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${dir === "rtl" ? "right-3.5" : "left-3.5"}`}
								/>

								<input
									id='email'
									type='email'
									required
									autoComplete='email'
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder={t("email_placeholder")}
									className={`w-full rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-500 dark:focus:bg-slate-800 ${
										dir === "rtl" ? "pr-11 pl-4" : "pl-11 pr-4"
									}`}
								/>
							</div>
						</div>

						{/* Password */}
						<div>
							<label htmlFor='password' className='mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300'>
								{t("password")}
							</label>

							<div className='relative'>
								<Lock
									size={18}
									className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${dir === "rtl" ? "right-3.5" : "left-3.5"}`}
								/>

								<input
									id='password'
									type='password'
									required
									autoComplete={isRegister ? "new-password" : "current-password"}
									value={pass}
									onChange={(e) => setPass(e.target.value)}
									placeholder='••••••••'
									className={`w-full rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-500 dark:focus:bg-slate-800 ${
										dir === "rtl" ? "pr-11 pl-4" : "pl-11 pr-4"
									}`}
								/>
							</div>
						</div>

						{/* Submit */}
						<button
							type='submit'
							disabled={isLoading}
							className='flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60'>
							{isLoading ? (
								<>
									<Loader2 size={18} className='animate-spin' />
									{t("processing")}
								</>
							) : isRegister ? (
								<>
									<UserPlus size={18} />
									{t("create_account")}
								</>
							) : (
								<>
									<LogIn size={18} />
									{t("sign_in")}
								</>
							)}
						</button>
					</form>

					{/* Switch mode */}
					<div className='mt-7 border-t border-slate-100 pt-6 text-center dark:border-slate-800'>
						<p className='text-sm text-slate-500 dark:text-slate-400'>
							{isRegister ? t("already_have_account") : t("dont_have_account")}
						</p>

						<button
							type='button'
							onClick={() => {
								setIsRegister((value) => !value);
								setError("");
							}}
							className='mt-1 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300'>
							{isRegister ? t("sign_in_instead") : t("create_account")}
						</button>
					</div>
				</div>

				<p className='mt-6 text-center text-xs text-slate-400 dark:text-slate-600'>{t("privacy_notice")}</p>
			</div>
		</div>
	);
}
