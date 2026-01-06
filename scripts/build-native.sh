#!/bin/bash
# Build script for Capacitor native apps
# Temporarily moves API routes and dynamic routes out of the way since static export doesn't support them

set -e

# Check for required tools
check_requirements() {
  if ! command -v bun >/dev/null 2>&1; then
    echo "❌ Error: 'bun' is required but not installed."
    echo "   Install it from: https://bun.sh"
    echo "   Or use: curl -fsSL https://bun.sh/install | bash"
    exit 1
  fi
}

# Safely move a directory, with error handling
# Usage: safe_move_dir <source> <destination>
safe_move_dir() {
  local src="$1"
  local dst="$2"

  # Only attempt to move if the source directory exists
  if [ ! -d "$src" ]; then
    return 0
  fi

  # Avoid overwriting an existing destination directory
  if [ -d "$dst" ]; then
    echo "❌ Error: Cannot move '$src' to '$dst': destination already exists." >&2
    exit 1
  fi

  if ! mv "$src" "$dst"; then
    echo "❌ Error: Failed to move '$src' to '$dst'." >&2
    exit 1
  fi
}

API_DIR="src/app/api"
API_BACKUP_DIR="src/app/_api_backup"
WATCH_ID_DIR="src/app/watch/[id]"
WATCH_ID_BACKUP_DIR="src/app/watch/_id_backup"

# Verify requirements before starting
check_requirements

echo "📦 Building for Capacitor (static export)..."

# Move API routes out of the way temporarily
if [ -d "$API_DIR" ]; then
  echo "📁 Temporarily moving API routes..."
  safe_move_dir "$API_DIR" "$API_BACKUP_DIR"
fi

# Move dynamic watch route out of the way (requires server for room state)
if [ -d "$WATCH_ID_DIR" ]; then
  echo "📁 Temporarily moving dynamic watch route..."
  safe_move_dir "$WATCH_ID_DIR" "$WATCH_ID_BACKUP_DIR"
fi

# Function to restore routes on exit (success or failure)
cleanup() {
  if [ -d "$API_BACKUP_DIR" ]; then
    echo "📁 Restoring API routes..."
    mv "$API_BACKUP_DIR" "$API_DIR" 2>/dev/null || true
  fi
  if [ -d "$WATCH_ID_BACKUP_DIR" ]; then
    echo "📁 Restoring dynamic watch route..."
    mv "$WATCH_ID_BACKUP_DIR" "$WATCH_ID_DIR" 2>/dev/null || true
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
