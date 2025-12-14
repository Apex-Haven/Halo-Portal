#!/bin/bash

# HALO Deployment Verification Script
# This script verifies that the deployment is working correctly

echo "🔍 HALO Deployment Verification"
echo "==============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if URLs are provided
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: $0 <backend-url> <frontend-url>"
    echo "Example: $0 https://halo-backend.onrender.com https://halo-app.netlify.app"
    echo "         $0 https://halo-backend.fly.dev https://halo-app.netlify.app"
    echo ""
    echo "Note: Backend can be on Render or Fly.io, frontend should be on Netlify"
    exit 1
fi

BACKEND_URL=$1
FRONTEND_URL=$2

echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""

# Test backend health endpoint
echo "1. Testing backend health endpoint..."
HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/api/health")
if [ $? -eq 0 ]; then
    if echo "$HEALTH_RESPONSE" | grep -q "OK"; then
        echo -e "${GREEN}✅ Backend health check passed${NC}"
        echo "   Response: $HEALTH_RESPONSE"
    else
        echo -e "${RED}❌ Backend health check failed${NC}"
        echo "   Response: $HEALTH_RESPONSE"
    fi
else
    echo -e "${RED}❌ Failed to connect to backend${NC}"
fi
echo ""

# Test frontend accessibility
echo "2. Testing frontend accessibility..."
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Frontend is accessible${NC}"
    echo "   HTTP Status: $FRONTEND_RESPONSE"
else
    echo -e "${RED}❌ Frontend is not accessible${NC}"
    echo "   HTTP Status: $FRONTEND_RESPONSE"
fi
echo ""

# Test CORS (if backend allows it)
echo "3. Testing CORS configuration..."
CORS_RESPONSE=$(curl -s -H "Origin: $FRONTEND_URL" -H "Access-Control-Request-Method: GET" -X OPTIONS "$BACKEND_URL/api/health" -w "\n%{http_code}")
if echo "$CORS_RESPONSE" | grep -q "200\|204"; then
    echo -e "${GREEN}✅ CORS appears to be configured${NC}"
else
    echo -e "${YELLOW}⚠️  CORS check inconclusive (may need manual verification)${NC}"
fi
echo ""

# Test API endpoint
echo "4. Testing API endpoint..."
API_RESPONSE=$(curl -s "$BACKEND_URL/api" 2>&1)
if [ $? -eq 0 ]; then
    if echo "$API_RESPONSE" | grep -q "Route not found\|404"; then
        echo -e "${GREEN}✅ API endpoint is responding (404 is expected for root)${NC}"
    else
        echo -e "${YELLOW}⚠️  API endpoint response: $API_RESPONSE${NC}"
    fi
else
    echo -e "${RED}❌ Failed to connect to API${NC}"
fi
echo ""

echo "==============================="
echo "Verification complete!"
echo ""
echo "Next steps:"
echo "1. Open $FRONTEND_URL in your browser"
echo "2. Try logging in with: admin@halo.com / admin123"
echo "3. Check browser console for any errors"
echo "4. Check Render/Fly.io and Netlify logs for any issues"
echo ""

