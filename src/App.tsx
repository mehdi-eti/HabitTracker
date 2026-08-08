/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { I18nProvider } from './contexts/I18nContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Habits from './pages/Habits';
import WorkoutNutrition from './pages/WorkoutNutrition';
import Calendar from './pages/Calendar';
import Stats from './pages/Stats';
import Settings from './pages/Settings';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <ThemeProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="habits" element={<Habits />} />
                <Route path="workout" element={<WorkoutNutrition />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="stats" element={<Stats />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
          </Router>
        </ThemeProvider>
      </I18nProvider>
    </AuthProvider>
  );
}

