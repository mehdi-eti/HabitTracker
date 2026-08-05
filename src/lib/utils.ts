/** @format */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, subDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const getTodayStr = () => format(new Date(), "yyyy-MM-dd");
export const getYesterdayStr = () => format(subDays(new Date(), 1), "yyyy-MM-dd");

export const isTodayOrYesterday = (dateStr: string) => {
	const today = getTodayStr();
	const yesterday = getYesterdayStr();
	return dateStr === today || dateStr === yesterday;
};

export const generateDateRange = (startDateStr: string, numDays: number) => {
	const dates = [];
	const start = parseISO(startDateStr);
	for (let i = 0; i < numDays; i++) {
		// If it's consecutive, we just add days. But wait, if mode is "selected_days",
		// the 21 days are spread out over more calendar days.
		// So this function is just for consecutive days.
		// We should probably just pass an array of required dates.
	}
};
