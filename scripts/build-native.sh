#!/bin/bash
# Build script for Capacitor native apps
# Temporarily moves API routes and dynamic routes out of the way since static export doesn't support them

set -e

API_DIR="src/app/api"
API_BACKUP_DIR="src/app/_api_backup"
WATCH_ID_DIR="src/app/watch/[id]"
WATCH_ID_BACKUP_DIR="src/app/watch/_id_backup"

echo "📦 Building for Capacitor (static export)..."

# Move API routes out of the way temporarily
if [ -d "$API_DIR" ]; then
  echo "📁 Temporarily moving API routes..."
  mv "$API_DIR" "$API_BACKUP_DIR"
fi

# Move dynamic watch route out of the way (requires server for room state)
if [ -d "$WATCH_ID_DIR" ]; then
  echo "📁 Temporarily moving dynamic watch route..."
  mv "$WATCH_ID_DIR" "$WATCH_ID_BACKUP_DIR"
fi

# Function to restore routes on exit (success or failure)
cleanup() {
  if [ -d "$API_BACKUP_DIR" ]; then
    echo "📁 Restoring API routes..."
    mv "$API_BACKUP_DIR" "$API_DIR"
  fi
  if [ -d "$WATCH_ID_BACKUP_DIR" ]; then
    echo "📁 Restoring dynamic watch route..."
    mv "$WATCH_ID_BACKUP_DIR" "$WATCH_ID_DIR"
  fi
}

# Set up trap to ensure cleanup runs on exit
trap cleanup EXIT

# Build WASM
echo "🦀 Building WASM..."
bun run build:wasm:release

# Build Next.js with static export
echo "⚡ Building Next.js (static export)..."
CAPACITOR_BUILD=true next build --webpack

echo "✅ Native build complete! Output in 'out/' directory"
echo ""
echo "Next steps:"
echo "  1. bun run cap:sync   # Sync with native projects"
echo "  2. bun run cap:ios    # Open in Xcode"
echo "  3. bun run cap:android # Open in Android Studio"
