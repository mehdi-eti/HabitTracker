package main

import (
	"log"
	"net/http"
	"os"
	"path"
	"strings"
)

func main() {
	// Configuration
	port := getEnv("PORT", "8979")
	staticDir := getEnv("STATIC_DIR", "./dist")

	// Verify dist exists
	if _, err := os.Stat(staticDir); os.IsNotExist(err) {
		log.Fatalf("Static directory '%s' not found. Run 'npm run build' first.", staticDir)
	}

	// Create file server for static assets
	fsRoot := http.Dir(staticDir)
	fileServer := http.FileServer(fsRoot)

	// Main handler
	router := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Security headers
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")

		// Clean the path
		cleanPath := path.Clean(r.URL.Path)

		// API routes (add your backend API here)
		if strings.HasPrefix(cleanPath, "/api/") {
			w.WriteHeader(http.StatusNotFound)
			return
		}

		// Try to serve the file directly
		fullPath := path.Join(staticDir, cleanPath)

		// Check if file exists and is not a directory
		info, err := os.Stat(fullPath)
		if err == nil && !info.IsDir() {
			// It's a real file (JS, CSS, images, etc.) — serve it
			fileServer.ServeHTTP(w, r)
			return
		}

		// It's a directory or doesn't exist — serve index.html for SPA routing
		// This handles /, /about, /dashboard, etc.
		indexPath := path.Join(staticDir, "index.html")
		indexFile, err := os.Open(indexPath)
		if err != nil {
			http.Error(w, "index.html not found", http.StatusInternalServerError)
			return
		}
		defer indexFile.Close()

		stat, err := indexFile.Stat()
		if err != nil {
			http.Error(w, "Cannot read index.html", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		http.ServeContent(w, r, "index.html", stat.ModTime(), indexFile)
	})

	addr := ":" + port
	log.Printf("🚀 Server starting on http://localhost%s", addr)
	log.Printf("📁 Serving static files from: %s", staticDir)

	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}