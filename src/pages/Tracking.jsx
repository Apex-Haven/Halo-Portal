import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPin, Clock, User, Car, Navigation, CheckCircle, Circle, AlertCircle, Plane, ChevronDown, Building2, Users } from 'lucide-react';
// import LiveMap from '../components/LiveMap'; // Commented out for now
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';
import { getClientAndTravelerNames, getTransferStatusDisplay, getLegStatusDisplay, getAirlineDisplay, hasRealFlight, getFlightFieldDisplay, DEFAULT_AIRPORT, DEFAULT_HOTEL, formatDateTimeFriendly, formatTimeFriendly } from '../utils/transferUtils';
import Dropdown from '../components/Dropdown';

const SEARCH_TYPE_APEX = 'apex';
const SEARCH_TYPE_COMPANY_TRAVELER = 'company_traveler';

const Tracking = () => {
  const { isDark } = useTheme()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchType, setSearchType] = useState(() => localStorage.getItem('tracking_search_type') || SEARCH_TYPE_COMPANY_TRAVELER);
  // Load search state from localStorage on mount, or from URL id param
  const [trackingId, setTrackingId] = useState(() => {
    const urlId = searchParams.get('id')
    if (urlId) return urlId
    return localStorage.getItem('tracking_search_id') || '';
  });
  const [companyName, setCompanyName] = useState(() => localStorage.getItem('tracking_search_company') || '');
  const [travelerName, setTravelerName] = useState(() => localStorage.getItem('tracking_search_traveler') || '');
  const [companies, setCompanies] = useState([]);
  const [travelers, setTravelers] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingTravelers, setLoadingTravelers] = useState(false);
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [estimatedArrival, setEstimatedArrival] = useState(null);
  const [trackingSteps, setTrackingSteps] = useState([]);
  const [locationUpdateInterval, setLocationUpdateInterval] = useState(null);
  
  // Accordion states
  const [accordions, setAccordions] = useState({
    transferDetails: true,
    trackingProgress: true,
    liveMap: false // Commented out live map for now
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
  useEffect(() => {
    localStorage.setItem('tracking_search_type', searchType);
  }, [searchType]);
  useEffect(() => {
    if (companyName) localStorage.setItem('tracking_search_company', companyName);
    else localStorage.removeItem('tracking_search_company');
  }, [companyName]);
  useEffect(() => {
    if (travelerName) localStorage.setItem('tracking_search_traveler', travelerName);
    else localStorage.removeItem('tracking_search_traveler');
  }, [travelerName]);

  // Fetch companies when Company & Traveler mode is selected
  useEffect(() => {
    if (searchType !== SEARCH_TYPE_COMPANY_TRAVELER) return;
    const fetchCompanies = async () => {
      setLoadingCompanies(true);
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
        const res = await fetch(`${API_BASE_URL}/tracking/companies`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) setCompanies(data.data);
        else setCompanies([]);
      } catch (e) {
        console.error('Failed to fetch companies:', e);
        setCompanies([]);
      } finally {
        setLoadingCompanies(false);
      }
    };
    fetchCompanies();
  }, [searchType]);

  // Fetch travelers when company is selected
  useEffect(() => {
    if (searchType !== SEARCH_TYPE_COMPANY_TRAVELER || !companyName?.trim()) {
      setTravelers([]);
      setTravelerName('');
      return;
    }
    const fetchTravelers = async () => {
      setLoadingTravelers(true);
      setTravelerName('');
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
        const params = new URLSearchParams({ company: companyName.trim() });
        const res = await fetch(`${API_BASE_URL}/tracking/travelers?${params}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) setTravelers(data.data);
        else setTravelers([]);
      } catch (e) {
        console.error('Failed to fetch travelers:', e);
        setTravelers([]);
      } finally {
        setLoadingTravelers(false);
      }
    };
    fetchTravelers();
  }, [searchType, companyName]);

  // Build tracking steps: Transfer Requested → Driver Assigned → Transfer Started → Arrival Completed → [Return: Departure Driver → Departure Completed] → Transfer Completed
  const buildTrackingStepsFromTransfer = (t) => {
    if (!t) return [];
    const onwardStatus = t.transfer_details?.transfer_status || t.transfer_details?.status || 'pending';
    const returnStatus = t.return_transfer_details?.transfer_status || t.return_transfer_details?.status || 'pending';
    const hasDriver = !!t.assigned_driver_details;
    const onwardCompleted = onwardStatus === 'completed';
    const hasReturn = !!(t.return_transfer_details || t.return_flight_details);
    // Driver Assigned: status is 'assigned' or later (or has assigned_driver_details)
    const driverAssigned = hasDriver || ['assigned', 'enroute', 'waiting', 'in_progress', 'completed'].includes(onwardStatus);
    // Transfer Started: driver has begun (enroute, waiting, in_progress, or completed) - not just assigned
    const transferStarted = ['enroute', 'waiting', 'in_progress', 'completed'].includes(onwardStatus);
    const returnDriverAssigned = hasReturn && (!!t.return_assigned_driver_details || ['assigned', 'enroute', 'waiting', 'in_progress', 'completed'].includes(returnStatus));
    const returnCompleted = hasReturn && returnStatus === 'completed';
    const allCompleted = onwardCompleted && (!hasReturn || returnCompleted);

    const steps = [
      { id: 1, title: 'Transfer Requested', description: 'Your transfer request has been received', status: 'completed', time: null },
      { id: 2, title: 'Driver Assigned (Arrival)', description: driverAssigned ? `Driver: ${t.assigned_driver_details?.name || 'N/A'}` : 'Vendor will assign a driver', status: driverAssigned ? 'completed' : 'pending', time: null },
      { id: 3, title: 'Transfer Started', description: 'Transfer has begun', status: transferStarted ? 'completed' : 'pending', time: null },
      { id: 4, title: hasReturn ? 'Arrival Transfer Completed' : 'Transfer Completed', description: 'You have reached your destination', status: onwardCompleted ? 'completed' : 'pending', time: null }
    ];

    if (hasReturn) {
      steps.push(
        { id: 5, title: 'Departure Driver Assigned', description: returnDriverAssigned ? 'Driver confirmed for return' : 'Driver will be assigned for return', status: returnDriverAssigned ? 'completed' : 'pending', time: null },
        { id: 6, title: 'Departure Completed', description: 'Return leg completed', status: returnCompleted ? 'completed' : 'pending', time: null },
        { id: 7, title: 'Transfer Completed', description: 'Your round trip is complete', status: allCompleted ? 'completed' : 'pending', time: null }
      );
    }
    return steps;
  };

  const defaultSteps = [
    { id: 1, title: 'Transfer Requested', description: 'Your transfer request has been received', status: 'completed', time: null },
    { id: 2, title: 'Driver Assigned (Arrival)', description: 'Vendor will assign a driver', status: 'pending', time: null },
    { id: 3, title: 'Transfer Started', description: 'Transfer has begun', status: 'pending', time: null },
    { id: 4, title: 'Transfer Completed', description: 'You have reached your destination', status: 'pending', time: null }
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

  const applyTransferData = useCallback((data) => {
    setTransfer(data);
    if (data.tracking?.driverLocation) {
      setDriverLocation({
        lat: data.tracking.driverLocation.latitude,
        lng: data.tracking.driverLocation.longitude,
        address: data.tracking.driverLocation.address || '',
        timestamp: data.tracking.driverLocation.timestamp
      });
    } else {
      setDriverLocation(null);
    }
    if (data.tracking?.estimatedArrival) {
      setEstimatedArrival(new Date(data.tracking.estimatedArrival));
    } else {
      setEstimatedArrival(null);
    }
    if (data.tracking?.progressSteps?.length > 0) {
      setTrackingSteps(data.tracking.progressSteps);
    } else {
      setTrackingSteps(buildTrackingStepsFromTransfer(data));
    }
  }, []);

  const handleTrackTransfer = useCallback(async (overrideId) => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    if (searchType === SEARCH_TYPE_COMPANY_TRAVELER) {
      const company = companyName?.trim?.();
      const traveler = travelerName?.trim?.();
      if (!company || !traveler) {
        toast.error('Please enter both company name and traveler name');
        return;
      }
      setLoading(true);
      setSearchError(null);
      try {
        const params = new URLSearchParams({ company, traveler });
        const response = await fetch(`${API_BASE_URL}/tracking/search?${params}`, { headers });
        const data = await response.json();
        if (data.success) {
          applyTransferData(data.data);
          toast.success(data.matchesCount > 1 ? `Transfer found! (${data.matchesCount} matches, showing most recent)` : 'Transfer found!');
        } else {
          setSearchError(data.message || 'No transfer found for this company and traveler.');
          setTransfer(null);
        }
      } catch (error) {
        console.error('Error searching transfer:', error);
        setSearchError('Unable to connect. Please check your internet connection and try again.');
        setTransfer(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    const idToSearch = (overrideId ?? trackingId)?.trim?.() || trackingId?.trim?.();
    if (!idToSearch) {
      toast.error('Please enter a tracking ID');
      return;
    }

    setLoading(true);
    setSearchError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/tracking/${idToSearch}`, { headers });
      const data = await response.json();

      if (data.success) {
        applyTransferData(data.data);
        toast.success('Transfer found!');
      } else {
        const errorMsg = data.message || 'Transfer not found. Please check your ID or name and try again.';
        setSearchError(errorMsg);
        setTransfer(null);
      }
    } catch (error) {
      console.error('Error tracking transfer:', error);
      setSearchError('Unable to connect. Please check your internet connection and try again.');
      setTransfer(null);
    } finally {
      setLoading(false);
    }
  }, [trackingId, searchType, companyName, travelerName, applyTransferData]);

  // When arriving with ?id= in URL, prefill search and auto-fetch
  useEffect(() => {
    const urlId = searchParams.get('id')
    if (urlId && urlId.trim()) {
      setTrackingId(urlId)
      setSearchParams({}, { replace: true })
      handleTrackTransfer(urlId)
    }
  }, [searchParams, handleTrackTransfer])

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
      case 'in_progress':
      case 'enroute': return 'Arrival transfer in progress';
      case 'waiting': return 'Driver is waiting at pickup';
      case 'pending': return 'Waiting for driver assignment';
      case 'assigned': return 'Driver assigned, transfer started';
      case 'delayed': return 'Transfer is delayed';
      case 'cancelled': return 'This transfer was cancelled';
      default: return 'Status unknown';
    }
  };

  const formatTime = (date) => date ? formatTimeFriendly(date) : null;
  const formatDateTime = (date) => date ? formatDateTimeFriendly(date) : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Track Your Transfer
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-base">
            Track your transfer using your company and traveler, or Apex ID or name
          </p>
        </div>

      {/* Search Section */}
      <div className="bg-card rounded-xl p-4 md:p-6 shadow-sm border border-border mb-6 md:mb-8">
        <div className="flex flex-col gap-3">
          {/* Search type toggle - Company & Traveler first */}
          <div className="flex gap-2 mb-1">
            <button
              type="button"
              onClick={() => { setSearchType(SEARCH_TYPE_COMPANY_TRAVELER); setSearchError(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                searchType === SEARCH_TYPE_COMPANY_TRAVELER
                  ? 'bg-primary text-white'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              <Building2 size={16} />
              Company & Traveler
            </button>
            <button
              type="button"
              onClick={() => { setSearchType(SEARCH_TYPE_APEX); setSearchError(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                searchType === SEARCH_TYPE_APEX
                  ? 'bg-primary text-white'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              Apex ID or Name
            </button>
          </div>

          {searchType === SEARCH_TYPE_APEX ? (
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
                    setSearchError(null);
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
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Company name
                  </label>
                  <Dropdown
                    value={companyName}
                    onChange={(e) => { setCompanyName(e.target.value); setSearchError(null); }}
                    options={[
                      { value: '', label: loadingCompanies ? 'Loading companies...' : 'Select company...' },
                      ...companies.map(c => ({ value: c, label: c }))
                    ]}
                    placeholder={loadingCompanies ? 'Loading...' : 'Select company'}
                    minWidth="100%"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Traveler name
                  </label>
                  <Dropdown
                    value={travelerName}
                    onChange={(e) => { setTravelerName(e.target.value); setSearchError(null); }}
                    options={[
                      {
                        value: '',
                        label: !companyName
                          ? 'Select company first'
                          : loadingTravelers
                            ? 'Loading travelers...'
                            : travelers.length === 0
                              ? 'No travelers found for this company'
                              : 'Select traveler...'
                      },
                      ...travelers.map(t => ({ value: t, label: t }))
                    ]}
                    placeholder={!companyName ? 'Select company first' : (loadingTravelers ? 'Loading...' : 'Select traveler')}
                    minWidth="100%"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleTrackTransfer}
                  disabled={loading || !companyName.trim() || !travelerName.trim()}
                  className={`px-6 py-3 border-none rounded-lg text-base font-medium text-white flex items-center justify-center gap-2 transition-all ${
                    loading || !companyName.trim() || !travelerName.trim()
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
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {searchType === SEARCH_TYPE_APEX
              ? 'Enter your Apex ID (e.g., APX123456) or your name as it appears in your booking'
              : 'Enter your company name first, then the traveler name as it appears in your booking'}
          </p>

          {searchError && (
            <div className="flex gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
              <AlertCircle size={20} className="flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">We couldn't find your transfer</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">{searchError}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  {searchType === SEARCH_TYPE_COMPANY_TRAVELER
                    ? '• Use company and traveler names exactly as on your confirmation'
                    : '• Use your Apex ID (e.g. APX12345) or full name exactly as on your confirmation'}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  • Check for typos or extra spaces
                </p>
                <button
                  onClick={() => setSearchError(null)}
                  className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
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
                    {/* Status + Company & Traveler */}
                    {(() => {
                      const status = transfer.transfer_details?.transfer_status || transfer.transfer_details?.status || 'pending';
                      const { label: statusLabel, statusKey, description } = getTransferStatusDisplay(transfer);
                      const { companyName, clientName, travelerName } = getClientAndTravelerNames(transfer);
                      const hasReturn = !!(transfer.return_transfer_details || transfer.return_flight_details);
                      return (
                        <div className={`${getStatusBg(statusKey)} border rounded-xl p-4 flex items-center justify-between gap-4`}>
                          <div className="flex items-center gap-3 min-w-0">
                            {getStatusIcon(statusKey)}
                            <div className="min-w-0">
                              <div className={`text-lg font-semibold ${getStatusColor(statusKey)}`}>
                                {statusLabel}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                                {description}
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right pl-2 border-l border-border dark:border-gray-600">
                            <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                              {companyName || clientName || 'Unknown Customer'}
                            </div>
                            {travelerName && (
                              <div className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{travelerName}</div>
                            )}
                            {hasReturn && (
                              <span className="inline-block mt-1 text-xs bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-medium">Round Trip</span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Trip: From → To (Onward) */}
                    <div className="rounded-xl border border-border bg-muted/20 dark:bg-muted/10 p-4 space-y-4">
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide text-muted-foreground">Onward Trip</h3>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                          <MapPin size={16} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Pickup</div>
                          <p className="text-base font-medium text-foreground">{DEFAULT_AIRPORT}</p>
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
                          <p className="text-base font-medium text-foreground">{DEFAULT_HOTEL}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-border grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs text-muted-foreground">Vendor</span>
                          <p className="text-sm font-medium text-foreground">{transfer.vendor_details?.vendor_name || 'Not assigned'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Driver</span>
                          <p className="text-sm font-medium text-foreground">{transfer.assigned_driver_details?.name || transfer.assigned_driver_details?.driver_name || 'Not assigned'}</p>
                        </div>
                      </div>
                      {(transfer.transfer_details?.event_place && transfer.transfer_details.event_place !== 'Event (TBD)') && (
                        <div className="pt-2 border-t border-border">
                          <span className="text-xs text-muted-foreground">Event</span>
                          <p className="text-sm font-medium text-foreground">{transfer.transfer_details.event_place}</p>
                        </div>
                      )}
                      {(transfer.transfer_details?.special_notes) && (
                        <div className="pt-2 border-t border-border">
                          <span className="text-xs text-muted-foreground">Special notes</span>
                          <p className="text-sm text-foreground mt-0.5">{transfer.transfer_details.special_notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Return Trip (when available) */}
                    {(transfer.return_transfer_details || transfer.return_flight_details) && (
                      <div className="rounded-xl border border-border bg-muted/20 dark:bg-muted/10 p-4 space-y-4">
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide text-muted-foreground">Return Trip</h3>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                            <MapPin size={16} className="text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Pickup</div>
                            <p className="text-base font-medium text-foreground">{DEFAULT_HOTEL}</p>
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
                            <p className="text-base font-medium text-foreground">{DEFAULT_AIRPORT}</p>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-border grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs text-muted-foreground">Vendor</span>
                            <p className="text-sm font-medium text-foreground">{transfer.return_vendor_details?.vendor_name || transfer.vendor_details?.vendor_name || 'Not assigned'}</p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Driver</span>
                            <p className="text-sm font-medium text-foreground">{transfer.return_assigned_driver_details?.name || transfer.return_assigned_driver_details?.driver_name || 'Not assigned'}</p>
                          </div>
                        </div>
                        {transfer.return_transfer_details?.estimated_pickup_time && (
                          <div className="pt-2 border-t border-border">
                            <span className="text-xs text-muted-foreground">Estimated pickup</span>
                            <p className="text-sm font-medium text-foreground">
                              {formatDateTime(transfer.return_transfer_details.estimated_pickup_time) || formatTime(transfer.return_transfer_details.estimated_pickup_time) || '—'}
                            </p>
                          </div>
                        )}
                        {transfer.return_transfer_details && (() => {
                          const { label: returnStatusLabel, statusKey: returnStatusKey } = getLegStatusDisplay(transfer, 'return');
                          return (
                            <div className="pt-2 border-t border-border">
                              <span className="text-xs text-muted-foreground">Return status</span>
                              <p className={`text-sm font-medium ${getStatusColor(returnStatusKey)}`}>
                                {returnStatusLabel}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Flight (only when real flight) */}
                    {hasRealFlight(transfer.flight_details) && (
                      <div className="rounded-xl border border-border bg-muted/20 dark:bg-muted/10 p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                          <Plane size={16} /> Onward Flight
                        </h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Flight</span>
                            <p className="font-mono font-medium text-foreground">{transfer.flight_details.flight_no}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Airline</span>
                            <p className="font-medium text-foreground">{getAirlineDisplay(transfer.flight_details) || '—'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Route</span>
                            <p className="font-medium text-foreground">
                              {getFlightFieldDisplay([transfer.flight_details.departure_airport, transfer.flight_details.arrival_airport].filter(Boolean).join(' → '))}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Arrival</span>
                            <p className="font-medium text-foreground">
                              {getFlightFieldDisplay(formatDateTime(transfer.flight_details.arrival_time) || formatTime(transfer.flight_details.arrival_time))}
                            </p>
                          </div>
                          {transfer.flight_details.status && transfer.flight_details.status !== 'on_time' && (
                            <div>
                              <span className="text-muted-foreground">Status</span>
                              <p className="font-medium text-foreground capitalize">{String(transfer.flight_details.status).replace(/_/g, ' ')}</p>
                            </div>
                          )}
                          {transfer.flight_details.api_verified && transfer.flight_details.last_checked && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Last verified</span>
                              <p className="font-medium text-foreground text-xs">
                                {formatDateTime(transfer.flight_details.last_checked) || '—'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Return Flight (when available and real flight) */}
                    {hasRealFlight(transfer.return_flight_details) && (
                      <div className="rounded-xl border border-border bg-muted/20 dark:bg-muted/10 p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                          <Plane size={16} /> Return Flight
                        </h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Flight</span>
                            <p className="font-mono font-medium text-foreground">{transfer.return_flight_details.flight_no}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Airline</span>
                            <p className="font-medium text-foreground">{getAirlineDisplay(transfer.return_flight_details) || '—'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Route</span>
                            <p className="font-medium text-foreground">
                              {getFlightFieldDisplay([transfer.return_flight_details.departure_airport, transfer.return_flight_details.arrival_airport].filter(Boolean).join(' → '))}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Departure</span>
                            <p className="font-medium text-foreground">
                              {getFlightFieldDisplay(formatDateTime(transfer.return_flight_details.departure_time) || formatTime(transfer.return_flight_details.departure_time))}
                            </p>
                          </div>
                          {transfer.return_flight_details.status && transfer.return_flight_details.status !== 'on_time' && (
                            <div>
                              <span className="text-muted-foreground">Status</span>
                              <p className="font-medium text-foreground capitalize">{String(transfer.return_flight_details.status).replace(/_/g, ' ')}</p>
                            </div>
                          )}
                          {transfer.return_flight_details.api_verified && transfer.return_flight_details.last_checked && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Last verified</span>
                              <p className="font-medium text-foreground text-xs">
                                {formatDateTime(transfer.return_flight_details.last_checked) || '—'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Traveler – full info including passport */}
                    {(transfer.customer_details || transfer.traveler_details) && (
                      <div className="rounded-xl border border-border bg-muted/20 dark:bg-muted/10 p-4 space-y-4">
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                          <User size={16} /> Traveler
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {(transfer.customer_details?.company_name || transfer.traveler_details?.company_name) && (
                            <div>
                              <span className="text-xs text-muted-foreground block mb-0.5">Company</span>
                              <p className="text-base font-medium text-foreground">
                                {transfer.customer_details?.company_name || transfer.traveler_details?.company_name}
                              </p>
                            </div>
                          )}
                          {(transfer.customer_details?.name || transfer.traveler_details?.name) && (
                            <div>
                              <span className="text-xs text-muted-foreground block mb-0.5">Traveler</span>
                              <p className="text-base font-medium text-foreground">
                                {transfer.customer_details?.name || transfer.traveler_details?.name}
                              </p>
                            </div>
                          )}
                          {(transfer.customer_details?.name_as_per_passport || transfer.traveler_details?.name_as_per_passport) && (
                            <div>
                              <span className="text-xs text-muted-foreground block mb-0.5">Name as per passport</span>
                              <p className="text-base font-medium text-foreground">
                                {transfer.customer_details?.name_as_per_passport || transfer.traveler_details?.name_as_per_passport}
                              </p>
                            </div>
                          )}
                          {(transfer.customer_details?.passport_number || transfer.traveler_details?.passport_number) && (
                            <div>
                              <span className="text-xs text-muted-foreground block mb-0.5">Passport number</span>
                              <p className="text-base font-mono font-medium text-foreground">
                                {transfer.customer_details?.passport_number || transfer.traveler_details?.passport_number}
                              </p>
                            </div>
                          )}
                          {(transfer.customer_details?.email || transfer.traveler_details?.email) && (
                            <div>
                              <span className="text-xs text-muted-foreground block mb-0.5">Email</span>
                              <a href={`mailto:${transfer.customer_details?.email || transfer.traveler_details?.email}`} className="text-base text-primary font-medium hover:underline">
                                {transfer.customer_details?.email || transfer.traveler_details?.email}
                              </a>
                            </div>
                          )}
                          {(transfer.customer_details?.contact_number || transfer.traveler_details?.contact_number) && (
                            <div>
                              <span className="text-xs text-muted-foreground block mb-0.5">Contact</span>
                              <a href={`tel:${transfer.customer_details?.contact_number || transfer.traveler_details?.contact_number}`} className="text-base text-primary font-medium hover:underline">
                                {transfer.customer_details?.contact_number || transfer.traveler_details?.contact_number}
                              </a>
                            </div>
                          )}
                          {(transfer.customer_details?.whatsapp_number) && (
                            <div>
                              <span className="text-xs text-muted-foreground block mb-0.5">WhatsApp</span>
                              <a href={`https://wa.me/${transfer.customer_details.whatsapp_number.replace(/\D/g, '')}`} className="text-base text-primary font-medium hover:underline">
                                {transfer.customer_details.whatsapp_number}
                              </a>
                            </div>
                          )}
                          {(transfer.customer_details?.job_position || transfer.traveler_details?.job_position) && (
                            <div>
                              <span className="text-xs text-muted-foreground block mb-0.5">Job position</span>
                              <p className="text-base font-medium text-foreground">
                                {transfer.customer_details?.job_position || transfer.traveler_details?.job_position}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Travelers in same car */}
                    {(() => {
                      const { travelerName } = getClientAndTravelerNames(transfer);
                      const hasDelegates = transfer.delegates && transfer.delegates.length > 0;
                      return travelerName || hasDelegates;
                    })() && (
                      <div className="rounded-xl border border-border bg-muted/20 dark:bg-muted/10 p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                          <Users size={16} /> Travelers in same car
                        </h3>
                        <div className="text-sm text-foreground space-y-1">
                          {(() => {
                            const { travelerName } = getClientAndTravelerNames(transfer);
                            return travelerName ? (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">•</span>
                                <span>{travelerName}</span>
                                <span className="text-xs text-muted-foreground">(primary)</span>
                              </div>
                            ) : null;
                          })()}
                          {(transfer.delegates || []).map((d, i) => {
                            const name = d.traveler_id?.profile
                              ? [d.traveler_id.profile.firstName, d.traveler_id.profile.lastName].filter(Boolean).join(' ').trim()
                              : d.travelerName || d.traveler_id?.email || 'Traveler';
                            return (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-muted-foreground">•</span>
                                <span>{name}</span>
                              </div>
                            );
                          })}
                        </div>
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

                  {/* Right column: Onward & Return Vendor & Driver */}
                  <div className="lg:col-span-1 space-y-4">
                    {/* Onward Vendor & Driver */}
                    <div className="rounded-xl border border-border bg-muted/20 dark:bg-muted/10 p-4">
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide text-muted-foreground flex items-center gap-2 mb-3">
                        <Plane size={14} /> Onward
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <span className="text-xs text-muted-foreground block mb-0.5">Vendor</span>
                          <p className="text-base font-medium text-foreground">{transfer.vendor_details?.vendor_name || 'Not assigned'}</p>
                          {transfer.vendor_details?.contact_number && (
                            <a href={`tel:${transfer.vendor_details.contact_number}`} className="text-sm text-primary hover:underline block">{transfer.vendor_details.contact_number}</a>
                          )}
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block mb-0.5">Driver</span>
                          {transfer.assigned_driver_details ? (
                            <>
                              <p className="text-base font-medium text-foreground">{transfer.assigned_driver_details.driver_name || transfer.assigned_driver_details.name || 'N/A'}</p>
                              <p className="text-sm text-muted-foreground">
                                {transfer.assigned_driver_details.vehicle_type || 'N/A'}
                                {transfer.assigned_driver_details.vehicle_number && ` · ${transfer.assigned_driver_details.vehicle_number}`}
                              </p>
                              {(transfer.assigned_driver_details.driver_phone || transfer.assigned_driver_details.contact_number) && (
                                <a href={`tel:${transfer.assigned_driver_details.driver_phone || transfer.assigned_driver_details.contact_number}`} className="text-sm text-primary hover:underline block">
                                  {transfer.assigned_driver_details.driver_phone || transfer.assigned_driver_details.contact_number}
                                </a>
                              )}
                              {driverLocation?.address && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <Navigation size={12} /> {driverLocation.address}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">Not assigned</p>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Return Vendor & Driver */}
                    {(transfer.return_transfer_details || transfer.return_flight_details) && (
                      <div className="rounded-xl border border-border bg-muted/20 dark:bg-muted/10 p-4 sticky top-4">
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide text-muted-foreground flex items-center gap-2 mb-3">
                          <Plane size={14} className="rotate-180" /> Return
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <span className="text-xs text-muted-foreground block mb-0.5">Vendor</span>
                            <p className="text-base font-medium text-foreground">{transfer.return_vendor_details?.vendor_name || transfer.vendor_details?.vendor_name || 'Not assigned'}</p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block mb-0.5">Driver</span>
                            <p className="text-base font-medium text-foreground">{transfer.return_assigned_driver_details?.name || transfer.return_assigned_driver_details?.driver_name || 'Not assigned'}</p>
                            {transfer.return_assigned_driver_details?.vehicle_number && (
                              <p className="text-sm text-muted-foreground">{transfer.return_assigned_driver_details.vehicle_number}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
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
                <div className="space-y-4">
                  {trackingSteps.map((step) => {
                    const isCompleted = step.status === 'completed';
                    return (
                      <div
                        key={step.id}
                        className={`flex items-start gap-3 p-4 rounded-lg border-2 ${
                          isCompleted
                            ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                            : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
                        }`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {isCompleted ? (
                            <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                          ) : (
                            <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-foreground">{step.title}</h3>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                isCompleted
                                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                                  : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                              }`}
                            >
                              {isCompleted ? 'Completed' : 'Pending'}
                            </span>
                            {step.time && (
                              <span className="text-sm text-muted-foreground ml-auto">{step.time}</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground m-0">{step.description}</p>
                        </div>
                      </div>
                    );
                  })}
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
                  Live Map (Disabled)
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
                  {/* Live Map component commented out */}
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-center">
                    <div className="text-amber-600 dark:text-amber-400 mb-2">
                      <MapPin size={24} className="mx-auto" />
                    </div>
                    <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">Live Map Temporarily Disabled</h3>
                    <p className="text-amber-700 dark:text-amber-300 text-sm">
                      The live map feature has been temporarily disabled for maintenance.
                    </p>
                    <p className="text-amber-600 dark:text-amber-400 text-xs mt-2">
                      You can still track your transfer status using the progress indicators above.
                    </p>
                  </div>
                  {/* <LiveMap
                    transfer={transfer}
                    driverLocation={driverLocation}
                    estimatedArrival={estimatedArrival}
                    routeHistory={trackingSteps}
                  /> */}
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
