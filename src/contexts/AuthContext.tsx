/** @format */

import React, { createContext, useContext, useState, useEffect } from "react";
import { pb, syncDown } from "../lib/pocketbase";

interface AuthContextType {
	user: any;
	login: (email: string, pass: string) => Promise<void>;
	register: (email: string, pass: string) => Promise<void>;
	logout: () => void;
	isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
	const [user, setUser] = useState<any>(pb.authStore.model);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (pb.authStore.isValid) {
			syncDown().catch(console.error);
		}
		return pb.authStore.onChange((token, model) => {
			setUser(model);
		});
	}, []);

	const login = async (email: string, pass: string) => {
		setIsLoading(true);
		try {
			await pb.collection("users").authWithPassword(email, pass);
			await syncDown();
		} finally {
			setIsLoading(false);
		}
	};

	const register = async (email: string, pass: string) => {
		setIsLoading(true);
		try {
			await pb.collection("users").create({
				email,
				password: pass,
				passwordConfirm: pass,
			});
			await login(email, pass);
		} finally {
			setIsLoading(false);
		}
	};

	const logout = () => {
		pb.authStore.clear();
		// Also clear Dexie so the local DB is empty upon logout
		import("../lib/db").then(({ db }) => {
			const collections = [
				"habits",
				"dayRecords",
				"settings",
				"workoutPlans",
				"workoutPlanVersions",
				"workoutDailyRecords",
				"workoutSetRecords",
				"nutritionDailyRecords",
				"nutritionFoodRecords",
				"extraFoodRecords",
				"weeklyProgressRecords",
				"workoutNutritionNotes",
			];
			db.transaction(
				"rw",
				collections.map((c) => (db as any)[c]),
				async () => {
					// @ts-ignore
					db.ignoreSync = true;
					for (const col of collections) {
						await (db as any)[col].clear();
					}
				},
			).finally(() => {
				// @ts-ignore
				db.ignoreSync = false;
				window.location.reload();
			});
		});
	};

	return <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
};
