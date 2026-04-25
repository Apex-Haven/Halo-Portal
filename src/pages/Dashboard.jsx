import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Truck, CheckCircle, Users, Plane, Plus, UserPlus, BarChart3, Calendar, Building2, UserCheck, Briefcase, ArrowDownCircle, ArrowUpCircle, Navigation, ChevronRight, Clock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import AIInsightsCard from '../components/AIInsightsCard'
import { useNavigate } from 'react-router-dom'
import { getTransferDisplayName, getClientAndTravelerNames, getAirlineDisplay, hasRealFlight, buildCompaniesFromTransfers } from '../utils/transferUtils'

const STATUS_ORDER = ['pending', 'assigned', 'enroute', 'waiting', 'in_progress', 'completed']
const STATUS_LABELS = {
  pending: 'Pending',
  assigned: 'Driver assigned',
  enroute: 'En Route',
  waiting: 'Waiting',
  in_progress: 'In Progress',
  completed: 'Completed'
}

/** Top-row KPIs — large gradient tiles (replaces thin left-border stat cards). */
const HeroKpiTile = ({
  icon: Icon,
  label,
  value,
  loading,
  onClick,
  gradientClass,
  iconWrapClass,
  transitionDelay = 0
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay: transitionDelay }}
    className={`group relative min-h-[148px] w-full overflow-hidden rounded-2xl border border-border/50 p-6 text-left shadow-sm transition-all duration-300 sm:min-h-[160px] sm:p-7 ${gradientClass}`}
  >
    <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 opacity-40 blur-2xl dark:bg-white/5" />
    <div className="relative flex h-full flex-col justify-between gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/90">{label}</p>
        <div className="mt-3">
          {loading ? (
            <span className="inline-block h-11 w-20 animate-pulse rounded-lg bg-muted/90 sm:h-12 sm:w-24" />
          ) : (
            <p className="text-4xl font-bold tabular-nums tracking-tight text-foreground sm:text-5xl">{value}</p>
          )}
        </div>
      </div>
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-border/30 transition-transform group-hover:scale-105 sm:h-14 sm:w-14 ${iconWrapClass}`}
      >
        <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.75} />
      </div>
    </div>
  </motion.div>
)

/** Large dashboard tile for network / platform counts (not a compact stat card). */
const NetworkBigTile = ({
  label,
  description,
  value,
  loading,
  onClick,
  icon: Icon,
  gradientClass,
  iconWrapClass,
  transitionDelay = 0,
  emphasis = false,
  hoverPreviewItems = [],
  hoverPreviewTitle = 'Preview',
  hoverPreviewMoreCount = 0
}) => {
  const hasDesc = Boolean(description)
  const sizeClass = emphasis
    ? hasDesc
      ? 'min-h-[240px] sm:min-h-[280px]'
      : 'min-h-[220px] sm:min-h-[260px]'
    : hasDesc
      ? 'min-h-[210px] sm:min-h-[240px]'
      : 'min-h-[190px] sm:min-h-[220px]'
  return (
  <motion.button
    type="button"
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: transitionDelay, ease: [0.25, 0.46, 0.45, 0.94] }}
    onClick={onClick}
    className={`group relative flex w-full flex-col rounded-2xl border border-border/60 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl ${sizeClass} ${gradientClass}`}
  >
    {/* Glow clipped inside rounded rect only — outer button stays overflow-visible so footer is never cut off */}
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gradient-to-br from-white/15 to-transparent opacity-50 blur-3xl dark:from-white/5" />
    </div>
    <div className="relative z-[1] flex flex-1 flex-col gap-4 p-7 pb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-9 sm:pb-6">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-2">
          {loading ? (
            <span
              className={`inline-block animate-pulse rounded-xl bg-muted/80 ${emphasis ? 'h-16 w-36 sm:h-20 sm:w-44' : 'h-14 w-28 sm:h-16 sm:w-36'}`}
            />
          ) : typeof value === 'string' ? (
            <p
              className={`line-clamp-2 font-bold leading-tight tracking-tight text-foreground ${emphasis ? 'text-3xl sm:text-4xl lg:text-5xl' : 'text-2xl sm:text-3xl lg:text-4xl'}`}
            >
              {value || '—'}
            </p>
          ) : (
            <p
              className={`font-bold tracking-tight tabular-nums text-foreground ${emphasis ? 'text-5xl sm:text-6xl lg:text-7xl xl:text-8xl' : 'text-4xl sm:text-5xl lg:text-6xl'}`}
            >
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          )}
        </div>
        {description ? (
          <p className="mt-3 max-w-[18rem] text-xs leading-snug text-muted-foreground sm:text-sm">{description}</p>
        ) : null}
        {hoverPreviewItems.length > 0 ? (
          <div className="pointer-events-none absolute left-4 right-4 top-4 z-20 hidden rounded-lg border border-border bg-popover/95 p-3 shadow-xl backdrop-blur md:group-hover:block">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{hoverPreviewTitle}</p>
            <div className="flex flex-wrap gap-1.5">
              {hoverPreviewItems.map((item) => (
                <span key={item} className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground/90">
                  {item}
                </span>
              ))}
            </div>
            {hoverPreviewMoreCount > 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                +{hoverPreviewMoreCount} more companies
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      <div
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ring-1 ring-border/40 backdrop-blur-sm transition-transform duration-300 group-hover:scale-105 sm:h-[4.5rem] sm:w-[4.5rem] ${iconWrapClass}`}
      >
        <Icon className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={1.5} />
      </div>
    </div>
    <div className="relative z-[2] mt-auto flex shrink-0 border-t border-border/40 bg-muted/20 px-7 py-3 sm:px-9 sm:py-3.5">
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
        Open
        <ChevronRight size={16} className="text-foreground/90 transition-transform group-hover:translate-x-0.5" />
      </span>
    </div>
  </motion.button>
  )
}

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [userStats, setUserStats] = useState({ clients: 0, vendors: 0, drivers: 0, travelers: 0 })
  const [recentTransfers, setRecentTransfers] = useState([])
  const [companySummary, setCompanySummary] = useState([])
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
  }, [user, isAdmin, isClient])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'
      const token = localStorage.getItem('token')
      const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }
      const [statsResponse, transfersResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/transfers/stats`, { headers }).then((res) => res.json()),
        fetch(`${API_BASE_URL}/transfers?limit=6`, { headers }).then((res) => res.json())
      ])

      if (statsResponse.success) setStats(statsResponse.data)
      if (transfersResponse.success) setRecentTransfers(transfersResponse.data || [])
      // Use a broader transfer set for company count/preview (same source idea as Companies page).
      const companiesResponse = await fetch(`${API_BASE_URL}/transfers?limit=500`, { headers }).then((res) => res.json())
      if (companiesResponse.success && Array.isArray(companiesResponse.data)) {
        setCompanySummary(buildCompaniesFromTransfers(companiesResponse.data))
      } else {
        setCompanySummary([])
      }
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
  const guestCompaniesMeta = useMemo(() => {
    const companyNames = companySummary.map((c) => c.companyName)
    const totalFromStats = Number(stats?.guestCompanies || 0)
    // Keep UI consistent when stats value is stale/zero but preview has companies.
    const totalCompanies = Math.max(totalFromStats, companyNames.length)
    const shown = Math.min(5, companyNames.length)
    return {
      totalCompanies,
      items: companyNames.slice(0, 5),
      moreCount: Math.max(0, totalCompanies - shown)
    }
  }, [companySummary, stats?.guestCompanies])

  return (
    <div className="mx-auto max-w-7xl">
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
          {isAdmin ? 'Event operations at a glance' : 'Transfers, travelers, and guest companies at a glance'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">{todayDate}</p>
      </motion.div>

      {/* Client primary metrics: transfers (scoped to you), travelers, guest companies on traveler profiles */}
      {isClient && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-3">
            <NetworkBigTile
              label="Transfers"
              value={stats?.total ?? 0}
              loading={loading}
              onClick={() => navigate('/transfers')}
              icon={Truck}
              emphasis
              transitionDelay={0}
              gradientClass="bg-gradient-to-br from-blue-500/[0.16] via-card to-indigo-600/[0.1] dark:from-blue-500/18 dark:via-card dark:to-indigo-950/40"
              iconWrapClass="bg-blue-500/20 text-blue-700 dark:text-blue-300"
            />
            <NetworkBigTile
              label="Travelers"
              description="People on your transfers: primary guest plus travelers in the same car."
              value={
                stats?.travelerSlotsOnTransfers != null
                  ? stats.travelerSlotsOnTransfers
                  : (stats?.travelers ?? stats?.rosterTravelers ?? 0)
              }
              loading={loading}
              onClick={() => navigate('/travelers')}
              icon={UserCheck}
              emphasis
              transitionDelay={0.05}
              gradientClass="bg-gradient-to-br from-violet-500/[0.14] via-card to-indigo-600/[0.06] dark:from-violet-500/18 dark:via-card dark:to-indigo-950/35"
              iconWrapClass="bg-violet-500/20 text-violet-700 dark:text-violet-300"
            />
            <NetworkBigTile
              label="Guest companies"
              value={guestCompaniesMeta.totalCompanies}
              loading={loading}
              onClick={() => navigate('/companies')}
              icon={Building2}
              emphasis
              transitionDelay={0.1}
              gradientClass="bg-gradient-to-br from-teal-500/[0.12] via-card to-cyan-600/[0.08] dark:from-teal-500/15 dark:via-card dark:to-cyan-950/35"
              iconWrapClass="bg-teal-500/20 text-teal-800 dark:text-teal-300"
              hoverPreviewItems={guestCompaniesMeta.items}
              hoverPreviewTitle="Companies"
              hoverPreviewMoreCount={guestCompaniesMeta.moreCount}
            />
          </div>
        </motion.section>
      )}

      {/* Primary KPIs — hero gradient tiles (clients: no duplicate total; use upcoming instead) */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
        <HeroKpiTile
          icon={ArrowDownCircle}
          label="Arrivals today"
          value={stats?.todayArrivals ?? todayOverview?.flightsArriving ?? 0}
          loading={loading}
          transitionDelay={0}
          gradientClass="bg-gradient-to-br from-cyan-500/[0.12] via-card to-teal-600/[0.06] dark:from-cyan-500/15 dark:via-card dark:to-teal-950/30"
          iconWrapClass="bg-cyan-500/15 text-cyan-700 dark:text-cyan-300"
        />
        <HeroKpiTile
          icon={ArrowUpCircle}
          label="Departures today"
          value={stats?.todayDepartures ?? todayOverview?.flightsDeparting ?? 0}
          loading={loading}
          transitionDelay={0.04}
          gradientClass="bg-gradient-to-br from-emerald-500/[0.12] via-card to-green-600/[0.06] dark:from-emerald-500/15 dark:via-card dark:to-green-950/30"
          iconWrapClass="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
        />
        {isClient ? (
          <HeroKpiTile
            icon={Clock}
            label="Upcoming"
            value={stats?.upcoming ?? 0}
            loading={loading}
            transitionDelay={0.08}
            gradientClass="bg-gradient-to-br from-amber-500/[0.12] via-card to-orange-600/[0.06] dark:from-amber-500/14 dark:via-card dark:to-orange-950/28"
            iconWrapClass="bg-amber-500/15 text-amber-800 dark:text-amber-300"
          />
        ) : (
          <HeroKpiTile
            icon={Truck}
            label="Total transfers"
            value={stats?.total || 0}
            loading={loading}
            transitionDelay={0.08}
            gradientClass="bg-gradient-to-br from-blue-500/[0.12] via-card to-indigo-600/[0.07] dark:from-blue-500/15 dark:via-card dark:to-indigo-950/35"
            iconWrapClass="bg-blue-500/15 text-blue-700 dark:text-blue-300"
          />
        )}
        <HeroKpiTile
          icon={CheckCircle}
          label="Completed"
          value={statusCount('completed')}
          loading={loading}
          transitionDelay={0.12}
          gradientClass="bg-gradient-to-br from-violet-500/[0.1] via-card to-fuchsia-600/[0.06] dark:from-violet-500/12 dark:via-card dark:to-fuchsia-950/25"
          iconWrapClass="bg-violet-500/15 text-violet-700 dark:text-violet-300"
        />
      </div>

      {/* Network — large tiles (admin): travelers, companies, vendors, drivers */}
      {isAdmin && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="mb-12"
        >
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Network</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Travelers and companies on the platform, plus partners and drivers — tap a tile to open the list.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-2">
            <NetworkBigTile
              label="Travelers"
              description="Traveler accounts on the platform."
              value={userStats.travelers}
              loading={userStatsLoading}
              onClick={() => navigate('/travelers')}
              icon={UserCheck}
              emphasis
              transitionDelay={0}
              gradientClass="bg-gradient-to-br from-violet-500/[0.14] via-card to-indigo-600/[0.06] dark:from-violet-500/18 dark:via-card dark:to-indigo-950/35"
              iconWrapClass="bg-violet-500/20 text-violet-700 dark:text-violet-300"
            />
            <NetworkBigTile
              label="Companies"
              description="Companies coming to this event from transfer records."
              value={guestCompaniesMeta.totalCompanies}
              loading={loading}
              onClick={() => navigate('/companies')}
              icon={Briefcase}
              emphasis
              transitionDelay={0.06}
              gradientClass="bg-gradient-to-br from-sky-500/[0.12] via-card to-blue-600/[0.08] dark:from-sky-500/15 dark:via-card dark:to-blue-950/40"
              iconWrapClass="bg-sky-500/20 text-sky-800 dark:text-sky-300"
              hoverPreviewItems={guestCompaniesMeta.items}
              hoverPreviewTitle="Companies"
              hoverPreviewMoreCount={guestCompaniesMeta.moreCount}
            />
            <NetworkBigTile
              label="Vendors"
              description="Vendor accounts."
              value={userStats.vendors}
              loading={userStatsLoading}
              onClick={() => navigate('/user-management')}
              icon={Building2}
              transitionDelay={0.1}
              gradientClass="bg-gradient-to-br from-amber-500/[0.12] via-card to-orange-600/[0.06] dark:from-amber-500/14 dark:via-card dark:to-orange-950/30"
              iconWrapClass="bg-amber-500/20 text-amber-800 dark:text-amber-300"
            />
            <NetworkBigTile
              label="Drivers"
              description="Driver profiles."
              value={userStats.drivers}
              loading={userStatsLoading}
              onClick={() => navigate('/drivers')}
              icon={Truck}
              transitionDelay={0.14}
              gradientClass="bg-gradient-to-br from-emerald-500/[0.12] via-card to-teal-600/[0.07] dark:from-emerald-500/15 dark:via-card dark:to-teal-950/35"
              iconWrapClass="bg-emerald-500/20 text-emerald-800 dark:text-emerald-300"
            />
          </div>
        </motion.section>
      )}

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
            <div
              key={status}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-left"
            >
              <span className="text-lg font-semibold tabular-nums text-foreground">
                {loading ? '—' : statusCount(status)}
              </span>
              <span className="text-xs text-muted-foreground">{STATUS_LABELS[status]}</span>
            </div>
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
            className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
          >
            <div className="border-b border-border/60 bg-muted/20 px-6 py-4">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Today</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Activity for the current calendar day</p>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4 lg:p-5">
              {[
                {
                  label: 'Arriving',
                  value: todayOverview.flightsArriving,
                  icon: Plane,
                  href: '/flights',
                  grad: 'from-sky-500/[0.1] to-card dark:to-card'
                },
                {
                  label: 'Departing',
                  value: todayOverview.flightsDeparting,
                  icon: Plane,
                  href: '/flights',
                  grad: 'from-amber-500/[0.1] to-card dark:to-card'
                },
                {
                  label: 'Scheduled',
                  value: todayOverview.transfersScheduled,
                  icon: Truck,
                  href: '/transfers',
                  grad: 'from-indigo-500/[0.1] to-card dark:to-card'
                },
                {
                  label: 'Traveling today',
                  value: todayOverview.customersTraveling,
                  icon: Users,
                  href: '/transfers',
                  grad: 'from-rose-500/[0.08] to-card dark:to-card'
                }
              ].map(({ label, value, icon: Icon, href, grad }) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => navigate(href)}
                  className={`flex min-h-[112px] flex-col justify-between rounded-xl border border-border/50 bg-gradient-to-br p-5 text-left transition-all hover:border-primary/30 hover:shadow-md ${grad}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
                    <Icon className="h-5 w-5 shrink-0 text-muted-foreground/80" strokeWidth={1.75} />
                  </div>
                  <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">
                    {todayLoading ? '—' : (value ?? 0)}
                  </p>
                </button>
              ))}
            </div>
          </motion.section>
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
