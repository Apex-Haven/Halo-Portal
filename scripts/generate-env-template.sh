#!/bin/bash

# HALO Environment Variables Template Generator
# This script generates environment variable templates for deployment

echo "🔧 HALO Environment Variables Template Generator"
echo "================================================"
echo ""

# Generate JWT secrets
JWT_SECRET=$(openssl rand -base64 32 | tr -d '\n' | head -c 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 32 | tr -d '\n' | head -c 48)

echo "📋 Backend Environment Variables (for Render or Fly.io):"
echo "--------------------------------------------------------"
echo ""
echo "NODE_ENV=production"
echo "PORT=10000"
echo "MONGODB_URI=mongodb+srv://halo-user:YOUR_PASSWORD@halo-cluster.xxxxx.mongodb.net/halo?retryWrites=true&w=majority"
echo "JWT_SECRET=$JWT_SECRET"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo "ALLOWED_ORIGINS=https://your-app.netlify.app"
echo "AVIATIONSTACK_API_KEY=your-aviationstack-api-key-here"
echo "OPENSKY_CLIENT_ID=your-opensky-client-id"
echo "OPENSKY_CLIENT_SECRET=your-opensky-client-secret"
echo "XOTELO_API_KEY=your-xotelo-api-key-here"
echo "XOTELO_ENABLED=true"
echo "XOTELO_RATE_LIMIT_MONTHLY=1000"
echo "TWILIO_ACCOUNT_SID=your-twilio-account-sid"
echo "TWILIO_AUTH_TOKEN=your-twilio-auth-token"
echo "TWILIO_PHONE_NUMBER=+1234567890"
echo "EMAIL_USER=your-email@gmail.com"
echo "EMAIL_PASS=your-app-password"
echo ""
echo "📋 Frontend Environment Variables (for Netlify):"
echo "-------------------------------------------------"
echo ""
echo "# For Render backend:"
echo "VITE_API_BASE_URL=https://your-backend.onrender.com/api"
echo "# OR for Fly.io backend:"
echo "VITE_API_BASE_URL=https://your-backend.fly.dev/api"
echo "VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here"
echo "VITE_NODE_ENV=production"
echo "VITE_APP_NAME=HALO"
echo ""
echo "✅ Generated JWT secrets (32+ characters)"
echo "⚠️  Replace placeholder values with your actual credentials"
echo ""

