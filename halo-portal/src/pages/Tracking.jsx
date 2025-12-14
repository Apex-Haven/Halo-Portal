import React, { useState, useEffect } from 'react';
import { MapPin, Clock, User, Car, Phone, Navigation, CheckCircle, Circle, AlertCircle, Plane, Users, FileText, Truck, ChevronDown } from 'lucide-react';
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

  // Mock tracking steps for demonstration
  const defaultSteps = [
    { id: 1, title: 'Transfer Requested', description: 'Your transfer request has been received', status: 'completed', time: '10:00 AM' },
    { id: 2, title: 'Driver Assigned', description: 'Driver has been assigned to your transfer', status: 'completed', time: '10:05 AM' },
    { id: 3, title: 'Driver En Route', description: 'Driver is on the way to pickup location', status: 'in_progress', time: '10:15 AM' },
    { id: 4, title: 'Arrived at Pickup', description: 'Driver has arrived at pickup location', status: 'pending', time: null },
    { id: 5, title: 'Transfer Started', description: 'Transfer has begun', status: 'pending', time: null },
    { id: 6, title: 'Transfer Completed', description: 'You have reached your destination', status: 'pending', time: null }
  ];

  useEffect(() => {
    setTrackingSteps(defaultSteps);
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
            
            // Update progress steps if available
            if (data.data.tracking.progressSteps) {
              setTrackingSteps(data.data.tracking.progressSteps);
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
          
          if (data.data.tracking.progressSteps) {
            setTrackingSteps(data.data.tracking.progressSteps);
          }
        }
        
        toast.success('Transfer found!');
      } else {
        const errorMsg = data.message || 'Transfer not found. Please check your APX ID and try again.';
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
    const iconClass = status === 'completed' ? 'text-success-600 dark:text-success-500' :
                     status === 'in_progress' ? 'text-primary-600 dark:text-primary-400' :
                     status === 'assigned' ? 'text-warning-600 dark:text-warning-500' :
                     status === 'delayed' ? 'text-danger-600 dark:text-danger-500' :
                     'text-muted-foreground';
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} className={iconClass} />;
      case 'in_progress':
        return <Navigation size={20} className={iconClass} />;
      case 'assigned':
        return <User size={20} className={iconClass} />;
      case 'pending':
        return <Circle size={20} className={iconClass} />;
      case 'delayed':
        return <AlertCircle size={20} className={iconClass} />;
      default:
        return <Circle size={20} className="text-muted-foreground" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-success-600 dark:text-success-500';
      case 'in_progress': return 'text-primary-600 dark:text-primary-400';
      case 'pending': return 'text-muted-foreground';
      case 'assigned': return 'text-warning-600 dark:text-warning-500';
      case 'delayed': return 'text-danger-600 dark:text-danger-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'completed': return 'bg-success-50 dark:bg-success-950 border-success-200 dark:border-success-800';
      case 'in_progress': return 'bg-primary-50 dark:bg-primary-950 border-primary-300 dark:border-primary-700';
      case 'assigned': return 'bg-warning-50 dark:bg-warning-950 border-warning-200 dark:border-warning-800';
      case 'pending': return 'bg-muted border-border';
      case 'delayed': return 'bg-danger-50 dark:bg-danger-950 border-danger-200 dark:border-danger-800';
      default: return 'bg-muted border-border';
    }
  };

  const getStatusDescription = (status) => {
    switch (status) {
      case 'completed': return 'Transfer completed successfully';
      case 'in_progress': return 'Driver is currently en route';
      case 'pending': return 'Waiting for driver assignment';
      case 'assigned': return 'Driver has been assigned and is preparing';
      case 'delayed': return 'Transfer is delayed';
      default: return 'Status unknown';
    }
  };

  const formatTime = (date) => {
    return date ? new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    }) : null;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1200px] mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-6 md:mb-8 text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Track Your Transfer
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Enter your APX transfer ID (e.g., APX123456) to track your ride in real-time
          </p>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            No login required - just enter your transfer ID below
          </p>
        </div>

      {/* Search Section */}
      <div className="bg-card rounded-xl p-4 md:p-6 shadow-sm border border-border mb-6 md:mb-8">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Transfer ID (APX)
            </label>
            <input
              type="text"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
              placeholder="Enter your transfer ID (e.g., APX123456)"
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
            Your transfer ID was provided in your booking confirmation email or SMS
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">{/* Transfer Details Content */}
          <div>

            {/* Prominent Status Display */}
            {(() => {
              const status = transfer.transfer_details.transfer_status || transfer.transfer_details.status || 'pending';
              return (
                <div className={`${getStatusBg(status)} border-2 rounded-xl p-4 mb-6 flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    {getStatusIcon(status)}
                <div>
                      <div className={`text-lg font-bold capitalize ${getStatusColor(status)}`}>
                        {status.replace('_', ' ')}
                  </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {getStatusDescription(status)}
                  </div>
                </div>
              </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-foreground">
                  Transfer ID
                </div>
                    <div className="text-base text-muted-foreground font-mono">
                  {transfer._id}
                </div>
              </div>
            </div>
              );
            })()}
            
            <div className="mb-5">
              <div className="flex items-center mb-2">
                <MapPin size={16} className="text-muted-foreground mr-2" />
                <span className="text-sm font-medium text-foreground">From</span>
              </div>
              <p className="text-base text-foreground ml-6">
                {transfer.transfer_details.pickup_location}
              </p>
            </div>

            <div className="mb-5">
              <div className="flex items-center mb-2">
                <MapPin size={16} className="text-muted-foreground mr-2" />
                <span className="text-sm font-medium text-foreground">To</span>
              </div>
              <p className="text-base text-foreground ml-6">
                {transfer.transfer_details.drop_location}
              </p>
            </div>

            <div className="mb-5">
              <div className="flex items-center mb-2">
                <Clock size={16} className="text-muted-foreground mr-2" />
                <span className="text-sm font-medium text-foreground">Scheduled Time</span>
              </div>
              <p className="text-base text-foreground ml-6">
                {formatTime(transfer.transfer_details.estimated_pickup_time)}
              </p>
            </div>

            {estimatedArrival && (
              <div className="mb-5">
                <div className="flex items-center mb-2">
                  <Clock size={16} className="text-primary mr-2" />
                  <span className="text-sm font-medium text-foreground">Estimated Arrival</span>
                </div>
                <p className="text-base text-primary ml-6 font-medium">
                  {formatTime(estimatedArrival)}
                </p>
              </div>
            )}

            {/* Status Badge */}
            {(() => {
              const status = transfer.transfer_details.transfer_status || transfer.transfer_details.status || 'pending';
              return (
                <div className="mt-5">
                  <span className={`${getStatusBg(status)} ${getStatusColor(status)} px-4 py-2 rounded-lg text-sm font-semibold capitalize border`}>
                    {status.replace('_', ' ')}
              </span>
            </div>
              );
            })()}
          </div>

          {/* Driver Details */}
          {transfer.assigned_driver_details && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-5">
                Driver Details
              </h2>
              
              <div className="mb-5">
                <div className="flex items-center mb-2">
                  <User size={16} className="text-muted-foreground mr-2" />
                  <span className="text-sm font-medium text-foreground">Driver Name</span>
                </div>
                <p className="text-base text-foreground ml-6">
                  {transfer.assigned_driver_details.driver_name || transfer.assigned_driver_details.name || 'N/A'}
                </p>
              </div>

              <div className="mb-5">
                <div className="flex items-center mb-2">
                  <Car size={16} className="text-muted-foreground mr-2" />
                  <span className="text-sm font-medium text-foreground">Vehicle</span>
                </div>
                <p className="text-base text-foreground ml-6">
                  {transfer.assigned_driver_details.vehicle_type || 'N/A'}
                  {transfer.assigned_driver_details.vehicle_number && ` - ${transfer.assigned_driver_details.vehicle_number}`}
                  {transfer.assigned_driver_details.vehicle_license && ` (${transfer.assigned_driver_details.vehicle_license})`}
                </p>
              </div>

              <div className="mb-5">
                <div className="flex items-center mb-2">
                  <Phone size={16} className="text-muted-foreground mr-2" />
                  <span className="text-sm font-medium text-foreground">Contact</span>
                </div>
                {(transfer.assigned_driver_details.driver_phone || transfer.assigned_driver_details.contact_number) && (
                  <a 
                    href={`tel:${transfer.assigned_driver_details.driver_phone || transfer.assigned_driver_details.contact_number}`}
                    className="text-base text-primary ml-6 no-underline hover:underline"
                  >
                    {transfer.assigned_driver_details.driver_phone || transfer.assigned_driver_details.contact_number}
                  </a>
                )}
                {!transfer.assigned_driver_details.driver_phone && !transfer.assigned_driver_details.contact_number && (
                  <p className="text-base text-muted-foreground ml-6">Contact information not available</p>
                )}
              </div>

              {driverLocation && (
                <div className="mb-5">
                  <div className="flex items-center mb-2">
                    <Navigation size={16} className="text-muted-foreground mr-2" />
                    <span className="text-sm font-medium text-foreground">Current Location</span>
                  </div>
                  <p className="text-base text-foreground ml-6">
                    {driverLocation.address}
                  </p>
                </div>
              )}
            </div>
          )}
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
            {/* Flight Details Status */}
            {(() => {
              const isCompleted = transfer.flight_details?.flight_no && 
                                  transfer.flight_details?.flight_no !== 'XX000';
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

            {/* Passenger Details Status */}
            {(() => {
              const isCompleted = transfer.customer_details?.no_of_passengers > 1 || 
                                  transfer.customer_details?.luggage_count > 0;
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
                      <h3 className="font-semibold text-foreground">Passenger & Luggage</h3>
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
                        ? `${transfer.customer_details.no_of_passengers} passenger(s), ${transfer.customer_details.luggage_count} luggage`
                        : 'Using default values (1 passenger, 0 luggage)'}
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

            {/* Traveler Assignment Status */}
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

            {/* Driver Assignment Status */}
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
                      <Truck size={16} className={isCompleted ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'} />
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

            {/* Special Notes Status (Optional) */}
            {(() => {
              const hasNotes = transfer.transfer_details?.special_notes && 
                              transfer.transfer_details.special_notes.trim().length > 0;
              return (
                <div className={`flex items-start gap-3 p-4 rounded-lg border-2 ${
                  hasNotes 
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                    : 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800'
                }`}>
                  <div className="flex-shrink-0 mt-0.5">
                    {hasNotes ? (
                      <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <Circle size={20} className="text-gray-400 dark:text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText size={16} className={hasNotes ? 'text-green-600 dark:text-green-400' : 'text-gray-400'} />
                      <h3 className="font-semibold text-foreground">Special Notes</h3>
                      <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${
                        hasNotes 
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {hasNotes ? 'Added' : 'Optional'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {hasNotes 
                        ? transfer.transfer_details.special_notes
                        : 'No special instructions provided'}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Overall Progress Bar */}
            {(() => {
              const flightCompleted = transfer.flight_details?.flight_no && transfer.flight_details?.flight_no !== 'XX000';
              const passengerCompleted = transfer.customer_details?.no_of_passengers > 1 || transfer.customer_details?.luggage_count > 0;
              const travelerCompleted = !!transfer.traveler_details || !!transfer.traveler_id;
              const driverCompleted = !!transfer.assigned_driver_details;
              const pickupCompleted = transfer.assigned_driver_details?.traveler_picked_up || false;
              const dropCompleted = transfer.assigned_driver_details?.arrived_at_drop || false;
              
              const completedCount = [flightCompleted, passengerCompleted, travelerCompleted, driverCompleted, pickupCompleted, dropCompleted].filter(Boolean).length;
              const totalRequired = 6;
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
