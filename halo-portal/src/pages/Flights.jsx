import { useState, useEffect } from 'react'
import { Search, Filter, Plus, Plane, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

const Flights = () => {
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFlights()
  }, [])

  const fetchFlights = async () => {
    try {
      setLoading(true)
      // Mock flight data
      const mockFlights = [
        {
          id: 'AI202',
          airline: 'Air India',
          departure: 'DXB',
          arrival: 'BOM',
          scheduled_time: '2024-01-15T14:30:00Z',
          actual_time: '2024-01-15T14:45:00Z',
          status: 'landed',
          terminal: 'T2',
          delay_minutes: 15
        },
        {
          id: 'EK501',
          airline: 'Emirates',
          departure: 'DXB',
          arrival: 'BOM',
          scheduled_time: '2024-01-15T16:00:00Z',
          actual_time: null,
          status: 'delayed',
          terminal: 'T2',
          delay_minutes: 45
        },
        {
          id: 'SG123',
          airline: 'SpiceJet',
          departure: 'DEL',
          arrival: 'BOM',
          scheduled_time: '2024-01-15T18:00:00Z',
          actual_time: '2024-01-15T17:55:00Z',
          status: 'landed',
          terminal: 'T2',
          delay_minutes: -5
        }
      ]
      
      setFlights(mockFlights)
    } catch (error) {
      console.error('Error fetching flights:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'landed': return 'text-success-600 dark:text-success-500'
      case 'delayed': return 'text-warning-600 dark:text-warning-500'
      case 'cancelled': return 'text-danger-600 dark:text-danger-500'
      case 'on_time': return 'text-primary-600 dark:text-primary-400'
      default: return 'text-muted-foreground'
    }
  }

  const getStatusBg = (status) => {
    switch (status) {
      case 'landed': return 'bg-success-50 dark:bg-success-950 border-success-200 dark:border-success-800'
      case 'delayed': return 'bg-warning-50 dark:bg-warning-950 border-warning-200 dark:border-warning-800'
      case 'cancelled': return 'bg-danger-50 dark:bg-danger-950 border-danger-200 dark:border-danger-800'
      case 'on_time': return 'bg-primary-50 dark:bg-primary-950 border-primary-300 dark:border-primary-700'
      default: return 'bg-muted border-border'
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground m-0">
          Flights
        </h1>
        <p className="text-muted-foreground mt-2 mb-0">
          Monitor flight arrivals and departures
        </p>
      </div>

      {/* Controls */}
      <div className="bg-card p-6 rounded-xl shadow-sm border border-border mb-6">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="relative flex-1 min-w-[300px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search flights..."
              className="w-full py-3 pl-10 pr-3 border border-input rounded-lg text-sm outline-none bg-background text-foreground focus:ring-2 focus:ring-ring"
            />
          </div>
          
          <button className="flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground border-none rounded-lg text-sm font-medium cursor-pointer hover:bg-primary/90 transition-colors">
            <Plus size={16} />
            Add Flight
          </button>
        </div>
      </div>

      {/* Flights Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="text-base text-muted-foreground">Loading flights...</div>
          </div>
        ) : flights.length > 0 ? (
          <div>
            {/* Table Header */}
            <div className="grid grid-cols-7 gap-4 px-6 py-4 bg-muted/30 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div>Flight</div>
              <div>Airline</div>
              <div>Route</div>
              <div>Status</div>
              <div>Scheduled</div>
              <div>Actual</div>
              <div>Delay</div>
            </div>

            {/* Table Rows */}
            {flights.map((flight) => (
              <div
                key={flight.id}
                className="grid grid-cols-7 gap-4 px-6 py-4 border-b border-border items-center text-sm hover:bg-muted/30 transition-colors"
              >
                <div className="font-semibold text-foreground">
                  {flight.id}
                </div>
                
                <div className="text-foreground">
                  {flight.airline}
                </div>
                
                <div>
                  <div className="font-medium text-foreground">
                    {flight.departure} → {flight.arrival}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Terminal {flight.terminal}
                  </div>
                </div>
                
                <div>
                  <span className={`${getStatusBg(flight.status)} ${getStatusColor(flight.status)} px-2 py-1 rounded text-xs font-medium capitalize border`}>
                    {flight.status}
                  </span>
                </div>
                
                <div className="text-foreground">
                  {new Date(flight.scheduled_time).toLocaleString()}
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
              No flights found
            </div>
            <div className="text-sm text-muted-foreground/70">
              No flights to display
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Flights