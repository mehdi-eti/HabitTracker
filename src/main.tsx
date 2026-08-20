/** @format */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";

import "./index.css";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { I18nProvider } from "./contexts/I18nContext.tsx";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<AuthProvider>
			<I18nProvider>
				<ThemeProvider>
					<App />
				</ThemeProvider>
			</I18nProvider>
		</AuthProvider>
	</StrictMode>,
);
