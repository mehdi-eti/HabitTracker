/** @format */

import axiosInstance from "./axios";

let vapidPublicKey: string | null = null;

async function getVapidPublicKey(): Promise<string | null> {
	if (vapidPublicKey) return vapidPublicKey;
	try {
		const response = await axiosInstance.get("/api/push/vapid-public-key");
		vapidPublicKey = response.data.publicKey;
		console.log("VAPID public key received, length:", vapidPublicKey?.length);
		return vapidPublicKey;
	} catch (err: any) {
		console.error("Failed to fetch VAPID key:", err.response?.status || err.message);
		return null;
	}
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
	const rawData = atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
	if (!("serviceWorker" in navigator)) {
		console.warn("Service Worker not supported");
		return null;
	}
	try {
		const registration = await navigator.serviceWorker.register("/sw.js");
		console.log("SW registered:", registration.scope);
		return registration;
	} catch (err) {
		console.error("SW registration failed:", err);
		return null;
	}
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
	const registration = await navigator.serviceWorker.ready;
	const existing = await registration.pushManager.getSubscription();
	if (existing) {
		console.log("Already subscribed to push");
		return existing;
	}

	const key = await getVapidPublicKey();
	if (!key) {
		console.error("No VAPID public key available");
		return null;
	}

	try {
		const applicationServerKey = urlBase64ToUint8Array(key);
		console.log("ApplicationServerKey bytes:", applicationServerKey.length, "(expected 65)");

		const subscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey,
		});
		console.log("Push subscription successful:", subscription.endpoint);
		return subscription;
	} catch (err: any) {
		console.error("Push subscription failed:", err.name, err.message);
		if (err.name === "InvalidAccessError") {
			console.error("💡 The VAPID public key is invalid. Generate proper keys with: npx web-push generate-vapid-keys");
		}
		return null;
	}
}

export async function unsubscribeFromPush(): Promise<boolean> {
	const registration = await navigator.serviceWorker.ready;
	const subscription = await registration.pushManager.getSubscription();
	if (!subscription) return true;

	const endpoint = subscription.endpoint;
	await subscription.unsubscribe();

	try {
		await axiosInstance.post("/api/push/unsubscribe", {
			endpoint,
		});
	} catch (err: any) {
		console.error("Unsubscribe sync failed:", err.response?.status || err.message);
	}
	return true;
}

export async function syncPushSchedule(
	habits: { id: string; title: string; reminderTime?: string; mode: string; selectedDays: number[] }[],
	globalReminderTime: string,
): Promise<void> {
	const registration = await navigator.serviceWorker.ready;
	const subscription = await registration.pushManager.getSubscription();
	if (!subscription) return;

	const payload = {
		subscription: subscription.toJSON(),
		habits: habits.map((h) => ({
			id: h.id,
			title: h.title,
			reminderTime: h.reminderTime || globalReminderTime,
			mode: h.mode,
			selectedDays: h.selectedDays,
		})),
	};

	try {
		await axiosInstance.post("/api/push/sync", payload);
	} catch (err: any) {
		console.error("Push sync failed:", err.response?.status || err.message);
	}
}
