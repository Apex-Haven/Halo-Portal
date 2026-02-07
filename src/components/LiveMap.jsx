import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, LoadScript, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { MapPin, Navigation, Clock, Car, Plane } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '12px'
};

const defaultCenter = {
  lat: 19.0760, // Mumbai
  lng: 72.8777
};

const LiveMap = ({ transfer, driverLocation, estimatedArrival, routeHistory }) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [center, setCenter] = useState(defaultCenter);
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropLocation, setDropLocation] = useState(null);
  const [airportLocation, setAirportLocation] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [routeSegments, setRouteSegments] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const mapRef = useRef(null);
  
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  
  const transferStatus = transfer?.transfer_details?.transfer_status || transfer?.transfer_details?.status || 'pending';

  useEffect(() => {
    // Set center based on available locations
    if (pickupLocation) {
      setCenter({
        lat: pickupLocation.lat,
        lng: pickupLocation.lng
      });
    } else if (dropLocation) {
      setCenter({
        lat: dropLocation.lat,
        lng: dropLocation.lng
      });
    } else if (driverLocation) {
      setCenter({
        lat: driverLocation.lat,
        lng: driverLocation.lng
      });
    }
  }, [driverLocation, pickupLocation, dropLocation]);

  // Geocode addresses to coordinates
  useEffect(() => {
    const geocodeAddress = async (address) => {
      if (!googleMapsApiKey || !address) return null;
      
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleMapsApiKey}`
        );
        const data = await response.json();
        
        if (data.status === 'OK' && data.results.length > 0) {
          const location = data.results[0].geometry.location;
          return {
            lat: location.lat,
            lng: location.lng,
            address: data.results[0].formatted_address
          };
        }
        return null;
      } catch (error) {
        console.error('Geocoding error:', error);
        return null;
      }
    };

    const loadLocations = async () => {
      if (!transfer) return;

      // Geocode pickup location
      if (transfer.transfer_details?.pickup_location) {
        const pickup = await geocodeAddress(transfer.transfer_details.pickup_location);
        if (pickup) {
          setPickupLocation(pickup);
        }
      }

      // Geocode drop location
      if (transfer.transfer_details?.drop_location) {
        const drop = await geocodeAddress(transfer.transfer_details.drop_location);
        if (drop) {
          setDropLocation(drop);
        }
      }

      // Geocode airport/arrival location from flight details
      if (transfer.flight_details?.arrival_airport) {
        const airportCode = transfer.flight_details.arrival_airport;
        const airportName = `${airportCode} Airport`;
        const airport = await geocodeAddress(airportName);
        if (airport) {
          setAirportLocation(airport);
        }
      }
    };

    if (transfer && googleMapsApiKey) {
      loadLocations();
    }
  }, [transfer, googleMapsApiKey]);

  // Build route segments based on transfer status/progress
  useEffect(() => {
    const segments = [];
    
    // Determine what's completed based on transfer status
    const isFlightArrived = ['assigned', 'enroute', 'waiting', 'in_progress', 'completed'].includes(transferStatus);
    const isPickupReached = ['waiting', 'in_progress', 'completed'].includes(transferStatus);
    const isTransferStarted = ['in_progress', 'completed'].includes(transferStatus);
    const isTransferCompleted = transferStatus === 'completed';

    // Segment 1: Airport to Pickup (if flight has arrived)
    if (airportLocation && pickupLocation) {
      segments.push({
        path: [
          { lat: airportLocation.lat, lng: airportLocation.lng },
          { lat: pickupLocation.lat, lng: pickupLocation.lng }
        ],
        completed: isFlightArrived,
        label: 'Flight → Pickup'
      });
    }

    // Segment 2: Pickup to Drop (if pickup reached)
    if (pickupLocation && dropLocation) {
      segments.push({
        path: [
          { lat: pickupLocation.lat, lng: pickupLocation.lng },
          { lat: dropLocation.lat, lng: dropLocation.lng }
        ],
        completed: isPickupReached,
        started: isTransferStarted,
        label: 'Pickup → Drop'
      });
    }

    // If driver location exists, show current position
    if (driverLocation) {
      if (pickupLocation && !isPickupReached) {
        // Driver heading to pickup
        segments.push({
          path: [
            { lat: driverLocation.lat, lng: driverLocation.lng },
            { lat: pickupLocation.lat, lng: pickupLocation.lng }
          ],
          completed: false,
          isCurrentLocation: true,
          label: 'Driver → Pickup'
        });
      } else if (dropLocation && isPickupReached && !isTransferCompleted) {
        // Driver heading to drop
        segments.push({
          path: [
            { lat: driverLocation.lat, lng: driverLocation.lng },
            { lat: dropLocation.lat, lng: dropLocation.lng }
          ],
          completed: isTransferStarted,
          isCurrentLocation: true,
          label: 'Driver → Drop'
        });
      }
    }

    setRouteSegments(segments);
  }, [airportLocation, pickupLocation, dropLocation, driverLocation, transferStatus]);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    setMapLoaded(true);
    
    // Fit bounds to show all markers
    const locations = [];
    if (driverLocation) locations.push({ lat: driverLocation.lat, lng: driverLocation.lng });
    if (airportLocation) locations.push({ lat: airportLocation.lat, lng: airportLocation.lng });
    if (pickupLocation) locations.push({ lat: pickupLocation.lat, lng: pickupLocation.lng });
    if (dropLocation) locations.push({ lat: dropLocation.lat, lng: dropLocation.lng });
    
    if (locations.length > 0 && window.google?.maps) {
      const bounds = new window.google.maps.LatLngBounds();
      locations.forEach(loc => bounds.extend(loc));
      
      if (bounds.isEmpty() === false) {
        map.fitBounds(bounds);
        // Add some padding
        const currentZoom = map.getZoom();
        map.setZoom(currentZoom > 15 ? currentZoom - 1 : currentZoom);
      }
    }
  }, [driverLocation, airportLocation, pickupLocation, dropLocation]);

  const getDistance = (loc1, loc2) => {
    if (!loc1 || !loc2) return 'Calculating...';
    
    const R = 6371; // Earth's radius in km
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLon = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance < 1 ? `${(distance * 1000).toFixed(0)} m` : `${distance.toFixed(2)} km`;
  };

  const getETA = () => {
    if (!estimatedArrival) return 'Calculating...';
    
    const now = new Date();
    const arrival = new Date(estimatedArrival);
    const diffMinutes = Math.ceil((arrival - now) / (1000 * 60));
    
    if (diffMinutes <= 0) return 'Arriving now';
    if (diffMinutes === 1) return '1 minute';
    return `${diffMinutes} minutes`;
  };

  const getStatusColor = () => {
    switch (transferStatus) {
      case 'completed': return '#059669';
      case 'in_progress': return '#2563eb';
      case 'waiting': return '#f59e0b';
      case 'enroute': return '#3b82f6';
      case 'assigned': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  // Custom marker icons (will be set after Google Maps loads)
  const [driverIcon, setDriverIcon] = useState(null);
  const [pickupIcon, setPickupIcon] = useState(null);
  const [dropIcon, setDropIcon] = useState(null);
  const [airportIcon, setAirportIcon] = useState(null);

  // Initialize icons after map loads
  useEffect(() => {
    if (window.google?.maps?.SymbolPath) {
      setDriverIcon({
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#2563eb',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      });

      setPickupIcon({
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="#059669" stroke="white" stroke-width="3"/>
            <path d="M16 10 L16 22 M10 16 L22 16" stroke="white" stroke-width="2"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(32, 32),
        anchor: new window.google.maps.Point(16, 16)
      });

      setDropIcon({
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="#f59e0b" stroke="white" stroke-width="3"/>
            <path d="M16 12 L16 20 M12 16 L20 16" stroke="white" stroke-width="2"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(32, 32),
        anchor: new window.google.maps.Point(16, 16)
      });

      setAirportIcon({
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="#3b82f6" stroke="white" stroke-width="3"/>
            <path d="M16 8 L20 16 L16 18 L12 16 Z" fill="white"/>
            <path d="M16 18 L16 24" stroke="white" stroke-width="2"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(32, 32),
        anchor: new window.google.maps.Point(16, 16)
      });
    }
  }, [mapLoaded]);

  const handleLoadError = useCallback((error) => {
    console.error('Google Maps load error:', error);
    setLoadError(error);
  }, []);

  // Check if API key is placeholder or missing
  if (googleMapsApiKey === 'your_google_maps_api_key_here' || !googleMapsApiKey || googleMapsApiKey.trim() === '') {
    return (
      <div style={{
        height: '400px',
        backgroundColor: '#f3f4f6',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px dashed #d1d5db',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          <MapPin size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <p style={{ fontSize: '16px', fontWeight: '500', margin: 0, marginBottom: '8px' }}>
            Google Maps API Key Required
          </p>
          <p style={{ fontSize: '14px', margin: 0, color: '#9ca3af', marginBottom: '12px' }}>
            To enable the live map, add your Google Maps API key:
          </p>
          <ol style={{ textAlign: 'left', fontSize: '12px', color: '#6b7280', paddingLeft: '20px', maxWidth: '400px', margin: '0 auto' }}>
            <li style={{ marginBottom: '8px' }}>Get a key from <a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>Google Cloud Console</a></li>
            <li style={{ marginBottom: '8px' }}>Enable <strong>Maps JavaScript API</strong> and <strong>Geocoding API</strong></li>
            <li style={{ marginBottom: '8px' }}>Add <code style={{ backgroundColor: '#e5e7eb', padding: '2px 6px', borderRadius: '4px' }}>VITE_GOOGLE_MAPS_API_KEY=your_key_here</code> to <code style={{ backgroundColor: '#e5e7eb', padding: '2px 6px', borderRadius: '4px' }}>halo-portal/.env</code></li>
            <li>Restart the frontend server</li>
          </ol>
        </div>
      </div>
    );
  }

  // Show error if Google Maps failed to load
  if (loadError) {
    return (
      <div style={{
        height: '400px',
        backgroundColor: '#fef2f2',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px dashed #fecaca',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ textAlign: 'center', color: '#dc2626' }}>
          <MapPin size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <p style={{ fontSize: '16px', fontWeight: '500', margin: 0, marginBottom: '8px' }}>
            Failed to Load Google Maps
          </p>
          <p style={{ fontSize: '14px', margin: 0, color: '#991b1b' }}>
            Please check your API key and ensure the required APIs are enabled.
          </p>
        </div>
      </div>
    );
  }

  return (
    <LoadScript 
      googleMapsApiKey={googleMapsApiKey} 
      onError={handleLoadError}
      loadingElement={
        <div style={{
          height: '400px',
          backgroundColor: '#f3f4f6',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center', color: '#6b7280' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e5e7eb',
              borderTop: '3px solid #2563eb',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <p style={{ fontSize: '16px', fontWeight: '500', margin: 0 }}>
              Loading Live Map...
            </p>
          </div>
        </div>
      }
    >
      <div style={{ position: 'relative' }}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={13}
          onLoad={onMapLoad}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          }}
        >
          {/* Route Segments with Progress Indicators */}
          {routeSegments.map((segment, index) => (
            <Polyline
              key={index}
              path={segment.path}
              options={{
                strokeColor: segment.completed ? '#059669' : segment.isCurrentLocation ? '#2563eb' : '#9ca3af',
                strokeOpacity: segment.completed ? 0.8 : segment.isCurrentLocation ? 0.9 : 0.4,
                strokeWeight: segment.completed || segment.isCurrentLocation ? 4 : 3,
                geodesic: true,
                zIndex: segment.completed ? 2 : 1,
                icons: (window.google?.maps?.SymbolPath?.FORWARD_CLOSED_ARROW) ? [{
                  icon: {
                    path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: segment.completed ? 5 : 3,
                    strokeColor: segment.completed ? '#059669' : segment.isCurrentLocation ? '#2563eb' : '#9ca3af',
                    fillColor: segment.completed ? '#059669' : segment.isCurrentLocation ? '#2563eb' : '#9ca3af',
                    fillOpacity: segment.completed ? 0.8 : segment.isCurrentLocation ? 0.9 : 0.4
                  },
                  offset: segment.completed ? '100%' : '50%',
                  repeat: segment.completed ? '80px' : '120px'
                }] : []
              }}
            />
          ))}

          {/* Airport/Flight Arrival Marker */}
          {airportLocation && airportIcon && (
            <Marker
              position={{ lat: airportLocation.lat, lng: airportLocation.lng }}
              icon={airportIcon}
              title="Flight Arrival"
              onClick={() => setSelectedMarker('airport')}
            />
          )}

          {/* Driver Location Marker (Optional) */}
          {driverLocation && driverIcon && (
            <Marker
              position={{ lat: driverLocation.lat, lng: driverLocation.lng }}
              icon={driverIcon}
              title="Driver Location"
              onClick={() => setSelectedMarker('driver')}
            />
          )}

          {/* Pickup Location Marker */}
          {pickupLocation && pickupIcon && (
            <Marker
              position={{ lat: pickupLocation.lat, lng: pickupLocation.lng }}
              icon={pickupIcon}
              title="Pickup Location"
              onClick={() => setSelectedMarker('pickup')}
            />
          )}

          {/* Drop Location Marker */}
          {dropLocation && dropIcon && (
            <Marker
              position={{ lat: dropLocation.lat, lng: dropLocation.lng }}
              icon={dropIcon}
              title="Drop Location"
              onClick={() => setSelectedMarker('drop')}
            />
          )}

          {/* Info Windows */}
          {selectedMarker === 'airport' && airportLocation && (
            <InfoWindow
              position={{ lat: airportLocation.lat, lng: airportLocation.lng }}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div style={{ padding: '8px', minWidth: '200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Plane size={16} color="#3b82f6" />
                  <strong style={{ fontSize: '14px' }}>Flight Arrival</strong>
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0' }}>
                  {transfer.flight_details?.flight_no || 'N/A'} - {transfer.flight_details?.airline || 'N/A'}
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0' }}>
                  {airportLocation.address || transfer.flight_details?.arrival_airport}
                </p>
                {transfer.flight_details?.arrival_time && (
                  <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0 0' }}>
                    Arrival: {new Date(transfer.flight_details.arrival_time).toLocaleString()}
                  </p>
                )}
              </div>
            </InfoWindow>
          )}

          {selectedMarker === 'driver' && driverLocation && (
            <InfoWindow
              position={{ lat: driverLocation.lat, lng: driverLocation.lng }}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div style={{ padding: '8px', minWidth: '200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Car size={16} color="#2563eb" />
                  <strong style={{ fontSize: '14px' }}>Driver Location</strong>
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0' }}>
                  {driverLocation.address || 'Current Location'}
                </p>
                {driverLocation.timestamp && (
                  <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0 0' }}>
                    Updated: {new Date(driverLocation.timestamp).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </InfoWindow>
          )}

          {selectedMarker === 'pickup' && pickupLocation && (
            <InfoWindow
              position={{ lat: pickupLocation.lat, lng: pickupLocation.lng }}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div style={{ padding: '8px', minWidth: '200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <MapPin size={16} color="#059669" />
                  <strong style={{ fontSize: '14px' }}>Pickup Location</strong>
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0' }}>
                  {pickupLocation.address || transfer.transfer_details?.pickup_location}
                </p>
                {estimatedArrival && (
                  <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0 0' }}>
                    ETA: {getETA()}
                  </p>
                )}
              </div>
            </InfoWindow>
          )}

          {selectedMarker === 'drop' && dropLocation && (
            <InfoWindow
              position={{ lat: dropLocation.lat, lng: dropLocation.lng }}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div style={{ padding: '8px', minWidth: '200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <MapPin size={16} color="#f59e0b" />
                  <strong style={{ fontSize: '14px' }}>Drop Location</strong>
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0' }}>
                  {dropLocation.address || transfer.transfer_details?.drop_location}
                </p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>

        {/* Map Info Overlay */}
        <div className="absolute top-4 left-4 bg-card border border-border p-3 rounded-lg shadow-lg z-10 flex gap-6 items-center">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-gray-500 dark:text-gray-400" />
            <div>
              <div className="text-[11px] text-gray-400 dark:text-gray-500 mb-0.5">Status</div>
              <div className="text-sm font-semibold" style={{ color: getStatusColor() }}>
                {transferStatus.replace('_', ' ').toUpperCase()}
              </div>
            </div>
          </div>
          {pickupLocation && dropLocation && (
            <div className="flex items-center gap-2">
              <Navigation size={16} className="text-gray-500 dark:text-gray-400" />
              <div>
                <div className="text-[11px] text-gray-400 dark:text-gray-500 mb-0.5">Total Distance</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {getDistance(pickupLocation, dropLocation)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-card border border-border p-3 rounded-lg shadow-lg z-10 text-xs">
          <div className="mb-2 font-semibold text-gray-900 dark:text-white">Legend</div>
          <div className="flex flex-col gap-1.5">
            {airportLocation && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                <span className="text-gray-500 dark:text-gray-400">Flight Arrival</span>
              </div>
            )}
            {driverLocation && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-gray-500 dark:text-gray-400">Driver</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-600"></div>
              <span className="text-gray-500 dark:text-gray-400">Pickup</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-gray-500 dark:text-gray-400">Drop</span>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-0.5 bg-green-600 rounded"></div>
                <span className="text-gray-500 dark:text-gray-400 text-[11px]">Completed Route</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-0.5 bg-blue-600 rounded"></div>
                <span className="text-gray-500 dark:text-gray-400 text-[11px]">Current Route</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-0.5 bg-gray-400 dark:bg-gray-600 rounded"></div>
                <span className="text-gray-500 dark:text-gray-400 text-[11px]">Pending Route</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </LoadScript>
  );
};

export default LiveMap;
