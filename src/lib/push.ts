/** @format */

let vapidPublicKey: string | null = null;

async function getVapidPublicKey(): Promise<string | null> {
	if (vapidPublicKey) return vapidPublicKey;
	try {
		const res = await fetch("/api/push/vapid-public-key");
		const data = await res.json();
		vapidPublicKey = data.publicKey;
		return vapidPublicKey;
	} catch (err) {
		console.error("Failed to fetch VAPID key:", err);
		return null;
	}
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
	const rawData = atob(base64);
	return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
	if (!("serviceWorker" in navigator)) {
		console.warn("Service Worker not supported");
		return null;
	}
	try {
		const registration = await navigator.serviceWorker.register("/sw.js");
		return registration;
	} catch (err) {
		console.error("SW registration failed:", err);
		return null;
	}
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
	const registration = await navigator.serviceWorker.ready;
	const existing = await registration.pushManager.getSubscription();
	if (existing) return existing;

	const key = await getVapidPublicKey();
	if (!key) return null;

	try {
		const subscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(key),
		});
		return subscription;
	} catch (err) {
		console.error("Push subscription failed:", err);
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
		await fetch("/api/push/unsubscribe", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ endpoint }),
		});
	} catch (err) {
		console.error("Unsubscribe sync failed:", err);
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
		await fetch("/api/push/sync", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
	} catch (err) {
		console.error("Push sync failed:", err);
	}
}
