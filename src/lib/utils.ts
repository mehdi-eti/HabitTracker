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

/**
 * Safely parses a YYYY-MM-DD date string into a local Date object.
 * This avoids the timezone shift issue of `new Date("YYYY-MM-DD")` which parses as UTC.
 */
export const parseLocalDate = (dateStr: string): Date => {
	const [y, m, d] = dateStr.split("-");
	const date = new Date(Number(y), Number(m) - 1, Number(d));
	date.setHours(0, 0, 0, 0);
	return date;
};

/**
 * Returns today's date as a local Date object, normalized to 00:00:00.
 */
export const getNormalizedToday = (): Date => {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return today;
};

/**
 * Calculates the number of days difference between two dates.
 * Returns (endDate - startDate) in days.
 */
export const getDaysDifference = (startDate: Date, endDate: Date): number => {
	return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Adds a specific number of days to a Date and returns a new Date object.
 */
export const addDaysToDate = (date: Date, days: number): Date => {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
};

/**
 * Formats a Date object as a YYYY-MM-DD string.
 */
export const formatDateStr = (date: Date): string => {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const generateDateRange = (startDateStr: string, numDays: number) => {
	const dates = [];
	const start = parseLocalDate(startDateStr);
	for (let i = 0; i < numDays; i++) {
		// If it's consecutive, we just add days. But wait, if mode is "selected_days",
		// the 21 days are spread out over more calendar days.
		// So this function is just for consecutive days.
		// We should probably just pass an array of required dates.
	}
};
