import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Truck, CheckCircle, Users, Plane, Plus, UserPlus, BarChart3, Calendar, Building2, UserCheck, Briefcase, ArrowDownCircle, ArrowUpCircle, Navigation, ChevronRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import AIInsightsCard from '../components/AIInsightsCard'
import { useNavigate } from 'react-router-dom'
import { getTransferDisplayName, getClientAndTravelerNames, getAirlineDisplay, hasRealFlight } from '../utils/transferUtils'

const STATUS_ORDER = ['pending', 'assigned', 'enroute', 'waiting', 'in_progress', 'completed']
const STATUS_LABELS = {
  pending: 'Pending',
  assigned: 'Assigned',
  enroute: 'En Route',
  waiting: 'Waiting',
  in_progress: 'In Progress',
  completed: 'Completed'
}

const StatCard = ({ icon: Icon, label, value, loading, onClick, accent = 'primary' }) => {
  const accentMap = {
    primary: 'bg-primary',
    success: 'bg-emerald-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500'
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-md ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className={`absolute left-0 top-0 h-full w-1 ${accentMap[accent] || accentMap.primary}`} />
      <div className="flex items-start justify-between pl-1">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
            {loading ? (
              <span className="inline-block h-8 w-12 animate-pulse rounded bg-muted" />
            ) : (
              value
            )}
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2.5 transition-colors group-hover:bg-primary/10">
          <Icon size={20} className="text-muted-foreground group-hover:text-primary" />
        </div>
      </div>
    </motion.div>
  )
}

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [userStats, setUserStats] = useState({ clients: 0, vendors: 0, drivers: 0, travelers: 0 })
  const [recentTransfers, setRecentTransfers] = useState([])
  const [todayOverview, setTodayOverview] = useState({
    flightsArriving: 0,
    flightsDeparting: 0,
    transfersScheduled: 0,
    customersTraveling: 0
  })
  const [loading, setLoading] = useState(true)
  const [userStatsLoading, setUserStatsLoading] = useState(true)
  const [todayLoading, setTodayLoading] = useState(true)
  const { user, can, isRole } = useAuth()
  const navigate = useNavigate()

  const isAdmin = isRole('SUPER_ADMIN') || isRole('ADMIN')
  const isClient = isRole('CLIENT')

  useEffect(() => {
    if (!user) return
    fetchDashboardData()
    if (isAdmin) {
      fetchUserStats()
      fetchTodayOverview()
    } else {
      fetchTodayOverview()
    }
  }, [user, isAdmin])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'
      const token = localStorage.getItem('token')
      const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }
      const [statsResponse, transfersResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/transfers/stats`, { headers }).then(res => res.json()),
        fetch(`${API_BASE_URL}/transfers?limit=6`, { headers }).then(res => res.json())
      ])
      if (statsResponse.success) setStats(statsResponse.data)
      if (transfersResponse.success) setRecentTransfers(transfersResponse.data || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserStats = async () => {
    try {
      setUserStatsLoading(true)
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'
      const token = localStorage.getItem('token')
      const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }
      const response = await fetch(`${API_BASE_URL}/users/stats`, { headers }).then(res => res.json())
      if (response.success) setUserStats(response.data)
    } catch (error) {
      console.error('Error fetching user stats:', error)
    } finally {
      setUserStatsLoading(false)
    }
  }

  const fetchTodayOverview = async () => {
    try {
      setTodayLoading(true)
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'
      const token = localStorage.getItem('token')
      const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0)
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
      const transfersResponse = await fetch(
        `${API_BASE_URL}/transfers?date_from=${startOfDay.toISOString()}&date_to=${endOfDay.toISOString()}&limit=100`,
        { headers }
      ).then(res => res.json())
      if (transfersResponse.success && transfersResponse.data) {
        const transfers = transfersResponse.data
        // Only count transfers with real flights (exclude XX000, TBD placeholders)
        const flightsArriving = transfers.filter(t => {
          if (!hasRealFlight(t.flight_details)) return false
          const arrivalTime = new Date(t.flight_details?.arrival_time || t.flight_details?.scheduled_arrival)
          return !isNaN(arrivalTime.getTime()) && arrivalTime >= startOfDay && arrivalTime <= endOfDay
        }).length
        const inToday = (d) => {
          if (!d) return false
          const dt = new Date(d)
          return !isNaN(dt.getTime()) && dt >= startOfDay && dt <= endOfDay
        }
        const flightsDeparting = transfers.filter(t => {
          const onwardDep = t.flight_details?.departure_time || t.flight_details?.scheduled_departure
          const returnDep = t.return_flight_details?.departure_time
          return (hasRealFlight(t.flight_details) && inToday(onwardDep)) ||
                 (hasRealFlight(t.return_flight_details) && inToday(returnDep))
        }).length
        const withRealFlights = transfers.filter(t => hasRealFlight(t.flight_details) || hasRealFlight(t.return_flight_details))
        const uniqueCustomers = new Set(withRealFlights.map(t => t.customer_details?.name || t.customer_id)).size
        setTodayOverview({
          flightsArriving,
          flightsDeparting,
          transfersScheduled: withRealFlights.length,
          customersTraveling: uniqueCustomers
        })
      }
    } catch (error) {
      console.error('Error fetching today overview:', error)
    } finally {
      setTodayLoading(false)
    }
  }

  const statusCount = (key) => stats?.byStatus?.[key] || 0
  const todayDate = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin ? 'Event operations at a glance' : 'Your transfers and travelers'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">{todayDate}</p>
      </motion.div>

      {/* Primary KPIs */}
      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={ArrowDownCircle}
          label="Arrivals today"
          value={stats?.todayArrivals ?? todayOverview?.flightsArriving ?? 0}
          loading={loading}
          onClick={() => navigate('/flights')}
          accent="primary"
        />
        <StatCard
          icon={ArrowUpCircle}
          label="Departures today"
          value={stats?.todayDepartures ?? todayOverview?.flightsDeparting ?? 0}
          loading={loading}
          onClick={() => navigate('/flights')}
          accent="success"
        />
        <StatCard
          icon={Truck}
          label="Total transfers"
          value={stats?.total || 0}
          loading={loading}
          onClick={() => navigate('/transfers')}
          accent="blue"
        />
        <StatCard
          icon={CheckCircle}
          label="Completed"
          value={statusCount('completed')}
          loading={loading}
          onClick={() => navigate('/transfers?status=completed')}
          accent="success"
        />
      </div>

      {/* Status pipeline - horizontal bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-10"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Status overview</h2>
          <button
            onClick={() => navigate('/transfers')}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View all <ChevronRight size={14} />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_ORDER.map(status => (
            <button
              key={status}
              onClick={() => navigate(`/transfers?status=${status}`)}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <span className="text-lg font-semibold tabular-nums text-foreground">
                {loading ? '—' : statusCount(status)}
              </span>
              <span className="text-xs text-muted-foreground">{STATUS_LABELS[status]}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Two-column layout */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left: Today + Admin stats */}
        <div className="space-y-8 lg:col-span-2">
          {/* Today */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="mb-5 flex items-center gap-2">
              <Calendar size={18} className="text-muted-foreground" />
              <h2 className="text-base font-semibold text-foreground">Today</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Arriving', value: todayOverview.flightsArriving, icon: Plane, href: '/flights' },
                { label: 'Departing', value: todayOverview.flightsDeparting, icon: Plane, href: '/flights' },
                { label: 'Scheduled', value: todayOverview.transfersScheduled, icon: Truck, href: '/transfers' },
                { label: 'Travelers', value: todayOverview.customersTraveling, icon: Users, href: '/transfers' }
              ].map(({ label, value, icon: Icon, href }) => (
                <div
                  key={label}
                  onClick={() => navigate(href)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 transition-colors hover:bg-muted/40"
                >
                  <Icon size={18} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-xl font-semibold tabular-nums text-foreground">
                      {todayLoading ? '—' : (value ?? 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Admin user stats */}
          {isAdmin && (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-xl border border-border bg-card p-6"
            >
              <div className="mb-5 flex items-center gap-2">
                <Building2 size={18} className="text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">Platform</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: 'Clients', value: userStats.clients, icon: Briefcase, href: '/user-management' },
                  { label: 'Vendors', value: userStats.vendors, icon: Building2, href: '/user-management' },
                  { label: 'Drivers', value: userStats.drivers, icon: Truck, href: '/drivers' },
                  { label: 'Travelers', value: userStats.travelers, icon: UserCheck, href: '/travelers' }
                ].map(({ label, value, icon: Icon, href }) => (
                  <div
                    key={label}
                    onClick={() => navigate(href)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 transition-colors hover:bg-muted/40"
                  >
                    <Icon size={18} className="text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-xl font-semibold tabular-nums text-foreground">
                        {userStatsLoading ? '—' : value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}
        </div>

        {/* Right: AI Insights or Quick actions */}
        <div className="space-y-8">
          {isAdmin && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
            >
              <AIInsightsCard />
            </motion.div>
          )}

          {/* Quick actions */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-border bg-card p-6"
          >
            <h2 className="mb-4 text-base font-semibold text-foreground">Quick actions</h2>
            <div className="space-y-2">
              {(isAdmin || isClient) && (
                <button
                  onClick={() => navigate('/tracking')}
                  className="flex w-full items-center gap-3 rounded-lg border border-border/60 bg-transparent px-4 py-3 text-left transition-colors hover:bg-muted/30"
                >
                  <Navigation size={18} className="text-muted-foreground" />
                  <span className="text-sm font-medium">Track transfer</span>
                </button>
              )}
              {can('manage_transfers') && (
                <button
                  onClick={() => navigate('/transfers')}
                  className="flex w-full items-center gap-3 rounded-lg border border-border/60 bg-transparent px-4 py-3 text-left transition-colors hover:bg-muted/30"
                >
                  <Plus size={18} className="text-muted-foreground" />
                  <span className="text-sm font-medium">Add transfer</span>
                </button>
              )}
              {can('manage_drivers') && (
                <button
                  onClick={() => navigate('/drivers')}
                  className="flex w-full items-center gap-3 rounded-lg border border-border/60 bg-transparent px-4 py-3 text-left transition-colors hover:bg-muted/30"
                >
                  <UserPlus size={18} className="text-muted-foreground" />
                  <span className="text-sm font-medium">Manage drivers</span>
                </button>
              )}
              {isAdmin && can('view_reports') && (
                <button
                  onClick={() => navigate('/reports')}
                  className="flex w-full items-center gap-3 rounded-lg border border-border/60 bg-transparent px-4 py-3 text-left transition-colors hover:bg-muted/30"
                >
                  <BarChart3 size={18} className="text-muted-foreground" />
                  <span className="text-sm font-medium">View reports</span>
                </button>
              )}
              {isClient && (
                <button
                  onClick={() => navigate('/travelers')}
                  className="flex w-full items-center gap-3 rounded-lg border border-border/60 bg-transparent px-4 py-3 text-left transition-colors hover:bg-muted/30"
                >
                  <UserCheck size={18} className="text-muted-foreground" />
                  <span className="text-sm font-medium">My travelers</span>
                </button>
              )}
            </div>
          </motion.section>
        </div>
      </div>

      {/* Recent transfers */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mt-10"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Recent transfers</h2>
          <button
            onClick={() => navigate('/transfers')}
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </button>
        </div>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="divide-y divide-border p-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-4 py-4">
                  <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
                  <div className="flex-1">
                    <div className="mb-2 h-4 w-48 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentTransfers.length > 0 ? (
            <div className="divide-y divide-border">
              {recentTransfers.map(transfer => {
                const status = transfer.transfer_details?.transfer_status || transfer.transfer_details?.status || 'pending'
                const statusStyles = {
                  completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                  in_progress: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                  enroute: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                  waiting: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                  assigned: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                  pending: 'bg-muted text-muted-foreground',
                  cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400'
                }
                const { companyName, clientName, travelerName } = getClientAndTravelerNames(transfer)
                return (
                  <div
                    key={transfer._id}
                    onClick={() => navigate(`/transfers?id=${transfer._id}`)}
                    className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                        <Truck size={18} className="text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {companyName || clientName || getTransferDisplayName(transfer)}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {getAirlineDisplay(transfer.flight_details)} • {transfer.flight_details?.departure_airport} → {transfer.flight_details?.arrival_airport}
                          {travelerName && ` • ${travelerName}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${statusStyles[status] || statusStyles.pending}`}>
                        {STATUS_LABELS[status] || status}
                      </span>
                      <ChevronRight size={16} className="text-muted-foreground" />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 rounded-full bg-muted/50 p-4">
                <Truck size={24} className="text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">No transfers yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Transfers will appear here once created</p>
            </div>
          )}
        </div>
      </motion.section>
    </div>
  )
}

export default Dashboard
