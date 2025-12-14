# HALO Environment Variables Template

Copy and paste these environment variables into your hosting platform dashboards.

## Backend Environment Variables (Render or Fly.io)

Add these in your hosting platform's environment variables section:

```bash
# Server Configuration
NODE_ENV=production
PORT=707

# Database (REQUIRED)
MONGODB_URI=mongodb+srv://halo-user:YOUR_PASSWORD@halo-cluster.xxxxx.mongodb.net/halo?retryWrites=true&w=majority

# JWT Secrets (REQUIRED - generate strong secrets, min 32 chars)
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random-minimum-32-characters
JWT_REFRESH_SECRET=different-strong-secret-from-jwt-secret-also-minimum-32-characters

# CORS (Update after frontend deployment)
ALLOWED_ORIGINS=https://your-netlify-app.netlify.app

# Flight Tracking API (REQUIRED for flight tracking)
AVIATIONSTACK_API_KEY=your-aviationstack-api-key-here

# OpenSky Network API (Optional - free alternative)
OPENSKY_CLIENT_ID=your-opensky-client-id
OPENSKY_CLIENT_SECRET=your-opensky-client-secret

# Xotelo API (Optional - for hotel search via RapidAPI)
XOTELO_ENABLED=true
XOTELO_API_KEY=your-xotelo-api-key-here
XOTELO_RATE_LIMIT_MONTHLY=1000

# Twilio Configuration (Optional - for SMS/WhatsApp)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Email Configuration (Optional - for email notifications)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Security Configuration
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
AUTH_RATE_LIMIT_WINDOW=900000

# Security Features
ENABLE_BRUTE_FORCE_PROTECTION=true
ENABLE_CSRF=false
ENABLE_IP_WHITELIST=false
TRUSTED_IPS=127.0.0.1,::1

# Logging
LOG_LEVEL=info
LOG_SECURITY_EVENTS=true
AUDIT_ALL_REQUESTS=false
LOG_FILE_PATH=./logs
```

## Frontend Environment Variables (Netlify)

Add these in Netlify → Your Site → Site settings → Environment variables:

```bash
# API Base URL (REQUIRED - update with your backend URL)
# For Render: https://your-app.onrender.com/api
# For Fly.io: https://your-app.fly.dev/api
VITE_API_BASE_URL=https://your-backend-url.onrender.com/api

# Google Maps API Key (REQUIRED for live map tracking)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# App Configuration
VITE_APP_NAME=HALO
VITE_APP_VERSION=1.0.0
VITE_APP_DESCRIPTION=Haven's AI Logistic Operator

# Environment
VITE_NODE_ENV=production
```

## Quick Reference: Required vs Optional

### Backend - Required
- `NODE_ENV`
- `MONGODB_URI`
- `JWT_SECRET` (min 32 characters)
- `JWT_REFRESH_SECRET` (min 32 characters)
- `ALLOWED_ORIGINS` (update after frontend deployment)

### Backend - Recommended
- `AVIATIONSTACK_API_KEY` (for flight tracking)

### Backend - Optional
- `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET`
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER`
- `EMAIL_USER` / `EMAIL_PASS`
- All other security and logging variables (have defaults)

### Frontend - Required
- `VITE_API_BASE_URL`
- `VITE_GOOGLE_MAPS_API_KEY`

### Frontend - Optional
- `VITE_APP_NAME`
- `VITE_APP_VERSION`
- `VITE_APP_DESCRIPTION`
- `VITE_NODE_ENV`

## Generating Secure JWT Secrets

You can use the provided script to generate secure secrets:

```bash
./scripts/generate-env-template.sh
```

Or generate manually:

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate JWT_REFRESH_SECRET (different from JWT_SECRET)
openssl rand -base64 32
```

## Important Notes

1. **Never commit these values to Git** - They should only exist in your hosting platform dashboards
2. **JWT_SECRET must be at least 32 characters** - The application will fail to start if it's shorter
3. **Update ALLOWED_ORIGINS after frontend deployment** - Add your Netlify URL to allow CORS
4. **MongoDB URI format** - Make sure to replace `<password>` with your actual database password
5. **Vite environment variables** - Must be prefixed with `VITE_` to be accessible in the frontend code
6. **Backend hosting** - Render spins down after 15min inactivity (free tier), Fly.io stays always-on

