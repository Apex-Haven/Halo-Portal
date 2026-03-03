import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  Truck, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Search,
  MoreVertical,
  User,
  Building2,
  Activity
} from 'lucide-react'
import { PIPELINE_STAGES, getPipelineCount, legMatchesStage } from '../utils/transferFlow'
import toast from 'react-hot-toast'
import axios from 'axios'
import Dropdown from '../components/Dropdown'

const OperationsDashboard = () => {
  const [loading, setLoading] = useState(true)
  const [transfers, setTransfers] = useState([])
  const [stageMetrics, setStageMetrics] = useState({})
  const [syncStatus, setSyncStatus] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStage, setSelectedStage] = useState('all')
  const [viewMode, setViewMode] = useState('pipeline') // 'pipeline' or 'list'

  // Pipeline stages: Pending → Assigned → In Progress → Completed (enroute merged into In Progress)
  const stageColors = {
    pending: 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600',
    assigned: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-700',
    in_progress: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-700',
    completed: 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-700'
  }
  const stageIcons = { pending: Clock, assigned: Users, in_progress: Activity, completed: CheckCircle }
  const pipelineStages = PIPELINE_STAGES.map(s => ({
    ...s,
    color: stageColors[s.id],
    icon: stageIcons[s.id]
  }))

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData()
    fetchSyncStatus()
    
    // Set up real-time updates
    const interval = setInterval(fetchDashboardData, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/operations/dashboard')
      
      if (response.data.success) {
        setTransfers(response.data.transfers || [])
        setStageMetrics(response.data.stageMetrics || {})
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchSyncStatus = async () => {
    try {
      const response = await axios.get('/api/system/sync-status')
      if (response.data.success) {
        setSyncStatus(response.data.syncStatus || {})
      }
    } catch (error) {
      console.error('Error fetching sync status:', error)
    }
  }

  // Expand transfers into legs (onward + return) for display
  const expandToLegs = (list) => {
    const legs = []
    list.forEach(transfer => {
      legs.push({ transfer, leg: 'onward', transferDetails: transfer.transfer_details, legLabel: 'Onward' })
      if (transfer.return_transfer_details) {
        legs.push({ transfer, leg: 'return', transferDetails: transfer.return_transfer_details, legLabel: 'Return' })
      }
    })
    return legs
  }

  const allLegs = expandToLegs(transfers)

  // Filter legs based on search and stage
  const filteredLegs = allLegs.filter(({ transfer, transferDetails }) => {
    const matchesSearch = !searchTerm || 
      transfer.customer_details?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.traveler_details?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transferDetails?.pickup_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transferDetails?.drop_location?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStage = selectedStage === 'all' || 
      legMatchesStage(transferDetails, selectedStage)
    
    return matchesSearch && matchesStage
  })

  // Group legs by stage for pipeline view
  const legsByStage = pipelineStages.reduce((acc, stage) => {
    acc[stage.id] = filteredLegs.filter(({ transferDetails }) => 
      legMatchesStage(transferDetails, stage.id)
    )
    return acc
  }, {})

  // Handle stage change (drag and drop will be added later)
  const handleStageChange = async (transferId, newStage, leg = 'onward') => {
    try {
      const response = await axios.put(`/api/operations/transfers/${transferId}/stage`, {
        stage: newStage,
        leg
      })
      
      if (response.data.success) {
        toast.success('Transfer stage updated successfully')
        fetchDashboardData() // Refresh data
      } else {
        toast.error(response.data.message || 'Failed to update stage')
      }
    } catch (error) {
      console.error('Error updating transfer stage:', error)
      toast.error('Failed to update transfer stage')
    }
  }

  // Manual sync trigger
  const handleManualSync = async (type) => {
    try {
      const response = await axios.post(`/api/system/sync-${type}`)
      if (response.data.success) {
        toast.success(`${type} sync completed successfully`)
        fetchSyncStatus()
      } else {
        toast.error(response.data.message || `Failed to sync ${type}`)
      }
    } catch (error) {
      console.error(`Error syncing ${type}:`, error)
      toast.error(`Failed to sync ${type}`)
    }
  }

  // Transfer card component (per leg: onward or return)
  const TransferCard = ({ transfer, leg, transferDetails, legLabel, stage }) => {
    const StageIcon = pipelineStages.find(s => s.id === stage)?.icon || Clock
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-lg shadow-sm border border-border p-4 mb-3 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => {
          window.open(`/transfers?view=${transfer._id}`, '_blank')
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <StageIcon size={16} className="text-primary" />
            </div>
            <div>
              <div className="font-medium text-sm">
                {transfer.customer_details?.name || 'Unknown Customer'}
                {legLabel && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">({legLabel})</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {transferDetails?.pickup_location} → {transferDetails?.drop_location}
              </div>
            </div>
          </div>
          <button className="text-muted-foreground hover:text-foreground">
            <MoreVertical size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-1">
            <User size={12} className="text-muted-foreground" />
            <span className="text-muted-foreground">
              {transfer.traveler_details?.name || 'No traveler'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={12} className="text-muted-foreground" />
            <span className="text-muted-foreground">
              {transferDetails?.estimated_pickup_time
                ? new Date(transferDetails.estimated_pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '—'}
            </span>
          </div>
          {transfer.vendor_details?.vendor_name && (
            <div className="flex items-center gap-1">
              <Building2 size={12} className="text-muted-foreground" />
              <span className="text-muted-foreground truncate">
                {transfer.vendor_details.vendor_name}
              </span>
            </div>
          )}
          {transfer.assigned_driver_details?.name && (
            <div className="flex items-center gap-1">
              <Truck size={12} className="text-muted-foreground" />
              <span className="text-muted-foreground">
                {transfer.assigned_driver_details.name}
              </span>
            </div>
          )}
        </div>

        {transferDetails?.special_notes && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="text-xs text-muted-foreground">
              <AlertCircle size={12} className="inline mr-1" />
              {transferDetails.special_notes}
            </div>
          </div>
        )}
      </motion.div>
    )
  }

  if (loading && transfers.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Operations Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Operations Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Real-time overview of all transfer operations
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode(viewMode === 'pipeline' ? 'list' : 'pipeline')}
                className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors"
              >
                {viewMode === 'pipeline' ? 'List View' : 'Pipeline View'}
              </button>
              <button
                onClick={fetchDashboardData}
                className="p-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors"
                title="Refresh data"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {pipelineStages.map(stage => {
              const Icon = stage.icon
              const count = getPipelineCount(stageMetrics, stage.id)
              return (
                <div key={stage.id} className="bg-card rounded-lg border border-border p-3 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{stage.label}</p>
                      <p className="text-xl font-bold text-foreground">{count}</p>
                    </div>
                    <div className={`p-2 rounded-lg shrink-0 ${stage.color}`}>
                      <Icon size={18} className="text-foreground" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Sync Status */}
          <div className="bg-card rounded-lg border border-border p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Data Sync Status</h3>
              <button
                onClick={() => handleManualSync('all')}
                className="text-sm text-primary hover:text-primary/80"
              >
                Sync All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-green-600" />
                  <span className="text-sm">Travelers</span>
                </div>
                <div className="flex items-center gap-2">
                  {syncStatus.travelers?.lastSync ? (
                    <span className="text-xs text-green-600">
                      {new Date(syncStatus.travelers.lastSync).toLocaleTimeString()}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Never synced</span>
                  )}
                  <button
                    onClick={() => handleManualSync('travelers')}
                    className="text-xs text-primary hover:text-primary/80"
                  >
                    Sync
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Truck size={16} className="text-green-600" />
                  <span className="text-sm">Drivers</span>
                </div>
                <div className="flex items-center gap-2">
                  {syncStatus.drivers?.lastSync ? (
                    <span className="text-xs text-green-600">
                      {new Date(syncStatus.drivers.lastSync).toLocaleTimeString()}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Never synced</span>
                  )}
                  <button
                    onClick={() => handleManualSync('drivers')}
                    className="text-xs text-primary hover:text-primary/80"
                  >
                    Sync
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Activity size={16} className={syncStatus.system?.status === 'healthy' ? 'text-green-600' : 'text-red-600'} />
                  <span className="text-sm">System</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${syncStatus.system?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                    {syncStatus.system?.status || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search transfers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Dropdown
              name="selectedStage"
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              options={[
                { value: 'all', label: 'All Stages' },
                ...pipelineStages.map(stage => ({
                  value: stage.id,
                  label: `${stage.label} (${getPipelineCount(stageMetrics, stage.id)})`
                }))
              ]}
              placeholder="All Stages"
              minWidth="160px"
            />
          </div>
        </div>

        {/* Pipeline View */}
        {viewMode === 'pipeline' ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {pipelineStages.map(stage => {
              const StageIcon = stage.icon
              return (
              <div key={stage.id} className={`${stage.color} rounded-lg border p-4`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <StageIcon size={18} />
                    <h3 className="font-semibold">{stage.label}</h3>
                    <span className="bg-background/50 px-2 py-1 rounded text-xs font-medium">
                      {legsByStage[stage.id]?.length || 0}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-4">{stage.description}</p>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {legsByStage[stage.id]?.map(({ transfer, leg, transferDetails, legLabel }, idx) => (
                    <TransferCard
                      key={`${transfer._id}-${leg}-${idx}`}
                      transfer={transfer}
                      leg={leg}
                      transferDetails={transferDetails}
                      legLabel={legLabel}
                      stage={stage.id}
                    />
                  ))}
                  {(!legsByStage[stage.id] || legsByStage[stage.id].length === 0) && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No transfers in this stage
                    </div>
                  )}
                </div>
              </div>
            )})}
          </div>
        ) : (
          /* List View */
          <div className="bg-card rounded-lg border border-border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left p-4 font-medium text-sm">Customer</th>
                    <th className="text-left p-4 font-medium text-sm">Traveler</th>
                    <th className="text-left p-4 font-medium text-sm">Route</th>
                    <th className="text-left p-4 font-medium text-sm">Vendor</th>
                    <th className="text-left p-4 font-medium text-sm">Driver</th>
                    <th className="text-left p-4 font-medium text-sm">Status</th>
                    <th className="text-left p-4 font-medium text-sm">Time</th>
                    <th className="text-left p-4 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLegs.map(({ transfer, leg, transferDetails, legLabel }, idx) => (
                    <tr key={`${transfer._id}-${leg}-${idx}`} className="border-t border-border hover:bg-muted/20">
                      <td className="p-4">
                        <div className="font-medium">{transfer.customer_details?.name || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">{transfer.customer_details?.email}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{transfer.traveler_details?.name || 'Not assigned'}</div>
                        <div className="text-sm text-muted-foreground">{transfer.traveler_details?.phone}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          {transferDetails?.pickup_location} → {transferDetails?.drop_location}
                          {legLabel && (
                            <span className="ml-1 text-muted-foreground">({legLabel})</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">{transfer.vendor_details?.vendor_name || 'Not assigned'}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">{transfer.assigned_driver_details?.name || 'Not assigned'}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          (transferDetails?.transfer_status || 'pending') === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          ['enroute', 'in_progress'].includes(transferDetails?.transfer_status || '') ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                          (transferDetails?.transfer_status || 'pending') === 'assigned' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}>
                          {['enroute'].includes(transferDetails?.transfer_status || '') ? 'In Progress' : (transferDetails?.transfer_status || 'pending')}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          {transferDetails?.estimated_pickup_time
                            ? new Date(transferDetails.estimated_pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => window.open(`/transfers?view=${transfer._id}`, '_blank')}
                          className="text-primary hover:text-primary/80 text-sm"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLegs.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No transfers found matching your criteria
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OperationsDashboard
