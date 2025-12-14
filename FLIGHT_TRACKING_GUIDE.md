# Flight Tracking Implementation Guide

## Overview
This guide explains how HALO implements free flight tracking using multiple free-tier APIs and best practices.

## Free Flight Tracking APIs

### 1. **OpenSky Network** ⭐ (Recommended - Completely Free)
- **Cost**: 100% Free, no API key required
- **Rate Limits**: Unlimited requests (reasonable use)
- **Data Available**:
  - Real-time aircraft positions (latitude, longitude, altitude)
  - Velocity, heading, vertical rate
  - Aircraft registration (ICAO24)
  - Callsign (flight number)
  - Origin country
- **Limitations**:
  - Only active flights (currently in the air)
  - No historical data
  - No route information (departure/arrival airports)
  - No scheduled times
- **Best For**: Real-time position tracking for active flights

**API Endpoints:**
- `GET /states/all` - All currently active flights
- `GET /states/own` - Your own tracked flights (requires auth)
- `GET /flights/all` - Historical flights (requires auth, limited)

### 2. **AviationStack** (Free Tier)
- **Cost**: Free tier = 100 requests/month
- **Rate Limits**: 100 requests/month (free tier)
- **Data Available**:
  - Complete flight information (routes, schedules, delays)
  - Airport details (terminals, gates)
  - Airline information
  - Historical data
- **Limitations**:
  - Very limited free tier (100 requests/month)
  - No real-time position data
- **Best For**: Flight schedules, routes, and airport information

**Get Free API Key:**
1. Visit: https://aviationstack.com/
2. Sign up for free account
3. Get 100 free requests/month

### 3. **AirLabs** (Free Package)
- **Cost**: Free package available
- **Data Available**: Real-time flight status, schedules
- **Get Free API Key**: https://airlabs.co/

### 4. **Aviation Edge** (Free Package)
- **Cost**: Free package available
- **Data Available**: Flight tracking, schedules, routes
- **Get Free API Key**: https://aviation-edge.com/

## Current Implementation Strategy

### Hybrid Approach (Best for Free Tier)

```
┌─────────────────────────────────────────┐
│   Flight Tracking Request              │
└──────────────┬──────────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │  Check Cache First   │
    │  (5 min TTL)         │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │  Try OpenSky Network │
    │  (Free, Unlimited)   │
    └──────────┬───────────┘
               │
               ▼ (if not found)
    ┌──────────────────────┐
    │  Try AviationStack   │
    │  (100/month limit)    │
    └──────────┬───────────┘
               │
               ▼ (if not found)
    ┌──────────────────────┐
    │  Use Mock Data        │
    │  (Fallback)           │
    └──────────────────────┘
```

## Implementation Details

### 1. OpenSky Network Integration
- **Primary Source**: Use for all active flight tracking
- **Caching**: Cache results for 5 minutes to reduce API calls
- **Data Enhancement**: Combine with airport database for route estimation

### 2. AviationStack Integration
- **Secondary Source**: Use sparingly (100 requests/month limit)
- **When to Use**: 
  - When OpenSky doesn't have the flight (not currently active)
  - When you need complete route information
  - For scheduled flights (not yet departed)
- **Rate Limiting**: Track usage and warn when approaching limit

### 3. Caching Strategy
- **In-Memory Cache**: Store flight data for 5 minutes
- **Cache Key**: `flight:${flightNumber}:${date}`
- **Benefits**: 
  - Reduces API calls
  - Faster response times
  - Better user experience

### 4. Fallback Logic
1. Check cache first
2. Try OpenSky Network (for active flights)
3. Try AviationStack (for scheduled/completed flights)
4. Use mock data (for development/testing)

## Setup Instructions

### Step 1: OpenSky Network (No Setup Required)
OpenSky Network works out of the box - no API key needed!

### Step 2: AviationStack (Optional - for better data)
1. Visit https://aviationstack.com/
2. Sign up for free account
3. Get your API key
4. Add to `.env`:
   ```bash
   AVIATIONSTACK_API_KEY=your_api_key_here
   ```

### Step 3: AirLabs (Optional - Alternative)
1. Visit https://airlabs.co/
2. Sign up for free package
3. Get your API key
4. Add to `.env`:
   ```bash
   AIRLABS_API_KEY=your_api_key_here
   ```

## Usage Examples

### Track Active Flight (OpenSky)
```javascript
// Automatically uses OpenSky Network for active flights
const flightInfo = await flightTrackingService.getFlightInfo('LH456');
```

### Track Scheduled Flight (AviationStack)
```javascript
// Uses AviationStack for scheduled/completed flights
const flightInfo = await flightTrackingService.getFlightInfo('AI202');
```

### Get Airport Information
```javascript
const airportInfo = await flightTrackingService.getAirportInfo('BOM');
```

## Rate Limiting Best Practices

### OpenSky Network
- **No strict limits**, but be respectful
- Recommended: Max 1 request per flight per 5 minutes
- Use caching to minimize requests

### AviationStack
- **100 requests/month** (free tier)
- Track usage: `AVIATIONSTACK_REQUESTS_USED` in env
- Use only when necessary (scheduled flights, route info)

## Cost Optimization Tips

1. **Use OpenSky First**: Always try OpenSky before paid APIs
2. **Cache Aggressively**: Cache results for 5-10 minutes
3. **Batch Requests**: When possible, batch multiple flight lookups
4. **Monitor Usage**: Track API usage to avoid overages
5. **Smart Fallbacks**: Only use paid APIs when free options fail

## Future Enhancements

### When Upgrading to Paid Tier:
- **FlightAware**: Best real-time tracking ($50-200/month)
- **AviationStack Pro**: Unlimited requests ($99/month)
- **FlightRadar24 API**: Premium flight data ($200+/month)

### Features to Add:
- Real-time position updates on map
- Flight path visualization
- Delay predictions
- Weather integration
- Airport congestion data

## Troubleshooting

### Issue: "No flight found"
- **Cause**: Flight not currently active (OpenSky only shows active flights)
- **Solution**: Try AviationStack for scheduled flights

### Issue: "API rate limit exceeded"
- **Cause**: AviationStack free tier limit reached
- **Solution**: Wait for next month or upgrade to paid tier

### Issue: "Incomplete flight data"
- **Cause**: Using OpenSky (no route information)
- **Solution**: Combine with AviationStack or use mock data for missing fields

## API Response Examples

### OpenSky Network Response
```json
{
  "flightNumber": "LH456",
  "airline": "Lufthansa",
  "status": "in-flight",
  "live": true,
  "position": {
    "latitude": 50.1109,
    "longitude": 8.6821,
    "altitude": 35000
  },
  "source": "opensky-live"
}
```

### AviationStack Response
```json
{
  "flightNumber": "AI202",
  "airline": "Air India",
  "departure": {
    "airport": "Dubai International Airport",
    "iata": "DXB",
    "scheduled": "2024-12-05T10:00:00Z",
    "gate": "A12",
    "terminal": "T2"
  },
  "arrival": {
    "airport": "Mumbai Airport",
    "iata": "BOM",
    "scheduled": "2024-12-05T14:00:00Z"
  },
  "status": "scheduled",
  "source": "aviationstack"
}
```

## Support

For issues or questions:
- Check API documentation: https://openskynetwork.github.io/opensky-api/
- AviationStack docs: https://aviationstack.com/documentation
- Open an issue in the repository

