#!/bin/bash

# HALO Development Startup Script
# This script helps you get both backend and frontend running

echo "🚀 HALO Development Setup"
echo "========================="

# Check if we're in the right directory
if [ ! -d "halo-engine" ] || [ ! -d "halo-portal" ]; then
    echo "❌ Error: Please run this script from the HALO-Clean directory"
    echo "   Expected structure:"
    echo "   HALO-Clean/"
    echo "   ├── halo-engine/"
    echo "   └── halo-portal/"
    exit 1
fi

echo "📦 Installing dependencies..."

# Check for Node.js/npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install Node.js first:"
    echo "   Visit: https://nodejs.org/"
    echo "   Or use: brew install node"
    exit 1
fi

# Install backend dependencies
echo "Installing backend dependencies..."
cd halo-engine
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install backend dependencies"
        exit 1
    fi
else
    echo "✅ Backend dependencies already installed"
fi
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd halo-portal
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install frontend dependencies"
        exit 1
    fi
else
    echo "✅ Frontend dependencies already installed"
fi
cd ..

echo ""
echo "🎯 Setup Complete!"
echo ""
echo "To start development:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd halo-engine && npm run dev"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd halo-portal && npm run dev"
echo ""
echo "Then visit: http://localhost:70070"
echo ""
echo "📚 For detailed setup instructions, see DEVELOPMENT_SETUP.md"
