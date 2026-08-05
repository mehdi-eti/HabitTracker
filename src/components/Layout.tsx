/** @format */

import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../contexts/I18nContext";
import { useTheme, AVAILABLE_THEMES } from "../contexts/ThemeContext";
import { useNotifications } from "../hooks/useNotifications";
import { LayoutDashboard, ListTodo, BarChart2, Calendar as CalendarIcon, Settings as SettingsIcon, LogOut, Moon, Sun, Languages } from "lucide-react";
import { cn } from "../lib/utils";

export default function Layout() {
	useNotifications();
	const { logout } = useAuth();
	const { t, lang, setLang, dir } = useI18n();
	const { theme, toggleTheme } = useTheme();
	const isDarkMode = (AVAILABLE_THEMES.find((t) => t.key === theme) || AVAILABLE_THEMES[0]).type === "dark";
	const navigate = useNavigate();

	const handleLogout = () => {
		logout();
		navigate("/login");
	};

	const navItems = [
		{ to: "/", icon: LayoutDashboard, label: t("dashboard") },
		{ to: "/habits", icon: ListTodo, label: t("habits") },
		{ to: "/calendar", icon: CalendarIcon, label: t("calendar" as any) || "Calendar" },
		{ to: "/stats", icon: BarChart2, label: t("stats") },
		{ to: "/settings", icon: SettingsIcon, label: t("settings") },
	];

	return (
		<div
			className={cn(
				"min-h-screen bg-[#F4F7FE] dark:bg-slate-950 text-[#1B2559] dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-200",
				dir === "rtl" ? "font-sans" : "",
			)}
			dir={dir}>
			{/* Sidebar / Navbar */}
			<nav className='w-full md:w-64 bg-white dark:bg-slate-900 border-e border-slate-100 dark:border-slate-800 shadow-sm z-10 flex flex-col justify-between shrink-0'>
				<div className='p-4 flex md:flex-col items-center md:items-stretch justify-between h-full'>
					<div className='flex md:flex-col gap-2 md:gap-4 flex-1 md:flex-none overflow-x-auto md:overflow-x-visible items-center md:items-stretch px-2 md:px-0'>
						<div className='hidden md:flex items-center gap-3 mb-6 px-2 md:mt-2'>
							<div className='w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl'>
								21
							</div>
							<h1 className='text-xl font-bold tracking-tight'>Habit21</h1>
						</div>

						{navItems.map((item) => (
							<NavLink
								key={item.to}
								to={item.to}
								className={({ isActive }) =>
									cn(
										"flex items-center gap-3 p-3 rounded-xl transition-all duration-200 whitespace-nowrap",
										isActive
											? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium"
											: "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800",
									)
								}>
								<item.icon size={20} />
								<span className='hidden md:inline'>{item.label}</span>
							</NavLink>
						))}
					</div>

					<div className='flex md:flex-col gap-2 p-2 md:p-0 md:mt-auto border-s md:border-s-0 md:border-t border-slate-100 dark:border-slate-800 md:pt-6'>
						<button
							onClick={handleLogout}
							className='flex items-center justify-center md:justify-start gap-3 p-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200 font-medium w-full'
							title={t("logout")}>
							<LogOut size={20} />
							<span className='hidden md:inline'>{t("logout")}</span>
						</button>
					</div>
				</div>
			</nav>

			{/* Main Content Area */}
			<div className='flex-1 flex flex-col h-screen overflow-hidden relative'>
				{/* Navigation Header */}
				<header className='bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-4 md:px-8 py-4 flex items-center justify-end gap-3 z-10 sticky top-0'>
					<button
						onClick={() => setLang(lang === "en" ? "fa" : "en")}
						className='flex items-center justify-center h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200 shadow-sm border border-slate-100 dark:border-slate-700 font-medium text-sm gap-2'
						title={t("language")}>
						<Languages size={18} />
						<span className='hidden sm:inline'>{lang === "en" ? "فارسی" : "English"}</span>
						<span className='sm:hidden'>{lang === "en" ? "FA" : "EN"}</span>
					</button>
					<button
						onClick={toggleTheme}
						className='flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200 shadow-sm border border-slate-100 dark:border-slate-700'
						title={t("theme")}>
						{theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
					</button>
				</header>

				<main className='flex-1 overflow-y-auto p-4 md:p-8'>
					<div className='max-w-6xl mx-auto pb-24 md:pb-8'>
						<Outlet />
					</div>
				</main>
			</div>
		</div>
	);
}
