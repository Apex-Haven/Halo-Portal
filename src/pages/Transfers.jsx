import { useState, useEffect } from 'react'
import { Search, Filter, Plus, Eye, Edit, Trash2, Plane, Truck, X, MapPin, Calendar, UserPlus, FileEdit, AlertCircle, User, Clock } from 'lucide-react'
import TransferForm from '../components/TransferForm'
import TransferDetailsModal from '../components/TransferDetailsModal'
import TransferEditModal from '../components/TransferEditModal'
import VendorDriverAssignment from '../components/VendorDriverAssignment'
import ClientTransferDetails from '../components/ClientTransferDetails'
import ClientTravelerAssignment from '../components/ClientTravelerAssignment'
import Dropdown from '../components/Dropdown'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { getTransferDisplayName, getClientAndTravelerNames } from '../utils/transferUtils'

const Transfers = () => {
  const { user, isRole } = useAuth()
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [vendorFilter, setVendorFilter] = useState('all')
  const [airportFilter, setAirportFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAssignDriver, setShowAssignDriver] = useState(false)
  const [transferForAssignment, setTransferForAssignment] = useState(null)
  const [showClientDetails, setShowClientDetails] = useState(false)
  const [transferForClientUpdate, setTransferForClientUpdate] = useState(null)
  const [showAssignTraveler, setShowAssignTraveler] = useState(false)
  const [transferForTravelerAssignment, setTransferForTravelerAssignment] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [transferToDelete, setTransferToDelete] = useState(null)
  const navigate = useNavigate()
  
  // Check if user can manage transfers (only admins)
  const canManageTransfers = isRole('SUPER_ADMIN') || isRole('ADMIN') || isRole('OPERATIONS_MANAGER')
  const isVendor = isRole('VENDOR')
  const isClient = isRole('CLIENT')

  useEffect(() => {
    fetchTransfers()
  }, [])

  
  // Check for transfer ID in URL and open details modal when transfers are loaded
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const transferId = params.get('id')
    if (transferId && transfers.length > 0 && !showDetailsModal) {
      const transfer = transfers.find(t => t._id === transferId)
      if (transfer) {
        setSelectedTransfer(transfer)
        setShowDetailsModal(true)
        // Clean up URL after a short delay to ensure modal opens
        setTimeout(() => {
          navigate('/transfers', { replace: true })
        }, 100)
      }
    }
  }, [transfers, navigate, showDetailsModal])

  const fetchTransfers = async () => {
    try {
      setLoading(true)
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Please login to view transfers')
        setTransfers([])
        return
      }
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      
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
        setTransfers(Array.isArray(data.data) ? data.data : [])
      } else {
        console.error('API returned unsuccessful response:', data)
        setTransfers([])
        if (data.message) {
          toast.error(data.message || 'Failed to fetch transfers')
        }
      }
    } catch (error) {
      console.error('Error fetching transfers:', error)
      setTransfers([])
      toast.error('Failed to fetch transfers. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const handleTransferCreated = (newTransfer) => {
    setTransfers(prev => [newTransfer, ...prev])
    toast.success('Transfer created successfully!')
    fetchTransfers() // Refresh the list
  }

  const handleAssignDriver = (transfer) => {
    setTransferForAssignment(transfer)
    setShowAssignDriver(true)
  }

  const handleUpdateClientDetails = (transfer) => {
    setTransferForClientUpdate(transfer)
    setShowClientDetails(true)
  }

  const handleAssignTraveler = (transfer) => {
    setTransferForTravelerAssignment(transfer)
    setShowAssignTraveler(true)
  }

  const handleViewTransfer = (transfer) => {
    setSelectedTransfer(transfer)
    setShowDetailsModal(true)
  }

  const handleEditTransfer = (transfer) => {
    setSelectedTransfer(transfer)
    setShowEditModal(true)
  }

  const handleDeleteClick = (transfer) => {
    setTransferToDelete(transfer)
    setShowDeleteConfirm(true)
  }

  const handleDeleteTransfer = async () => {
    if (!transferToDelete) return

    const token = localStorage.getItem('token')
    if (!token) {
      toast.error('Please login to delete transfers')
      return
    }

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'
      const response = await fetch(`${API_BASE_URL}/transfers/${transferToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.status === 401) {
        toast.error('Session expired. Please login again.')
        localStorage.removeItem('token')
        setTimeout(() => {
          window.location.href = '/'
        }, 2000)
        return
      }

      if (response.status === 403) {
        toast.error('You do not have permission to delete transfers.')
        return
      }

      if (data.success) {
        toast.success('Transfer deleted successfully!')
        setShowDeleteConfirm(false)
        setTransferToDelete(null)
        fetchTransfers() // Refresh the list
      } else {
        toast.error(data.message || 'Failed to delete transfer')
      }
    } catch (error) {
      console.error('Error deleting transfer:', error)
      toast.error('Failed to delete transfer. Please try again.')
    }
  }

  const handleTransferUpdated = async (updatedTransfer) => {
    // Refresh the transfers list
    await fetchTransfers()
    
    // If transfer data provided, update it in the list
    if (updatedTransfer && updatedTransfer._id) {
      setTransfers(prev => prev.map(t => t._id === updatedTransfer._id ? updatedTransfer : t))
      
      // If details modal is open, update the selected transfer
      if (showDetailsModal && selectedTransfer && selectedTransfer._id === updatedTransfer._id) {
        setSelectedTransfer(updatedTransfer)
      }
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#059669'
      case 'in_progress': return '#2563eb'
      case 'assigned': return '#d97706'
      case 'pending': return '#6b7280'
      case 'cancelled': return '#dc2626'
      default: return '#6b7280'
    }
  }

  const getStatusBg = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
      case 'in_progress': return 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700'
      case 'assigned': return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
      case 'pending': return 'bg-muted border-border'
      case 'cancelled': return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
      default: return 'bg-muted border-border'
    }
  }

  const getStatusTextColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 dark:text-green-500'
      case 'in_progress': return 'text-blue-600 dark:text-blue-400'
      case 'assigned': return 'text-yellow-600 dark:text-yellow-500'
      case 'pending': return 'text-muted-foreground'
      case 'cancelled': return 'text-red-600 dark:text-red-500'
      default: return 'text-muted-foreground'
    }
  }

  const filteredTransfers = transfers.filter(transfer => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const matchesSearch = 
        (transfer.customer_details?.name || '').toLowerCase().includes(search) ||
        (transfer._id || '').toLowerCase().includes(search) ||
        (transfer.flight_details?.flight_no || '').toLowerCase().includes(search) ||
        (transfer.vendor_details?.vendor_name || '').toLowerCase().includes(search) ||
        (transfer.vendor_details?.vendor_id || '').toLowerCase().includes(search)
      if (!matchesSearch) return false
    }

    // Status filter
    if (statusFilter !== 'all') {
      const status = transfer.transfer_details?.transfer_status || transfer.transfer_details?.status
      if (status !== statusFilter) return false
    }

    // Vendor filter
    if (vendorFilter !== 'all') {
      const vendorId = transfer.vendor_details?.vendor_id || transfer.vendor_id
      if (vendorId !== vendorFilter) return false
    }

    // Airport filter
    if (airportFilter !== 'all') {
      const arrivalAirport = transfer.flight_details?.arrival_airport || transfer.flight_details?.arrivalAirport
      const departureAirport = transfer.flight_details?.departure_airport || transfer.flight_details?.departureAirport
      if (arrivalAirport?.toUpperCase() !== airportFilter && departureAirport?.toUpperCase() !== airportFilter) {
        return false
      }
    }

    // Date filter
    if (dateFilter !== 'all') {
      const flightDate = new Date(transfer.flight_details?.arrival_time || transfer.flight_details?.scheduled_arrival)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const nextWeek = new Date(today)
      nextWeek.setDate(nextWeek.getDate() + 7)

      if (dateFilter === 'today' && (flightDate < today || flightDate >= tomorrow)) {
        return false
      }
      if (dateFilter === 'tomorrow' && (flightDate < tomorrow || flightDate >= nextWeek)) {
        return false
      }
      if (dateFilter === 'this_week' && flightDate >= nextWeek) {
        return false
      }
    }
    
    return true
  })

  // Get unique vendors and airports for filters
  const uniqueVendors = [...new Set(
    transfers
      .map(t => ({ id: t.vendor_details?.vendor_id || t.vendor_id, name: t.vendor_details?.vendor_name || t.vendor_details?.vendor_id || t.vendor_id }))
      .filter(v => v.id)
      .map(v => ({ id: v.id, name: v.name }))
  )]
  const vendorMap = uniqueVendors.reduce((acc, v) => {
    if (!acc[v.id]) acc[v.id] = v.name
    return acc
  }, {})

  const uniqueAirports = [...new Set(
    transfers
      .flatMap(t => [
        t.flight_details?.arrival_airport || t.flight_details?.arrivalAirport,
        t.flight_details?.departure_airport || t.flight_details?.departureAirport
      ])
      .filter(Boolean)
  )].sort()

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground m-0">
          Transfers
        </h1>
        <p className="text-muted-foreground mt-2 mb-0">
          Manage airport transfer operations
        </p>
      </div>

      {/* Controls */}
      <div className="bg-card p-6 rounded-xl shadow-sm border border-border mb-6">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="relative flex-1 min-w-[300px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search transfers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-3 border border-input rounded-lg text-sm outline-none bg-background text-foreground focus:ring-2 focus:ring-ring"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium cursor-pointer transition-colors border ${
              showFilters 
                ? 'bg-primary text-primary-foreground border-primary' 
                : 'bg-transparent text-foreground border-input hover:bg-accent'
            }`}
          >
            <Filter size={16} />
            Filters
          </button>
          
          {canManageTransfers && (
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground border-none rounded-lg text-sm font-medium cursor-pointer hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} />
            Add Transfer
          </button>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border flex gap-4 flex-wrap items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">Status:</label>
              <Dropdown
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'assigned', label: 'Assigned' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'enroute', label: 'Enroute' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' }
                ]}
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">Vendor:</label>
              <Dropdown
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Vendors' },
                  ...uniqueVendors.map(v => ({
                    value: v.id,
                    label: vendorMap[v.id] || v.id
                  }))
                ]}
                minWidth="150px"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">Airport:</label>
              <Dropdown
                value={airportFilter}
                onChange={(e) => setAirportFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Airports' },
                  ...uniqueAirports.map(airport => ({
                    value: airport,
                    label: airport
                  }))
                ]}
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">Date:</label>
              <Dropdown
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Dates' },
                  { value: 'today', label: 'Today' },
                  { value: 'tomorrow', label: 'Tomorrow' },
                  { value: 'this_week', label: 'This Week' }
                ]}
              />
            </div>

            {(statusFilter !== 'all' || vendorFilter !== 'all' || airportFilter !== 'all' || dateFilter !== 'all') && (
              <button
                onClick={() => {
                  setStatusFilter('all')
                  setVendorFilter('all')
                  setAirportFilter('all')
                  setDateFilter('all')
                }}
                className="flex items-center gap-1 px-3 py-2 bg-transparent border border-input rounded-md text-sm text-muted-foreground cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <X size={14} />
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Transfers Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border">
        {loading ? (
          <div className="p-12 text-center">
            <div className="text-base text-muted-foreground">Loading transfers...</div>
          </div>
        ) : filteredTransfers.length > 0 ? (
          <div className="w-full">
            {/* Table Header */}
            <div className="grid grid-cols-[100px_minmax(150px,1.2fr)_minmax(150px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(100px,1fr)_90px_auto] gap-2 px-4 py-4 bg-muted/30 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div>ID</div>
              <div>Customer / Traveler</div>
              <div>Flight</div>
              <div>Vendor / Driver</div>
              <div>Pickup / Drop</div>
              <div>Time</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>

            {/* Table Rows */}
            {filteredTransfers.map((transfer) => {
              const { clientName, travelerName } = getClientAndTravelerNames(transfer)
              return (
              <div
                key={transfer._id}
                className="grid grid-cols-[100px_minmax(150px,1.2fr)_minmax(150px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(100px,1fr)_90px_auto] gap-2 px-4 py-3 border-b border-border items-center text-sm transition-colors hover:bg-muted/30"
              >
                <div className="font-semibold text-foreground text-xs">
                  {transfer._id?.substring(0, 8) || 'N/A'}
                </div>
                
                <div className="overflow-hidden">
                  <div className="font-medium text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                    {clientName}
                  </div>
                  {travelerName ? (
                    <div className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                      Traveler: {travelerName}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">No traveler</div>
                  )}
                  {transfer.customer_details?.email && (
                    <div className="text-[11px] text-muted-foreground/70 whitespace-nowrap overflow-hidden text-ellipsis">
                      {transfer.customer_details.email}
                    </div>
                  )}
                </div>
                
                <div>
                  {(transfer.flight_details?.flight_no === 'XX000' || transfer.flight_details?.flight_no === 'TBD') ? (
                    <div className="text-xs text-muted-foreground italic">
                      Add flight details
                    </div>
                  ) : (
                    <>
                  <div 
                    onClick={() => navigate(`/flights?flight=${transfer.flight_details?.flight_no || transfer.flight_details?.flight_number}`)}
                    className="font-medium text-primary cursor-pointer flex items-center gap-1 hover:underline"
                  >
                    <Plane size={14} />
                    <span className="underline">
                      {transfer.flight_details?.flight_no || transfer.flight_details?.flight_number || 'N/A'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {transfer.flight_details?.airline || ''}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <MapPin size={12} />
                    {transfer.flight_details?.arrival_airport || transfer.flight_details?.arrivalAirport || ''}
                  </div>
                    </>
                  )}
                </div>

                <div className="overflow-hidden">
                  {transfer.vendor_details ? (
                    <div className="space-y-1">
                      <div
                        onClick={() => navigate(`/vendors?search=${transfer.vendor_details.vendor_id}`)}
                        className="cursor-pointer flex items-center gap-1 overflow-hidden"
                      >
                        <Truck size={14} className="text-primary" />
                        <span className="font-medium text-primary underline whitespace-nowrap overflow-hidden text-ellipsis text-xs">
                          {transfer.vendor_details.vendor_name || transfer.vendor_details.vendor_id || 'N/A'}
                        </span>
                      </div>
                      {transfer.assigned_driver_details && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <User size={12} />
                          <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                            {transfer.assigned_driver_details.name || transfer.assigned_driver_details.driver_name || 'Driver assigned'}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">No vendor</span>
                  )}
                </div>

                <div className="overflow-hidden">
                  {transfer.transfer_details?.pickup_location && (
                    <div className="text-xs">
                      <div className="font-medium text-foreground whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1">
                        <MapPin size={12} />
                        <span>Pickup</span>
                      </div>
                      <div className="text-muted-foreground mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                        {transfer.transfer_details.pickup_location}
                      </div>
                    </div>
                  )}
                  {transfer.transfer_details?.drop_location && (
                    <div className="text-xs mt-1">
                      <div className="font-medium text-foreground whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1">
                        <MapPin size={12} />
                        <span>Drop</span>
                      </div>
                      <div className="text-muted-foreground mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                        {transfer.transfer_details.drop_location}
                      </div>
                    </div>
                  )}
                  {!transfer.transfer_details?.pickup_location && !transfer.transfer_details?.drop_location && (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </div>

                <div className="overflow-hidden">
                  {transfer.transfer_details?.estimated_pickup_time && (
                    <div className="text-xs">
                      <div className="font-medium text-foreground flex items-center gap-1">
                        <Clock size={12} />
                        <span>Pickup</span>
                      </div>
                      <div className="text-muted-foreground mt-0.5">
                        {new Date(transfer.transfer_details.estimated_pickup_time).toLocaleDateString()}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(transfer.transfer_details.estimated_pickup_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )}
                  {transfer.flight_details?.arrival_time && (
                    <div className="text-xs mt-1">
                      <div className="font-medium text-foreground flex items-center gap-1">
                        <Plane size={12} />
                        <span>Arrival</span>
                      </div>
                      <div className="text-muted-foreground mt-0.5">
                        {new Date(transfer.flight_details.arrival_time).toLocaleDateString()}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(transfer.flight_details.arrival_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )}
                  {!transfer.transfer_details?.estimated_pickup_time && !transfer.flight_details?.arrival_time && (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </div>
                
                <div className="flex items-center">
                  {(() => {
                    const status = transfer.transfer_details?.transfer_status || transfer.transfer_details?.status || 'pending';
                    return (
                      <div className="flex flex-col gap-1">
                      <span className={`${getStatusBg(status)} ${getStatusTextColor(status)} px-2 py-1 rounded text-xs font-medium capitalize border inline-block`}>
                        {status}
                      </span>
                        {!transfer.assigned_driver_details && (
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                            <span className="text-yellow-600 dark:text-yellow-400 text-[10px] font-medium">No Driver</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                
                <div className="flex gap-1.5 justify-end">
                  {/* View button - only for admins and vendors */}
                  {!isClient && (
                  <button 
                    onClick={() => handleViewTransfer(transfer)}
                    className="p-1.5 bg-transparent border border-input rounded cursor-pointer flex items-center justify-center transition-colors hover:bg-accent hover:border-muted-foreground/50"
                    title="View Details"
                  >
                    <Eye size={14} className="text-muted-foreground" />
                  </button>
                  )}

                  {/* Vendor-specific buttons */}
                  {isVendor && (
                    <button 
                      onClick={() => handleAssignDriver(transfer)}
                      className="p-1.5 bg-transparent border border-primary rounded cursor-pointer flex items-center justify-center transition-colors hover:bg-primary/10 hover:border-primary/80"
                      title={transfer.assigned_driver_details ? "Update Driver" : "Assign Driver"}
                    >
                      <UserPlus size={14} className="text-primary" />
                    </button>
                  )}

                  {/* Client-specific buttons */}
                  {isClient && (
                    String(transfer.customer_id) === String(user?.id) || 
                    String(transfer.customer_id) === String(user?.userId) || 
                    String(transfer.customer_id) === String(user?._id)
                  ) && (
                    <>
                      <button 
                        onClick={() => handleAssignTraveler(transfer)}
                        className="p-1.5 bg-transparent border border-primary rounded cursor-pointer flex items-center justify-center transition-colors hover:bg-primary/10 hover:border-primary/80"
                        title="Assign Traveler"
                      >
                        <User size={14} className="text-primary" />
                      </button>
                      <button 
                        onClick={() => handleUpdateClientDetails(transfer)}
                        className="p-1.5 bg-transparent border border-primary rounded cursor-pointer flex items-center justify-center transition-colors hover:bg-primary/10 hover:border-primary/80"
                        title="Update Details"
                      >
                        <FileEdit size={14} className="text-primary" />
                      </button>
                    </>
                  )}

                  {/* Admin-only buttons */}
                  {canManageTransfers && (
                    <>
                  <button 
                    onClick={() => handleEditTransfer(transfer)}
                    className="p-1.5 bg-transparent border border-input rounded cursor-pointer flex items-center justify-center transition-colors hover:bg-accent hover:border-muted-foreground/50"
                    title="Edit Transfer"
                  >
                    <Edit size={14} className="text-muted-foreground" />
                  </button>
                  <button 
                        onClick={() => handleDeleteClick(transfer)}
                    className="p-1.5 bg-transparent border border-input rounded cursor-pointer flex items-center justify-center transition-colors hover:bg-danger/10 hover:border-danger/50"
                    title="Delete Transfer"
                  >
                    <Trash2 size={14} className="text-danger" />
                  </button>
                    </>
                  )}
                </div>
              </div>
              )
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="text-base text-muted-foreground mb-2">
              No transfers found
            </div>
            <div className="text-sm text-muted-foreground/70">
              Try adjusting your search or filter criteria
            </div>
          </div>
        )}
      </div>

      {/* Transfer Form Modal */}
      {showForm && (
        <TransferForm
          onClose={() => setShowForm(false)}
          onSuccess={handleTransferCreated}
        />
      )}

      {/* Transfer Details Modal */}
      {showDetailsModal && (
        <TransferDetailsModal
          transfer={selectedTransfer}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedTransfer(null)
          }}
          onTransferUpdated={handleTransferUpdated}
        />
      )}

      {/* Vendor Driver Assignment Drawer */}
      {showAssignDriver && transferForAssignment && (
        <VendorDriverAssignment
          transfer={transferForAssignment}
          isOpen={showAssignDriver}
          onClose={() => {
            setShowAssignDriver(false)
            setTransferForAssignment(null)
          }}
          onSuccess={handleTransferUpdated}
        />
      )}

      {/* Client Transfer Details Drawer */}
      {showClientDetails && transferForClientUpdate && (
        <ClientTransferDetails
          transfer={transferForClientUpdate}
          isOpen={showClientDetails}
          onClose={() => {
            setShowClientDetails(false)
            setTransferForClientUpdate(null)
          }}
          onSuccess={handleTransferUpdated}
        />
      )}

      {/* Client Traveler Assignment Drawer */}
      {showAssignTraveler && transferForTravelerAssignment && (
        <ClientTravelerAssignment
          transfer={transferForTravelerAssignment}
          isOpen={showAssignTraveler}
          onClose={() => {
            setShowAssignTraveler(false)
            setTransferForTravelerAssignment(null)
          }}
          onSuccess={handleTransferUpdated}
        />
      )}

      {/* Transfer Edit Modal */}
      {showEditModal && (
        <TransferEditModal
          transfer={selectedTransfer}
          onClose={() => {
            setShowEditModal(false)
            setSelectedTransfer(null)
          }}
          onSuccess={handleTransferUpdated}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && transferToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
          <div className="bg-card rounded-2xl shadow-2xl border border-border max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-danger/10 px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-danger/20 rounded-lg">
                  <AlertCircle size={24} className="text-danger" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Delete Transfer</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              <p className="text-foreground mb-4">
                Are you sure you want to delete this transfer?
              </p>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Transfer ID:</span>
                  <span className="text-sm font-bold text-foreground font-mono">{transferToDelete._id}</span>
                </div>
                {transferToDelete.customer_details?.name && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Customer:</span>
                    <span className="text-sm font-semibold text-foreground">{transferToDelete.customer_details.name}</span>
                  </div>
                )}
                {transferToDelete.transfer_details?.pickup_location && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Pickup:</span>
                    <span className="text-sm font-semibold text-foreground">{transferToDelete.transfer_details.pickup_location}</span>
                  </div>
                )}
                {transferToDelete.transfer_details?.drop_location && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Drop-off:</span>
                    <span className="text-sm font-semibold text-foreground">{transferToDelete.transfer_details.drop_location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-5 bg-muted/30 border-t border-border flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setTransferToDelete(null)
                }}
                className="flex-1 px-4 py-2.5 bg-background border-2 border-border rounded-lg text-foreground font-semibold hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTransfer}
                className="flex-1 px-4 py-2.5 bg-danger text-white rounded-lg font-semibold hover:bg-danger/90 transition-all shadow-lg shadow-danger/25"
              >
                Delete Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Transfers