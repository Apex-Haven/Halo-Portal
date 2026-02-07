import { useState, useEffect } from 'react'
import { Search, Plane, MapPin, Clock, AlertCircle, CheckCircle, Navigation, RefreshCw, User, Truck, X, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useNavigate } from 'react-router-dom'
import flightTrackingService from '../services/flightTrackingService'
import toast from 'react-hot-toast'
import { getTransferDisplayName, getClientAndTravelerNames } from '../utils/transferUtils'

const Flights = () => {
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('search')

  // Search Tab State (Flight Tracking)
  const [searchType, setSearchType] = useState(() => {
    return localStorage.getItem('flight_tracking_search_type') || 'flight'
  })
  const [flightNumber, setFlightNumber] = useState(() => {
    return localStorage.getItem('flight_tracking_flight_number') || ''
  })
  const [customerName, setCustomerName] = useState(() => {
    return localStorage.getItem('flight_tracking_customer_name') || ''
  })
  const [airport, setAirport] = useState(() => {
    return localStorage.getItem('flight_tracking_airport') || ''
  })
  const [flightData, setFlightData] = useState(null)
  const [transferData, setTransferData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastSearched, setLastSearched] = useState(null)
  const [showDataSourceInfo, setShowDataSourceInfo] = useState(false)

  // All Flights Tab State
  const [allFlights, setAllFlights] = useState([])
  const [loadingFlights, setLoadingFlights] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Load search state from localStorage on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const flightParam = params.get('flight')
    if (flightParam) {
      setFlightNumber(flightParam)
      setSearchType('flight')
      setActiveTab('search')
      localStorage.setItem('flight_tracking_flight_number', flightParam)
      localStorage.setItem('flight_tracking_search_type', 'flight')
    }
  }, [])

  // Save search state to localStorage
  useEffect(() => {
    localStorage.setItem('flight_tracking_search_type', searchType)
  }, [searchType])

  useEffect(() => {
    if (flightNumber) {
      localStorage.setItem('flight_tracking_flight_number', flightNumber)
    } else {
      localStorage.removeItem('flight_tracking_flight_number')
    }
  }, [flightNumber])

  useEffect(() => {
    if (customerName) {
      localStorage.setItem('flight_tracking_customer_name', customerName)
    } else {
      localStorage.removeItem('flight_tracking_customer_name')
    }
  }, [customerName])

  useEffect(() => {
    if (airport) {
      localStorage.setItem('flight_tracking_airport', airport)
    } else {
      localStorage.removeItem('flight_tracking_airport')
    }
  }, [airport])

  // Fetch all flights from transfers
  useEffect(() => {
    if (activeTab === 'all-flights') {
      fetchAllFlights()
    }
  }, [activeTab])

  const fetchAllFlights = async () => {
    try {
      setLoadingFlights(true)
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'
      const token = localStorage.getItem('token')
      
      if (!token) {
        toast.error('Please login to view flights')
        setAllFlights([])
        return
      }
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
      
      const response = await fetch(`${API_BASE_URL}/transfers`, { headers })
      
      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Session expired. Please login again.')
          localStorage.removeItem('token')
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.data) {
        // Extract flights from transfers
        const flights = data.data
          .filter(transfer => transfer.flight_details?.flight_no)
          .map(transfer => {
            const { clientName, travelerName } = getClientAndTravelerNames(transfer)
            return {
              id: transfer._id,
              transferId: transfer._id,
              flightNumber: transfer.flight_details.flight_no,
              airline: transfer.flight_details.airline || 'N/A',
              departure: transfer.flight_details.departure_airport || 'N/A',
              arrival: transfer.flight_details.arrival_airport || 'N/A',
              scheduled_time: transfer.flight_details.scheduled_arrival || transfer.flight_details.arrival_time,
              actual_time: transfer.flight_details.actual_arrival,
              status: transfer.flight_details.flight_status || 'scheduled',
              terminal: transfer.flight_details.terminal,
              delay_minutes: transfer.flight_details.delay_minutes || 0,
              clientName,
              travelerName,
              customerName: getTransferDisplayName(transfer),
              transfer: transfer
            }
          })
          .sort((a, b) => {
            const dateA = new Date(a.scheduled_time || 0)
            const dateB = new Date(b.scheduled_time || 0)
            return dateB - dateA // Most recent first
          })
        
        setAllFlights(flights)
      } else {
        setAllFlights([])
      }
    } catch (error) {
      console.error('Error fetching flights:', error)
      setAllFlights([])
      toast.error('Failed to fetch flights. Please check your connection.')
    } finally {
      setLoadingFlights(false)
    }
  }

  const handleSearch = async () => {
    setLoading(true)
    setError(null)
    setTransferData(null)

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'
      const token = localStorage.getItem('token')
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }

      if (searchType === 'flight') {
        if (!flightNumber.trim()) {
          toast.error('Please enter a flight number')
          setLoading(false)
          return
        }

        console.log(`🔍 Searching for flight: ${flightNumber}`)
        const response = await flightTrackingService.getFlightInfo(flightNumber)
        
        if (response.success) {
          setFlightData(response.data)
          setLastSearched(flightNumber)
          
          // Try to find associated transfer
          try {
            const transfersResponse = await fetch(
              `${API_BASE_URL}/transfers?flight_no=${flightNumber}`,
              { headers }
            ).then(res => res.json())
            
            if (transfersResponse.success && transfersResponse.data && transfersResponse.data.length > 0) {
              setTransferData(transfersResponse.data[0])
            }
          } catch (err) {
            console.error('Error fetching transfer:', err)
          }
          
          toast.success('Flight information retrieved successfully!')
        } else {
          throw new Error(response.message || 'Failed to fetch flight information')
        }
      } else if (searchType === 'customer') {
        if (!customerName.trim()) {
          toast.error('Please enter a customer name')
          setLoading(false)
          return
        }

        const transfersResponse = await fetch(
          `${API_BASE_URL}/transfers?limit=100`,
          { headers }
        ).then(res => res.json())

        if (transfersResponse.success && transfersResponse.data) {
          const matchingTransfer = transfersResponse.data.find(t => 
            t.customer_details?.name?.toLowerCase().includes(customerName.toLowerCase()) ||
            t.customer_details?.email?.toLowerCase().includes(customerName.toLowerCase())
          )

          if (matchingTransfer) {
            setTransferData(matchingTransfer)
            const flightNo = matchingTransfer.flight_details?.flight_no
            if (flightNo) {
              const flightResponse = await flightTrackingService.getFlightInfo(flightNo)
              if (flightResponse.success) {
                setFlightData(flightResponse.data)
                setFlightNumber(flightNo)
              }
            }
            toast.success('Customer transfer found!')
          } else {
            throw new Error('No transfers found for this customer')
          }
        } else {
          throw new Error('Failed to search for customer transfers')
        }
      } else if (searchType === 'airport') {
        if (!airport.trim()) {
          toast.error('Please enter an airport code')
          setLoading(false)
          return
        }

        const transfersResponse = await fetch(
          `${API_BASE_URL}/transfers?limit=100`,
          { headers }
        ).then(res => res.json())

        if (transfersResponse.success && transfersResponse.data) {
          const matchingTransfers = transfersResponse.data.filter(t => 
            t.flight_details?.arrival_airport === airport.toUpperCase() ||
            t.flight_details?.departure_airport === airport.toUpperCase()
          )

          if (matchingTransfers.length > 0) {
            const transfer = matchingTransfers[0]
            setTransferData(transfer)
            const flightNo = transfer.flight_details?.flight_no
            if (flightNo) {
              const flightResponse = await flightTrackingService.getFlightInfo(flightNo)
              if (flightResponse.success) {
                setFlightData(flightResponse.data)
                setFlightNumber(flightNo)
              }
            }
            toast.success(`Found ${matchingTransfers.length} flight(s) for ${airport.toUpperCase()}`)
          } else {
            throw new Error(`No flights found for airport ${airport.toUpperCase()}`)
          }
        } else {
          throw new Error('Failed to search for airport flights')
        }
      }
    } catch (error) {
      console.error('Search error:', error)
      setError(error.message)
      toast.error(error.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    if (!lastSearched) return
    setFlightNumber(lastSearched)
    await handleSearch()
  }

  const formatTime = (dateString) => {
    return flightTrackingService.formatTime(dateString)
  }

  const getStatusColor = (status) => {
    return flightTrackingService.getStatusColor(status)
  }

  const getStatusDescription = (status) => {
    return flightTrackingService.getStatusDescription(status)
  }

  const getDelayText = (delay) => {
    if (!delay || delay === 0) return null
    return `${delay} min delay`
  }

  const getStatusBg = (status) => {
    switch (status?.toLowerCase()) {
      case 'landed':
      case 'arrived': return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700'
      case 'delayed':
      case 'delayed_arrival': return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700'
      case 'cancelled': return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700'
      case 'scheduled':
      case 'on_time': return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
      default: return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
    }
  }

  const getStatusTextColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'landed':
      case 'arrived': return 'text-green-700 dark:text-green-400'
      case 'delayed':
      case 'delayed_arrival': return 'text-yellow-700 dark:text-yellow-400'
      case 'cancelled': return 'text-red-700 dark:text-red-400'
      case 'scheduled':
      case 'on_time': return 'text-blue-700 dark:text-blue-400'
      default: return 'text-gray-700 dark:text-gray-300'
    }
  }

  // Filter flights based on search term
  const filteredFlights = allFlights.filter(flight => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      flight.flightNumber?.toLowerCase().includes(search) ||
      flight.airline?.toLowerCase().includes(search) ||
      flight.departure?.toLowerCase().includes(search) ||
      flight.arrival?.toLowerCase().includes(search) ||
      flight.clientName?.toLowerCase().includes(search) ||
      flight.travelerName?.toLowerCase().includes(search) ||
      flight.customerName?.toLowerCase().includes(search)
    )
  })

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Flights
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-base">
          Track flights and view all flight information
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-card rounded-xl shadow-sm border border-border mb-6">
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'search'
                ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Search size={18} />
              Search
            </div>
          </button>
          <button
            onClick={() => setActiveTab('all-flights')}
            className={`flex-1 px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'all-flights'
                ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Plane size={18} />
              All Flights
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'search' ? (
            <>
              {/* Search Section */}
              <div className="mb-6">
                {/* Search Type Selector */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  <button
                    onClick={() => {
                      setSearchType('flight')
                      setError(null)
                    }}
                    className={`px-4 py-2 rounded-md text-sm font-medium cursor-pointer flex items-center gap-1.5 transition-all ${
                      searchType === 'flight'
                        ? 'bg-blue-600 dark:bg-blue-500 text-white'
                        : 'bg-transparent dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Plane size={16} />
                    Flight Number
                  </button>
                  <button
                    onClick={() => {
                      setSearchType('customer')
                      setError(null)
                    }}
                    className={`px-4 py-2 rounded-md text-sm font-medium cursor-pointer flex items-center gap-1.5 transition-all ${
                      searchType === 'customer'
                        ? 'bg-blue-600 dark:bg-blue-500 text-white'
                        : 'bg-transparent dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    <User size={16} />
                    Customer Name
                  </button>
                  <button
                    onClick={() => {
                      setSearchType('airport')
                      setError(null)
                    }}
                    className={`px-4 py-2 rounded-md text-sm font-medium cursor-pointer flex items-center gap-1.5 transition-all ${
                      searchType === 'airport'
                        ? 'bg-blue-600 dark:bg-blue-500 text-white'
                        : 'bg-transparent dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    <MapPin size={16} />
                    Airport Code
                  </button>
                </div>

                <div className="flex gap-3 items-center">
                  <div className="flex-1 relative">
                    {searchType === 'flight' && (
                      <input
                        type="text"
                        placeholder="Enter flight number (e.g., AI123, 6E1234)"
                        value={flightNumber}
                        onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full py-3 pl-11 pr-4 border-2 border-input rounded-lg text-base outline-none bg-background text-foreground focus:border-blue-600 dark:focus:border-blue-500 focus:ring-2 focus:ring-ring transition-colors"
                      />
                    )}
                    {searchType === 'customer' && (
                      <input
                        type="text"
                        placeholder="Enter customer name or email"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full py-3 pl-11 pr-4 border-2 border-input rounded-lg text-base outline-none bg-background text-foreground focus:border-blue-600 dark:focus:border-blue-500 focus:ring-2 focus:ring-ring transition-colors"
                      />
                    )}
                    {searchType === 'airport' && (
                      <input
                        type="text"
                        placeholder="Enter airport code (e.g., BOM, DEL, JFK)"
                        value={airport}
                        onChange={(e) => setAirport(e.target.value.toUpperCase())}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full py-3 pl-11 pr-4 border-2 border-input rounded-lg text-base outline-none bg-background text-foreground focus:border-blue-600 dark:focus:border-blue-500 focus:ring-2 focus:ring-ring transition-colors"
                      />
                    )}
                    <Search 
                      size={20} 
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" 
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className={`px-6 py-3 rounded-lg text-base font-medium text-white flex items-center gap-2 transition-all ${
                      loading 
                        ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                        : 'bg-blue-600 dark:bg-blue-500 cursor-pointer hover:bg-blue-700 dark:hover:bg-blue-600'
                    }`}
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search size={16} />
                        Search
                      </>
                    )}
                  </button>
                  {lastSearched && searchType === 'flight' && (
                    <button
                      onClick={handleRefresh}
                      className="p-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                      title="Refresh flight data"
                    >
                      <RefreshCw size={16} className="text-gray-500 dark:text-gray-400" />
                    </button>
                  )}
                </div>
                
                {error && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}
              </div>

              {/* Data Source Information - Accordion */}
              <div className="bg-card border border-border rounded-xl mb-6 overflow-hidden">
                <button
                  onClick={() => setShowDataSourceInfo(!showDataSourceInfo)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-500 rounded-full" />
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white m-0">
                      Data Source Information
                    </h3>
                  </div>
                  {showDataSourceInfo ? (
                    <ChevronUp size={20} className="text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-500 dark:text-gray-400" />
                  )}
                </button>
                
                {showDataSourceInfo && (
                  <div className="px-5 pb-5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    <p className="m-0 mb-3 text-gray-700 dark:text-gray-300">
                      <strong className="text-gray-900 dark:text-white">Current Status:</strong> We're using <strong className="text-blue-600 dark:text-blue-400">OpenSky Network</strong> as our primary flight tracking source - it's completely free and provides real-time flight positions!
                    </p>
                    
                    <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                        <span className="text-sm font-semibold text-green-800 dark:text-green-300">
                          OpenSky Network (Primary Source)
                        </span>
                      </div>
                      <ul className="m-0 pl-5 text-xs text-green-900 dark:text-green-200 space-y-1">
                        <li>✅ <strong>100% Free</strong> - No API key required</li>
                        <li>✅ <strong>Unlimited requests</strong> - No rate limits</li>
                        <li>✅ <strong>Real-time positions</strong> - Live flight tracking</li>
                        <li>✅ <strong>Active flights only</strong> - Currently in the air</li>
                        <li>✅ <strong>Position data</strong> - Latitude, longitude, altitude, speed, heading</li>
                      </ul>
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Plane size={16} className="text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                          AviationStack (Enhancement)
                        </span>
                      </div>
                      <ul className="m-0 pl-5 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                        <li>Used to enhance OpenSky data with route information</li>
                        <li>Free tier: 100 requests/month</li>
                        <li>Provides: Airport names, terminals, gates, scheduled times</li>
                      </ul>
                    </div>
                    
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={16} className="text-yellow-600 dark:text-yellow-400" />
                        <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                          Limitations
                        </span>
                      </div>
                      <ul className="m-0 pl-5 text-xs text-yellow-900 dark:text-yellow-200 space-y-1">
                        <li>OpenSky: Only shows flights currently in the air (no scheduled flights)</li>
                        <li>OpenSky: No historical data or route information</li>
                        <li>Some airport/route information may be estimated based on airline and position</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Assigned Vendor Pickup Info */}
              {transferData && transferData.vendor_details && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Truck size={20} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white m-0">
                      Assigned Vendor Pickup Information
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vendor</div>
                      <div 
                        onClick={() => navigate(`/vendors?search=${transferData.vendor_details.vendor_id}`)}
                        className="text-sm font-semibold text-blue-600 dark:text-blue-400 cursor-pointer underline"
                      >
                        {transferData.vendor_details.vendor_name || transferData.vendor_details.vendor_id}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Customer</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {transferData.customer_details?.name || 'N/A'}
                      </div>
                      {transferData.traveler_details?.name && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Traveler: {transferData.traveler_details.name}
                        </div>
                      )}
                    </div>
                    
                    {transferData.transfer_details?.pickup_location && (
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pickup Location</div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {transferData.transfer_details.pickup_location}
                        </div>
                      </div>
                    )}
                    
                    {transferData.transfer_details?.estimated_pickup_time && (
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estimated Pickup</div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(transferData.transfer_details.estimated_pickup_time).toLocaleString()}
                        </div>
                      </div>
                    )}
                    
                    {transferData.assigned_driver_details && (
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Driver</div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {transferData.assigned_driver_details.name || transferData.assigned_driver_details.driver_name || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {transferData.assigned_driver_details.vehicle_type || 'N/A'} • {transferData.assigned_driver_details.vehicle_number || transferData.assigned_driver_details.vehicle_license || 'N/A'}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                    <span className={`px-3 py-1 rounded text-xs font-semibold capitalize ${
                      transferData.transfer_details?.transfer_status === 'completed' 
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : transferData.transfer_details?.transfer_status === 'in_progress' || transferData.transfer_details?.transfer_status === 'enroute'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                    }`}>
                      Transfer Status: {transferData.transfer_details?.transfer_status || 'Pending'}
                    </span>
                  </div>
                </div>
              )}

              {/* Flight Information */}
              {flightData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Flight Details */}
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-5">
                      Flight Information
                    </h2>

                    {/* Flight Status */}
                    <div className={`bg-slate-50 dark:bg-gray-700/50 border-2 rounded-xl p-4 mb-6 ${
                      flightData.status === 'landed' || flightData.status === 'arrived'
                        ? 'border-green-500 dark:border-green-400'
                        : flightData.status === 'delayed' || flightData.status === 'delayed_arrival'
                        ? 'border-yellow-500 dark:border-yellow-400'
                        : flightData.status === 'cancelled'
                        ? 'border-red-500 dark:border-red-400'
                        : 'border-blue-500 dark:border-blue-400'
                    }`}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-3 h-3 rounded-full ${
                          flightData.status === 'landed' || flightData.status === 'arrived'
                            ? 'bg-green-500'
                            : flightData.status === 'delayed' || flightData.status === 'delayed_arrival'
                            ? 'bg-yellow-500'
                            : flightData.status === 'cancelled'
                            ? 'bg-red-500'
                            : 'bg-blue-500'
                        }`} />
                        <span className={`text-lg font-bold capitalize ${
                          flightData.status === 'landed' || flightData.status === 'arrived'
                            ? 'text-green-600 dark:text-green-500'
                            : flightData.status === 'delayed' || flightData.status === 'delayed_arrival'
                            ? 'text-yellow-600 dark:text-yellow-500'
                            : flightData.status === 'cancelled'
                            ? 'text-red-600 dark:text-red-500'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}>
                          {flightData.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 m-0">
                        {getStatusDescription(flightData.status)}
                      </p>
                    </div>

                    {/* Flight Details */}
                    <div className="grid gap-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Flight Number</span>
                        <span className="text-base font-semibold text-gray-900 dark:text-white">
                          {flightData.flightNumber}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Airline</span>
                        <span className="text-base font-medium text-gray-900 dark:text-white">
                          {flightData.airline}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Aircraft</span>
                        <span className="text-base font-medium text-gray-900 dark:text-white">
                          {flightData.aircraft}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Data Source</span>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded uppercase">
                          {flightData.source}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Route Information */}
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white m-0">
                        Route Information
                      </h2>
                      {flightData.routeEstimated && (
                        <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded border border-yellow-300 dark:border-yellow-700">
                          <AlertCircle size={12} className="inline mr-1" />
                          Estimated Route
                        </span>
                      )}
                    </div>

                    {/* Departure */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Departure</span>
                      </div>
                      
                      <div className="ml-4">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {flightData.departure.airport}
                          </div>
                          {flightData.departure.isEstimated && (
                            <span className="text-xs text-yellow-600 dark:text-yellow-400">(Est.)</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          {flightData.departure.iata}
                        </div>
                        
                        <div className="grid gap-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Scheduled</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatTime(flightData.departure.scheduled)}
                            </span>
                          </div>
                          
                          {flightData.departure.actual && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500 dark:text-gray-400">Actual</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatTime(flightData.departure.actual)}
                              </span>
                            </div>
                          )}
                          
                          {flightData.departure.delay > 0 && (
                            <div className="flex justify-between">
                              <span className="text-sm text-red-600 dark:text-red-400">Delay</span>
                              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                {getDelayText(flightData.departure.delay)}
                              </span>
                            </div>
                          )}
                          
                          {flightData.departure.terminal && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500 dark:text-gray-400">Terminal</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {flightData.departure.terminal}
                              </span>
                            </div>
                          )}
                          
                          {flightData.departure.gate && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500 dark:text-gray-400">Gate</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {flightData.departure.gate}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Arrival */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Arrival</span>
                      </div>
                      
                      <div className="ml-4">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {flightData.arrival.airport}
                          </div>
                          {flightData.arrival.isEstimated && (
                            <span className="text-xs text-yellow-600 dark:text-yellow-400">(Est.)</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          {flightData.arrival.iata}
                        </div>
                        
                        <div className="grid gap-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Scheduled</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatTime(flightData.arrival.scheduled)}
                            </span>
                          </div>
                          
                          {flightData.arrival.actual && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500 dark:text-gray-400">Actual</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatTime(flightData.arrival.actual)}
                              </span>
                            </div>
                          )}
                          
                          {flightData.arrival.delay > 0 && (
                            <div className="flex justify-between">
                              <span className="text-sm text-red-600 dark:text-red-400">Delay</span>
                              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                {getDelayText(flightData.arrival.delay)}
                              </span>
                            </div>
                          )}
                          
                          {flightData.arrival.terminal && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500 dark:text-gray-400">Terminal</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {flightData.arrival.terminal}
                              </span>
                            </div>
                          )}
                          
                          {flightData.arrival.gate && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500 dark:text-gray-400">Gate</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {flightData.arrival.gate}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* All Flights Tab */}
              <div className="mb-6">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search flights by number, airline, route, client, or traveler..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full py-3 pl-10 pr-3 border border-input rounded-lg text-sm outline-none bg-background text-foreground focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Flights Table */}
              <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                {loadingFlights ? (
                  <div className="p-12 text-center">
                    <div className="text-base text-muted-foreground">Loading flights...</div>
                  </div>
                ) : filteredFlights.length > 0 ? (
                  <div>
                    {/* Table Header */}
                    <div className="grid grid-cols-8 gap-4 px-6 py-4 bg-muted/30 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <div>Flight</div>
                      <div>Airline</div>
                      <div>Route</div>
                      <div>Customer</div>
                      <div>Status</div>
                      <div>Scheduled</div>
                      <div>Actual</div>
                      <div>Delay</div>
                    </div>

                    {/* Table Rows */}
                    {filteredFlights.map((flight) => (
                      <div
                        key={flight.id}
                        onClick={() => navigate(`/transfers?id=${flight.transferId}`)}
                        className="grid grid-cols-8 gap-4 px-6 py-4 border-b border-border items-center text-sm hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <div className="font-semibold text-foreground">
                          {flight.flightNumber}
                        </div>
                        
                        <div className="text-foreground">
                          {flight.airline}
                        </div>
                        
                        <div>
                          <div className="font-medium text-foreground">
                            {flight.departure} → {flight.arrival}
                          </div>
                          {flight.terminal && (
                            <div className="text-xs text-muted-foreground">
                              Terminal {flight.terminal}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-foreground">
                          <div className="font-medium">{flight.clientName}</div>
                          {flight.travelerName ? (
                            <div className="text-xs text-muted-foreground mt-0.5">{flight.travelerName}</div>
                          ) : (
                            <div className="text-xs text-muted-foreground/60 mt-0.5 italic">No traveler assigned</div>
                          )}
                        </div>
                        
                        <div>
                          <span className={`${getStatusBg(flight.status)} ${getStatusTextColor(flight.status)} px-2 py-1 rounded text-xs font-medium capitalize border`}>
                            {flight.status}
                          </span>
                        </div>
                        
                        <div className="text-foreground">
                          {flight.scheduled_time ? new Date(flight.scheduled_time).toLocaleString() : 'N/A'}
                        </div>
                        
                        <div className={flight.actual_time ? 'text-foreground' : 'text-muted-foreground'}>
                          {flight.actual_time ? new Date(flight.actual_time).toLocaleString() : 'N/A'}
                        </div>
                        
                        <div className={`font-medium ${
                          flight.delay_minutes > 0 ? 'text-warning-600 dark:text-warning-500' : 
                          flight.delay_minutes < 0 ? 'text-success-600 dark:text-success-500' : 
                          'text-muted-foreground'
                        }`}>
                          {flight.delay_minutes > 0 ? `+${flight.delay_minutes}m` :
                           flight.delay_minutes < 0 ? `${flight.delay_minutes}m` : 'On time'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="text-base text-muted-foreground mb-2">
                      {searchTerm ? 'No flights found matching your search' : 'No flights found'}
                    </div>
                    <div className="text-sm text-muted-foreground/70">
                      {searchTerm ? 'Try adjusting your search terms' : 'Flights will appear here once transfers with flight details are created'}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Flights
