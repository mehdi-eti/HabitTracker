/**
 * @format
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "./contexts/AuthContext";

import Layout from "./components/Layout";

import Calendar from "./pages/Calendar";
import Dashboard from "./pages/Dashboard";
import Habits from "./pages/Habits";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import Stats from "./pages/Stats";
import WorkoutNutrition from "./pages/WorkoutNutrition";

export default function App() {
	const { user } = useAuth();

	return (
		<Router>
			<Routes>
				{/* Public */}
				<Route path='/login' element={user ? <Navigate to='/' replace /> : <Login />} />

				{/* Protected */}
				<Route path='/' element={user ? <Layout /> : <Navigate to='/login' replace />}>
					<Route index element={<Dashboard />} />
					<Route path='habits' element={<Habits />} />
					<Route path='workout' element={<WorkoutNutrition />} />
					<Route path='calendar' element={<Calendar />} />
					<Route path='stats' element={<Stats />} />
					<Route path='settings' element={<Settings />} />
				</Route>

				{/* Fallback */}
				<Route path='*' element={<Navigate to={user ? "/" : "/login"} replace />} />
			</Routes>
		</Router>
	);
}
