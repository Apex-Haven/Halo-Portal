# HALO Deployment Guide

Complete guide for deploying HALO to production using Netlify (frontend) and Render/Fly.io (backend).

## Overview

- **Frontend**: Netlify (free tier, perfect for React/Vite apps)
- **Backend**: Render or Fly.io (free tier available for both)

## Prerequisites

- GitHub account
- MongoDB Atlas account (free tier available)
- Netlify account (free)
- Render or Fly.io account (free tier available)

## Step 1: Prepare MongoDB Database

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist IP addresses (use `0.0.0.0/0` for Render/Fly.io)
5. Get your connection string: `mongodb+srv://username:password@cluster.mongodb.net/halo?retryWrites=true&w=majority`

## Step 2: Deploy Backend to Render

### Option A: Render (Recommended for Simplicity)

1. Go to [Render](https://render.com) and sign up with GitHub
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `halo-backend`
   - **Root Directory**: `halo-engine`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (spins down after 15min inactivity)

5. Add Environment Variables (see [ENV_VARIABLES_TEMPLATE.md](./ENV_VARIABLES_TEMPLATE.md)):
   ```bash
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=your-jwt-secret-min-32-chars
   JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
   ALLOWED_ORIGINS=https://your-netlify-app.netlify.app
   ```

6. Deploy and copy your Render URL: `https://halo-backend.onrender.com`

### Option B: Fly.io (Recommended for Always-On)

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. In `halo-engine` directory, initialize: `fly launch`
4. Configure `fly.toml`:
   ```toml
   app = "halo-backend"
   primary_region = "iad"
   
   [build]
   
   [http_service]
     internal_port = 7007
     force_https = true
     auto_stop_machines = false
     auto_start_machines = true
     min_machines_running = 1
   
   [[vm]]
     memory_mb = 512
   ```

5. Set secrets:
   ```bash
   fly secrets set MONGODB_URI=your-connection-string
   fly secrets set JWT_SECRET=your-secret
   fly secrets set JWT_REFRESH_SECRET=your-refresh-secret
   fly secrets set ALLOWED_ORIGINS=https://your-netlify-app.netlify.app
   ```

6. Deploy: `fly deploy`
7. Get URL: `https://halo-backend.fly.dev`

## Step 3: Deploy Frontend to Netlify

1. Go to [Netlify](https://netlify.com) and sign up with GitHub
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Configure build settings:
   - **Base directory**: `halo-portal`
   - **Build command**: `npm run build`
   - **Publish directory**: `halo-portal/dist`
   - **Node version**: `18` (or higher)

5. Add Environment Variables:
   ```bash
   VITE_API_BASE_URL=https://your-backend-url.onrender.com/api
   # OR for Fly.io:
   # VITE_API_BASE_URL=https://your-backend-url.fly.dev/api
   VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
   ```

6. Deploy and copy your Netlify URL: `https://your-app.netlify.app`

## Step 4: Update CORS Settings

1. Go back to your backend hosting (Render or Fly.io)
2. Update `ALLOWED_ORIGINS` environment variable:
   ```bash
   ALLOWED_ORIGINS=https://your-app.netlify.app
   ```
3. Redeploy backend (Render auto-redeploys, Fly.io: `fly deploy`)

## Step 5: Verify Deployment

### Test Backend Health Check
```bash
curl https://your-backend-url.onrender.com/api/health
# OR
curl https://your-backend-url.fly.dev/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Test Frontend
1. Visit your Netlify URL
2. Try logging in with default admin: `admin@halo.com` / `admin123`
3. Check browser console for any CORS errors

## Environment Variables Reference

See [ENV_VARIABLES_TEMPLATE.md](./ENV_VARIABLES_TEMPLATE.md) for complete list of environment variables.

### Critical Backend Variables
- `MONGODB_URI` - MongoDB connection string (REQUIRED)
- `JWT_SECRET` - JWT secret key, min 32 characters (REQUIRED)
- `JWT_REFRESH_SECRET` - Refresh token secret, min 32 characters (REQUIRED)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed frontend URLs (REQUIRED)

### Critical Frontend Variables
- `VITE_API_BASE_URL` - Backend API URL with `/api` suffix (REQUIRED)
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps API key (REQUIRED for maps)

## Troubleshooting

### CORS Errors
- Verify `ALLOWED_ORIGINS` includes your exact Netlify URL (no trailing slash)
- Check backend logs for CORS-related errors
- Ensure backend is running and accessible

### Build Failures
- Check build logs in Netlify dashboard
- Verify Node.js version (18+)
- Ensure all dependencies are in `package.json`

### Backend Not Starting
- Check environment variables are set correctly
- Verify MongoDB connection string is valid
- Check backend logs for specific errors

### Health Check Fails
- Verify backend is running
- Check `/api/health` endpoint exists
- Ensure PORT environment variable is set

## Hosting Platform Comparison

### Frontend: Netlify
- **Free Tier**: 100GB bandwidth/month, 300 build minutes/month
- **Pros**: Free forever, automatic deployments, CDN, easy setup
- **Perfect for**: React/Vite frontend applications

### Backend: Render
- **Free Tier**: 750 hours/month, spins down after 15min inactivity
- **Pros**: Simple setup, automatic deployments
- **Cons**: Cold starts after inactivity
- **Good for**: Development/staging, low-traffic production

### Backend: Fly.io
- **Free Tier**: 3 shared VMs, 3GB storage
- **Pros**: Always-on, no cold starts, global edge network
- **Cons**: Slightly more complex setup
- **Good for**: Production apps that need to stay online

## Custom Domains

### Netlify Custom Domain
1. Go to Netlify dashboard → Site settings → Domain management
2. Add custom domain
3. Follow DNS configuration instructions

### Render Custom Domain
1. Go to Render dashboard → Your service → Settings → Custom Domains
2. Add your domain
3. Configure DNS records as shown

### Fly.io Custom Domain
1. Run: `fly certs add yourdomain.com`
2. Configure DNS as shown in output
3. Verify: `fly certs show yourdomain.com`

## Continuous Deployment

Both Netlify and Render automatically deploy on git push to main branch.

For Fly.io:
```bash
fly deploy  # Manual deployment
# OR set up GitHub Actions for automatic deployment
```

## Support

- **Netlify**: [Documentation](https://docs.netlify.com) | [Community](https://answers.netlify.com)
- **Render**: [Documentation](https://render.com/docs) | [Community](https://community.render.com)
- **Fly.io**: [Documentation](https://fly.io/docs) | [Community](https://community.fly.io)

## Security Notes

1. Never commit `.env` files to git
2. Use strong, unique secrets (min 32 characters)
3. Keep MongoDB Atlas IP whitelist minimal
4. Regularly rotate JWT secrets
5. Monitor backend logs for suspicious activity
6. Use HTTPS only (enforced by all platforms)
