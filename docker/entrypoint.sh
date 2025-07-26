#!/bin/sh

# dompile Docker entrypoint script
# Builds site and serves with NGINX, auto-rebuilding on changes

set -e

echo "🐳 Starting dompile Docker container..."

# Check if site directory is mounted
if [ ! -d "/site" ]; then
    echo "❌ Error: No /site directory found. Please mount your site directory:"
    echo "   docker run -v \$(pwd)/mysite:/site dompile"
    exit 1
fi

# Set default directories
SOURCE_DIR="/site"
OUTPUT_DIR="/var/www/html"

echo "📁 Source: $SOURCE_DIR"
echo "📁 Output: $OUTPUT_DIR"

# Initial build
echo "🔨 Building site..."
cd /site
dompile build --source . --output "$OUTPUT_DIR"

if [ $? -eq 0 ]; then
    echo "✅ Initial build completed"
else
    echo "❌ Initial build failed"
    exit 1
fi

# Start NGINX in background
echo "🌐 Starting NGINX..."
nginx &
NGINX_PID=$!

# Start file watcher for auto-rebuild
echo "👀 Starting file watcher for auto-rebuild..."
dompile watch --source . --output "$OUTPUT_DIR" &
WATCHER_PID=$!

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $NGINX_PID 2>/dev/null || true
    kill $WATCHER_PID 2>/dev/null || true
    exit 0
}

# Handle signals
trap cleanup SIGTERM SIGINT

echo "🚀 dompile is running!"
echo "   📖 Site: http://localhost/"
echo "   📁 Watching: $SOURCE_DIR"
echo "   🎯 Output: $OUTPUT_DIR"
echo ""
echo "Press Ctrl+C to stop"

# Wait for processes
wait $NGINX_PID $WATCHER_PID