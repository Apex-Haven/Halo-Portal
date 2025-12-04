#!/bin/bash

# HALO Local Development Startup Script
echo "🚀 Starting HALO Backend and Frontend..."

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
lsof -ti:7007,7070 | xargs kill -9 2>/dev/null || true

echo "📦 Starting Backend (Port 7007)..."
cd /Users/stalin/Workspace/Halo/halo-engine
npm run dev &
BACKEND_PID=$!

echo "📦 Starting Frontend (Port 7070)..."
cd /Users/stalin/Workspace/Halo/halo-portal
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both services are starting up!"
echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://localhost:7070"
echo "   Backend:  http://localhost:7007/api"
echo ""
echo "🔐 Demo Login:"
echo "   Admin:    admin@halo.com / admin123"
echo "   Driver:   driver@halo.com / driver123"
echo "   Customer: customer@halo.com / customer123"
echo ""
echo "Press Ctrl+C to stop both services"

# Wait for user interrupt
wait
