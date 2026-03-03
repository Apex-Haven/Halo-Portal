import { useState, useEffect } from 'react'
import { 
  Search, Filter, Plus, Eye, Edit, Trash2, Plane, Truck, X, MapPin, Calendar, 
  User, Clock, Copy, CheckSquare, Square,
  ChevronDown, ChevronRight, Download, Users, Car, Navigation, CheckCircle, AlertTriangle, Building2, RefreshCw, Info, XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { getClientAndTravelerNames } from '../utils/transferUtils'
import { STATUS_OPTIONS, normalizeStatus } from '../utils/transferFlow'
import Dropdown from '../components/Dropdown'
import Drawer from '../components/Drawer'
import axios from 'axios'

const TransfersEnhanced = () => {
  const { user, isRole } = useAuth()
  const { isDark } = useTheme()
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState('cards')
  
  // Bulk operations state
  const [selectedTransfers, setSelectedTransfers] = useState([])
  const [bulkLoading, setBulkLoading] = useState(false)
  
  // Modal states
  const [selectedTransfer, setSelectedTransfer] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [transferToDelete, setTransferToDelete] = useState(null)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [showTransferSyncModal, setShowTransferSyncModal] = useState(false)
  const [transferSyncSheetId, setTransferSyncSheetId] = useState('')
  const [transferSyncSheetName, setTransferSyncSheetName] = useState('')
  const [transferSyncing, setTransferSyncing] = useState(false)
  const [transferSyncResults, setTransferSyncResults] = useState(null)
  const [transferSyncProgress, setTransferSyncProgress] = useState({ message: '', percentage: 0 })
  const [transferSyncCustomerId, setTransferSyncCustomerId] = useState('')
  const [showBulkVendorModal, setShowBulkVendorModal] = useState(false)
  const [showBulkDriverModal, setShowBulkDriverModal] = useState(false)
  const [showBulkReturnDriverModal, setShowBulkReturnDriverModal] = useState(false)
  const [vendors, setVendors] = useState([])
  const [drivers, setDrivers] = useState([])
  const [bulkVendorId, setBulkVendorId] = useState('')
  const [bulkVendorIdForDriver, setBulkVendorIdForDriver] = useState('')
  const [bulkDriverId, setBulkDriverId] = useState('')
  const [bulkReturnDriverId, setBulkReturnDriverId] = useState('')
  const [bulkVendorIdForReturnDriver, setBulkVendorIdForReturnDriver] = useState('')
  const [loadingVendors, setLoadingVendors] = useState(false)
  const [loadingDrivers, setLoadingDrivers] = useState(false)
  const [clients, setClients] = useState([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage] = useState(15)
  const [collapsedTimelineDates, setCollapsedTimelineDates] = useState(new Set())
  
  const navigate = useNavigate()

  const toggleTimelineDate = (dateKey) => {
    setCollapsedTimelineDates(prev => {
      const next = new Set(prev)
      if (next.has(dateKey)) next.delete(dateKey)
      else next.add(dateKey)
      return next
    })
  }
  
  // Check if user can manage transfers
  const canManageTransfers = isRole('SUPER_ADMIN') || isRole('ADMIN') || isRole('OPERATIONS_MANAGER')
  const isVendor = isRole('VENDOR')
  const isClient = isRole('CLIENT')

  useEffect(() => {
    fetchTransfers()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  useEffect(() => {
    if ((showBulkVendorModal || showBulkDriverModal || showBulkReturnDriverModal) && canManageTransfers) {
      setLoadingVendors(true)
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'
      const token = localStorage.getItem('token')
      if (token) {
        fetch(`${API_BASE_URL}/users/vendors`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(data => setVendors(data.success && Array.isArray(data.data) ? data.data : []))
          .catch(() => setVendors([]))
          .finally(() => setLoadingVendors(false))
      } else setLoadingVendors(false)
    }
  }, [showBulkVendorModal, showBulkDriverModal, showBulkReturnDriverModal, canManageTransfers])

  useEffect(() => {
    if (showBulkDriverModal && bulkVendorIdForDriver) {
      setLoadingDrivers(true)
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'
      const token = localStorage.getItem('token')
      if (token) {
        fetch(`${API_BASE_URL}/drivers?vendorId=${bulkVendorIdForDriver}`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(data => setDrivers(data.success && Array.isArray(data.data) ? data.data : []))
          .catch(() => setDrivers([]))
          .finally(() => setLoadingDrivers(false))
      } else setLoadingDrivers(false)
    } else {
      setDrivers([])
      setBulkDriverId('')
    }
  }, [showBulkDriverModal, bulkVendorIdForDriver])

  // When Assign Driver modal opens, pre-select vendor if all selected transfers have the same vendor
  useEffect(() => {
    if (showBulkDriverModal && selectedTransfers.length > 0) {
      const selectedObjs = transfers.filter(t => selectedTransfers.includes(t._id))
      const withVendor = selectedObjs.filter(t => t.vendor_details?.vendor_id)
      const withoutVendor = selectedObjs.filter(t => !t.vendor_details?.vendor_id)
      if (withoutVendor.length === 0 && withVendor.length > 0) {
        const vendorIds = [...new Set(withVendor.map(t => t.vendor_details.vendor_id))]
        if (vendorIds.length === 1) {
          setBulkVendorIdForDriver(vendorIds[0])
        } else {
          setBulkVendorIdForDriver('')
        }
      } else {
        setBulkVendorIdForDriver('')
      }
    }
  }, [showBulkDriverModal, selectedTransfers, transfers])

  useEffect(() => {
    if (showBulkReturnDriverModal && bulkVendorIdForReturnDriver) {
      setLoadingDrivers(true)
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'
      const token = localStorage.getItem('token')
      if (token) {
        fetch(`${API_BASE_URL}/drivers?vendorId=${bulkVendorIdForReturnDriver}`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(data => setDrivers(data.success && Array.isArray(data.data) ? data.data : []))
          .catch(() => setDrivers([]))
          .finally(() => setLoadingDrivers(false))
      } else setLoadingDrivers(false)
    } else {
      setDrivers([])
      setBulkReturnDriverId('')
    }
  }, [showBulkReturnDriverModal, bulkVendorIdForReturnDriver])

  useEffect(() => {
    if (showBulkReturnDriverModal && selectedTransfers.length > 0) {
      const selectedObjs = transfers.filter(t => selectedTransfers.includes(t._id))
      const eligible = selectedObjs.filter(t => t.return_transfer_details && (t.transfer_details?.transfer_status || 'pending') === 'completed')
      const withVendor = eligible.filter(t => t.vendor_details?.vendor_id)
      if (withVendor.length > 0) {
        const vendorIds = [...new Set(withVendor.map(t => (t.vendor_details?.vendor_id || '').toString()).filter(Boolean))]
        if (vendorIds.length === 1) setBulkVendorIdForReturnDriver(vendorIds[0])
        else setBulkVendorIdForReturnDriver('')
      } else setBulkVendorIdForReturnDriver('')
    }
  }, [showBulkReturnDriverModal, selectedTransfers, transfers])

  useEffect(() => {
    if (showTransferSyncModal && (isRole('SUPER_ADMIN') || isRole('ADMIN') || isRole('OPERATIONS_MANAGER'))) {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'
      const token = localStorage.getItem('token')
      if (token) {
        setLoadingClients(true)
        fetch(`${API_BASE_URL}/users/clients`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(data => setClients(data.success && Array.isArray(data.data) ? data.data : []))
          .catch(() => setClients([]))
          .finally(() => setLoadingClients(false))
      }
    }
  }, [showTransferSyncModal])

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
      
      console.log('🔍 Fetching transfers from:', `${API_BASE_URL}/transfers`)
      
      const response = await fetch(`${API_BASE_URL}/transfers?limit=500`, { headers })
      
      console.log('📡 Response status:', response.status)
      
      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Session expired. Please login again.')
          localStorage.removeItem('token')
          return
        }
        throw new Error('Failed to fetch transfers')
      }
      
      const data = await response.json()
      console.log('📊 API Response:', data)
      console.log('📊 Transfers array:', data.data)
      console.log('📊 Transfers length:', data.data?.length)
      
      if (data.success) {
        const transfersData = data.data || data.transfers || []
        setTransfers(transfersData)
        console.log('✅ Transfers loaded:', transfersData.length)
        
        // Log first transfer for debugging
        if (transfersData.length > 0) {
          console.log('🔍 First transfer sample:', transfersData[0])
        }
      } else {
        toast.error(data.message || 'Failed to load transfers')
        setTransfers([])
      }
    } catch (error) {
      console.error('❌ Error fetching transfers:', error)
      toast.error('Failed to load transfers')
      setTransfers([])
    } finally {
      setLoading(false)
    }
  }

  // Handle transfer selection
  const handleTransferSelect = (transferId, selected) => {
    if (selected) {
      setSelectedTransfers(prev => [...prev, transferId])
    } else {
      setSelectedTransfers(prev => prev.filter(id => id !== transferId))
    }
  }

  const handleSelectAll = (selected) => {
    if (selected) {
      setSelectedTransfers(filteredTransfers.map(t => t._id))
    } else {
      setSelectedTransfers([])
    }
  }

  // Quick status change
  const handleQuickStatusChange = async (transferId, newStatus) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
      const token = localStorage.getItem('token');
      
      const response = await axios.put(`${API_BASE_URL}/bulk-operations/status`, {
        transferIds: [transferId],
        newStatus
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        toast.success('Status updated successfully')
        fetchTransfers()
      } else {
        toast.error(response.data.message || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedTransfers.length === 0) return
    setShowBulkDeleteConfirm(false)
    setBulkLoading(true)
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'
      const token = localStorage.getItem('token')
      const response = await axios.delete(`${API_BASE_URL}/bulk-operations`, {
        data: { transferIds: selectedTransfers },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.data.success) {
        toast.success(response.data.message)
        setSelectedTransfers([])
        fetchTransfers()
      } else {
        toast.error(response.data.message || 'Failed to delete transfers')
      }
    } catch (error) {
      console.error('Error in bulk delete:', error)
      toast.error('Failed to delete transfers')
    } finally {
      setBulkLoading(false)
    }
  }

  // Delete single transfer
  const handleDeleteClick = (transfer) => {
    setTransferToDelete(transfer)
    setShowDeleteConfirm(true)
  }

  const handleDeleteTransfer = async () => {
    if (!transferToDelete) return
    setBulkLoading(true)
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'
      const token = localStorage.getItem('token')
      const response = await axios.delete(`${API_BASE_URL}/transfers/${transferToDelete._id}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.data.success) {
        toast.success('Transfer deleted successfully')
        setShowDeleteConfirm(false)
        setTransferToDelete(null)
        fetchTransfers()
      } else {
        toast.error(response.data.message || 'Failed to delete transfer')
      }
    } catch (error) {
      console.error('Error deleting transfer:', error)
      toast.error('Failed to delete transfer')
    } finally {
      setBulkLoading(false)
    }
  }

  // Bulk status update (leg: 'onward' | 'return')
  const handleBulkStatusUpdate = async (newStatus, leg = 'onward') => {
    if (selectedTransfers.length === 0) return

    setBulkLoading(true)
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
      const token = localStorage.getItem('token');

      const response = await axios.put(`${API_BASE_URL}/bulk-operations/status`, {
        transferIds: selectedTransfers,
        newStatus,
        leg
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        toast.success(response.data.message)
        setSelectedTransfers([])
        setShowBulkStatusModal(false)
        fetchTransfers()
      } else {
        toast.error(response.data.message || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error in bulk status update:', error)
      toast.error('Failed to update status')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkVendorAssign = async () => {
    if (selectedTransfers.length === 0 || !bulkVendorId) return
    setBulkLoading(true)
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'
      const token = localStorage.getItem('token')
      await axios.put(`${API_BASE_URL}/bulk-operations/vendor`, { transferIds: selectedTransfers, vendorId: bulkVendorId }, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } })
      toast.success(`Vendor assigned to ${selectedTransfers.length} transfer(s)`)
      setSelectedTransfers([])
      setShowBulkVendorModal(false)
      fetchTransfers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign vendor')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkDriverAssign = async () => {
    if (selectedTransfers.length === 0 || !bulkDriverId) return
    const selectedDriver = drivers.find(d => (d._id || d.id) === bulkDriverId)
    if (!selectedDriver) {
      toast.error('Please select a valid driver')
      return
    }
    const driverName = [selectedDriver.profile?.firstName, selectedDriver.profile?.lastName].filter(Boolean).join(' ') || selectedDriver.username || 'Driver'
    setBulkLoading(true)
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'
      const token = localStorage.getItem('token')
      const payload = {
        transferIds: selectedTransfers,
        driverId: bulkDriverId,
        driverName,
        driverPhone: selectedDriver.profile?.phone || selectedDriver.email || '',
        vehicleType: selectedDriver.driverDetails?.vehicleType || 'sedan',
        vehicleNumber: selectedDriver.driverDetails?.vehicleNumber || 'TBD'
      }
      await axios.put(`${API_BASE_URL}/bulk-operations/driver`, payload, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } })
      toast.success(`Driver assigned to ${selectedTransfers.length} transfer(s)`)
      setSelectedTransfers([])
      setShowBulkDriverModal(false)
      fetchTransfers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign driver')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkReturnDriverAssign = async () => {
    if (selectedTransfers.length === 0 || !bulkReturnDriverId) return
    const selectedDriver = drivers.find(d => (d._id || d.id) === bulkReturnDriverId)
    if (!selectedDriver) {
      toast.error('Please select a valid driver')
      return
    }
    const driverName = [selectedDriver.profile?.firstName, selectedDriver.profile?.lastName].filter(Boolean).join(' ') || selectedDriver.username || 'Driver'
    setBulkLoading(true)
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'
      const token = localStorage.getItem('token')
      const payload = {
        transferIds: selectedTransfers,
        driverId: bulkReturnDriverId,
        driverName,
        driverPhone: selectedDriver.profile?.phone || selectedDriver.email || '',
        vehicleType: selectedDriver.driverDetails?.vehicleType || 'sedan',
        vehicleNumber: selectedDriver.driverDetails?.vehicleNumber || 'TBD'
      }
      const response = await axios.put(`${API_BASE_URL}/bulk-operations/return-driver`, payload, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } })
      toast.success(response.data?.message || `Return driver assigned to ${response.data?.updatedCount || 0} transfer(s)`)
      setSelectedTransfers([])
      setShowBulkReturnDriverModal(false)
      fetchTransfers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign return driver')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleSyncTransfersFromRegistrationSheet = async (e) => {
    e.preventDefault()
    if (!transferSyncSheetId.trim()) {
      toast.error('Please enter a Google Sheet ID')
      return
    }
    if ((isRole('SUPER_ADMIN') || isRole('ADMIN') || isRole('OPERATIONS_MANAGER')) && !transferSyncCustomerId) {
      toast.error('Please select a client for these transfers')
      return
    }
    let progressInterval
    try {
      setTransferSyncing(true)
      setTransferSyncResults(null)
      setTransferSyncProgress({ message: 'Fetching registration data from Google Sheets...', percentage: 10 })
      progressInterval = setInterval(() => {
        setTransferSyncProgress(prev => ({
          message: prev.percentage < 50 ? 'Fetching registration data from Google Sheets...' : 'Creating transfers...',
          percentage: Math.min(prev.percentage + 5, 90)
        }))
      }, 2000)
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'
      const token = localStorage.getItem('token')
      const body = { sheetId: transferSyncSheetId.trim(), sheetName: transferSyncSheetName.trim() || undefined }
      if (isRole('SUPER_ADMIN') || isRole('ADMIN') || isRole('OPERATIONS_MANAGER')) body.customerId = transferSyncCustomerId
      const response = await axios.post(`${API_BASE_URL}/transfers/sync-from-registration-sheet`, body, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        timeout: 300000
      })
      if (progressInterval) clearInterval(progressInterval)
      setTransferSyncProgress({ message: 'Processing completed!', percentage: 100 })
      if (response.data.success) {
        setTransferSyncResults(response.data.data)
        toast.success(response.data.message || 'Transfer sync completed successfully')
        fetchTransfers()
      } else {
        toast.error(response.data.message || 'Transfer sync failed')
        setTransferSyncResults(response.data.data || { errors: [] })
      }
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval)
      if (error.code === 'ECONNABORTED' || (error.message && error.message.includes('timeout'))) {
        toast.error('Transfer sync timed out.')
        setTransferSyncProgress({ message: 'Sync timed out', percentage: 0 })
      } else {
        toast.error(error.response?.data?.message || 'Failed to sync transfers from registration sheet')
        if (error.response?.data?.data) setTransferSyncResults(error.response.data.data)
      }
    } finally {
      setTransferSyncing(false)
      setTimeout(() => setTransferSyncProgress({ message: '', percentage: 0 }), 2000)
    }
  }

  // Export functionality
  const handleExport = async (format = 'csv') => {
    try {
      const dataToExport = filteredTransfers.map(transfer => {
        const { clientName, travelerName } = getClientAndTravelerNames(transfer)
        return {
          'Transfer ID': transfer._id,
          'Customer': clientName,
          'Traveler': travelerName,
          'Pickup Location': transfer.transfer_details?.pickup_location,
          'Drop Location': transfer.transfer_details?.drop_location,
          'Status': transfer.transfer_details?.transfer_status,
          'Pickup Time': new Date(transfer.transfer_details?.estimated_pickup_time).toLocaleString(),
          'Vendor': transfer.vendor_details?.vendor_name,
          'Driver': transfer.assigned_driver_details?.name,
          'Flight': transfer.flight_details?.flight_no,
          'Priority': transfer.priority
        }
      })

      if (format === 'csv') {
        // Convert to CSV
        const headers = Object.keys(dataToExport[0] || {})
        const csvContent = [
          headers.join(','),
          ...dataToExport.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
        ].join('\n')

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `transfers_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
        
        toast.success('Transfers exported successfully')
      }
    } catch (error) {
      console.error('Error exporting transfers:', error)
      toast.error('Failed to export transfers')
    }
  }

  // Filter transfers
  const filteredTransfers = transfers.filter(transfer => {
    const { clientName, travelerName } = getClientAndTravelerNames(transfer)
    const matchesSearch = !searchTerm || 
      clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      travelerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.transfer_details?.pickup_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.transfer_details?.drop_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer._id?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const status = transfer.transfer_details?.transfer_status || 'pending'
    const matchesStatus = statusFilter === 'all' || normalizeStatus(status) === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Sort by pickup time for timeline view
  const sortedTransfers = [...filteredTransfers].sort((a, b) => {
    return new Date(a.transfer_details?.estimated_pickup_time || 0) - 
           new Date(b.transfer_details?.estimated_pickup_time || 0)
  })

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTransfers.length / perPage))
  const startIndex = (currentPage - 1) * perPage
  const endIndex = startIndex + perPage
  const paginatedTransfers = filteredTransfers.slice(startIndex, endIndex)
  const sortedTransfersPaginated = sortedTransfers.slice(startIndex, endIndex)

  // Status options – aligned with project flow (enroute merged into in_progress)
  const statusColors = {
    pending: 'bg-gray-100 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200',
    assigned: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200',
    in_progress: 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200',
    completed: 'bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-200',
    cancelled: 'bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200'
  }
  const statusOptions = STATUS_OPTIONS.map(opt => ({
    ...opt,
    color: statusColors[opt.value] || statusColors.pending
  }))

  const getStatusColor = (status) => {
    const normalized = normalizeStatus(status)
    const option = statusOptions.find(opt => opt.value === normalized)
    return option ? option.color : 'bg-gray-100 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200'
  }

  // Enhanced transfer card component
  const TransferCard = ({ transfer }) => {
    const { clientName, travelerName } = getClientAndTravelerNames(transfer)
    const status = transfer.transfer_details?.transfer_status || 'pending'
    const isSelected = selectedTransfers.includes(transfer._id)
    
    // Check for onward flight (support flight_no and flight_number)
    const onwardFlightNo = transfer.flight_details?.flight_no || transfer.flight_details?.flight_number
    const hasOnwardFlight = onwardFlightNo && 
                           onwardFlightNo !== 'XX000' && 
                           onwardFlightNo !== 'TBD'
    
    // Check for return flight
    const hasReturnFlight = transfer.return_flight_details?.flight_no && 
                          transfer.return_flight_details.flight_no !== 'XX000' && 
                          transfer.return_flight_details.flight_no !== 'TBD'
    
    // Check if return transfer exists but is missing flight details
    const hasReturnTransfer = transfer.return_transfer_details || transfer.return_flight_details
    const isReturnFlightMissing = hasReturnTransfer && !hasReturnFlight
    
    // Check if return transfer is missing departure info
    const isReturnDepartureMissing = hasReturnTransfer && 
      (!transfer.return_transfer_details?.estimated_pickup_time || !transfer.return_flight_details?.departure_time)

    return (
      <div className={`bg-card rounded-xl shadow-sm border border-border overflow-hidden transition-all ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}>
        {/* Card header with checkbox */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-muted/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {canManageTransfers && (
                <button
                  onClick={() => handleTransferSelect(transfer._id, !isSelected)}
                  className="flex-shrink-0"
                >
                  {isSelected ? (
                    <CheckSquare size={18} className="text-primary" />
                  ) : (
                    <Square size={18} className="text-muted-foreground" />
                  )}
                </button>
              )}
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {transfer._id?.slice(-8) || 'N/A'}
                  </span>
                  {transfer.priority === 'high' && (
                    <AlertTriangle size={14} className="text-red-500" />
                  )}
                  {transfer.priority === 'vip' && (
                    <span className="text-xs bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full">VIP</span>
                  )}
                  {hasReturnTransfer && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                      Round Trip
                    </span>
                  )}
                  {isReturnFlightMissing && (
                    <span className="text-xs bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200 px-2 py-1 rounded-full">
                      Return Flight Missing
                    </span>
                  )}
                  {isReturnDepartureMissing && (
                    <span className="text-xs bg-orange-100 dark:bg-orange-900/60 text-orange-800 dark:text-orange-200 px-2 py-1 rounded-full">
                      Return Departure Missing
                    </span>
                  )}
                </div>
                
                <div className="font-semibold text-foreground truncate">
                  {clientName || 'Unknown Customer'}
                </div>
                {travelerName && (
                  <div className="text-sm text-muted-foreground">
                    Traveler: {travelerName}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                {status}
              </span>
            </div>
          </div>
        </div>

        {/* Card body */}
        <div className="p-4 space-y-4">
          {/* Onward Transfer */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Plane size={14} className="text-muted-foreground" />
              <span>Onward Transfer</span>
            </div>
            
            {/* Onward Route */}
            <div className="flex items-center gap-2 text-sm ml-6">
              <MapPin size={14} className="text-muted-foreground" />
              <span className="truncate">
                {transfer.transfer_details?.pickup_location} → {transfer.transfer_details?.drop_location}
              </span>
            </div>

            {/* Onward Time and Flight */}
            <div className="grid grid-cols-2 gap-3 text-sm ml-6">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-muted-foreground" />
                <span>
                  {new Date(transfer.transfer_details?.estimated_pickup_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              {hasOnwardFlight ? (
                <div className="flex items-center gap-2">
                  <Plane size={14} className="text-muted-foreground" />
                  <span>{transfer.flight_details?.flight_no || transfer.flight_details?.flight_number}</span>
                  {transfer.flight_details?.departure_time && (
                    <span className="text-xs text-muted-foreground">
                      ({new Date(transfer.flight_details.departure_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })})
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-500">
                  <AlertTriangle size={14} />
                  <span className="text-xs">Flight Missing</span>
                </div>
              )}
            </div>
          </div>

          {/* Return Transfer */}
          {hasReturnTransfer && (
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Plane size={14} className="text-muted-foreground rotate-180" />
                <span>Return Transfer</span>
                {isReturnFlightMissing && (
                  <AlertTriangle size={14} className="text-red-500" />
                )}
                {isReturnDepartureMissing && (
                  <AlertTriangle size={14} className="text-orange-500" />
                )}
              </div>
              
              {/* Return Route */}
              <div className="flex items-center gap-2 text-sm ml-6">
                <MapPin size={14} className="text-muted-foreground" />
                <span className="truncate">
                  {transfer.return_transfer_details?.pickup_location || 'TBD'} → {transfer.return_transfer_details?.drop_location || 'TBD'}
                </span>
              </div>

              {/* Return Time and Flight */}
              <div className="grid grid-cols-2 gap-3 text-sm ml-6">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-muted-foreground" />
                  <span>
                    {transfer.return_transfer_details?.estimated_pickup_time ? 
                      new Date(transfer.return_transfer_details.estimated_pickup_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Time Missing'
                    }
                  </span>
                </div>
                {hasReturnFlight ? (
                  <div className="flex items-center gap-2">
                    <Plane size={14} className="text-muted-foreground" />
                    <span>{transfer.return_flight_details.flight_no}</span>
                    {transfer.return_flight_details?.departure_time && (
                      <span className="text-xs text-muted-foreground">
                        ({new Date(transfer.return_flight_details.departure_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })})
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertTriangle size={14} />
                    <span className="text-xs">Flight Missing</span>
                  </div>
                )}
              </div>

              {/* Return specific warnings */}
              {isReturnFlightMissing && (
                <div className="ml-6 p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
                  ⚠️ Return flight details are missing. Please add return flight information.
                </div>
              )}
              
              {isReturnDepartureMissing && (
                <div className="ml-6 p-2 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded text-xs text-orange-700 dark:text-orange-300">
                  ⚠️ Return departure date/time is missing. Please add return transfer details.
                </div>
              )}
            </div>
          )}

          {/* Vendor and Driver */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {transfer.vendor_details?.vendor_name && (
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-muted-foreground" />
                <span className="truncate">{transfer.vendor_details.vendor_name}</span>
              </div>
            )}
            {transfer.assigned_driver_details?.name && (
              <div className="flex items-center gap-2">
                <Car size={14} className="text-muted-foreground" />
                <span className="truncate">{transfer.assigned_driver_details.name}</span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              {canManageTransfers && (
                <div className="flex items-center gap-1">
                  {['pending', 'assigned', 'in_progress', 'completed'].map(statusValue => (
                    <button
                      key={statusValue}
                      onClick={() => handleQuickStatusChange(transfer._id, statusValue)}
                      disabled={statusValue === status}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        statusValue === status 
                          ? 'bg-muted text-muted-foreground cursor-not-allowed'
                          : 'bg-background hover:bg-muted border border-border'
                      }`}
                    >
                      {statusValue.charAt(0).toUpperCase() + statusValue.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setSelectedTransfer(transfer)
                  setShowDetailsModal(true)
                }}
                className="p-1 rounded hover:bg-muted text-muted-foreground"
                title="View details"
              >
                <Eye size={14} />
              </button>
              {canManageTransfers && (
                <>
                  <button
                    onClick={() => {
                      setSelectedTransfer(transfer)
                      setShowDetailsModal(true)
                    }}
                    className="p-1 rounded hover:bg-muted text-muted-foreground"
                    title="Edit transfer"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(transfer)}
                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Timeline view component (uses paginated sorted list, accordion per date, sticky headers)
  const TimelineView = () => {
    const groupedByDate = sortedTransfersPaginated.reduce((acc, transfer) => {
      const date = new Date(transfer.transfer_details?.estimated_pickup_time).toDateString()
      if (!acc[date]) acc[date] = []
      acc[date].push(transfer)
      return acc
    }, {})

    const dateEntries = Object.entries(groupedByDate)

    return (
      <div className="space-y-6">
        {dateEntries.map(([date, dayTransfers]) => {
          const dateKey = date
          const isCollapsed = collapsedTimelineDates.has(dateKey)
          return (
            <div key={date} className="rounded-lg border border-border bg-card">
              {/* Sticky Date Header – accordion trigger (sticks on scroll, next header replaces previous) */}
              <button
                type="button"
                onClick={() => toggleTimelineDate(dateKey)}
                className="sticky -top-6 z-[100] w-full flex items-center justify-between gap-2 bg-background py-3 px-4 border-b border-border hover:bg-muted/50 transition-colors text-left shadow-[0_4px_12px_-2px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.5)] rounded-t-lg"
              >
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  {isCollapsed ? (
                    <ChevronRight size={20} className="text-muted-foreground" />
                  ) : (
                    <ChevronDown size={20} className="text-muted-foreground" />
                  )}
                  {new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                  <span className="text-sm text-muted-foreground font-normal">
                    ({dayTransfers.length} transfers)
                  </span>
                </h3>
              </button>
            
            {/* Timeline content – collapsible */}
            {!isCollapsed && (
            <div className="relative p-4">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>
              
              {/* Timeline items */}
              <div className="space-y-4">
                {dayTransfers.map((transfer) => {
                  const { clientName, travelerName } = getClientAndTravelerNames(transfer)
                  const status = transfer.transfer_details?.transfer_status || 'pending'
                  const pickupTime = new Date(transfer.transfer_details?.estimated_pickup_time)
                  
                  // Check for onward flight (support flight_no and flight_number)
                  const onwardFlightNo = transfer.flight_details?.flight_no || transfer.flight_details?.flight_number
                  const hasOnwardFlight = onwardFlightNo && 
                                         onwardFlightNo !== 'XX000' && 
                                         onwardFlightNo !== 'TBD'
                  
                  // Check for return flight
                  const hasReturnFlight = transfer.return_flight_details?.flight_no && 
                                        transfer.return_flight_details.flight_no !== 'XX000' && 
                                        transfer.return_flight_details.flight_no !== 'TBD'
                  
                  // Check if return transfer exists but is missing flight details
                  const hasReturnTransfer = transfer.return_transfer_details || transfer.return_flight_details
                  const isReturnFlightMissing = hasReturnTransfer && !hasReturnFlight
                  
                  // Check if return transfer is missing departure info
                  const isReturnDepartureMissing = hasReturnTransfer && 
                    (!transfer.return_transfer_details?.estimated_pickup_time || !transfer.return_flight_details?.departure_time)
                  
                  return (
                    <div key={transfer._id} className="relative flex items-start gap-4">
                      {/* Timeline node – status icon (enroute = In Progress) */}
                      <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm ring-2 ring-background ${
                        status === 'completed' ? 'bg-green-500 text-white' :
                        ['in_progress', 'enroute'].includes(status) ? 'bg-blue-500 text-white' :
                        status === 'assigned' ? 'bg-purple-500 text-white' :
                        'bg-gray-500 text-white'
                      }`}>
                        {status === 'completed' ? (
                          <CheckCircle size={16} strokeWidth={2.5} />
                        ) : ['in_progress', 'enroute'].includes(status) ? (
                          <Navigation size={16} strokeWidth={2.5} />
                        ) : status === 'assigned' ? (
                          <User size={16} strokeWidth={2.5} />
                        ) : (
                          <Clock size={16} strokeWidth={2.5} />
                        )}
                      </div>
                      
                      {/* Timeline content */}
                      <div className="flex-1 min-w-0">
                        <div className={`bg-card rounded-lg border border-border p-4 shadow-sm transition-all ${
                          selectedTransfers.includes(transfer._id) ? 'ring-2 ring-primary ring-offset-2' : ''
                        }`}>
                          {/* Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-muted-foreground">
                                {pickupTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(normalizeStatus(status))}`}>
                                {['enroute', 'in_progress'].includes(status) ? 'In Progress' : String(status || 'pending').replace(/_/g, ' ')}
                              </span>
                              {transfer.priority === 'high' && (
                                <AlertTriangle size={14} className="text-red-500" />
                              )}
                              {transfer.priority === 'vip' && (
                                <span className="text-xs bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full">VIP</span>
                              )}
                              {hasReturnTransfer && (
                                <span className="text-xs bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                                  Round Trip
                                </span>
                              )}
                              {isReturnFlightMissing && (
                                <span className="text-xs bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200 px-2 py-1 rounded-full">
                                  Return Flight Missing
                                </span>
                              )}
                              {isReturnDepartureMissing && (
                                <span className="text-xs bg-orange-100 dark:bg-orange-900/60 text-orange-800 dark:text-orange-200 px-2 py-1 rounded-full">
                                  Return Departure Missing
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {canManageTransfers && (
                                <button
                                  onClick={() => handleTransferSelect(transfer._id, !selectedTransfers.includes(transfer._id))}
                                  className="flex-shrink-0"
                                >
                                  {selectedTransfers.includes(transfer._id) ? (
                                    <CheckSquare size={16} className="text-primary" />
                                  ) : (
                                    <Square size={16} className="text-muted-foreground" />
                                  )}
                                </button>
                              )}
                              
                              <button
                                onClick={() => {
                                  setSelectedTransfer(transfer)
                                  setShowDetailsModal(true)
                                }}
                                className="p-1 rounded hover:bg-muted text-muted-foreground"
                                title="View details"
                              >
                                <Eye size={14} />
                              </button>
                              {canManageTransfers && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedTransfer(transfer)
                                      setShowDetailsModal(true)
                                    }}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground"
                                    title="Edit"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(transfer)}
                                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Content */}
                          <div className="space-y-3">
                            <div className="font-semibold text-foreground">
                              {clientName || 'Unknown Customer'}
                            </div>
                            {travelerName && (
                              <div className="text-sm text-muted-foreground">
                                Traveler: {travelerName}
                              </div>
                            )}
                            
                            {/* Onward Transfer */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <Plane size={14} className="text-muted-foreground" />
                                <span>Onward</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground ml-6">
                                <MapPin size={14} className="text-muted-foreground" />
                                <span className="truncate">
                                  {transfer.transfer_details?.pickup_location} → {transfer.transfer_details?.drop_location}
                                </span>
                              </div>
                              {hasOnwardFlight ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground ml-6">
                                  <Plane size={14} className="text-muted-foreground" />
                                  <span>{transfer.flight_details?.flight_no || transfer.flight_details?.flight_number}</span>
                                  {transfer.flight_details?.departure_time && (
                                    <span className="text-xs text-muted-foreground">
                                      ({new Date(transfer.flight_details.departure_time).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })})
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-red-500 text-sm ml-6">
                                  <AlertTriangle size={14} />
                                  <span className="text-xs">Flight Missing</span>
                                </div>
                              )}
                            </div>

                            {/* Return Transfer */}
                            {hasReturnTransfer && (
                              <div className="space-y-2">
                              <div className="space-y-2 border-t border-border pt-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                  <Plane size={14} className="text-muted-foreground rotate-180" />
                                  <span>Return</span>
                                  {isReturnFlightMissing && (
                                    <AlertTriangle size={14} className="text-red-500" />
                                  )}
                                  {isReturnDepartureMissing && (
                                    <AlertTriangle size={14} className="text-orange-500" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground ml-6">
                                  <MapPin size={14} className="text-muted-foreground" />
                                  <span className="truncate">
                                    {transfer.return_transfer_details?.pickup_location || 'TBD'} → {transfer.return_transfer_details?.drop_location || 'TBD'}
                                  </span>
                                </div>
                                {hasReturnFlight ? (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground ml-6">
                                    <Plane size={14} className="text-muted-foreground" />
                                    <span>{transfer.return_flight_details.flight_no}</span>
                                    {transfer.return_flight_details?.departure_time && (
                                      <span className="text-xs text-muted-foreground">
                                        ({new Date(transfer.return_flight_details.departure_time).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })})
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-red-500 text-sm ml-6">
                                    <AlertTriangle size={14} />
                                    <span className="text-xs">Flight Missing</span>
                                  </div>
                                )}
                              </div>

                              {/* Return specific warnings */}
                              <div className="space-y-2">
                              {isReturnFlightMissing && (
                                <div className="ml-6 p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
                                  ⚠️ Return flight details are missing. Please add return flight information.
                                </div>
                              )}
                              
                              {isReturnDepartureMissing && (
                                <div className="ml-6 p-2 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded text-xs text-orange-700 dark:text-orange-300">
                                  ⚠️ Return departure date/time is missing. Please add return transfer details.
                                </div>
                              )}
                              </div>
                            </div>
                            )}

                            {/* Vendor and Driver */}
                            <div className="flex items-center gap-4 text-sm">
                              {transfer.vendor_details?.vendor_name && (
                                <div className="flex items-center gap-2">
                                  <Building2 size={14} className="text-muted-foreground" />
                                  <span className="truncate">{transfer.vendor_details.vendor_name}</span>
                                </div>
                              )}
                              {transfer.assigned_driver_details?.name && (
                                <div className="flex items-center gap-2">
                                  <Car size={14} className="text-muted-foreground" />
                                  <span className="truncate">{transfer.assigned_driver_details.name}</span>
                                </div>
                              )}
                            </div>

                            {/* Quick Actions */}
                            {canManageTransfers && (
                              <div className="flex items-center gap-2 pt-2 border-t border-border">
                                {['pending', 'assigned', 'in_progress', 'completed'].map(statusValue => (
                                  <button
                                    key={statusValue}
                                    onClick={() => handleQuickStatusChange(transfer._id, statusValue)}
                                    disabled={statusValue === status}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                      statusValue === status 
                                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                        : 'bg-background hover:bg-muted border border-border'
                                    }`}
                                  >
                                    {statusValue.charAt(0).toUpperCase() + statusValue.slice(1)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            )}
          </div>
        )})}
        
        {dateEntries.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No transfers scheduled
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Transfers</h1>
              <p className="text-muted-foreground mt-1">
                Manage and monitor all transfers with onward and return flight information
              </p>
            </div>
            <div className="flex items-center gap-3">
              {(isRole('SUPER_ADMIN') || isRole('ADMIN') || isRole('OPERATIONS_MANAGER')) && (
                <button
                  onClick={() => {
                    setShowTransferSyncModal(true)
                    setTransferSyncSheetId('')
                    setTransferSyncSheetName('')
                    setTransferSyncResults(null)
                    setTransferSyncCustomerId('')
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors border border-border"
                >
                  <RefreshCw size={20} />
                  Sync Transfers
                </button>
              )}
              <div className="flex items-center bg-muted rounded-lg p-1">
                {['cards', 'timeline'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      viewMode === mode 
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stats – single row */}
          <div className="flex flex-nowrap gap-3 sm:gap-4 mb-6 overflow-x-auto pb-1 -mx-1">
            {statusOptions.map(option => {
              const count = filteredTransfers.filter(t => 
                (t.transfer_details?.transfer_status || 'pending') === option.value
              ).length
              return (
                <div key={option.value} className="bg-card rounded-lg border border-border p-3 sm:p-4 flex-shrink-0 min-w-[100px] sm:min-w-[120px]">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{count}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{option.label}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedTransfers.length > 0 && (
          <div className="bg-card rounded-lg border border-border p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-medium">
                  {selectedTransfers.length} transfer{selectedTransfers.length > 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => handleSelectAll(false)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Clear selection
                </button>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowBulkStatusModal(true)}
                  disabled={bulkLoading}
                  className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
                >
                  Update Status
                </button>
                <button
                  onClick={() => setShowBulkVendorModal(true)}
                  disabled={bulkLoading}
                  className="px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 text-sm"
                >
                  Assign Vendor
                </button>
                <button
                  onClick={() => setShowBulkDriverModal(true)}
                  disabled={bulkLoading}
                  className="px-3 py-1.5 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 text-sm"
                >
                  Assign Driver
                </button>
                {(() => {
                  const eligibleReturn = transfers.filter(t => selectedTransfers.includes(t._id) && t.return_transfer_details && (t.transfer_details?.transfer_status || 'pending') === 'completed')
                  return eligibleReturn.length > 0 && (
                    <button
                      onClick={() => setShowBulkReturnDriverModal(true)}
                      disabled={bulkLoading}
                      className="px-3 py-1.5 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50 text-sm"
                    >
                      Assign Return Driver ({eligibleReturn.length})
                    </button>
                  )
                })()}
                <button
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  disabled={bulkLoading}
                  className="px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 text-sm flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="px-3 py-1.5 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-card rounded-lg border border-border p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search transfers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Dropdown
                name="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Status' },
                  ...statusOptions.map(o => ({ value: o.value, label: o.label }))
                ]}
                placeholder="All Status"
                minWidth="140px"
              />
              
              {(statusFilter !== 'all' || searchTerm) && (
                <button
                  onClick={() => {
                    setStatusFilter('all')
                    setSearchTerm('')
                  }}
                  className="px-3 py-2 bg-transparent border border-input rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Transfers Display */}
        {loading ? (
          <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center">
            <div className="text-base text-muted-foreground">Loading transfers...</div>
          </div>
        ) : filteredTransfers.length === 0 ? (
          <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center">
            <div className="text-base text-muted-foreground">
              {searchTerm || statusFilter !== 'all' ? 'No transfers found matching your criteria' : 'No transfers found'}
            </div>
          </div>
        ) : viewMode === 'timeline' ? (
          <TimelineView />
        ) : (
          <div className="space-y-4">
            {/* Select all on current page */}
            {canManageTransfers && paginatedTransfers.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <button
                  onClick={() => {
                    const pageIds = paginatedTransfers.map(t => t._id)
                    const allSelected = pageIds.every(id => selectedTransfers.includes(id))
                    if (allSelected) {
                      setSelectedTransfers(prev => prev.filter(id => !pageIds.includes(id)))
                    } else {
                      setSelectedTransfers(prev => [...new Set([...prev, ...pageIds])])
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  {paginatedTransfers.every(t => selectedTransfers.includes(t._id)) ? (
                    <CheckSquare size={18} className="text-primary" />
                  ) : (
                    <Square size={18} className="text-muted-foreground" />
                  )}
                  <span className="text-sm">
                    {paginatedTransfers.every(t => selectedTransfers.includes(t._id)) ? 'Deselect page' : 'Select page'}
                  </span>
                </button>
                <span className="text-sm text-muted-foreground">
                  {filteredTransfers.length} transfers
                </span>
              </div>
            )}
            
            {paginatedTransfers.map(transfer => (
              <TransferCard key={transfer._id} transfer={transfer} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredTransfers.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1}–{Math.min(endIndex, filteredTransfers.length)} of {filteredTransfers.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 rounded-lg border border-border bg-background text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Previous
              </button>
              <span className="px-2 text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-border bg-background text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Sync Transfers from Registration Sheet Drawer */}
        <Drawer
          isOpen={showTransferSyncModal}
          onClose={() => {
            setShowTransferSyncModal(false)
            setTransferSyncSheetId('')
            setTransferSyncSheetName('')
            setTransferSyncResults(null)
            setTransferSyncCustomerId('')
          }}
          title="Sync Transfers from Registration Sheet"
          subtitle="Create one transfer per traveler using event registration data"
          position="right"
          size="lg"
        >
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                    <Info size={18} />
                    How this works:
                  </h3>
                  <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1.5 list-decimal list-inside">
                    <li>Use your event registration Google Form that collects Delegate 1 and optional Delegate 2, plus flight details.</li>
                    <li>Make the sheet <strong>public</strong> (File → Share → Anyone with the link can view).</li>
                    <li>Copy the Sheet ID from the URL and paste it below.</li>
                    <li>Each row will create one transfer for Delegate 1, with Delegate 2 stored as plus-one inside that transfer.</li>
                  </ol>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-3">
                    Existing transfers are not modified. This feature is ideal for generating transfers in bulk from a confirmed registration sheet.
                  </p>
                </div>

                {(isRole('SUPER_ADMIN') || isRole('ADMIN') || isRole('OPERATIONS_MANAGER')) && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Client for these transfers <span className="text-destructive">*</span>
                    </label>
                    <Dropdown
                      name="transferSyncCustomerId"
                      value={transferSyncCustomerId}
                      onChange={(e) => setTransferSyncCustomerId(e.target.value)}
                      options={[
                        { value: '', label: 'Select a client' },
                        ...clients.map(client => ({
                          value: client._id,
                          label: `${client.profile?.firstName || ''} ${client.profile?.lastName || ''}`.trim() || client.username || client.email
                        }))
                      ]}
                      placeholder="Select client"
                      minWidth="100%"
                    />
                    {loadingClients && <p className="text-xs text-muted-foreground mt-1">Loading clients...</p>}
                    <p className="text-xs text-muted-foreground mt-1">All generated transfers will belong to this client account.</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Google Sheet ID <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={transferSyncSheetId}
                    onChange={(e) => setTransferSyncSheetId(e.target.value)}
                    placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={transferSyncing}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Found in the Google Sheet URL: <code className="bg-muted px-1 rounded">https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit</code>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Sheet Name (Optional)</label>
                  <input
                    type="text"
                    value={transferSyncSheetName}
                    onChange={(e) => setTransferSyncSheetName(e.target.value)}
                    placeholder="e.g., Form Responses 1, Sheet1, or leave empty for first sheet"
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={transferSyncing}
                  />
                </div>

                {transferSyncing && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">{transferSyncProgress.message || 'Syncing transfers...'}</span>
                      {transferSyncProgress.percentage > 0 && <span className="text-sm text-muted-foreground">{transferSyncProgress.percentage}%</span>}
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                      <div className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${transferSyncProgress.percentage}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">This may take a few minutes for large sheets. Please don&apos;t close this window.</p>
                  </div>
                )}

                {transferSyncResults && (
                  <div className="mt-6 space-y-3">
                    <h3 className="font-semibold text-foreground">Transfer Sync Results</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                          <span className="text-xs font-medium text-green-700 dark:text-green-300">Transfers created</span>
                        </div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{transferSyncResults.createdTransfers || 0}</div>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Travelers created</span>
                        </div>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{transferSyncResults.createdTravelers || 0}</div>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <XCircle size={16} className="text-yellow-600 dark:text-yellow-400" />
                          <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">Skipped</span>
                        </div>
                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{transferSyncResults.skipped || 0}</div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Info size={16} className="text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Total rows</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{transferSyncResults.total || 0}</div>
                      </div>
                    </div>
                    {transferSyncResults.errors && transferSyncResults.errors.length > 0 && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
                          <XCircle size={18} />
                          Errors ({transferSyncResults.errors.length})
                        </h4>
                        <div className="max-h-48 overflow-y-auto space-y-1.5">
                          {transferSyncResults.errors.map((error, index) => (
                            <div key={index} className="text-xs text-red-600 dark:text-red-400">
                              {error.row ? <><strong>Row {error.row}</strong> ({error.email || 'N/A'}): {error.error}</> : <>{error.error}</>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 border-t border-border bg-muted/30 backdrop-blur-sm">
              <div className="flex gap-3 px-6 py-5">
                <button
                  type="button"
                  onClick={() => { setShowTransferSyncModal(false); setTransferSyncSheetId(''); setTransferSyncSheetName(''); setTransferSyncResults(null) }}
                  className="flex-1 px-4 py-2.5 bg-background border-2 border-border rounded-lg text-foreground font-semibold hover:bg-muted"
                  disabled={transferSyncing}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSyncTransfersFromRegistrationSheet}
                  className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 flex items-center justify-center gap-2"
                  disabled={transferSyncing || !transferSyncSheetId.trim() || ((isRole('SUPER_ADMIN') || isRole('ADMIN') || isRole('OPERATIONS_MANAGER')) && !transferSyncCustomerId)}
                >
                  {transferSyncing ? <><RefreshCw size={18} className="animate-spin" />Syncing...</> : <><RefreshCw size={18} />Sync Transfers</>}
                </button>
              </div>
            </div>
          </div>
        </Drawer>

        {/* Bulk Vendor Modal */}
        {showBulkVendorModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
            <div className="bg-card rounded-lg border border-border p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Assign Vendor to {selectedTransfers.length} Transfers</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Vendor</label>
                  <Dropdown
                    name="bulkVendor"
                    value={bulkVendorId}
                    onChange={(e) => setBulkVendorId(e.target.value)}
                    options={[
                      { value: '', label: 'Select a vendor...' },
                      ...vendors.map(v => ({
                        value: v._id || v.id,
                        label: `${v.vendorDetails?.companyName || v.username || v.email || 'Vendor'} (${v.email || ''})`
                      }))
                    ]}
                    placeholder={loadingVendors ? 'Loading vendors...' : 'Select a vendor'}
                    minWidth="100%"
                  />
                  {vendors.length === 0 && !loadingVendors && (
                    <p className="text-xs text-muted-foreground mt-1">No vendors found. Add vendors in User Management first.</p>
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleBulkVendorAssign}
                  disabled={bulkLoading || !bulkVendorId || loadingVendors}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {bulkLoading ? 'Assigning...' : 'Assign Vendor'}
                </button>
                <button
                  onClick={() => setShowBulkVendorModal(false)}
                  className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Driver Modal */}
        {showBulkDriverModal && (() => {
          const selectedObjs = transfers.filter(t => selectedTransfers.includes(t._id))
          const withVendor = selectedObjs.filter(t => t.vendor_details?.vendor_id)
          const withoutVendor = selectedObjs.filter(t => !t.vendor_details?.vendor_id)
          const hasVendorMissing = withoutVendor.length > 0
          const vendorIds = [...new Set(withVendor.map(t => t.vendor_details.vendor_id))]
          const allSameVendor = vendorIds.length === 1
          const hasMixedVendors = vendorIds.length > 1
          return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
            <div className="bg-card rounded-lg border border-border p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Assign Driver to {selectedTransfers.length} Transfer{selectedTransfers.length !== 1 ? 's' : ''}</h3>
              {/* Vendor status summary */}
              <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border text-sm">
                {hasVendorMissing ? (
                  <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
                    <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Vendor required first</p>
                      <p className="text-muted-foreground mt-1">
                        {withoutVendor.length} transfer{withoutVendor.length !== 1 ? 's' : ''} {withoutVendor.length !== 1 ? 'are' : 'is'} missing a vendor. Please assign a vendor to {withoutVendor.length !== 1 ? 'these transfers' : 'this transfer'} before adding a driver.
                      </p>
                    </div>
                  </div>
                ) : hasMixedVendors ? (
                  <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
                    <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Different vendors assigned</p>
                      <p className="text-muted-foreground mt-1">
                        Selected transfers have different vendors. Please select transfers with the same vendor to assign a driver in bulk.
                      </p>
                    </div>
                  </div>
                ) : withVendor.length > 0 && (
                  <div className="text-foreground">
                    <p className="font-medium text-green-700 dark:text-green-300">Vendor assigned</p>
                    <p className="text-muted-foreground mt-1">
                      {withVendor[0].vendor_details?.vendor_name || 'Vendor'}
                    </p>
                  </div>
                )}
              </div>
              {!hasVendorMissing && !hasMixedVendors && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Driver</label>
                    <Dropdown
                      name="bulkDriver"
                      value={bulkDriverId}
                      onChange={(e) => setBulkDriverId(e.target.value)}
                      options={[
                        { value: '', label: !bulkVendorIdForDriver ? 'Loading vendor...' : (loadingDrivers ? 'Loading drivers...' : 'Select a driver') },
                        ...drivers.map(d => {
                          const name = [d.profile?.firstName, d.profile?.lastName].filter(Boolean).join(' ') || d.username || ''
                          const vehicle = d.driverDetails?.vehicleNumber ? ` - ${d.driverDetails.vehicleNumber}` : ''
                          return { value: d._id || d.id, label: `${name}${vehicle}` }
                        })
                      ]}
                      placeholder={!bulkVendorIdForDriver ? 'Loading...' : (loadingDrivers ? 'Loading...' : 'Select driver')}
                      minWidth="100%"
                    />
                    {bulkVendorIdForDriver && drivers.length === 0 && !loadingDrivers && (
                      <p className="text-xs text-muted-foreground mt-1">No drivers found for this vendor.</p>
                    )}
                  </div>
                </div>
              )}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleBulkDriverAssign}
                  disabled={bulkLoading || hasVendorMissing || hasMixedVendors || !bulkDriverId || loadingDrivers}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {bulkLoading ? 'Assigning...' : 'Assign Driver'}
                </button>
                <button
                  onClick={() => setShowBulkDriverModal(false)}
                  className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
          )
        })()}

        {/* Bulk Return Driver Modal */}
        {showBulkReturnDriverModal && (() => {
          const eligible = transfers.filter(t => selectedTransfers.includes(t._id) && t.return_transfer_details && (t.transfer_details?.transfer_status || 'pending') === 'completed')
          const withVendor = eligible.filter(t => t.vendor_details?.vendor_id)
          const vendorIds = [...new Set(withVendor.map(t => (t.vendor_details?.vendor_id || '').toString()).filter(Boolean))]
          const allSameVendor = vendorIds.length === 1
          const hasMixedVendors = vendorIds.length > 1
          return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
            <div className="bg-card rounded-lg border border-border p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Assign Return Driver to {eligible.length} Transfer{eligible.length !== 1 ? 's' : ''}</h3>
              {eligible.length === 0 ? (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
                  <p>No eligible transfers. Only round-trip transfers with <strong>onward leg completed</strong> can have a return driver assigned.</p>
                  <p className="mt-2">Update status to &quot;Completed&quot; for the onward leg first.</p>
                </div>
              ) : hasMixedVendors ? (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 text-amber-800 text-sm">
                  Selected transfers have different vendors. Please select transfers with the same vendor.
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Vendor</label>
                    <Dropdown
                      name="bulkVendorForReturnDriver"
                      value={bulkVendorIdForReturnDriver}
                      onChange={(e) => setBulkVendorIdForReturnDriver(e.target.value)}
                      options={[
                        { value: '', label: 'Select vendor...' },
                        ...vendors.filter(v => vendorIds.includes((v._id || v.id).toString())).map(v => ({
                          value: (v._id || v.id).toString(),
                          label: v.vendorDetails?.companyName || v.username || v.email || 'Vendor'
                        }))
                      ]}
                      placeholder="Select vendor"
                      minWidth="100%"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Return Driver</label>
                    <Dropdown
                      name="bulkReturnDriver"
                      value={bulkReturnDriverId}
                      onChange={(e) => setBulkReturnDriverId(e.target.value)}
                      options={[
                        { value: '', label: !bulkVendorIdForReturnDriver ? 'Select vendor...' : (loadingDrivers ? 'Loading drivers...' : 'Select a driver') },
                        ...drivers.map(d => {
                          const name = [d.profile?.firstName, d.profile?.lastName].filter(Boolean).join(' ') || d.username || ''
                          const vehicle = d.driverDetails?.vehicleNumber ? ` - ${d.driverDetails.vehicleNumber}` : ''
                          return { value: d._id || d.id, label: `${name}${vehicle}` }
                        })
                      ]}
                      placeholder={!bulkVendorIdForReturnDriver ? 'Loading...' : (loadingDrivers ? 'Loading...' : 'Select driver')}
                      minWidth="100%"
                    />
                    {!bulkVendorIdForReturnDriver && (
                      <p className="text-xs text-muted-foreground mt-1">Select vendor first to load drivers.</p>
                    )}
                  </div>
                </div>
              )}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleBulkReturnDriverAssign}
                  disabled={bulkLoading || eligible.length === 0 || hasMixedVendors || !bulkVendorIdForReturnDriver || !bulkReturnDriverId || loadingDrivers}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {bulkLoading ? 'Assigning...' : 'Assign Return Driver'}
                </button>
                <button
                  onClick={() => setShowBulkReturnDriverModal(false)}
                  className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
          )
        })()}

        {/* Bulk Delete Confirmation Modal */}
        {showBulkDeleteConfirm && selectedTransfers.length > 0 && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
            <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Trash2 size={24} className="text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Delete Transfers</h3>
                  <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-foreground mb-6">
                Are you sure you want to delete <strong>{selectedTransfers.length}</strong> transfer{selectedTransfers.length !== 1 ? 's' : ''}?
                This will permanently remove {selectedTransfers.length === 1 ? 'this transfer' : 'these transfers'} from the system.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  disabled={bulkLoading}
                  className="flex-1 px-4 py-2 bg-background border-2 border-border rounded-lg text-foreground font-semibold hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkLoading}
                  className="flex-1 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg font-semibold hover:bg-destructive/90 transition-all flex items-center justify-center gap-2"
                >
                  {bulkLoading ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Single Transfer Confirmation Modal */}
        {showDeleteConfirm && transferToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
            <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Trash2 size={24} className="text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Delete Transfer</h3>
                  <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-foreground mb-6">
                Are you sure you want to delete transfer <strong>{transferToDelete._id?.slice(-8)}</strong>?
                This will permanently remove this transfer from the system.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setTransferToDelete(null)
                  }}
                  disabled={bulkLoading}
                  className="flex-1 px-4 py-2 bg-background border-2 border-border rounded-lg text-foreground font-semibold hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTransfer}
                  disabled={bulkLoading}
                  className="flex-1 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg font-semibold hover:bg-destructive/90 transition-all flex items-center justify-center gap-2"
                >
                  {bulkLoading ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Status Modal */}
        {showBulkStatusModal && (() => {
          const selectedObjs = transfers.filter(t => selectedTransfers.includes(t._id))
          const withReturn = selectedObjs.filter(t => t.return_transfer_details)
          return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
            <div className="bg-card rounded-lg border border-border p-6 max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Update Status for {selectedTransfers.length} Transfer{selectedTransfers.length !== 1 ? 's' : ''}</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Onward (Arrival) – left */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Plane size={14} />
                    Onward (Arrival)
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">Update arrival leg only</p>
                  <div className="space-y-2">
                    {statusOptions.map(option => (
                      <button
                        key={`onward-${option.value}`}
                        onClick={() => handleBulkStatusUpdate(option.value, 'onward')}
                        disabled={bulkLoading}
                        className={`w-full p-3 rounded-lg border text-left font-medium transition-all duration-200
                          hover:scale-[1.02] hover:shadow-md hover:border-foreground/20
                          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                          active:scale-[0.99] active:shadow-sm
                          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none
                          ${option.color}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Return (Departure) – right */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Plane size={14} className="rotate-180" />
                    Return (Departure)
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {withReturn.length > 0
                      ? `Update return leg only (${withReturn.length} of ${selectedTransfers.length} have return)`
                      : 'No selected transfers have a return leg'}
                  </p>
                  <div className="space-y-2">
                    {statusOptions.map(option => (
                      <button
                        key={`return-${option.value}`}
                        onClick={() => handleBulkStatusUpdate(option.value, 'return')}
                        disabled={bulkLoading || withReturn.length === 0}
                        className={`w-full p-3 rounded-lg border text-left font-medium transition-all duration-200
                          hover:scale-[1.02] hover:shadow-md hover:border-foreground/20
                          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                          active:scale-[0.99] active:shadow-sm
                          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none
                          ${option.color}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowBulkStatusModal(false)}
                  className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg font-medium
                    hover:bg-muted/80 hover:shadow-sm transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                    active:scale-[0.99]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
          )
        })()}

        {/* Simple Details Modal */}
        {showDetailsModal && selectedTransfer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
            <div className="bg-card rounded-lg border border-border p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Transfer Details</h3>
              <div className="space-y-4">
                <div>
                  <strong>Transfer ID:</strong> {selectedTransfer._id}
                </div>
                <div>
                  <strong>Customer:</strong> {getClientAndTravelerNames(selectedTransfer).clientName}
                </div>
                <div>
                  <strong>Traveler:</strong> {getClientAndTravelerNames(selectedTransfer).travelerName}
                </div>
                
                {/* Onward Transfer Section */}
                <div className="border-t border-border pt-4">
                  <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <Plane size={16} className="text-muted-foreground" />
                    Onward Transfer
                  </h4>
                  <div className="grid grid-cols-2 gap-4 ml-6">
                    <div>
                      <strong>Pickup:</strong> {selectedTransfer.transfer_details?.pickup_location}
                    </div>
                    <div>
                      <strong>Drop:</strong> {selectedTransfer.transfer_details?.drop_location}
                    </div>
                    <div>
                      <strong>Pickup Time:</strong> {new Date(selectedTransfer.transfer_details?.estimated_pickup_time).toLocaleString()}
                    </div>
                    <div>
                      <strong>Status:</strong> {selectedTransfer.transfer_details?.transfer_status}
                    </div>
                  </div>
                  
                  {/* Onward Flight Details */}
                  {selectedTransfer.flight_details?.flight_no && selectedTransfer.flight_details.flight_no !== 'XX000' && (
                    <div className="ml-6 p-3 bg-muted/50 rounded border border-border">
                      <h5 className="font-medium text-sm mb-2">Flight Details</h5>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <strong>Flight Number:</strong> {selectedTransfer.flight_details.flight_no}
                        </div>
                        <div>
                          <strong>Departure Time:</strong> {selectedTransfer.flight_details?.departure_time ? new Date(selectedTransfer.flight_details.departure_time).toLocaleString() : 'N/A'}
                        </div>
                        <div>
                          <strong>Airline:</strong> {selectedTransfer.flight_details?.airline || 'N/A'}
                        </div>
                        <div>
                          <strong>Terminal:</strong> {selectedTransfer.flight_details?.terminal || 'N/A'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Return Transfer Section */}
                {(selectedTransfer.return_transfer_details || selectedTransfer.return_flight_details) && (() => {
                  const hasReturnTransfer = selectedTransfer.return_transfer_details || selectedTransfer.return_flight_details
                  const hasReturnFlight = selectedTransfer.return_flight_details?.flight_no && 
                    selectedTransfer.return_flight_details.flight_no !== 'XX000' && 
                    selectedTransfer.return_flight_details.flight_no !== 'TBD'
                  const isReturnFlightMissing = hasReturnTransfer && !hasReturnFlight
                  const isReturnDepartureMissing = hasReturnTransfer && 
                    (!selectedTransfer.return_transfer_details?.estimated_pickup_time || !selectedTransfer.return_flight_details?.departure_time)
                  return (
                  <div className="border-t border-border pt-4">
                    <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                      <Plane size={16} className="text-muted-foreground rotate-180" />
                      Return Transfer
                      {(!selectedTransfer.return_flight_details?.flight_no || selectedTransfer.return_flight_details?.flight_no === 'XX000') && (
                        <span className="ml-2 px-2 py-1 bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200 rounded text-xs">
                          Flight Missing
                        </span>
                      )}
                      {(!selectedTransfer.return_transfer_details?.estimated_pickup_time || !selectedTransfer.return_flight_details?.departure_time) && (
                        <span className="ml-2 px-2 py-1 bg-orange-100 dark:bg-orange-900/60 text-orange-800 dark:text-orange-200 rounded text-xs">
                          Departure Missing
                        </span>
                      )}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 ml-6">
                      <div>
                        <strong>Pickup:</strong> {selectedTransfer.return_transfer_details?.pickup_location || 'TBD'}
                      </div>
                      <div>
                        <strong>Drop:</strong> {selectedTransfer.return_transfer_details?.drop_location || 'TBD'}
                      </div>
                      <div>
                        <strong>Pickup Time:</strong> {selectedTransfer.return_transfer_details?.estimated_pickup_time ? new Date(selectedTransfer.return_transfer_details.estimated_pickup_time).toLocaleString() : 'Missing'}
                      </div>
                      <div>
                        <strong>Status:</strong> {selectedTransfer.return_transfer_details?.transfer_status || 'N/A'}
                      </div>
                    </div>
                    
                    {/* Return Flight Details */}
                    {selectedTransfer.return_flight_details?.flight_no && selectedTransfer.return_flight_details.flight_no !== 'XX000' && (
                      <div className="ml-6 p-3 bg-muted/50 rounded border border-border">
                        <h5 className="font-medium text-sm mb-2">Return Flight Details</h5>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <strong>Flight Number:</strong> {selectedTransfer.return_flight_details.flight_no}
                          </div>
                          <div>
                            <strong>Departure Time:</strong> {selectedTransfer.return_flight_details?.departure_time ? new Date(selectedTransfer.return_flight_details.departure_time).toLocaleString() : 'N/A'}
                          </div>
                          <div>
                            <strong>Airline:</strong> {selectedTransfer.return_flight_details?.airline || 'N/A'}
                          </div>
                          <div>
                            <strong>Terminal:</strong> {selectedTransfer.return_flight_details?.terminal || 'N/A'}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Return specific warnings */}
                    {isReturnFlightMissing && (
                      <div className="ml-6 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded">
                        <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                          <AlertTriangle size={16} />
                          <span>Return flight information is missing. Please add return flight details to complete the round-trip transfer.</span>
                        </div>
                      </div>
                    )}
                    
                    {isReturnDepartureMissing && (
                      <div className="ml-6 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded">
                        <div className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
                          <AlertTriangle size={16} />
                          <span>Return departure information is missing. Please add return transfer pickup time and location.</span>
                        </div>
                      </div>
                    )}
                  </div>
                  )
                })()}

                {/* Vendor and Driver Info */}
                <div className="border-t border-border pt-4">
                  <h4 className="font-medium text-foreground mb-3">Assignment Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedTransfer.vendor_details?.vendor_name && (
                      <div>
                        <strong>Vendor:</strong> {selectedTransfer.vendor_details.vendor_name}
                      </div>
                    )}
                    {selectedTransfer.assigned_driver_details?.name && (
                      <div>
                        <strong>Driver:</strong> {selectedTransfer.assigned_driver_details.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TransfersEnhanced
