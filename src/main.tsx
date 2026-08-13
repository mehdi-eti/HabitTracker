/** @format */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import { registerServiceWorker } from "./lib/push";

import "./index.css";

// Register service worker on app load
registerServiceWorker().catch(console.error);

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
