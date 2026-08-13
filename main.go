package main

import (
	"encoding/base64"
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
	vapidPublicKey = "BPLBCcLBERo9k_FnLH7xJPE4eTNdP4WU_TDbBZfEDuZblYfLIlHYaU2MFmrqmowGzzAUX3GUK0bSY3VGhITmMFU"
	vapidPrivateKey = "NwKRF1eS9XYv6q1QnGCh3sAAjEEhFKHzLJNoHvKM53s"

	if vapidPublicKey == "" || vapidPrivateKey == "" {
		log.Println("❌ VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars are required.")
		log.Println("   Generate keys with: npx web-push generate-vapid-keys")
		log.Println("   Then run with:")
		log.Println("   VAPID_PUBLIC_KEY=xxx VAPID_PRIVATE_KEY=yyy go run main.go")
		os.Exit(1)
	}

	// Validate: public key must decode to 65 bytes (uncompressed P-256 point)
	pubBytes, err := base64.RawURLEncoding.DecodeString(vapidPublicKey)
	if err != nil {
		// Try with standard Base64URL (with padding)
		pubBytes, err = base64.URLEncoding.DecodeString(vapidPublicKey)
	}
	if err != nil || len(pubBytes) != 65 || pubBytes[0] != 0x04 {
		log.Fatalf("❌ Invalid VAPID_PUBLIC_KEY. Must be a Base64URL-encoded uncompressed P-256 public key (65 bytes, starts with 0x04). Got %d bytes. Use 'npx web-push generate-vapid-keys'", len(pubBytes))
	}

	log.Printf("✅ VAPID public key validated (%d bytes)", len(pubBytes))
}

func main() {
	initVAPID()

	port := getEnv("PORT", "8979")
	staticDir := getEnv("STATIC_DIR", "./dist")

	if _, err := os.Stat(staticDir); os.IsNotExist(err) {
		log.Fatalf("Static directory '%s' not found. Run 'npm run build' first.", staticDir)
	}

	for _, f := range []string{"sw.js", "manifest.json", "logo.ico", "logo.png", "index.html"} {
		if _, err := os.Stat(filepath.Join(staticDir, f)); os.IsNotExist(err) {
			log.Fatalf("CRITICAL: '%s' not found in '%s'", f, staticDir)
		}
	}

	go startPushCron()

	router := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")

		path := r.URL.Path

		if strings.HasPrefix(path, "/api/") {
			handleAPI(w, r)
			return
		}

		if path == "/sw.js" {
			serveStaticFile(w, r, staticDir, "sw.js", "application/javascript; charset=utf-8")
			return
		}
		if path == "/manifest.json" {
			serveStaticFile(w, r, staticDir, "manifest.json", "application/json; charset=utf-8")
			return
		}

		filePath := filepath.Join(staticDir, filepath.Clean(path))
		info, err := os.Stat(filePath)
		if err == nil && !info.IsDir() {
			http.ServeFile(w, r, filePath)
			return
		}

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

	handler := corsMiddleware(router)

	if err := http.ListenAndServe(addr, handler); err != nil {
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

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		// Configure allowed origins for your frontend.
		allowedOrigins := map[string]bool{
			"http://localhost:3000": true,
			"http://localhost:5173": true,
			"http://localhost:4173": true,
		}

		if allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		}

		// Handle browser preflight requests.
		if r.Method == http.MethodOptions {
			if origin != "" && !allowedOrigins[origin] {
				http.Error(w, "CORS origin not allowed", http.StatusForbidden)
				return
			}

			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
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
	json.NewEncoder(w).Encode(map[string]string{"publicKey": vapidPublicKey, "privateKey": vapidPrivateKey})
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
	w.WriteHeader(http.StatusOK)
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
