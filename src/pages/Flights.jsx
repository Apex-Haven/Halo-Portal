import { useState, useEffect } from 'react'
import { Search, Plane, MapPin, AlertCircle, User, Filter, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getTransferDisplayName, getClientAndTravelerNames, formatDateTimeFriendly } from '../utils/transferUtils'

const Flights = () => {
  const [activeTab, setActiveTab] = useState('all-flights')

  // All Flights Tab State - filter type and search term
  const [searchType, setSearchType] = useState(() => {
    return localStorage.getItem('flight_tracking_search_type') || 'flight'
  })
  const [allFlights, setAllFlights] = useState([])
  const [loadingFlights, setLoadingFlights] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('company') // 'company' | 'latest'

  // Global Flight Search Tab State (FlightStats)
  const [globalFlightNumber, setGlobalFlightNumber] = useState('')
  const [globalFlightDate, setGlobalFlightDate] = useState(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10)
  })
  const [globalFlightData, setGlobalFlightData] = useState(null)
  const [globalLoading, setGlobalLoading] = useState(false)
  const [globalError, setGlobalError] = useState(null)

  // Load search state from localStorage and URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const flightParam = params.get('flight')
    if (flightParam) {
      setSearchTerm(flightParam)
      setSearchType('flight')
      setActiveTab('all-flights')
      localStorage.setItem('flight_tracking_search_type', 'flight')
    }
  }, [])

  // Save search state to localStorage
  useEffect(() => {
    localStorage.setItem('flight_tracking_search_type', searchType)
  }, [searchType])

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
            const { companyName, clientName, travelerName } = getClientAndTravelerNames(transfer)
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
              companyName,
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

  const handleGlobalFlightSearch = async () => {
    if (!globalFlightNumber.trim()) {
      toast.error('Please enter a flight number')
      return
    }
    setGlobalLoading(true)
    setGlobalError(null)
    setGlobalFlightData(null)
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        flight: globalFlightNumber.trim(),
        date: globalFlightDate
      })
      const response = await fetch(`${API_BASE_URL}/flights/global-search?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setGlobalFlightData(data.data)
        toast.success('Flight details retrieved')
      } else {
        setGlobalError(data.message || 'Flight not found')
        toast.error(data.message || 'Flight not found')
      }
    } catch (err) {
      setGlobalError(err.message || 'Search failed')
      toast.error(err.message || 'Search failed')
    } finally {
      setGlobalLoading(false)
    }
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

  // Filter flights based on search term and filter type
  const filteredFlights = allFlights.filter(flight => {
    if (!searchTerm.trim()) return true
    const search = searchTerm.trim().toLowerCase()
    switch (searchType) {
      case 'flight':
        return flight.flightNumber?.toLowerCase().includes(search) || flight.airline?.toLowerCase().includes(search)
      case 'customer':
        return (
          flight.companyName?.toLowerCase().includes(search) ||
          flight.clientName?.toLowerCase().includes(search) ||
          flight.travelerName?.toLowerCase().includes(search) ||
          flight.customerName?.toLowerCase().includes(search)
        )
      case 'airport':
        return (
          flight.departure?.toLowerCase().includes(search) ||
          flight.arrival?.toLowerCase().includes(search)
        )
      case 'company':
        return flight.companyName?.toLowerCase().includes(search) || flight.clientName?.toLowerCase().includes(search)
      default:
        return (
          flight.flightNumber?.toLowerCase().includes(search) ||
          flight.airline?.toLowerCase().includes(search) ||
          flight.departure?.toLowerCase().includes(search) ||
          flight.arrival?.toLowerCase().includes(search) ||
          flight.companyName?.toLowerCase().includes(search) ||
          flight.clientName?.toLowerCase().includes(search) ||
          flight.travelerName?.toLowerCase().includes(search) ||
          flight.customerName?.toLowerCase().includes(search)
        )
    }
  })

  // Sort: by company or latest
  const sortedFlights = [...filteredFlights].sort((a, b) => {
    if (sortBy === 'company') {
      const companyA = (a.companyName || a.clientName || '').toLowerCase()
      const companyB = (b.companyName || b.clientName || '').toLowerCase()
      return companyA.localeCompare(companyB)
    }
    const dateA = new Date(a.scheduled_time || 0)
    const dateB = new Date(b.scheduled_time || 0)
    return dateB - dateA
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
          <button
            onClick={() => setActiveTab('global-search')}
            className={`flex-1 px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'global-search'
                ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Search size={18} />
              Global Flight Search
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'all-flights' ? (
            <>
              {/* All Flights Tab - Filter */}
              <div className="mb-6">
                <div className="flex gap-2 mb-4 flex-wrap">
                  <button
                    onClick={() => setSearchType('company')}
                    className={`px-4 py-2 rounded-md text-sm font-medium cursor-pointer flex items-center gap-1.5 transition-all ${
                      searchType === 'company'
                        ? 'bg-blue-600 dark:bg-blue-500 text-white'
                        : 'bg-transparent dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Building2 size={16} />
                    Company
                  </button>
                  <button
                    onClick={() => setSearchType('flight')}
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
                    onClick={() => setSearchType('customer')}
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
                    onClick={() => setSearchType('airport')}
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
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1">
                    <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={
                      searchType === 'flight'
                        ? 'Filter by flight number or airline...'
                        : searchType === 'customer'
                        ? 'Filter by customer or traveler name...'
                        : searchType === 'company'
                        ? 'Filter by company name...'
                        : 'Filter by airport code (e.g. BOM, DEL)...'
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full py-3 pl-10 pr-3 border border-input rounded-lg text-sm outline-none bg-background text-foreground focus:ring-2 focus:ring-ring"
                  />
                  </div>
                </div>
              </div>

              {/* Flights Table */}
              <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                {loadingFlights ? (
                  <div className="p-12 text-center">
                    <div className="text-base text-muted-foreground">Loading flights...</div>
                  </div>
                ) : sortedFlights.length > 0 ? (
                  <div>
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
                    {sortedFlights.map((flight) => (
                      <div
                        key={flight.id}
                        className="grid grid-cols-8 gap-4 px-6 py-4 border-b border-border items-center text-sm"
                      >
                        <div className="font-semibold text-foreground">{flight.flightNumber}</div>
                        <div className="text-foreground">{flight.airline}</div>
                        <div>
                          <div className="font-medium text-foreground">
                            {flight.departure} → {flight.arrival}
                          </div>
                          {flight.terminal && (
                            <div className="text-xs text-muted-foreground">Terminal {flight.terminal}</div>
                          )}
                        </div>
                        <div className="text-foreground">
                          <div className="font-medium">{flight.companyName || flight.clientName}</div>
                          {(flight.travelerName || (flight.clientName && flight.clientName !== 'N/A')) ? (
                            <div className="text-xs text-muted-foreground mt-0.5">{flight.travelerName || flight.clientName}</div>
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
                          {formatDateTimeFriendly(flight.scheduled_time) || 'N/A'}
                        </div>
                        <div className={flight.actual_time ? 'text-foreground' : 'text-muted-foreground'}>
                          {formatDateTimeFriendly(flight.actual_time) || 'N/A'}
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
                      {searchTerm ? 'No flights found matching your filter' : 'No flights found'}
                    </div>
                    <div className="text-sm text-muted-foreground/70">
                      {searchTerm ? 'Try adjusting your filter' : 'Flights will appear here once transfers with flight details are created'}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Global Flight Search Tab (FlightStats) */}
              <div className="mb-6">
                <p className="text-muted-foreground mb-4">
                  Search any flight worldwide by flight number and date.
                </p>
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium mb-1">Flight Number</label>
                    <input
                      type="text"
                      placeholder="e.g. AI602, EK512, 6E528"
                      value={globalFlightNumber}
                      onChange={(e) => setGlobalFlightNumber(e.target.value.toUpperCase())}
                      onKeyPress={(e) => e.key === 'Enter' && handleGlobalFlightSearch()}
                      className="w-full py-3 px-4 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date</label>
                    <input
                      type="date"
                      value={globalFlightDate}
                      onChange={(e) => setGlobalFlightDate(e.target.value)}
                      className="py-3 px-4 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <button
                    onClick={handleGlobalFlightSearch}
                    disabled={globalLoading}
                    className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    {globalLoading ? (
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
                </div>
                {globalError && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle size={16} />
                    {globalError}
                  </div>
                )}
              </div>

              {/* Global Flight Results */}
              {globalFlightData && (
                <div className="space-y-6">
                  <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Plane size={20} />
                      {globalFlightData.flight} - {globalFlightData.airlineName || globalFlightData.airlineCode}
                    </h2>
                    <div className={`inline-flex px-3 py-1.5 rounded-lg text-sm font-semibold mb-4 ${
                      globalFlightData.status?.toLowerCase().includes('arrived') || globalFlightData.status?.toLowerCase().includes('landed')
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : globalFlightData.status?.toLowerCase().includes('delay')
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                        : globalFlightData.status?.toLowerCase().includes('cancel')
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                    }`}>
                      {globalFlightData.status}
                      {globalFlightData.statusDescription && (
                        <span className="ml-2 font-normal">({globalFlightData.statusDescription})</span>
                      )}
                    </div>

                    {/* Route */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-muted/30 rounded-lg mb-6">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase mb-1">Departure</div>
                        <div className="font-bold text-lg">{globalFlightData.departureAirport}</div>
                        <div className="text-sm text-muted-foreground">{globalFlightData.departureAirportName}</div>
                        <div className="text-sm">{globalFlightData.departureCity}</div>
                        <div className="text-sm font-medium mt-2">
                          {formatDateTimeFriendly(globalFlightData.departureTime) || 'N/A'}
                        </div>
                      </div>
                      <div className="flex items-center justify-center">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="w-8 h-0.5 bg-border" />
                          <Plane size={16} className="rotate-90" />
                          <div className="w-8 h-0.5 bg-border" />
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground uppercase mb-1">Arrival</div>
                        <div className="font-bold text-lg">{globalFlightData.arrivalAirport}</div>
                        <div className="text-sm text-muted-foreground">{globalFlightData.arrivalAirportName}</div>
                        <div className="text-sm">{globalFlightData.arrivalCity}</div>
                        <div className="text-sm font-medium mt-2">
                          {formatDateTimeFriendly(globalFlightData.arrivalTime) || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {globalFlightData.flightDuration && (
                        <div>
                          <div className="text-xs text-muted-foreground">Duration</div>
                          <div className="font-medium">{globalFlightData.flightDuration}</div>
                        </div>
                      )}
                      {globalFlightData.equipment && (
                        <div>
                          <div className="text-xs text-muted-foreground">Aircraft</div>
                          <div className="font-medium">{globalFlightData.equipment}</div>
                        </div>
                      )}
                      {globalFlightData.terminal && (
                        <div>
                          <div className="text-xs text-muted-foreground">Terminal</div>
                          <div className="font-medium">{globalFlightData.terminal}</div>
                        </div>
                      )}
                      {globalFlightData.gate && (
                        <div>
                          <div className="text-xs text-muted-foreground">Gate</div>
                          <div className="font-medium">{globalFlightData.gate}</div>
                        </div>
                      )}
                      {globalFlightData.baggage && (
                        <div>
                          <div className="text-xs text-muted-foreground">Baggage</div>
                          <div className="font-medium">{globalFlightData.baggage}</div>
                        </div>
                      )}
                      {globalFlightData.delayMinutes > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground">Delay</div>
                          <div className="font-medium text-yellow-600 dark:text-yellow-400">{globalFlightData.delayMinutes} min</div>
                        </div>
                      )}
                      {globalFlightData.operatedBy && (
                        <div className="col-span-2">
                          <div className="text-xs text-muted-foreground">Operated By</div>
                          <div className="font-medium text-sm">{globalFlightData.operatedBy}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Flights
