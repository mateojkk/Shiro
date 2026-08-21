#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "      🚀 Launching Shiro on X Layer zkEVM (DeFAI)         "
echo "=========================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 1. Start AI Agent Backend
echo "Starting Shiro AI Intent Engine & Keeper Bot (Port 8000)..."
if [ -d "$ROOT_DIR/backend/venv" ]; then
    PYTHON_BIN="$ROOT_DIR/backend/venv/bin/python"
else
    PYTHON_BIN="python3"
fi

cd "$ROOT_DIR"
$PYTHON_BIN -m uvicorn backend.src.server:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# 2. Start Frontend dApp
echo "Starting Shiro Frontend Terminal (Port 3000)..."
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo "=========================================================="
echo " Shiro Services Running:"
echo " 🌐 Frontend dApp: http://localhost:3000"
echo " 🤖 AI Intent API: http://localhost:8000"
echo " 📖 Swagger Docs:  http://localhost:8000/docs"
echo "=========================================================="
echo "Press Ctrl+C to stop all services."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true" EXIT
wait
