package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	webpush "github.com/SherClockHolmes/webpush-go"
)

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

var (
	vapidPublicKey  string
	vapidPrivateKey string
	pushStore       = NewPushStore()
)

type PushSubscription struct {
	Endpoint string `json:"endpoint"`
	Keys     struct {
		P256dh string `json:"p256dh"`
		Auth   string `json:"auth"`
	} `json:"keys"`
}

type HabitSchedule struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	ReminderTime string `json:"reminderTime"`
	Mode         string `json:"mode"`
	SelectedDays []int  `json:"selectedDays"`
}

type PushSyncRequest struct {
	Subscription PushSubscription `json:"subscription"`
	Habits       []HabitSchedule  `json:"habits"`
}

type StoredSubscription struct {
	Subscription PushSubscription
	Habits       []HabitSchedule
	LastNotified map[string]string
}

type PushStore struct {
	mu            sync.RWMutex
	subscriptions map[string]*StoredSubscription
}

func NewPushStore() *PushStore {
	return &PushStore{
		subscriptions: make(map[string]*StoredSubscription),
	}
}

func (s *PushStore) Save(sub PushSubscription, habits []HabitSchedule) {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := sub.Endpoint
	if existing, ok := s.subscriptions[key]; ok {
		existing.Habits = habits
		existing.Subscription = sub
	} else {
		s.subscriptions[key] = &StoredSubscription{
			Subscription: sub,
			Habits:       habits,
			LastNotified: make(map[string]string),
		}
	}
}

func (s *PushStore) Delete(endpoint string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.subscriptions, endpoint)
}

func (s *PushStore) GetAll() []*StoredSubscription {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]*StoredSubscription, 0, len(s.subscriptions))
	for _, v := range s.subscriptions {
		result = append(result, v)
	}
	return result
}

func initVAPID() {
	var err error
	vapidPublicKey = os.Getenv("VAPID_PUBLIC_KEY")
	vapidPrivateKey = os.Getenv("VAPID_PRIVATE_KEY")

	if vapidPublicKey == "" || vapidPrivateKey == "" {
		vapidPublicKey, vapidPrivateKey, err = webpush.GenerateVAPIDKeys()
		if err != nil {
			log.Fatalf("Failed to generate VAPID keys: %v", err)
		}
		log.Println("⚠️  Generated temporary VAPID keys. Set env vars to persist them.")
		log.Printf("VAPID_PUBLIC_KEY=%s", vapidPublicKey)
	}
}

func main() {
	initVAPID()

	port := getEnv("PORT", "8979")
	staticDir := getEnv("STATIC_DIR", "./dist")

	staticDir, err := filepath.Abs(staticDir)
	if err != nil {
		log.Fatalf("Failed to resolve static directory: %v", err)
	}

	if _, err := os.Stat(staticDir); os.IsNotExist(err) {
		log.Fatalf("Static directory '%s' not found. Run 'npm run build' first.", staticDir)
	}

	// Verify PWA files
	for _, f := range []string{"sw.js", "manifest.json", "logo.png"} {
		if _, err := os.Stat(filepath.Join(staticDir, f)); os.IsNotExist(err) {
			log.Fatalf("CRITICAL: '%s' not found in '%s'", f, staticDir)
		}
	}

	go startPushCron()

	router := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Security headers
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")

		path := r.URL.Path

		// API routes
		if strings.HasPrefix(path, "/api/") {
			handleAPI(w, r)
			return
		}

		// EXPLICIT: Serve sw.js with correct MIME type (BEFORE any fallback)
		if path == "/sw.js" {
			serveStaticFile(w, r, staticDir, "sw.js", "application/javascript; charset=utf-8")
			return
		}

		// EXPLICIT: Serve manifest.json
		if path == "/manifest.json" {
			serveStaticFile(w, r, staticDir, "manifest.json", "application/json; charset=utf-8")
			return
		}

		// Serve other static files (JS, CSS, images)
		filePath := filepath.Join(staticDir, filepath.Clean(path))
		info, err := os.Stat(filePath)
		if err == nil && !info.IsDir() {
			http.ServeFile(w, r, filePath)
			return
		}

		// SPA fallback
		serveSPA(w, r, staticDir)
	})

	addr := ":" + port
	log.Printf("🚀 Server starting on http://localhost%s", addr)
	log.Printf("📁 Serving static files from: %s", staticDir)

	swPath := filepath.Join(staticDir, "sw.js")

	info, err := os.Stat(swPath)
	if err != nil {
		log.Fatalf("SW file check failed: %v", err)
	}

	log.Printf("✅ SW found: %s (%d bytes)", swPath, info.Size())

	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func serveStaticFile(w http.ResponseWriter, r *http.Request, dir, filename, contentType string) {
	fp := filepath.Join(dir, filename)
	f, err := os.Open(fp)
	if err != nil {
		log.Printf("❌ Failed to open %s: %v", fp, err)
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	defer f.Close()

	stat, err := f.Stat()
	if err != nil {
		http.Error(w, "Cannot stat file", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "no-cache")
	http.ServeContent(w, r, filename, stat.ModTime(), f)
}

func serveSPA(w http.ResponseWriter, r *http.Request, staticDir string) {
	fp := filepath.Join(staticDir, "index.html")
	f, err := os.Open(fp)
	if err != nil {
		http.Error(w, "index.html not found", http.StatusInternalServerError)
		return
	}
	defer f.Close()

	stat, err := f.Stat()
	if err != nil {
		http.Error(w, "Cannot read index.html", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	http.ServeContent(w, r, "index.html", stat.ModTime(), f)
}

func handleAPI(w http.ResponseWriter, r *http.Request) {
	switch r.URL.Path {
	case "/api/push/vapid-public-key":
		handleVapidPublicKey(w, r)
	case "/api/push/sync":
		handlePushSync(w, r)
	case "/api/push/unsubscribe":
		handlePushUnsubscribe(w, r)
	default:
		w.WriteHeader(http.StatusNotFound)
	}
}

func handleVapidPublicKey(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"publicKey": vapidPublicKey})
}

func handlePushSync(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req PushSyncRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	pushStore.Save(req.Subscription, req.Habits)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func handlePushUnsubscribe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Endpoint string `json:"endpoint"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	pushStore.Delete(req.Endpoint)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "unsubscribed"})
}

func startPushCron() {
	time.Sleep(5 * time.Second)
	log.Println("🔔 Push cron started")
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			checkAndSendPushes()
		}
	}
}

func checkAndSendPushes() {
	now := time.Now()
	currentDayOfWeek := int(now.Weekday())
	currentTimeStr := fmt.Sprintf("%02d:%02d", now.Hour(), now.Minute())
	todayStr := now.Format("2006-01-02")

	for _, sub := range pushStore.GetAll() {
		for _, habit := range sub.Habits {
			if habit.Mode == "selected_days" {
				found := false
				for _, d := range habit.SelectedDays {
					if d == currentDayOfWeek {
						found = true
						break
					}
				}
				if !found {
					continue
				}
			}
			if habit.ReminderTime != currentTimeStr {
				continue
			}
			notifiedKey := fmt.Sprintf("%s_%s", habit.ID, todayStr)
			if sub.LastNotified[notifiedKey] == todayStr {
				continue
			}
			if err := sendPush(sub.Subscription, habit.Title); err != nil {
				log.Printf("Push failed for %s: %v", habit.Title, err)
			} else {
				sub.LastNotified[notifiedKey] = todayStr
				log.Printf("✅ Push sent: %s", habit.Title)
			}
		}
	}
}

func sendPush(sub PushSubscription, habitTitle string) error {
	s := &webpush.Subscription{
		Endpoint: sub.Endpoint,
		Keys: webpush.Keys{
			P256dh: sub.Keys.P256dh,
			Auth:   sub.Keys.Auth,
		},
	}
	payload, _ := json.Marshal(map[string]interface{}{
		"title": "Habit Reminder",
		"body":  fmt.Sprintf("Don't forget to complete your habit: %s", habitTitle),
		"tag":   "habit-reminder-" + habitTitle,
		"data":  map[string]string{"url": "/habits"},
	})
	resp, err := webpush.SendNotification(payload, s, &webpush.Options{
		Subscriber:      "mailto:admin@localhost",
		VAPIDPublicKey:  vapidPublicKey,
		VAPIDPrivateKey: vapidPrivateKey,
		TTL:             60,
	})
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("push service returned %d", resp.StatusCode)
	}
	return nil
}
