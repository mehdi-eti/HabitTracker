/** @format */

const CACHE_NAME = "habittracker-v1";

self.addEventListener("install", (event) => {
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
	const data = event.data?.json() || {};
	const title = data.title || "Habit Reminder";
	const options = {
		body: data.body || "Don't forget to complete your habit!",
		icon: "/logo.png",
		badge: "/logo.png",
		tag: data.tag || "habit-reminder",
		requireInteraction: true,
		data: data.data || { url: "/" },
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const urlToOpen = event.notification.data?.url || "/";

	event.waitUntil(
		self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
			for (const client of clientList) {
				if (new URL(client.url).pathname === urlToOpen && "focus" in client) {
					return client.focus();
				}
			}
			if (self.clients.openWindow) {
				return self.clients.openWindow(urlToOpen);
			}
		}),
	);
});
