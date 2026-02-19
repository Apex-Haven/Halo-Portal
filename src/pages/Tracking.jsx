import React, { useState, useEffect } from 'react';
import { MapPin, Clock, User, Car, Phone, Navigation, CheckCircle, Circle, AlertCircle, Plane, Users, FileText, Truck, ChevronDown, Building2 } from 'lucide-react';
import LiveMap from '../components/LiveMap';
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';

const Tracking = () => {
  const { isDark } = useTheme()
  // Load search state from localStorage on mount
  const [trackingId, setTrackingId] = useState(() => {
    return localStorage.getItem('tracking_search_id') || '';
  });
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);
  const [estimatedArrival, setEstimatedArrival] = useState(null);
  const [trackingSteps, setTrackingSteps] = useState([]);
  const [locationUpdateInterval, setLocationUpdateInterval] = useState(null);
  
  // Accordion states
  const [accordions, setAccordions] = useState({
    transferDetails: true,
    completionStatus: true,
    trackingProgress: true,
    liveMap: true
  });

  const toggleAccordion = (key) => {
    setAccordions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Save search state to localStorage whenever it changes
  useEffect(() => {
    if (trackingId) {
      localStorage.setItem('tracking_search_id', trackingId);
    } else {
      localStorage.removeItem('tracking_search_id');
    }
  }, [trackingId]);

  // Build tracking steps from transfer state (aligned with completion flow: Traveler → Flight → Vendor → Driver → En route → Pickup → Drop → Completed)
  const buildTrackingStepsFromTransfer = (t) => {
    if (!t) return [];
    const hasTraveler = !!(t.traveler_details || t.traveler_id);
    const hasFlight = !!(t.flight_details?.flight_no && t.flight_details.flight_no !== 'XX000' && t.flight_details.flight_no !== 'TBD');
    const hasVendor = !!(t.vendor_details?.vendor_id || t.vendor_details?.vendor_name);
    const hasDriver = !!t.assigned_driver_details;
    const pickedUp = t.assigned_driver_details?.traveler_picked_up;
    const droppedOff = t.assigned_driver_details?.arrived_at_drop;
    const status = t.transfer_details?.transfer_status || t.transfer_details?.status || 'pending';

    const steps = [
      { id: 1, title: 'Transfer Created', description: 'Your transfer request has been received', status: 'completed', time: null },
      { id: 2, title: 'Traveler Assigned', description: hasTraveler ? `Traveler: ${t.traveler_details?.name || 'N/A'}` : 'Client needs to assign a traveler', status: hasTraveler ? 'completed' : 'pending', time: null },
      { id: 3, title: 'Flight Details', description: hasFlight ? `Flight ${t.flight_details?.flight_no || 'N/A'}` : 'Client needs to add flight information', status: hasFlight ? 'completed' : 'pending', time: null },
      { id: 4, title: 'Vendor Assigned', description: hasVendor ? `Vendor: ${t.vendor_details?.vendor_name || 'N/A'}` : 'Admin needs to assign a vendor', status: hasVendor ? 'completed' : 'pending', time: null },
      { id: 5, title: 'Driver Assigned', description: hasDriver ? `Driver: ${t.assigned_driver_details?.name || 'N/A'}` : 'Vendor needs to assign a driver', status: hasDriver ? 'completed' : 'pending', time: null },
      { id: 6, title: 'Driver En Route', description: 'Driver is on the way to pickup location', status: hasDriver && (status === 'enroute' || pickedUp) ? 'in_progress' : hasDriver ? 'pending' : 'pending', time: null },
      { id: 7, title: 'Traveler Pickup', description: 'Driver has picked up the traveler', status: pickedUp ? 'completed' : hasDriver ? 'pending' : 'pending', time: null },
      { id: 8, title: 'Transfer Completed', description: 'Traveler has been dropped off at destination', status: droppedOff ? 'completed' : 'pending', time: null }
    ];
    return steps;
  };

  const defaultSteps = [
    { id: 1, title: 'Transfer Created', description: 'Your transfer request has been received', status: 'completed', time: null },
    { id: 2, title: 'Traveler Assigned', description: 'Client needs to assign a traveler', status: 'pending', time: null },
    { id: 3, title: 'Flight Details', description: 'Client needs to add flight information', status: 'pending', time: null },
    { id: 4, title: 'Vendor Assigned', description: 'Admin needs to assign a vendor', status: 'pending', time: null },
    { id: 5, title: 'Driver Assigned', description: 'Vendor needs to assign a driver', status: 'pending', time: null },
    { id: 6, title: 'Driver En Route', description: 'Driver is on the way to pickup location', status: 'pending', time: null },
    { id: 7, title: 'Traveler Pickup', description: 'Driver has picked up the traveler', status: 'pending', time: null },
    { id: 8, title: 'Transfer Completed', description: 'Traveler has been dropped off at destination', status: 'pending', time: null }
  ];

  useEffect(() => {
    if (!transfer) setTrackingSteps(defaultSteps);
  }, []);

  // Poll for real-time location updates
  useEffect(() => {
    if (transfer?._id) {
      const fetchLocationUpdate = async () => {
        try {
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
          const token = localStorage.getItem('token');
          
          const headers = {
            'Content-Type': 'application/json'
          };
          
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(`${API_BASE_URL}/tracking/${transfer._id}`, { headers });
          const data = await response.json();

          if (data.success && data.data?.tracking?.driverLocation) {
            const newLocation = data.data.tracking.driverLocation;
            setDriverLocation({
              lat: newLocation.latitude,
              lng: newLocation.longitude,
              address: newLocation.address || '',
              timestamp: newLocation.timestamp
            });
            
            // Update transfer status if changed
            if (data.data.tracking.currentStatus) {
              setTransfer(prev => ({
                ...prev,
                transfer_details: {
                  ...prev.transfer_details,
                  transfer_status: data.data.tracking.currentStatus
                }
              }));
            }
            
            // Update progress steps from API or derive from transfer
            if (data.data.tracking.progressSteps && data.data.tracking.progressSteps.length > 0) {
              setTrackingSteps(data.data.tracking.progressSteps);
            } else if (data.data) {
              setTrackingSteps(buildTrackingStepsFromTransfer(data.data));
            }
          }
        } catch (error) {
          console.error('Error fetching location update:', error);
        }
      };

      // Fetch immediately
      fetchLocationUpdate();

      // Then poll every 10 seconds for real-time updates
      const interval = setInterval(fetchLocationUpdate, 10000);
      setLocationUpdateInterval(interval);
      
      return () => clearInterval(interval);
    }
  }, [transfer?._id]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (locationUpdateInterval) {
        clearInterval(locationUpdateInterval);
      }
    };
  }, [locationUpdateInterval]);

  const handleTrackTransfer = async () => {
    if (!trackingId.trim()) {
      toast.error('Please enter a tracking ID');
      return;
    }

    setLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
      const token = localStorage.getItem('token');
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/tracking/${trackingId}`, { headers });
      const data = await response.json();

      if (data.success) {
        // Store full transfer data including tracking
        setTransfer(data.data);
        
        // Use tracking data from API
        if (data.data.tracking) {
          if (data.data.tracking.driverLocation) {
            setDriverLocation({
              lat: data.data.tracking.driverLocation.latitude,
              lng: data.data.tracking.driverLocation.longitude,
              address: data.data.tracking.driverLocation.address || '',
              timestamp: data.data.tracking.driverLocation.timestamp
            });
          }
          
          if (data.data.tracking.estimatedArrival) {
            setEstimatedArrival(new Date(data.data.tracking.estimatedArrival));
          }
          
          if (data.data.tracking.progressSteps && data.data.tracking.progressSteps.length > 0) {
            setTrackingSteps(data.data.tracking.progressSteps);
          } else {
            setTrackingSteps(buildTrackingStepsFromTransfer(data.data));
          }
        } else {
          setTrackingSteps(buildTrackingStepsFromTransfer(data.data));
        }
        
        toast.success('Transfer found!');
      } else {
        const errorMsg = data.message || 'Transfer not found. Please check your ID or name and try again.';
        toast.error(errorMsg);
        setTransfer(null);
      }
    } catch (error) {
      console.error('Error tracking transfer:', error);
      toast.error('Unable to connect to tracking service. Please check your internet connection and try again.');
      setTransfer(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    const iconClass = status === 'completed' ? 'text-green-600 dark:text-green-400' :
                     status === 'in_progress' || status === 'enroute' ? 'text-blue-600 dark:text-blue-400' :
                     status === 'assigned' || status === 'waiting' ? 'text-amber-600 dark:text-amber-400' :
                     status === 'delayed' || status === 'cancelled' ? 'text-red-600 dark:text-red-400' :
                     'text-gray-500 dark:text-gray-400';
    switch (status) {
      case 'completed':
        return <CheckCircle size={22} className={iconClass} />;
      case 'in_progress':
      case 'enroute':
        return <Navigation size={22} className={iconClass} />;
      case 'assigned':
      case 'waiting':
        return <User size={22} className={iconClass} />;
      case 'pending':
        return <Circle size={22} className={iconClass} />;
      case 'delayed':
      case 'cancelled':
        return <AlertCircle size={22} className={iconClass} />;
      default:
        return <Circle size={22} className={iconClass} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-700 dark:text-green-400';
      case 'in_progress':
      case 'enroute': return 'text-blue-700 dark:text-blue-400';
      case 'pending': return 'text-foreground/80 dark:text-gray-300';
      case 'assigned':
      case 'waiting': return 'text-amber-700 dark:text-amber-400';
      case 'delayed':
      case 'cancelled': return 'text-red-700 dark:text-red-400';
      default: return 'text-foreground/80 dark:text-gray-300';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800/80';
      case 'in_progress':
      case 'enroute': return 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-700/80';
      case 'assigned':
      case 'waiting': return 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-700/80';
      case 'pending': return 'bg-muted/50 dark:bg-muted/30 border-border dark:border-border';
      case 'delayed':
      case 'cancelled': return 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/80';
      default: return 'bg-muted/50 dark:bg-muted/30 border-border dark:border-border';
    }
  };

  const getStatusDescription = (status) => {
    switch (status) {
      case 'completed': return 'Transfer completed successfully';
      case 'in_progress': return 'Driver is currently en route';
      case 'enroute': return 'Driver is on the way to pickup';
      case 'waiting': return 'Driver is waiting at pickup';
      case 'pending': return 'Waiting for driver assignment';
      case 'assigned': return 'Driver has been assigned and is preparing';
      case 'delayed': return 'Transfer is delayed';
      case 'cancelled': return 'This transfer was cancelled';
      default: return 'Status unknown';
    }
  };

  const formatTime = (date) => {
    return date ? new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : null;
  };

  const formatDateTime = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Track Your Transfer
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-base">
            Track your transfer using your Apex ID or name
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            No login required - just enter your Apex ID (e.g., APX123456) or your name below
          </p>
        </div>

      {/* Search Section */}
      <div className="bg-card rounded-xl p-4 md:p-6 shadow-sm border border-border mb-6 md:mb-8">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Transfer ID or Name
            </label>
            <input
              type="text"
              value={trackingId}
              onChange={(e) => {
                const value = e.target.value;
                // Auto-uppercase only if it looks like an APX ID
                if (value.match(/^APX\d*$/i)) {
                  setTrackingId(value.toUpperCase());
                } else {
                  setTrackingId(value);
                }
              }}
              placeholder="Enter your Apex ID (e.g., APX123456) or your name"
              className="w-full px-4 py-3 border border-input rounded-lg text-base outline-none transition-colors bg-background text-foreground focus:ring-2 focus:ring-ring"
              onKeyPress={(e) => e.key === 'Enter' && handleTrackTransfer()}
              autoFocus
            />
          </div>
          <button
            onClick={handleTrackTransfer}
            disabled={loading || !trackingId.trim()}
              className={`w-full md:w-auto md:self-end px-6 py-3 border-none rounded-lg text-base font-medium text-white flex items-center justify-center gap-2 transition-all flex-shrink-0 ${
              loading || !trackingId.trim()
                ? 'bg-muted cursor-not-allowed' 
                : 'bg-primary hover:bg-primary/90 cursor-pointer'
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin" />
                Tracking...
              </>
            ) : (
              <>
                <Navigation size={16} />
                Track Transfer
              </>
            )}
          </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter your Apex ID (e.g., APX123456) or your name as it appears in your booking
          </p>
        </div>
      </div>

      {transfer && (
        <div className="space-y-4">
          {/* Transfer Details Accordion */}
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <button
              onClick={() => toggleAccordion('transferDetails')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <h2 className="text-xl font-semibold text-foreground">
              Transfer Details
            </h2>
              <ChevronDown
                size={20}
                className={`text-muted-foreground transition-transform duration-200 ${
                  accordions.transferDetails ? 'transform rotate-180' : ''
                }`}
              />
            </button>
            {accordions.transferDetails && (
              <div className="px-6 pb-6 border-t border-border">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-5">
                  {/* Left column: Status, Trip, Flight, Traveler, Times */}
                  <div className="lg:col-span-2 space-y-5">
                    {/* Status + Reference ID */}
                    {(() => {
                      const status = transfer.transfer_details?.transfer_status || transfer.transfer_details?.status || 'pending';
                      return (
                        <div className={`${getStatusBg(status)} border rounded-xl p-4 flex items-center justify-between gap-4`}>
                          <div className="flex items-center gap-3 min-w-0">
                            {getStatusIcon(status)}
                            <div className="min-w-0">
                              <div className={`text-lg font-semibold capitalize ${getStatusColor(status)}`}>
                                {String(status).replace(/_/g, ' ')}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                                {getStatusDescription(status)}
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right pl-2 border-l border-border dark:border-gray-600">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Reference</div>
                            <div className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{transfer._id}</div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Trip: From → To */}
                    <div className="rounded-xl border border-border bg-muted/20 dark:bg-muted/10 p-4 space-y-4">
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide text-muted-foreground">Trip</h3>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                          <MapPin size={16} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Pickup</div>
                          <p className="text-base font-medium text-foreground">{transfer.transfer_details?.pickup_location || '—'}</p>
                        </div>
                      </div>
                      <div className="ml-4 border-l-2 border-border pl-5 py-1">
                        <div className="text-xs text-muted-foreground">to</div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                          <MapPin size={16} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Drop-off</div>
                          <p className="text-base font-medium text-foreground">{transfer.transfer_details?.drop_location || '—'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Flight (only when real flight) */}
                    {transfer.flight_details?.flight_no && transfer.flight_details.flight_no !== 'XX000' && transfer.flight_details.flight_no !== 'TBD' && (
                      <div className="rounded-xl border border-border bg-muted/20 dark:bg-muted/10 p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                          <Plane size={16} /> Flight
                        </h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Flight</span>
                            <p className="font-mono font-medium text-foreground">{transfer.flight_details.flight_no}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Airline</span>
                            <p className="font-medium text-foreground">{transfer.flight_details.airline || '—'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Route</span>
                            <p className="font-medium text-foreground">
                              {[transfer.flight_details.departure_airport, transfer.flight_details.arrival_airport].filter(Boolean).join(' → ') || '—'}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Arrival</span>
                            <p className="font-medium text-foreground">
                              {formatDateTime(transfer.flight_details.arrival_time) || formatTime(transfer.flight_details.arrival_time) || '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Traveler */}
                    {(transfer.traveler_details?.name || transfer.customer_details?.name) && (
                      <div className="rounded-xl border border-border bg-muted/20 dark:bg-muted/10 p-4">
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide text-muted-foreground flex items-center gap-2 mb-2">
                          <User size={16} /> Traveler
                        </h3>
                        <p className="text-base font-medium text-foreground">
                          {transfer.traveler_details?.name || transfer.customer_details?.name}
                        </p>
                      </div>
                    )}

                    {/* Scheduled & Estimated times (when flight exists) */}
                    {(transfer.flight_details?.flight_no && transfer.flight_details.flight_no !== 'XX000' && transfer.flight_details.flight_no !== 'TBD') && (
                      <div className="rounded-xl border border-border bg-muted/20 dark:bg-muted/10 p-4">
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide text-muted-foreground flex items-center gap-2 mb-3">
                          <Clock size={16} /> Pickup time
                        </h3>
                        <div className="flex flex-wrap gap-4">
                          <div>
                            <span className="text-xs text-muted-foreground block">Scheduled</span>
                            <span className="text-base font-medium text-foreground">
                              {formatDateTime(transfer.transfer_details?.estimated_pickup_time) || formatTime(transfer.transfer_details?.estimated_pickup_time || transfer.flight_details?.arrival_time) || '—'}
                            </span>
                          </div>
                          {estimatedArrival && (
                            <div>
                              <span className="text-xs text-muted-foreground block">Estimated arrival</span>
                              <span className="text-base font-medium text-primary">{formatTime(estimatedArrival)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right column: Driver */}
                  <div className="lg:col-span-1">
                    {transfer.assigned_driver_details ? (
                      <div className="rounded-xl border border-border bg-muted/20 dark:bg-muted/10 p-4 sticky top-4">
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide text-muted-foreground flex items-center gap-2 mb-4">
                          <Car size={16} /> Driver
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <span className="text-xs text-muted-foreground block mb-0.5">Name</span>
                            <p className="text-base font-medium text-foreground">
                              {transfer.assigned_driver_details.driver_name || transfer.assigned_driver_details.name || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block mb-0.5">Vehicle</span>
                            <p className="text-base text-foreground">
                              {transfer.assigned_driver_details.vehicle_type || 'N/A'}
                              {transfer.assigned_driver_details.vehicle_number && ` · ${transfer.assigned_driver_details.vehicle_number}`}
                            </p>
                          </div>
                          {(transfer.assigned_driver_details.driver_phone || transfer.assigned_driver_details.contact_number) && (
                            <div>
                              <span className="text-xs text-muted-foreground block mb-0.5">Contact</span>
                              <a
                                href={`tel:${transfer.assigned_driver_details.driver_phone || transfer.assigned_driver_details.contact_number}`}
                                className="text-base text-primary font-medium hover:underline"
                              >
                                {transfer.assigned_driver_details.driver_phone || transfer.assigned_driver_details.contact_number}
                              </a>
                            </div>
                          )}
                          {driverLocation?.address && (
                            <div>
                              <span className="text-xs text-muted-foreground block mb-0.5 flex items-center gap-1">
                                <Navigation size={12} /> Current location
                              </span>
                              <p className="text-sm text-foreground">{driverLocation.address}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border bg-muted/10 p-4 text-center">
                        <User size={24} className="mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Driver not assigned yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Completion Status Accordion */}
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <button
              onClick={() => toggleAccordion('completionStatus')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <h2 className="text-xl font-semibold text-foreground">
                Completion Status
              </h2>
              <ChevronDown
                size={20}
                className={`text-muted-foreground transition-transform duration-200 ${
                  accordions.completionStatus ? 'transform rotate-180' : ''
                }`}
              />
            </button>
            {accordions.completionStatus && (
              <div className="px-6 pb-6 border-t border-border pt-5">
          <p className="text-sm text-muted-foreground mb-5">
            Track what information still needs to be provided
          </p>
          
          <div className="space-y-4">
            {/* 1. Traveler Assignment (first) */}
            {(() => {
              const isCompleted = !!transfer.traveler_details || !!transfer.traveler_id;
              return (
                <div className={`flex items-start gap-3 p-4 rounded-lg border-2 ${
                  isCompleted 
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                    : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
                }`}>
                  <div className="flex-shrink-0 mt-0.5">
                    {isCompleted ? (
                      <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <User size={16} className={isCompleted ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'} />
                      <h3 className="font-semibold text-foreground">Traveler Assignment</h3>
                      <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${
                        isCompleted 
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                      }`}>
                        {isCompleted ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isCompleted 
                        ? `Traveler: ${transfer.traveler_details?.name || 'N/A'} - ${transfer.traveler_details?.email || 'N/A'}`
                        : 'Client needs to assign a traveler'}
                    </p>
                    {!isCompleted && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Action required by: <span className="font-semibold">Client</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 2. Flight Details (second) */}
            {(() => {
              const isCompleted = transfer.flight_details?.flight_no && 
                                  transfer.flight_details?.flight_no !== 'XX000' &&
                                  transfer.flight_details?.flight_no !== 'TBD';
              return (
                <div className={`flex items-start gap-3 p-4 rounded-lg border-2 ${
                  isCompleted 
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                    : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
                }`}>
                  <div className="flex-shrink-0 mt-0.5">
                    {isCompleted ? (
                      <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Plane size={16} className={isCompleted ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'} />
                      <h3 className="font-semibold text-foreground">Flight Details</h3>
                      <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${
                        isCompleted 
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                      }`}>
                        {isCompleted ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isCompleted 
                        ? `Flight ${transfer.flight_details.flight_no} - ${transfer.flight_details.airline || 'N/A'}`
                        : 'Client needs to provide flight information'}
                    </p>
                    {!isCompleted && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Action required by: <span className="font-semibold">Client</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 3. Vendor Assignment (third) */}
            {(() => {
              const isCompleted = !!(transfer.vendor_details?.vendor_id || transfer.vendor_details?.vendor_name);
              return (
                <div className={`flex items-start gap-3 p-4 rounded-lg border-2 ${
                  isCompleted 
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                    : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
                }`}>
                  <div className="flex-shrink-0 mt-0.5">
                    {isCompleted ? (
                      <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 size={16} className={isCompleted ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'} />
                      <h3 className="font-semibold text-foreground">Vendor Assignment</h3>
                      <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${
                        isCompleted 
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                      }`}>
                        {isCompleted ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isCompleted 
                        ? `Vendor: ${transfer.vendor_details.vendor_name || 'N/A'}`
                        : 'Admin needs to assign a vendor'}
                    </p>
                    {!isCompleted && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Action required by: <span className="font-semibold">Admin</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 4. Driver Assignment (fourth) */}
            {(() => {
              const isCompleted = !!transfer.assigned_driver_details;
              return (
                <div className={`flex items-start gap-3 p-4 rounded-lg border-2 ${
                  isCompleted 
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                    : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
                }`}>
                  <div className="flex-shrink-0 mt-0.5">
                    {isCompleted ? (
                      <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Car size={16} className={isCompleted ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'} />
                      <h3 className="font-semibold text-foreground">Driver Assignment</h3>
                      <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${
                        isCompleted 
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                      }`}>
                        {isCompleted ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isCompleted 
                        ? `Driver: ${transfer.assigned_driver_details.name || transfer.assigned_driver_details.driver_name || 'N/A'} - ${transfer.assigned_driver_details.vehicle_type || 'N/A'}`
                        : 'Vendor needs to assign a driver'}
                    </p>
                    {!isCompleted && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Action required by: <span className="font-semibold">Vendor ({transfer.vendor_details?.vendor_name || 'N/A'})</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Traveler Pickup Status */}
            {transfer.assigned_driver_details && (() => {
              const isCompleted = transfer.assigned_driver_details.traveler_picked_up;
              const pickupTime = transfer.assigned_driver_details.pickup_time;
              return (
                <div className={`flex items-start gap-3 p-4 rounded-lg border-2 ${
                  isCompleted 
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                    : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
                }`}>
                  <div className="flex-shrink-0 mt-0.5">
                    {isCompleted ? (
                      <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Users size={16} className={isCompleted ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'} />
                      <h3 className="font-semibold text-foreground">Traveler Pickup</h3>
                      <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${
                        isCompleted 
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                      }`}>
                        {isCompleted ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isCompleted 
                        ? `Traveler picked up at ${pickupTime ? new Date(pickupTime).toLocaleString() : 'N/A'}`
                        : 'Driver needs to confirm traveler pickup'}
                    </p>
                    {!isCompleted && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Action required by: <span className="font-semibold">Driver ({transfer.assigned_driver_details.name || 'N/A'})</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Drop-off Status */}
            {transfer.assigned_driver_details && (() => {
              const isCompleted = transfer.assigned_driver_details.arrived_at_drop;
              const dropTime = transfer.assigned_driver_details.drop_time;
              return (
                <div className={`flex items-start gap-3 p-4 rounded-lg border-2 ${
                  isCompleted 
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                    : 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800'
                }`}>
                  <div className="flex-shrink-0 mt-0.5">
                    {isCompleted ? (
                      <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <Circle size={20} className="text-gray-400 dark:text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin size={16} className={isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-400'} />
                      <h3 className="font-semibold text-foreground">Drop-off Confirmation</h3>
                      <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${
                        isCompleted 
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {isCompleted ? 'Completed' : 'In Progress'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isCompleted 
                        ? `Traveler dropped off at ${dropTime ? new Date(dropTime).toLocaleString() : 'N/A'}`
                        : 'Waiting for driver to complete drop-off'}
                    </p>
                    {!isCompleted && transfer.assigned_driver_details.traveler_picked_up && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Action required by: <span className="font-semibold">Driver ({transfer.assigned_driver_details.name || 'N/A'})</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Overall Progress Bar (4 steps: Traveler, Flight, Vendor, Driver) */}
            {(() => {
              const travelerCompleted = !!transfer.traveler_details || !!transfer.traveler_id;
              const flightCompleted = transfer.flight_details?.flight_no && transfer.flight_details?.flight_no !== 'XX000' && transfer.flight_details?.flight_no !== 'TBD';
              const vendorCompleted = !!(transfer.vendor_details?.vendor_id || transfer.vendor_details?.vendor_name);
              const driverCompleted = !!transfer.assigned_driver_details;
              
              const completedCount = [travelerCompleted, flightCompleted, vendorCompleted, driverCompleted].filter(Boolean).length;
              const totalRequired = 4;
              const percentage = (completedCount / totalRequired) * 100;
              
              return (
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Overall Progress</span>
                    <span className="text-sm font-bold text-primary">{completedCount}/{totalRequired} Complete</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-green-500 transition-all duration-500 ease-out"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    {percentage === 100 ? (
                      <span className="text-green-600 dark:text-green-400 font-semibold">All required information provided! ✓</span>
                    ) : (
                      `${Math.round(percentage)}% of required information provided`
                    )}
                  </p>
                </div>
              );
            })()}
          </div>
              </div>
            )}
          </div>

          {/* Tracking Progress Accordion */}
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <button
              onClick={() => toggleAccordion('trackingProgress')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <h2 className="text-xl font-semibold text-foreground">
            Tracking Progress
          </h2>
              <ChevronDown
                size={20}
                className={`text-muted-foreground transition-transform duration-200 ${
                  accordions.trackingProgress ? 'transform rotate-180' : ''
                }`}
              />
            </button>
            {accordions.trackingProgress && (
              <div className="px-6 pb-6 border-t border-border pt-5">
          
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute left-[10px] top-5 bottom-5 w-0.5 bg-border" />
            
            {trackingSteps.map((step, index) => (
              <div key={step.id} className="flex items-start mb-6">
                <div className="mr-4 mt-0.5">
                  {getStatusIcon(step.status)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-base font-medium text-foreground m-0">
                      {step.title}
                    </h3>
                    {step.time && (
                      <span className="text-sm text-muted-foreground">
                        {step.time}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground m-0">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
          </div>

          {/* Live Map Accordion */}
          {driverLocation && (
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              <button
                onClick={() => toggleAccordion('liveMap')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <h2 className="text-xl font-semibold text-foreground">
            Live Map
          </h2>
                <ChevronDown
                  size={20}
                  className={`text-muted-foreground transition-transform duration-200 ${
                    accordions.liveMap ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
              {accordions.liveMap && (
                <div className="px-6 pb-6 border-t border-border pt-5">
          <LiveMap
            transfer={transfer}
            driverLocation={driverLocation}
            estimatedArrival={estimatedArrival}
            routeHistory={transfer?.tracking?.routeHistory || []}
          />
                </div>
              )}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default Tracking;
