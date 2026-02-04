import { useState, useEffect } from 'react'
import { Truck, Clock, CheckCircle, Users, Plane, TrendingUp, Plus, UserPlus, BarChart3, Calendar, Building2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import AIInsightsCard from '../components/AIInsightsCard'
import { useNavigate } from 'react-router-dom'
import { getTransferDisplayName } from '../utils/transferUtils'

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [recentTransfers, setRecentTransfers] = useState([])
  const [todayOverview, setTodayOverview] = useState({
    flightsArriving: 0,
    flightsDeparting: 0,
    transfersScheduled: 0,
    customersTraveling: 0,
    hotelBookings: 0
  })
  const [loading, setLoading] = useState(true)
  const [todayLoading, setTodayLoading] = useState(true)
  const { user, can, isRole } = useAuth()
  const navigate = useNavigate()

  // Check if user is admin or super admin
  useEffect(() => {
    if (user && !isRole('SUPER_ADMIN') && !isRole('ADMIN')) {
      // Redirect non-admin users to transfers page
      navigate('/transfers', { replace: true })
      return
    }
  }, [user, isRole, navigate])

  useEffect(() => {
    // Only fetch data if user is admin
    if (user && (isRole('SUPER_ADMIN') || isRole('ADMIN'))) {
    fetchDashboardData()
    fetchTodayOverview()
    }
  }, [user, isRole])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
      const token = localStorage.getItem('token');
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const [statsResponse, transfersResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/transfers/stats`, { headers }).then(res => res.json()),
        fetch(`${API_BASE_URL}/transfers?limit=6`, { headers }).then(res => res.json())
      ])

      if (statsResponse.success) {
        setStats(statsResponse.data)
      }

      if (transfersResponse.success) {
        setRecentTransfers(transfersResponse.data || [])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTodayOverview = async () => {
    try {
      setTodayLoading(true)
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
      const token = localStorage.getItem('token');
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      // Fetch today's transfers (which include flight info)
      const transfersResponse = await fetch(
        `${API_BASE_URL}/transfers?date_from=${startOfDay.toISOString()}&date_to=${endOfDay.toISOString()}&limit=100`,
        { headers }
      ).then(res => res.json());

      if (transfersResponse.success && transfersResponse.data) {
        const transfers = transfersResponse.data;
        
        // Count flights arriving today
        const flightsArriving = transfers.filter(t => {
          const arrivalTime = new Date(t.flight_details?.arrival_time || t.flight_details?.scheduled_arrival);
          return arrivalTime >= startOfDay && arrivalTime <= endOfDay;
        }).length;

        // Count flights departing today
        const flightsDeparting = transfers.filter(t => {
          const departureTime = new Date(t.flight_details?.departure_time || t.flight_details?.scheduled_departure);
          return departureTime >= startOfDay && departureTime <= endOfDay;
        }).length;

        // Count unique customers traveling today
        const uniqueCustomers = new Set(
          transfers.map(t => t.customer_details?.name || t.customer_id)
        ).size;

        setTodayOverview({
          flightsArriving,
          flightsDeparting,
          transfersScheduled: transfers.length,
          customersTraveling: uniqueCustomers,
          hotelBookings: 0 // TODO: Add hotel bookings when available
        });
      }
    } catch (error) {
      console.error('Error fetching today overview:', error);
    } finally {
      setTodayLoading(false);
    }
  }


  const getRoleBasedTitle = () => {
        return 'Admin Dashboard'
  }

  const getRoleBasedSubtitle = () => {
        return 'Complete system overview and management'
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Role-based Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground m-0">
          {getRoleBasedTitle()}
        </h1>
        <p className="text-muted-foreground mt-2 mb-0">
          {getRoleBasedSubtitle()}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Truck size={24} className="text-primary" />
            </div>
            <div className="text-success-600 dark:text-success-500 text-sm font-medium">
              +12%
            </div>
          </div>
          <h3 className="text-muted-foreground text-sm mb-2">Total Transfers</h3>
          <div className="text-3xl font-bold text-foreground">
            {loading ? '...' : (stats?.total || 0)}
          </div>
          <div className="text-muted-foreground text-sm">from last period</div>
        </div>
        
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-success/10">
              <Clock size={24} className="text-success-600 dark:text-success-500" />
            </div>
            <div className="text-success-600 dark:text-success-500 text-sm font-medium">
              +5%
            </div>
          </div>
          <h3 className="text-muted-foreground text-sm mb-2">Today's Transfers</h3>
          <div className="text-3xl font-bold text-foreground">
            {loading ? '...' : (stats?.today || 0)}
          </div>
          <div className="text-muted-foreground text-sm">from last period</div>
        </div>
        
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-warning/10">
              <CheckCircle size={24} className="text-warning-600 dark:text-warning-500" />
            </div>
            <div className="text-success-600 dark:text-success-500 text-sm font-medium">
              +2%
            </div>
          </div>
          <h3 className="text-muted-foreground text-sm mb-2">Success Rate</h3>
          <div className="text-3xl font-bold text-foreground">
            {loading ? '...' : `${stats?.successRate || 0}%`}
          </div>
          <div className="text-muted-foreground text-sm">from last period</div>
        </div>
        
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Users size={24} className="text-primary" />
            </div>
            <div className="text-success-600 dark:text-success-500 text-sm font-medium">
              +3
            </div>
          </div>
          <h3 className="text-muted-foreground text-sm mb-2">Active Drivers</h3>
          <div className="text-3xl font-bold text-foreground">
            {loading ? '...' : (stats?.activeDrivers || 0)}
          </div>
          <div className="text-muted-foreground text-sm">from last period</div>
        </div>
      </div>

      {/* Today's Overview Section */}
      {(isRole('SUPER_ADMIN') || isRole('ADMIN')) && (
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Calendar size={20} className="text-primary" />
            <h2 className="text-xl font-semibold text-foreground m-0">
              Today's Overview
            </h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div 
              onClick={() => navigate('/flights')}
              className="p-4 border border-border rounded-lg cursor-pointer transition-all bg-muted/30 hover:bg-muted/50"
            >
              <div className="flex items-center gap-2 mb-2">
                <Plane size={18} className="text-primary" />
                <span className="text-xs text-muted-foreground font-medium">Flights Arriving</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {todayLoading ? '...' : todayOverview.flightsArriving}
              </div>
            </div>

            <div 
              onClick={() => navigate('/flights')}
              className="p-4 border border-border rounded-lg cursor-pointer transition-all bg-muted/30 hover:bg-muted/50"
            >
              <div className="flex items-center gap-2 mb-2">
                <Plane size={18} className="text-success-600 dark:text-success-500" />
                <span className="text-xs text-muted-foreground font-medium">Flights Departing</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {todayLoading ? '...' : todayOverview.flightsDeparting}
              </div>
            </div>

            <div 
              onClick={() => navigate('/transfers')}
              className="p-4 border border-border rounded-lg cursor-pointer transition-all bg-muted/30 hover:bg-muted/50"
            >
              <div className="flex items-center gap-2 mb-2">
                <Truck size={18} className="text-warning-600 dark:text-warning-500" />
                <span className="text-xs text-muted-foreground font-medium">Transfers Scheduled</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {todayLoading ? '...' : todayOverview.transfersScheduled}
              </div>
            </div>

            <div 
              onClick={() => navigate('/customers')}
              className="p-4 border border-border rounded-lg cursor-pointer transition-all bg-muted/30 hover:bg-muted/50"
            >
              <div className="flex items-center gap-2 mb-2">
                <Users size={18} className="text-purple-600 dark:text-purple-400" />
                <span className="text-xs text-muted-foreground font-medium">Customers Traveling</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {todayLoading ? '...' : todayOverview.customersTraveling}
              </div>
            </div>

            <div 
              onClick={() => navigate('/hotels')}
              className="p-4 border border-border rounded-lg cursor-pointer transition-all bg-muted/30 hover:bg-muted/50"
            >
              <div className="flex items-center gap-2 mb-2">
                <Building2 size={18} className="text-danger-600 dark:text-danger-500" />
                <span className="text-xs text-muted-foreground font-medium">Hotel Bookings</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {todayLoading ? '...' : todayOverview.hotelBookings}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights Card - Only show for Admin/Operations roles */}
      {(isRole('SUPER_ADMIN') || isRole('ADMIN')) && (
        <div className="mb-8">
          <AIInsightsCard />
        </div>
      )}

      {/* Recent Transfers */}
      <div className="bg-card p-6 rounded-xl shadow-sm border border-border mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-foreground m-0">Recent Transfers</h2>
          <button className="text-primary text-sm font-medium bg-transparent border-none cursor-pointer no-underline hover:underline">
            View All
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="border border-border rounded-lg p-4 bg-muted/30">
                <div className="h-5 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded mb-2 w-3/5"></div>
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded w-2/5"></div>
              </div>
            ))
          ) : recentTransfers.length > 0 ? (
            recentTransfers.map((transfer) => {
              const status = transfer.transfer_details?.status || transfer.transfer_details?.transfer_status || 'pending';
              const statusBg = status === 'completed' ? 'bg-success-50 dark:bg-success-950 border-success-200 dark:border-success-800' :
                              status === 'in_progress' ? 'bg-primary-50 dark:bg-primary-950 border-primary-300 dark:border-primary-700' :
                              status === 'assigned' ? 'bg-warning-50 dark:bg-warning-950 border-warning-200 dark:border-warning-800' :
                              status === 'pending' ? 'bg-muted border-border' :
                              status === 'cancelled' ? 'bg-danger-50 dark:bg-danger-950 border-danger-200 dark:border-danger-800' :
                              'bg-muted border-border';
              const statusColor = status === 'completed' ? 'text-success-600 dark:text-success-500' :
                                 status === 'in_progress' ? 'text-primary-600 dark:text-primary-400' :
                                 status === 'assigned' ? 'text-warning-600 dark:text-warning-500' :
                                 status === 'pending' ? 'text-muted-foreground' :
                                 status === 'cancelled' ? 'text-danger-600 dark:text-danger-500' :
                                 'text-muted-foreground';
              return (
                <div 
                  key={transfer._id} 
                  onClick={() => navigate(`/transfers?id=${transfer._id}`)}
                  className="border border-border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md hover:bg-muted/30"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-foreground text-sm">
                    {getTransferDisplayName(transfer)}
                  </span>
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/transfers?id=${transfer._id}`);
                      }}
                      className={`${statusBg} ${statusColor} px-2 py-1 rounded text-xs font-medium capitalize border cursor-pointer hover:opacity-80 transition-opacity`}
                    >
                      {status}
                  </span>
                </div>
                  <div className="mb-2">
                    <strong className="text-foreground text-base">
                      {transfer.customer_details?.name}
                  </strong>
                </div>
                  <div className="text-muted-foreground text-sm mb-1">
                    {transfer.flight_details?.airline} • {transfer.flight_details?.departure_airport} → {transfer.flight_details?.arrival_airport}
                    {transfer.flight_details?.delay_minutes && ` +${transfer.flight_details.delay_minutes} min delay`}
                  </div>
                  <div className="text-muted-foreground text-sm mb-1">
                    Arrival: {transfer.flight_details?.scheduled_arrival ? new Date(transfer.flight_details.scheduled_arrival).toLocaleString() : 'N/A'}
                </div>
                  <div className="text-muted-foreground text-sm">
                    {transfer.transfer_details?.transfer_type} • {transfer.transfer_details?.pickup_location}
                </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center p-12 text-muted-foreground">
              <Truck size={48} className="mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No transfers found
              </h3>
              <p>No recent transfers to display</p>
            </div>
          )}
        </div>
      </div>

      {/* Role-based Quick Actions */}
      <div className="bg-card p-6 rounded-xl shadow-sm border border-border mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Admin/Operations Manager Actions */}
          {can('manage_transfers') && (
            <button 
              onClick={() => navigate('/transfers')}
              className="flex items-center justify-center p-4 border border-input rounded-lg bg-transparent cursor-pointer transition-all hover:bg-accent hover:border-primary gap-2"
            >
              <Plus size={20} className="text-primary" />
              <span className="text-sm font-medium text-foreground">Add Transfer</span>
            </button>
          )}
          
          {/* Admin/Operations Manager/Vendor Manager Actions */}
          {can('manage_drivers') && (
            <button 
              onClick={() => navigate('/drivers')}
              className="flex items-center justify-center p-4 border border-input rounded-lg bg-transparent cursor-pointer transition-all hover:bg-accent hover:border-primary gap-2"
            >
              <UserPlus size={20} className="text-primary" />
              <span className="text-sm font-medium text-foreground">Manage Drivers</span>
            </button>
          )}
          
          {/* Reports for Admin/Operations Manager/Vendor Manager */}
          {can('view_reports') && (
            <button 
              onClick={() => navigate('/reports')}
              className="flex items-center justify-center p-4 border border-input rounded-lg bg-transparent cursor-pointer transition-all hover:bg-accent hover:border-primary gap-2"
            >
              <BarChart3 size={20} className="text-primary" />
              <span className="text-sm font-medium text-foreground">View Reports</span>
            </button>
          )}
          
          {/* Driver-specific Actions */}
          {isRole('DRIVER') && (
            <button 
              onClick={() => navigate('/transfers')}
              className="flex items-center justify-center p-4 border border-input rounded-lg bg-transparent cursor-pointer transition-all hover:bg-accent hover:border-primary gap-2"
            >
              <Truck size={20} className="text-primary" />
              <span className="text-sm font-medium text-foreground">My Transfers</span>
            </button>
          )}
          
          {/* Customer-specific Actions */}
          {(isRole('CLIENT') || isRole('TRAVELER')) && (
            <button 
              onClick={() => navigate('/tracking')}
              className="flex items-center justify-center p-4 border border-input rounded-lg bg-transparent cursor-pointer transition-all hover:bg-accent hover:border-primary gap-2"
            >
              <Plane size={20} className="text-primary" />
              <span className="text-sm font-medium text-foreground">Track Flight</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard