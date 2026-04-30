import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import {
  Calendar,
  Users,
  MapPin,
  Clock,
  Phone,
  Mail,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  X,
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Building2,
  Plane,
  Square,
  CheckSquare,
  Car,
  Layers,
  Info,
  RotateCcw,
  XCircle,
  User
} from 'lucide-react'
import toast from 'react-hot-toast'
import { startOfDay } from 'date-fns'
import 'react-datepicker/dist/react-datepicker.css'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { getClientAndTravelerNames, getCompanyName, getDelegateDisplayName, getTransferStatusDisplay, getUniqueTravelerCountAcrossTransfers, getAirlineDisplay, hasRealFlight, getFlightNoDisplay, getFlightFieldDisplay, DEFAULT_AIRPORT, DEFAULT_HOTEL, formatDateFriendly, formatTransferPickupLocal, formatReturnPickupLocal, formatFlightDepartureLocal, formatFlightArrivalLocal, formatDateTimeAtAirport, expandTransferToCardRows } from '../utils/transferUtils'
import { STATUS_OPTIONS, normalizeStatus } from '../utils/transferFlow'
import Dropdown from '../components/Dropdown'
import Drawer from '../components/Drawer'
import AddTravelerInSameCar from '../components/AddTravelerInSameCar'
import axios from 'axios'
import DatePicker from 'react-datepicker'

const TransfersEnhanced = () => {
  const { user, isRole } = useAuth()
  const { isDark } = useTheme()
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)
  const [companyFilter, setCompanyFilter] = useState('')
  const [travelerFilter, setTravelerFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState('cards')
  const [groupByCompany, setGroupByCompany] = useState(true)
  const [sortBy, setSortBy] = useState('company') // 'company' | 'latest'
  
  // Bulk operations state
  const [selectedTransfers, setSelectedTransfers] = useState([])
  const [bulkLoading, setBulkLoading] = useState(false)
  
  // Modal states
  const [selectedTransfer, setSelectedTransfer] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [transferToDelete, setTransferToDelete] = useState(null)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [deleteAllBulk, setDeleteAllBulk] = useState(false)
  const [showTransferSyncModal, setShowTransferSyncModal] = useState(false)
  const [transferSyncSheetId, setTransferSyncSheetId] = useState('')
  const [transferSyncSheetName, setTransferSyncSheetName] = useState('')
  const [transferSyncGid, setTransferSyncGid] = useState('')
  const [transferSyncing, setTransferSyncing] = useState(false)
  const [transferSyncResults, setTransferSyncResults] = useState(null)
  const [transferSyncProgress, setTransferSyncProgress] = useState({ message: '', percentage: 0 })
  const [transferSyncCustomerId, setTransferSyncCustomerId] = useState('')
  const [showBulkVendorModal, setShowBulkVendorModal] = useState(false)
  const [bulkVendorLeg, setBulkVendorLeg] = useState('onward')
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
  const [showFlightDrawer, setShowFlightDrawer] = useState(false)
  const [flightDrawerLeg, setFlightDrawerLeg] = useState('onward')
  const [flightNumberInput, setFlightNumberInput] = useState('')
  const [flightDateInput, setFlightDateInput] = useState('')
  const [fetchedFlightData, setFetchedFlightData] = useState(null)
  const [flightFetchLoading, setFlightFetchLoading] = useState(false)
  const [flightFetchError, setFlightFetchError] = useState(null)
  const [flightSaveLoading, setFlightSaveLoading] = useState(false)
  const [fetchedTerminalOverride, setFetchedTerminalOverride] = useState('')
  const [showAddTravelerInSameCar, setShowAddTravelerInSameCar] = useState(false)
  const [removingDelegateId, setRemovingDelegateId] = useState(null)
  // Manual flight entry (when not from sheet/fetch)
  const [manualFlight, setManualFlight] = useState({
    flight_no: '',
    airline: 'TBD',
    departure_airport: '',
    departure_date: '',
    departure_time: '',
    arrival_airport: '',
    arrival_date: '',
    arrival_time: '',
    terminal: ''
  })
  
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const getTodayLocal = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const getDefaultFlightDate = (transfer, leg) => {
    const today = getTodayLocal()
    const src = leg === 'onward' ? transfer?.transfer_details?.estimated_pickup_time : transfer?.return_transfer_details?.estimated_pickup_time
    if (src) {
      const d = new Date(src)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (dateStr < today) return today
      return dateStr
    }
    return today
  }

  const toDateStr = (d) => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : ''
  const toTimeStr = (d) => d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : ''

  const openFlightDrawer = (leg, existing = null) => {
    setFlightDrawerLeg(leg)
    setFetchedFlightData(null)
    setFetchedTerminalOverride('')
    setFlightFetchError(null)
    if (existing?.flight_no) {
      setFlightNumberInput(existing.flight_no)
      const dep = existing.departure_time ? new Date(existing.departure_time) : null
      const arr = existing.arrival_time ? new Date(existing.arrival_time) : null
      let dateStr = dep ? toDateStr(dep) : getDefaultFlightDate(selectedTransfer, leg)
      if (dateStr < getTodayLocal()) dateStr = getTodayLocal()
      setFlightDateInput(dateStr)
      setManualFlight({
        flight_no: existing.flight_no || '',
        airline: existing.airline || 'TBD',
        departure_airport: existing.departure_airport || '',
        departure_date: toDateStr(dep),
        departure_time: toTimeStr(dep),
        arrival_airport: existing.arrival_airport || '',
        arrival_date: toDateStr(arr),
        arrival_time: toTimeStr(arr),
        terminal: existing.terminal || ''
      })
    } else {
      setFlightNumberInput('')
      setFlightDateInput(getDefaultFlightDate(selectedTransfer, leg))
      const defDate = getDefaultFlightDate(selectedTransfer, leg)
      setManualFlight({
        flight_no: '',
        airline: 'TBD',
        departure_airport: '',
        departure_date: defDate,
        departure_time: '12:00',
        arrival_airport: leg === 'return' ? '' : 'KUL',
        arrival_date: defDate,
        arrival_time: '14:00',
        terminal: ''
      })
    }
    setShowFlightDrawer(true)
  }

  const handleFetchFlight = async () => {
    const fn = flightNumberInput?.trim()
    if (!fn) {
      toast.error('Please enter a flight number')
      return
    }
    setFlightFetchLoading(true)
    setFlightFetchError(null)
    setFetchedFlightData(null)
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'
      const token = localStorage.getItem('token')
      const date = flightDateInput || getTodayLocal()
      const res = await axios.get(`${API_BASE_URL}/flights/global-search`, {
        params: { flight: fn, date },
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data?.success && res.data.data) {
        const d = res.data.data
        setFetchedFlightData(d)
        setFetchedTerminalOverride(d.terminal || '')
        toast.success('Flight details retrieved')
      } else {
        const apiMsg = res.data?.message || 'Flight not found'
        const friendlyMsg = apiMsg?.toLowerCase().includes('flight not found') ? 'Flight not found. Try a date closer to today.' : apiMsg
        setFlightFetchError(friendlyMsg)
      }
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error('Session expired. Please login again.')
        localStorage.removeItem('token')
        setShowFlightDrawer(false)
        setTimeout(() => { window.location.href = '/' }, 1500)
        return
      }
      const apiMsg = err.response?.data?.message || err.message || 'Failed to fetch flight'
      const friendlyMsg = apiMsg?.toLowerCase().includes('flight not found') ? 'Flight not found. Try a date closer to today.' : (apiMsg || 'Failed to fetch flight')
      setFlightFetchError(friendlyMsg)
      toast.error(friendlyMsg)
    } finally {
      setFlightFetchLoading(false)
    }
  }

  const handleSaveFlight = async () => {
    if (!selectedTransfer?._id) return
    let flightPayload
    if (fetchedFlightData) {
      const d = fetchedFlightData
      const depTime = d.departureTime ? new Date(d.departureTime) : null
      const arrTime = d.arrivalTime ? new Date(d.arrivalTime) : null
      if (!depTime || !arrTime || isNaN(depTime.getTime()) || isNaN(arrTime.getTime())) {
        toast.error('Flight data missing departure or arrival time')
        return
      }
      const depAirport = (d.departureAirport || '').trim() || 'TBD'
      const arrAirport = (d.arrivalAirport || '').trim() || 'TBD'
      flightPayload = {
        flight_no: (d.flight || flightNumberInput).trim().toUpperCase() || 'XX000',
        airline: (d.airlineName || d.airlineCode || '').trim() || 'N/A',
        departure_airport: flightDrawerLeg === 'return' ? 'KUL' : depAirport,
        arrival_airport: flightDrawerLeg === 'onward' ? 'KUL' : arrAirport,
        departure_time: depTime.toISOString(),
        arrival_time: arrTime.toISOString(),
        scheduled_arrival: arrTime.toISOString(),
        terminal: (fetchedTerminalOverride || d.terminal || '').trim() || undefined,
        status: d.status || 'on_time',
        delay_minutes: d.delayMinutes ?? 0
      }
    } else {
      const m = manualFlight
      const depDate = m.departure_date ? new Date(m.departure_date + 'T' + (m.departure_time || '12:00') + ':00') : null
      const arrDate = m.arrival_date ? new Date(m.arrival_date + 'T' + (m.arrival_time || '14:00') + ':00') : null
      if (!depDate || !arrDate || isNaN(depDate.getTime()) || isNaN(arrDate.getTime())) {
        toast.error('Please enter departure and arrival date/time')
        return
      }
      const depAirport = (m.departure_airport || '').trim() || 'TBD'
      const arrAirport = (m.arrival_airport || '').trim() || 'TBD'
      flightPayload = {
        flight_no: (m.flight_no || flightNumberInput).trim().toUpperCase() || 'XX000',
        airline: (m.airline || '').trim() || 'TBD',
        departure_airport: flightDrawerLeg === 'return' ? 'KUL' : depAirport,
        arrival_airport: flightDrawerLeg === 'onward' ? 'KUL' : arrAirport,
        departure_time: depDate.toISOString(),
        arrival_time: arrDate.toISOString(),
        scheduled_arrival: arrDate.toISOString(),
        terminal: (manualFlight.terminal || '').trim() || undefined,
        status: 'on_time',
        delay_minutes: 0
      }
    }
    setFlightSaveLoading(true)
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'
      const token = localStorage.getItem('token')
      const payload = flightDrawerLeg === 'onward'
        ? { flight_details: flightPayload }
        : {
            return_flight_details: flightPayload,
            return_transfer_details: {
              ...(selectedTransfer.return_transfer_details
                ? (typeof selectedTransfer.return_transfer_details.toObject === 'function'
                  ? selectedTransfer.return_transfer_details.toObject()
                  : selectedTransfer.return_transfer_details)
                : {}),
              estimated_pickup_time: flightPayload.departure_time
            }
          }
      const res = await axios.put(`${API_BASE_URL}/transfers/${selectedTransfer._id}/flight-details`, payload, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      })
      if (res.data?.success) {
        toast.success(flightDrawerLeg === 'onward' ? 'Onward flight saved' : 'Return flight saved')
        setSelectedTransfer(res.data.data)
        setTransfers(prev => prev.map(t => t._id === selectedTransfer._id ? res.data.data : t))
        setShowFlightDrawer(false)
        fetchTransfers(false)
      } else {
        toast.error(res.data?.message || 'Failed to save flight')
      }
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error('Session expired. Please login again.')
        localStorage.removeItem('token')
        setShowFlightDrawer(false)
        setTimeout(() => { window.location.href = '/' }, 1500)
        return
      }
      toast.error(err.response?.data?.message || err.message || 'Failed to save flight')
    } finally {
      setFlightSaveLoading(false)
    }
  }

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
  const canAddUpdateFlight = canManageTransfers || isRole('CLIENT')
  const isVendor = isRole('VENDOR')
  const isClient = isRole('CLIENT')

  useEffect(() => {
    fetchTransfers()
  }, [])

  useEffect(() => {
    if (!companyFilter) setTravelerFilter('')
  }, [companyFilter])

  // Apply company filter from query param (e.g. /transfers?company=Acme)
  useEffect(() => {
    const companyFromQuery = searchParams.get('company')
    if (!companyFromQuery) return
    if (companyFromQuery !== companyFilter) {
      setCompanyFilter(companyFromQuery)
    }
    // Consume one-time company param so clearing filter in UI doesn't get stuck/reapplied.
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('company')
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, companyFilter, setSearchParams])

  // Open specific transfer when navigating from Dashboard (e.g. /transfers?id=APX123456)
  useEffect(() => {
    const transferId = searchParams.get('id') || searchParams.get('transferId')
    if (!transferId || transfers.length === 0) return
    const transfer = transfers.find(t => t._id === transferId)
    if (!transfer) return
    setSelectedTransfer(transfer)
    setShowDetailsModal(true)
    setSearchParams({}, { replace: true })
  }, [transfers, searchParams, setSearchParams])

  useEffect(() => {
    setCurrentPage(1)
  }, [companyFilter, travelerFilter, statusFilter, sortBy, groupByCompany, searchTerm])

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

  // When Assign Driver modal opens, pre-select vendor if all selected have the same
  useEffect(() => {
    if (showBulkDriverModal && selectedTransfers.length > 0) {
      const selectedObjs = transfers.filter(t => selectedTransfers.includes(t._id))
      const getVendorId = (t) => (t.vendor_details?.vendor_id || t.vendor_details?.vendorId || '').toString().trim()
      const withVendor = selectedObjs.filter(t => getVendorId(t))
      const withoutVendor = selectedObjs.filter(t => !getVendorId(t))
      if (withoutVendor.length === 0 && withVendor.length > 0) {
        const vendorIds = [...new Set(withVendor.map(t => getVendorId(t)).filter(Boolean))]
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

  // When drivers load in Assign Driver modal, pre-select if all selected have the same driver
  useEffect(() => {
    if (showBulkDriverModal && !loadingDrivers && drivers.length > 0 && selectedTransfers.length > 0) {
      const selectedObjs = transfers.filter(t => selectedTransfers.includes(t._id))
      const getDriverId = (t) => (t.assigned_driver_details?.driver_id || t.assigned_driver_details?.driverId || '').toString().trim()
      const withDriver = selectedObjs.filter(t => getDriverId(t))
      if (withDriver.length === selectedObjs.length && withDriver.length > 0) {
        const driverIds = [...new Set(withDriver.map(t => getDriverId(t)).filter(Boolean))]
        if (driverIds.length === 1 && drivers.some(d => String(d._id || d.id).trim() === driverIds[0])) {
          setBulkDriverId(driverIds[0])
        }
      }
    }
  }, [showBulkDriverModal, loadingDrivers, drivers, selectedTransfers, transfers])

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

  // When drivers load in Assign Return Driver modal, pre-select if all eligible have the same return driver
  useEffect(() => {
    if (showBulkReturnDriverModal && !loadingDrivers && drivers.length > 0 && bulkVendorIdForReturnDriver) {
      const eligible = transfers.filter(t => selectedTransfers.includes(t._id) && t.return_transfer_details && (t.transfer_details?.transfer_status || 'pending') === 'completed')
      const getReturnDriverId = (t) => (t.return_assigned_driver_details?.driver_id || t.return_assigned_driver_details?.driverId || '').toString().trim()
      const withDriver = eligible.filter(t => getReturnDriverId(t))
      if (withDriver.length === eligible.length && withDriver.length > 0) {
        const driverIds = [...new Set(withDriver.map(t => getReturnDriverId(t)).filter(Boolean))]
        if (driverIds.length === 1 && drivers.some(d => String(d._id || d.id).trim() === driverIds[0])) {
          setBulkReturnDriverId(driverIds[0])
        }
      }
    }
  }, [showBulkReturnDriverModal, loadingDrivers, drivers, bulkVendorIdForReturnDriver, selectedTransfers, transfers])

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

  const fetchTransfers = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
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

  const handleSelectGroup = (transferIds, selected) => {
    if (selected) {
      setSelectedTransfers(prev => [...new Set([...prev, ...transferIds])])
    } else {
      setSelectedTransfers(prev => prev.filter(id => !transferIds.includes(id)))
    }
  }

  // Quick status change
  const handleQuickStatusChange = async (transferId, newStatus, transfer) => {
    if (newStatus === 'assigned') {
      setSelectedTransfer(transfer)
      setShowDetailsModal(true)
      return
    }
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
        fetchTransfers(false)
      } else {
        toast.error(response.data.message || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const handleRemoveDelegate = async (delegateTravelerId) => {
    if (!selectedTransfer?._id || !delegateTravelerId) return;
    setRemovingDelegateId(delegateTravelerId);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
      const token = localStorage.getItem('token');
      const updatedDelegates = (selectedTransfer.delegates || [])
        .filter((d) => String(d.traveler_id?._id || d.traveler_id) !== String(delegateTravelerId))
        .map((d) => ({
          traveler_id: d.traveler_id?._id || d.traveler_id,
          flight_same_as_primary: d.flight_same_as_primary !== false,
        }));
      const response = await axios.put(`${API_BASE_URL}/transfers/${selectedTransfer._id}/client-details`, { delegates: updatedDelegates }, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      if (response.data?.success) {
        toast.success('Traveler removed from same car');
        setSelectedTransfer(response.data.data || response.data);
        setTransfers(prev => prev.map(t => t._id === selectedTransfer._id ? (response.data.data || response.data) : t));
      } else {
        toast.error(response.data?.message || 'Failed to remove traveler');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove traveler');
    } finally {
      setRemovingDelegateId(null);
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    const isDeleteAll = deleteAllBulk
    if (!isDeleteAll && selectedTransfers.length === 0) return
    setShowBulkDeleteConfirm(false)
    setDeleteAllBulk(false)
    setBulkLoading(true)
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'
      const token = localStorage.getItem('token')
      const payload = isDeleteAll ? { deleteAllBulk: true } : { transferIds: selectedTransfers }
      const response = await axios.delete(`${API_BASE_URL}/bulk-operations`, {
        data: payload,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.data.success) {
        toast.success(response.data.message)
        setSelectedTransfers([])
        setDeleteAllBulk(false)
        fetchTransfers(false)
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
        fetchTransfers(false)
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

  // Bulk clear – reset vendor, driver, and status to fresh (pending)
  const handleBulkClearStatus = async () => {
    if (selectedTransfers.length === 0) return
    setBulkLoading(true)
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'
      const token = localStorage.getItem('token')
      const response = await axios.put(`${API_BASE_URL}/bulk-operations/clear`, { transferIds: selectedTransfers }, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } })
      if (response.data.success) {
        toast.success(response.data.message || `Cleared vendor, driver, and status for ${selectedTransfers.length} transfer${selectedTransfers.length === 1 ? '' : 's'}`)
        fetchTransfers(false)
      } else {
        toast.error(response.data.message || 'Failed to clear')
      }
    } catch (error) {
      console.error('Error clearing:', error)
      toast.error(error.response?.data?.message || 'Failed to clear')
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
        const count = response.data.updatedCount ?? selectedTransfers.length
        const legLabel = leg === 'onward' ? 'Arrival' : 'Return'
        const statusLabel = newStatus.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
        toast.success(`${count} transfer${count === 1 ? '' : 's'}: ${legLabel} → ${statusLabel}`)
        fetchTransfers(false)
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
      setShowBulkVendorModal(false)
      fetchTransfers(false)
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
      setShowBulkDriverModal(false)
      fetchTransfers(false)
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
      setShowBulkReturnDriverModal(false)
      fetchTransfers(false)
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
      const body = {
        sheetId: transferSyncSheetId.trim(),
        sheetName: transferSyncSheetName.trim() || undefined,
        gid: transferSyncGid.trim() ? parseInt(transferSyncGid.trim(), 10) : undefined
      }
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
        fetchTransfers(false)
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
        const { companyName, clientName, travelerName } = getClientAndTravelerNames(transfer)
        return {
          'Transfer ID': transfer._id,
          'Company': companyName || clientName,
          'Client': clientName,
          'Traveler': travelerName,
          'Pickup Location': transfer.transfer_details?.pickup_location,
          'Drop Location': transfer.transfer_details?.drop_location,
          'Status': getTransferStatusDisplay(transfer).label,
          'Pickup Time': formatTransferPickupLocal(transfer),
          'Vendor': transfer.vendor_details?.vendor_name,
          'Driver': transfer.assigned_driver_details?.name,
          'Flight': getFlightNoDisplay(transfer.flight_details),
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

  const getTransferCompanyNames = (transfer) => {
    const names = new Set()
    const add = (value) => {
      const normalized = value && String(value).trim()
      if (normalized) names.add(normalized)
    }
    add(transfer?.customer_details?.company_name)
    add(transfer?.traveler_details?.company_name)
    add(transfer?.traveler_id?.profile?.company_name)
    ;(transfer?.delegates || []).forEach((d) => add(d?.traveler_id?.profile?.company_name))
    return [...names]
  }

  // Unique companies and travelers for dropdowns
  const uniqueCompanies = [...new Set(
    transfers.flatMap((t) => getTransferCompanyNames(t))
  )].sort((a, b) => (a || '').localeCompare(b || ''))

  const travelersForCompany = companyFilter
    ? [...new Set(
        transfers
          .filter(t => {
            const companies = getTransferCompanyNames(t).map((c) => c.toLowerCase())
            return companies.includes(companyFilter.toLowerCase())
          })
          .flatMap(t => [t.traveler_details?.name, t.customer_details?.name].filter(Boolean))
      )].sort((a, b) => (a || '').localeCompare(b || ''))
    : [...new Set(transfers.flatMap(t => [t.traveler_details?.name, t.customer_details?.name].filter(Boolean)))].sort((a, b) => (a || '').localeCompare(b || ''))

  // Filter transfers
  const filteredTransfers = transfers.filter(transfer => {
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase()
      const { companyName, clientName, travelerName } = getClientAndTravelerNames(transfer)
      const apexId = (transfer._id || '').toLowerCase()
      const flightNo = (transfer.flight_details?.flight_no || '').toLowerCase()
      const delegateMatch = (transfer.delegates || []).some((d) =>
        getDelegateDisplayName(d).toLowerCase().includes(term)
      )
      const matchesSearch =
        (companyName || '').toLowerCase().includes(term) ||
        (clientName || '').toLowerCase().includes(term) ||
        (travelerName || '').toLowerCase().includes(term) ||
        delegateMatch ||
        apexId.includes(term) ||
        flightNo.includes(term)
      if (!matchesSearch) return false
    }
    if (companyFilter) {
      const companies = getTransferCompanyNames(transfer).map((c) => c.toLowerCase())
      if (!companies.includes(companyFilter.toLowerCase())) return false
    }
    if (travelerFilter) {
      const n = transfer.traveler_details?.name || transfer.customer_details?.name
      if ((n || '').toLowerCase() !== travelerFilter.toLowerCase()) return false
    }
    const status = transfer.transfer_details?.transfer_status || 'pending'
    const matchesStatus = statusFilter === 'all' || normalizeStatus(status) === statusFilter
    return matchesStatus
  })

  // Sort: by company name or by latest (pickup time)
  const sortedTransfers = [...filteredTransfers].sort((a, b) => {
    if (sortBy === 'company') {
      const companyA = (a.customer_details?.company_name || a.traveler_details?.company_name || a.customer_details?.name || '').toLowerCase()
      const companyB = (b.customer_details?.company_name || b.traveler_details?.company_name || b.customer_details?.name || '').toLowerCase()
      return companyA.localeCompare(companyB)
    }
    return new Date(a.transfer_details?.estimated_pickup_time || 0) -
           new Date(b.transfer_details?.estimated_pickup_time || 0)
  })

  /** One list card per traveler when a booking has same-car delegates (merged sync). */
  const expandedCardRows = useMemo(
    () => sortedTransfers.flatMap((t) => expandTransferToCardRows(t)),
    [sortedTransfers]
  )
  const searchedExpandedRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return expandedCardRows
    return expandedCardRows.filter((row) => {
      const transfer = row.transfer
      const { companyName, clientName, travelerName } = getClientAndTravelerNames(transfer)
      const apexId = (transfer._id || '').toLowerCase()
      const flightNo = (transfer.flight_details?.flight_no || '').toLowerCase()
      const rowTraveler = (row.cardTravelerLabel || '').toLowerCase()
      return (
        rowTraveler.includes(term) ||
        (travelerName || '').toLowerCase().includes(term) ||
        (clientName || '').toLowerCase().includes(term) ||
        (companyName || '').toLowerCase().includes(term) ||
        apexId.includes(term) ||
        flightNo.includes(term)
      )
    })
  }, [expandedCardRows, searchTerm])

  /** Group transfers that share the same company (customer_details / traveler_details company_name). Transfers without a company name stay as one transfer per group. */
  const companyGroups = (() => {
    const map = new Map()
    for (const t of sortedTransfers) {
      const raw = getCompanyName(t)?.trim()
      const key = raw || `__solo_${t._id}`
      if (!map.has(key)) {
        const names = getClientAndTravelerNames(t)
        map.set(key, {
          key,
          companyDisplayName: raw || names.companyName || names.clientName || 'Unknown',
          transfers: []
        })
      }
      map.get(key).transfers.push(t)
    }
    return [...map.values()]
  })()

  const useGroupedCards = groupByCompany && viewMode === 'cards'
  // Pagination: by company group when grouped; else by expanded cards (one row per traveler)
  const totalPages = Math.max(
    1,
    Math.ceil(
      (useGroupedCards
        ? companyGroups.length
        : viewMode === 'timeline'
          ? sortedTransfers.length
          : searchedExpandedRows.length) / perPage
    )
  )
  const startIndex = (currentPage - 1) * perPage
  const endIndex = startIndex + perPage
  const paginatedTransfers = sortedTransfers.slice(startIndex, endIndex)
  const paginatedExpandedRows = searchedExpandedRows.slice(startIndex, endIndex)
  const paginatedCompanyGroups = companyGroups.slice(startIndex, endIndex)
  const sortedTransfersPaginated = paginatedTransfers

  useEffect(() => {
    setCurrentPage(p => Math.min(p, totalPages))
  }, [totalPages])

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

  // Minimal transfer card – company as hero, traveler below, client-friendly status
  const TransferCard = ({ transfer, cardRow }) => {
    const { companyName, clientName, travelerName } = getClientAndTravelerNames(transfer)
    const status = transfer.transfer_details?.transfer_status || 'pending'
    const { label: statusLabel, statusKey } = getTransferStatusDisplay(transfer)
    const isSelected = selectedTransfers.includes(transfer._id)
    const hasReturnTransfer = transfer.return_transfer_details || transfer.return_flight_details

    // One card per traveler when cardRow is set (same-car merge); else primary traveler
    const displayTraveler =
      cardRow?.cardTravelerLabel ??
      (travelerName || (clientName && clientName !== 'N/A' ? clientName : null))
    const sameCarMulti = cardRow && cardRow.sameCarGroupSize > 1
    const sharedRideNames = sameCarMulti
      ? expandTransferToCardRows(transfer)
          .map((row) => row.cardTravelerLabel)
          .filter(Boolean)
          .join('\n')
      : ''

    return (
      <div
        onClick={() => { setSelectedTransfer(transfer); setShowDetailsModal(true) }}
        className={`group relative bg-card rounded-xl border transition-all hover:border-primary/50 hover:shadow-md cursor-pointer ${
          isSelected ? 'ring-2 ring-primary ring-offset-2 border-primary/50' : 'border-border'
        }`}
      >
        {/* Delete – top corner, visible on admin hover */}
        {canManageTransfers && (
          <button
            onClick={(e) => { e.stopPropagation(); handleDeleteClick(transfer) }}
            className="absolute top-2 right-2 p-2 rounded-lg bg-card/90 backdrop-blur-sm border border-border opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all z-10"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        )}

        {/* Company name – main highlight */}
        <div className="px-4 pt-4 pb-1">
          <div className="flex items-start gap-3 min-w-0">
            {canManageTransfers && (
              <button
                onClick={(e) => { e.stopPropagation(); handleTransferSelect(transfer._id, !isSelected) }}
                className={`flex-shrink-0 mt-1 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                {isSelected ? (
                  <CheckSquare size={18} className="text-primary" />
                ) : (
                  <Square size={18} className="text-muted-foreground" />
                )}
              </button>
            )}
            <div className="min-w-0 flex-1 pr-8">
              <h3
                className="text-lg font-bold text-foreground truncate"
                title={companyName || clientName || 'Unknown Customer'}
              >
                {companyName || clientName || 'Unknown Customer'}
              </h3>
              <p
                className="text-sm text-foreground/80 truncate mt-1 font-medium"
                title={displayTraveler || '—'}
              >
                {displayTraveler || '—'}
              </p>
              {sameCarMulti && (
                <div className="relative group">
                  <span
                    className="inline-flex mt-1 text-xs rounded-full border border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-300 px-2 py-0.5 font-medium cursor-help hover:border-teal-500/50 transition-colors"
                  >
                    Travelers in same car ({cardRow.sameCarGroupSize}/{cardRow.sameCarGroupSize})
                  </span>
                  <div className="absolute bottom-full left-0 mb-2 w-80 p-3 bg-popover border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999]">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Car size={14} className="text-teal-600" />
                        Shared Ride Details
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {cardRow.sameCarGroupSize} travelers sharing the same vehicle:
                      </div>
                      <div className="space-y-1">
                        {sharedRideNames.split('\n').map((name, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>
                            <span className="text-foreground">{name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Badges: Client-friendly status + Round Trip */}
        <div className="px-4 pb-4 pt-2 flex items-center gap-2 flex-wrap">
          <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${getStatusColor(statusKey)}`}>
            {statusLabel}
          </span>
          {transfer.priority === 'vip' && (
            <span className="text-xs bg-purple-500/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded font-medium">VIP</span>
          )}
          {transfer.priority === 'high' && <AlertTriangle size={12} className="text-amber-500" />}
          {hasReturnTransfer && (
            <span className="text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-medium">Round Trip</span>
          )}
        </div>
      </div>
    )
  }

  /** One card per company: header + stacked rows (traveler, status chips). Only used when group-by-company is on and the group has 2+ transfers. */
  const CompanyGroupCard = ({ group }) => {
    const { companyDisplayName, transfers } = group
    const ids = transfers.map(t => t._id)
    const allSelected = ids.length > 0 && ids.every(id => selectedTransfers.includes(id))
    const someSelected = ids.some(id => selectedTransfers.includes(id))

    return (
      <div className="group relative bg-card rounded-xl border transition-all hover:border-primary/50 hover:shadow-md border-border">
        <div className="px-4 pt-4 pb-3 border-b border-border bg-muted/20">
          <div className="flex items-start gap-3 min-w-0">
            {canManageTransfers && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelectGroup(ids, !allSelected)
                }}
                className={`flex-shrink-0 mt-0.5 transition-opacity ${allSelected || someSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                title={allSelected ? 'Deselect group' : 'Select group'}
              >
                {allSelected ? (
                  <CheckSquare size={18} className="text-primary" />
                ) : someSelected ? (
                  <div className="w-[18px] h-[18px] rounded border-2 border-primary bg-primary/25" aria-hidden />
                ) : (
                  <Square size={18} className="text-muted-foreground" />
                )}
              </button>
            )}
            <Building2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 pr-6">
              <h3 className="text-lg font-bold text-foreground truncate" title={companyDisplayName}>
                {companyDisplayName}
              </h3>
              <p className="text-xs text-muted-foreground">
                {transfers.flatMap((t) => expandTransferToCardRows(t)).length} travelers
              </p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-border">
          {transfers.flatMap((transfer) => expandTransferToCardRows(transfer)).map((row) => {
            const transfer = row.transfer
            const { label: statusLabel, statusKey } = getTransferStatusDisplay(transfer)
            const isSelected = selectedTransfers.includes(transfer._id)
            const displayTraveler = row.cardTravelerLabel
            const sameCarMulti = row.sameCarGroupSize > 1
            const hasReturnTransfer = transfer.return_transfer_details || transfer.return_flight_details
            const sharedRideNames = sameCarMulti
              ? expandTransferToCardRows(transfer)
                  .map((item) => item.cardTravelerLabel)
                  .filter(Boolean)
                  .join('\n')
              : ''
            return (
              <div
                key={row.cardRowKey}
                className={`relative px-4 py-3 flex flex-col gap-1.5 hover:bg-muted/40 cursor-pointer transition-colors ${
                  isSelected ? 'bg-primary/5' : ''
                }`}
                onClick={() => { setSelectedTransfer(transfer); setShowDetailsModal(true) }}
              >
                {canManageTransfers && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(transfer) }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-card/90 border border-border opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all z-10"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <div className="flex items-start gap-2 pr-12">
                  {canManageTransfers && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleTransferSelect(transfer._id, !isSelected) }}
                      className={`flex-shrink-0 mt-0.5 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    >
                      {isSelected ? (
                        <CheckSquare size={16} className="text-primary" />
                      ) : (
                        <Square size={16} className="text-muted-foreground" />
                      )}
                    </button>
                  )}
                  <div className="min-w-0 flex-1 flex flex-col gap-2">
                    <div className="font-medium text-foreground leading-snug" title={displayTraveler || '—'}>
                      {displayTraveler || '—'}
                    </div>
                    {sameCarMulti && (
                      <div className="relative group">
                        <span
                          className="inline-flex w-fit text-xs rounded-full border border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-300 px-2 py-0.5 font-medium cursor-help hover:border-teal-500/50 transition-colors"
                        >
                          Travelers in same car ({row.sameCarGroupSize}/{row.sameCarGroupSize})
                        </span>
                        <div className="absolute bottom-full left-0 mb-2 w-80 p-3 bg-popover border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999]">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                              <Car size={14} className="text-teal-600" />
                              Shared Ride Details
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {row.sameCarGroupSize} travelers sharing the same vehicle:
                            </div>
                            <div className="space-y-1">
                              {sharedRideNames.split('\n').map((name, index) => (
                                <div key={index} className="flex items-center gap-2 text-xs">
                                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>
                                  <span className="text-foreground">{name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover"></div>
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${getStatusColor(statusKey)}`}>
                        {statusLabel}
                      </span>
                      {transfer.priority === 'vip' && (
                        <span className="text-xs bg-purple-500/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded font-medium">VIP</span>
                      )}
                      {transfer.priority === 'high' && (
                        <span className="inline-flex items-center" title="High priority">
                          <AlertTriangle size={12} className="text-amber-500" />
                        </span>
                      )}
                      {hasReturnTransfer && (
                        <span className="text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-medium">Round Trip</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Timeline view component (uses paginated sorted list, accordion per date, sticky headers)
  const NOT_DECIDED_KEY = '__not_decided_yet__'
  const hasValidDate = (transfer) => {
    const t = transfer.transfer_details?.estimated_pickup_time
    if (!t) return false
    const d = new Date(t)
    if (isNaN(d.getTime())) return false
    // No real flight on both legs = date not confirmed, treat as "not decided"
    const hasOnward = hasRealFlight(transfer.flight_details)
    const hasReturn = hasRealFlight(transfer.return_flight_details)
    if (!hasOnward && !hasReturn) return false
    return true
  }

  const TimelineView = () => {
    const withDate = sortedTransfersPaginated.filter(hasValidDate)
    const noDate = sortedTransfersPaginated.filter(t => !hasValidDate(t))

    const groupedByDate = withDate.reduce((acc, transfer) => {
      const date = new Date(transfer.transfer_details?.estimated_pickup_time).toDateString()
      if (!acc[date]) acc[date] = []
      acc[date].push(transfer)
      return acc
    }, {})

    const dateEntries = Object.entries(groupedByDate).sort(([a], [b]) => {
      const dA = new Date(a).getTime()
      const dB = new Date(b).getTime()
      return dA - dB
    })

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
                  {formatDateFriendly(date)}
                  <span className="text-sm text-muted-foreground font-normal">
                    ({dayTransfers.flatMap((t) => expandTransferToCardRows(t)).length} travelers)
                  </span>
                </h3>
              </button>
            
            {/* Timeline content – collapsible, same layout as cards view */}
            {!isCollapsed && (
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
                {dayTransfers.flatMap((transfer) => expandTransferToCardRows(transfer)).map((row) => (
                  <TransferCard key={row.cardRowKey} transfer={row.transfer} cardRow={row} />
                ))}
              </div>
            </div>
            )}
          </div>
          )
        })}

        {/* Not decided yet – accordion at the end for transfers without dates */}
        {noDate.length > 0 && (
          <div className="rounded-lg border border-border bg-card">
            <button
              type="button"
              onClick={() => toggleTimelineDate(NOT_DECIDED_KEY)}
              className="sticky -top-6 z-[100] w-full flex items-center justify-between gap-2 bg-background py-3 px-4 border-b border-border hover:bg-muted/50 transition-colors text-left shadow-[0_4px_12px_-2px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.5)] rounded-t-lg"
            >
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                {collapsedTimelineDates.has(NOT_DECIDED_KEY) ? (
                  <ChevronRight size={20} className="text-muted-foreground" />
                ) : (
                  <ChevronDown size={20} className="text-muted-foreground" />
                )}
                Not decided yet
                <span className="text-sm text-muted-foreground font-normal">
                  ({noDate.flatMap((t) => expandTransferToCardRows(t)).length} travelers)
                </span>
              </h3>
            </button>
            {!collapsedTimelineDates.has(NOT_DECIDED_KEY) && (
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
                  {noDate.flatMap((transfer) => expandTransferToCardRows(transfer)).map((row) => (
                    <TransferCard key={row.cardRowKey} transfer={row.transfer} cardRow={row} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {dateEntries.length === 0 && noDate.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No transfers scheduled
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background w-full">
      <div className="w-full max-w-full mx-auto">
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
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  type="button"
                  disabled={viewMode !== 'cards'}
                  onClick={() => setGroupByCompany(g => !g)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors shrink-0 disabled:cursor-not-allowed disabled:opacity-50 ${
                    groupByCompany
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                  title={
                    viewMode === 'cards'
                      ? 'Combine transfers that share the same company into one card'
                      : 'Grouping by company applies to Cards view only — switch to Cards to use this option.'
                  }
                >
                  <Users size={16} className="shrink-0" />
                  By company
                </button>
                <div className="flex items-center bg-muted rounded-lg p-1 shrink-0">
                  {['cards', 'timeline'].map(mode => (
                    <button
                      key={mode}
                      type="button"
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
          </div>

          {/* Stats: transfers + travelers — compact KPI rows, status accent, no harsh column split */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 w-full">
            {statusOptions.map(option => {
              const inStatus = filteredTransfers.filter((t) =>
                normalizeStatus(t.transfer_details?.transfer_status || 'pending') === option.value
              )
              const count = inStatus.length
              const travelerSum = getUniqueTravelerCountAcrossTransfers(inStatus)
              const accent = {
                pending: 'border-l-slate-400 dark:border-l-slate-500',
                assigned: 'border-l-blue-500 dark:border-l-blue-400',
                in_progress: 'border-l-violet-500 dark:border-l-violet-400',
                completed: 'border-l-emerald-500 dark:border-l-emerald-400',
                cancelled: 'border-l-red-500 dark:border-l-red-400'
              }[option.value] || 'border-l-border'
              const iconTintPrimary = {
                pending: 'bg-slate-500/12 text-slate-600 dark:text-slate-300',
                assigned: 'bg-blue-500/12 text-blue-600 dark:text-blue-400',
                in_progress: 'bg-violet-500/12 text-violet-600 dark:text-violet-400',
                completed: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
                cancelled: 'bg-red-500/12 text-red-600 dark:text-red-400'
              }[option.value] || 'bg-muted text-muted-foreground'
              const iconTintSecondary = 'bg-muted/80 text-muted-foreground dark:bg-muted/50 dark:text-foreground/70'

              return (
                <div
                  key={option.value}
                  className={`relative min-w-0 rounded-2xl border border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md ${accent} border-l-[3px]`}
                >
                  <div className="px-4 pt-4 pb-1">
                    <p className="text-[13px] font-semibold text-foreground tracking-tight leading-snug">
                      {option.label}
                    </p>
                  </div>
                  <div className="space-y-0 px-4 pb-4 pt-2">
                    <div className="flex items-center gap-3 py-2.5 first:pt-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconTintPrimary}`}
                        aria-hidden
                      >
                        <Layers className="h-[18px] w-[18px] opacity-90" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-muted-foreground leading-none mb-1">
                          Transfers
                        </p>
                        <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground leading-none">
                          {count}
                        </p>
                      </div>
                    </div>
                    <div className="mx-0 border-t border-border/50" />
                    <div
                      className="flex items-center gap-3 py-2.5"
                      title="Distinct people on these transfers (primary + same car). Each traveler counted once even if sharing a vehicle."
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconTintSecondary}`}
                        aria-hidden
                      >
                        <Users className="h-[18px] w-[18px] opacity-90" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-muted-foreground leading-none mb-1">
                          Travelers
                        </p>
                        <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground leading-none">
                          {travelerSum}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Search and Filters – above bulk actions */}
        <div className="bg-card rounded-lg border border-border p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap items-end w-full">
            <div className="flex-1 min-w-[180px] sm:min-w-[220px]">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Search</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Company, traveler, Apex ID..."
                  className="w-full pl-9 pr-3 py-2 border border-input rounded-md bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="flex-1 min-w-[180px] sm:min-w-[200px]">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Company</label>
              <Dropdown
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                options={[
                  { value: '', label: 'All companies' },
                  ...uniqueCompanies.map(c => ({ value: c, label: c }))
                ]}
                placeholder="Select company"
                minWidth="100%"
                searchable
                searchPlaceholder="Search companies..."
                clearable
              />
            </div>
            <div className="flex-1 min-w-[180px] sm:min-w-[200px]">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Traveler</label>
              <Dropdown
                value={travelerFilter}
                onChange={(e) => setTravelerFilter(e.target.value)}
                options={[
                  { value: '', label: 'All travelers' },
                  ...travelersForCompany.map(t => ({ value: t, label: t }))
                ]}
                placeholder="Select traveler"
                minWidth="100%"
                searchable
                searchPlaceholder="Search travelers..."
                clearable
              />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
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
              {(statusFilter !== 'all' || companyFilter || travelerFilter || searchTerm.trim()) && (
                <button
                  onClick={() => {
                    setStatusFilter('all')
                    setCompanyFilter('')
                    setTravelerFilter('')
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

        {/* Bulk Actions Toolbar – below search */}
        {selectedTransfers.length > 0 && (() => {
          const selected = transfers.filter(t => selectedTransfers.includes(t._id))
          const needVendor = selected.filter(t => !t.vendor_details?.vendor_name && !t.vendor_details?.vendor_id).length
          const needDriver = selected.filter(t => (t.vendor_details?.vendor_name || t.vendor_details?.vendor_id) && !t.assigned_driver_details?.name && !t.assigned_driver_details?.driver_name).length
          const withReturn = selected.filter(t => t.return_transfer_details || t.return_flight_details)
          const eligibleReturn = withReturn.filter(t => (t.transfer_details?.transfer_status || 'pending') === 'completed')
          const needReturnDriver = eligibleReturn.filter(t => !t.return_assigned_driver_details?.name && !t.return_assigned_driver_details?.driver_name).length
          const vendorDone = needVendor === 0
          const driverDone = needVendor === 0 && needDriver === 0
          const returnDriverDone = (needVendor === 0 && needDriver === 0) && (eligibleReturn.length === 0 || needReturnDriver === 0)
          const returnSectionDisabled = withReturn.length > 0 && eligibleReturn.length === 0

          const onwardStatuses = selected.map(t => normalizeStatus(t.transfer_details?.transfer_status || 'pending'))
          const minOnward = onwardStatuses.some(s => s === 'pending') ? 'pending' : onwardStatuses.some(s => s === 'assigned') ? 'assigned' : onwardStatuses.some(s => s === 'in_progress') ? 'in_progress' : 'completed'
          const onwardInTransitDone = ['in_progress', 'completed'].includes(minOnward)
          const onwardCompleted = onwardStatuses.every(s => s === 'completed')

          const returnStatuses = withReturn.map(t => normalizeStatus(t.return_transfer_details?.transfer_status || t.return_transfer_details?.status || 'pending'))
          const minReturn = returnStatuses.some(s => s === 'pending') ? 'pending' : returnStatuses.some(s => s === 'assigned') ? 'assigned' : returnStatuses.some(s => s === 'in_progress') ? 'in_progress' : 'completed'
          const returnInTransitDone = returnStatuses.length > 0 && ['in_progress', 'completed'].includes(minReturn)
          const returnCompleted = returnStatuses.length > 0 && returnStatuses.every(s => s === 'completed')

          const allCompleted = onwardCompleted && (withReturn.length === 0 || returnCompleted)

          const nextOnward = !vendorDone ? 'vendor' : !driverDone ? 'driver' : !onwardInTransitDone ? 'inTransit' : !onwardCompleted ? 'completed' : null
          const nextReturn = withReturn.length === 0 ? null : !vendorDone ? 'returnVendor' : !returnDriverDone ? 'returnDriver' : !returnInTransitDone ? 'inTransit' : !returnCompleted ? 'completed' : null

          const btnBase = 'h-8 min-w-[2rem] px-2.5 rounded-md text-sm font-medium inline-flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
          const btnNext = 'bg-primary/90 dark:bg-primary/70 text-primary-foreground hover:bg-primary dark:hover:bg-primary/80 ring-1 ring-primary/30'
          const btnDone = 'bg-emerald-500/15 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
          const btnDefault = 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'

          const StepBtn = ({ step, done, isNext, onClick, disabled, children }) => (
            <button
              onClick={onClick}
              disabled={disabled}
              className={`${btnBase} rounded-md ${isNext ? btnNext : done ? btnDone : btnDefault}`}
            >
              {done ? <CheckCircle size={14} className="shrink-0" /> : null}
              {children}
            </button>
          )

          return (
            <div className="bg-card rounded-lg border border-border p-5 mb-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-semibold text-foreground">
                  {selectedTransfers.length} transfer{selectedTransfers.length > 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => handleSelectAll(false)}
                  className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                >
                  Clear selection
                </button>
              </div>

              {/* Flow: Onward | Return – two clear sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 py-3 border-y border-border">
                {/* Onward (Arrival) */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Plane size={12} />
                    Onward
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StepBtn step="vendor" done={vendorDone} isNext={nextOnward === 'vendor'} onClick={() => { setBulkVendorLeg('onward'); setShowBulkVendorModal(true) }} disabled={bulkLoading || allCompleted}>
                      {!vendorDone && <Building2 size={14} className="shrink-0" />}
                      1. Vendor
                    </StepBtn>
                    <StepBtn step="driver" done={driverDone} isNext={nextOnward === 'driver'} onClick={() => setShowBulkDriverModal(true)} disabled={bulkLoading || !vendorDone || allCompleted}>
                      {!driverDone && <User size={14} className="shrink-0" />}
                      2. Driver
                    </StepBtn>
                    <StepBtn step="inTransit" done={onwardInTransitDone} isNext={nextOnward === 'inTransit'} onClick={() => handleBulkStatusUpdate('in_progress', 'onward')} disabled={bulkLoading || !driverDone || allCompleted}>
                      3. In transit
                    </StepBtn>
                    <StepBtn step="completed" done={onwardCompleted} isNext={nextOnward === 'completed'} onClick={() => handleBulkStatusUpdate('completed', 'onward')} disabled={bulkLoading || !driverDone || allCompleted}>
                      4. Completed
                    </StepBtn>
                  </div>
                </div>

                {/* Return (Departure) */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Plane size={12} className="rotate-180" />
                    Return
                  </div>
                  {withReturn.length > 0 ? (
                    <div className={`flex flex-wrap items-center gap-2 ${returnSectionDisabled ? 'opacity-60' : ''}`}>
                      <StepBtn step="returnVendor" done={vendorDone} isNext={nextReturn === 'returnVendor'} onClick={() => { setBulkVendorLeg('return'); setShowBulkVendorModal(true) }} disabled={bulkLoading || returnSectionDisabled || allCompleted}>
                        {!vendorDone && <Building2 size={14} className="shrink-0" />}
                        1. Vendor
                      </StepBtn>
                      <StepBtn step="returnDriver" done={returnDriverDone} isNext={nextReturn === 'returnDriver'} onClick={() => setShowBulkReturnDriverModal(true)} disabled={bulkLoading || returnSectionDisabled || allCompleted}>
                        {!returnDriverDone && <User size={14} className="shrink-0" />}
                        2. Driver
                      </StepBtn>
                      <StepBtn step="inTransit" done={returnInTransitDone} isNext={nextReturn === 'inTransit'} onClick={() => handleBulkStatusUpdate('in_progress', 'return')} disabled={bulkLoading || returnSectionDisabled || !returnDriverDone || allCompleted}>
                        3. In transit
                      </StepBtn>
                      <StepBtn step="completed" done={returnCompleted} isNext={nextReturn === 'completed'} onClick={() => handleBulkStatusUpdate('completed', 'return')} disabled={bulkLoading || returnSectionDisabled || !returnDriverDone || allCompleted}>
                        4. Completed
                      </StepBtn>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No return leg</p>
                  )}
                </div>
              </div>

              {/* Actions – right aligned */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={handleBulkClearStatus}
                  disabled={bulkLoading}
                  className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  title="Reset vendor, driver, and status to fresh (pending)"
                >
                  <RotateCcw size={14} />
                  Clear status
                </button>
                <button
                  onClick={() => { setDeleteAllBulk(false); setShowBulkDeleteConfirm(true) }}
                  disabled={bulkLoading}
                  className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Delete selected ({selectedTransfers.length})
                </button>
                <button
                  onClick={() => { setDeleteAllBulk(true); setShowBulkDeleteConfirm(true) }}
                  disabled={bulkLoading || filteredTransfers.length === 0}
                  className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  title="Delete all transfers (respects current filters)"
                >
                  <Trash2 size={14} />
                  Delete all ({filteredTransfers.length})
                </button>
              </div>
            </div>
          </div>
          )
        })()}

        {/* Transfers Display */}
        {loading ? (
          <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center">
            <div className="text-base text-muted-foreground">Loading transfers...</div>
          </div>
        ) : filteredTransfers.length === 0 ? (
          <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center">
            <div className="text-base text-muted-foreground">
              {companyFilter || travelerFilter || statusFilter !== 'all' ? 'No transfers found matching your criteria' : 'No transfers found'}
            </div>
          </div>
        ) : viewMode === 'timeline' ? (
          <TimelineView />
        ) : (
          <div className="w-full space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
              {useGroupedCards
                ? paginatedCompanyGroups.map((group) =>
                    group.transfers.length === 1 ? (
                      <Fragment key={group.key}>
                        {expandTransferToCardRows(group.transfers[0]).map((row) => (
                          <TransferCard key={row.cardRowKey} transfer={row.transfer} cardRow={row} />
                        ))}
                      </Fragment>
                    ) : (
                      <CompanyGroupCard key={group.key} group={group} />
                    )
                  )
                : paginatedExpandedRows.map((row) => (
                    <TransferCard key={row.cardRowKey} transfer={row.transfer} cardRow={row} />
                  ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredTransfers.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {groupByCompany && viewMode === 'cards' ? (
                <>
                  Showing {startIndex + 1}–{Math.min(endIndex, companyGroups.length)} of {companyGroups.length} company group{companyGroups.length !== 1 ? 's' : ''}
                  <span className="text-muted-foreground/80"> ({sortedTransfers.length} transfers)</span>
                </>
              ) : (
                <>Showing {startIndex + 1}–{Math.min(endIndex, filteredTransfers.length)} of {filteredTransfers.length}</>
              )}
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
            setTransferSyncGid('')
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
                    <li>Use a sheet with columns: Company Name, First Name, Last Name, Email, Contact No, Check In Date, Flight No, ETA (onward), Check Out Date, Flight No, ETD (return).</li>
                    <li>Make the sheet <strong>public</strong> (Share → Anyone with the link can view).</li>
                    <li>Copy the Sheet ID from the URL and paste it below.</li>
                    <li>Each row creates one transfer. For multi-sheet workbooks, set Sheet Tab ID (gid) from the URL <code className="bg-muted px-1 rounded">#gid=123</code>.</li>
                  </ol>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-3">
                    Existing transfers are not modified. Dates like 7/5/2026 and times like 8:25 AM are supported.
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
                      searchable
                      searchPlaceholder="Search clients..."
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
                  <label className="block text-sm font-medium text-foreground mb-1">Sheet Tab ID <span className="text-muted-foreground font-normal">(Optional)</span></label>
                  <input
                    type="text"
                    value={transferSyncGid}
                    onChange={(e) => setTransferSyncGid(e.target.value)}
                    placeholder="e.g., 0 for first sheet, or gid from URL #gid=123"
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={transferSyncing}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty for the first sheet. For other sheets, copy the number from the URL <code className="bg-muted px-1 rounded">#gid=123</code>.
                  </p>
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
                  onClick={() => { setShowTransferSyncModal(false); setTransferSyncSheetId(''); setTransferSyncSheetName(''); setTransferSyncGid(''); setTransferSyncResults(null) }}
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
              <h3 className="text-lg font-semibold mb-4">{bulkVendorLeg === 'return' ? 'Assign Return Vendor' : 'Assign Onward Vendor'}</h3>
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
                    searchable
                    searchPlaceholder="Search vendors..."
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
          const getVendorId = (t) => (t.vendor_details?.vendor_id || t.vendor_details?.vendorId || '').toString().trim()
          const withVendor = selectedObjs.filter(t => getVendorId(t))
          const withoutVendor = selectedObjs.filter(t => !getVendorId(t))
          const hasVendorMissing = withoutVendor.length > 0
          const vendorIds = [...new Set(withVendor.map(t => getVendorId(t)).filter(Boolean))]
          const allSameVendor = vendorIds.length === 1
          const hasMixedVendors = vendorIds.length > 1
          return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
            <div className="bg-card rounded-lg border border-border p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Assign Onward Driver</h3>
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
                      searchable
                      searchPlaceholder="Search drivers..."
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
              <h3 className="text-lg font-semibold mb-4">Assign Return Driver</h3>
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
                      searchable
                      searchPlaceholder="Search vendors..."
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
                      searchable
                      searchPlaceholder="Search drivers..."
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
        {showBulkDeleteConfirm && (selectedTransfers.length > 0 || deleteAllBulk) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
            <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Trash2 size={24} className="text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {deleteAllBulk ? 'Delete All Transfers' : 'Delete Transfers'}
                  </h3>
                  <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-foreground mb-6">
                {deleteAllBulk ? (
                  <>Are you sure you want to delete <strong>all</strong> transfers you have access to? This will permanently remove them from the system.</>
                ) : (
                  <>Are you sure you want to delete <strong>{selectedTransfers.length}</strong> transfer{selectedTransfers.length !== 1 ? 's' : ''}? This will permanently remove {selectedTransfers.length === 1 ? 'this transfer' : 'these transfers'} from the system.</>
                )}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowBulkDeleteConfirm(false); setDeleteAllBulk(false) }}
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

        {/* Flight Add/Update Drawer (above transfer drawer) */}
        <Drawer
          isOpen={showFlightDrawer && !!selectedTransfer}
          onClose={() => setShowFlightDrawer(false)}
          title={flightDrawerLeg === 'onward' ? 'Add / Update Onward Flight' : 'Add / Update Return Flight'}
          subtitle="Enter flight number to fetch details"
          size="md"
          position="right"
          zIndex={1100}
        >
          {selectedTransfer && (
            <div className="p-6 space-y-6">
              {/* Search form */}
              <div className="rounded-xl border border-border bg-muted/20 dark:bg-muted/10 p-5 space-y-5">
                <p className="text-sm text-muted-foreground">
                  Enter the flight number and travel date to fetch live flight information.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Flight Number</label>
                    <input
                      type="text"
                      value={flightNumberInput}
                      onChange={e => { setFlightNumberInput(e.target.value); setFlightFetchError(null) }}
                      placeholder="e.g. EY488, AI602"
                      className="w-full py-2.5 px-4 border border-input rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
                      onKeyDown={e => e.key === 'Enter' && handleFetchFlight()}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Travel Date</label>
                    <div className="relative">
                      <Calendar size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                      <DatePicker
                        selected={flightDateInput ? new Date(flightDateInput + 'T12:00:00') : null}
                        onChange={(date) => setFlightDateInput(date ? date.toISOString().slice(0, 10) : '')}
                        minDate={startOfDay(new Date())}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select date"
                        className="w-full py-2.5 pl-10 pr-4 border border-input rounded-lg bg-background text-foreground text-sm min-h-[42px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
                        calendarClassName="halo-datepicker-calendar"
                        popperClassName="halo-datepicker-popper"
                      />
                    </div>
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleFetchFlight}
                    disabled={flightFetchLoading || !flightNumberInput?.trim()}
                    className="w-full py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 transition-colors shadow-sm"
                  >
                    {flightFetchLoading ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      <>
                        <Plane size={18} />
                        Fetch Flight Details
                      </>
                    )}
                  </button>
                </div>
              </div>

              {flightFetchError && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 text-sm text-red-700 dark:text-red-300">
                  <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
                  <span>{flightFetchError}</span>
                </div>
              )}

              <div className="border-t border-border pt-5">
                <p className="text-sm font-medium text-foreground mb-3">Or enter manually</p>
                <p className="text-xs text-muted-foreground mb-4">
                  {flightDrawerLeg === 'onward' ? 'Onward arrival airport is KUL. ' : 'Return departure airport is KUL. '}
                  Fill in when not available from sheet.
                </p>
                <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-muted/30 border border-border">
                  <button
                    type="button"
                    onClick={() => setManualFlight(prev => ({
                      ...prev,
                      departure_time: '00:00',
                      arrival_time: '00:00'
                    }))}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Set 00:00 for TBD flight
                  </button>
                  <span className="text-xs text-muted-foreground">— Use when flight time is not yet known</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Flight No</label>
                    <input
                      type="text"
                      value={manualFlight.flight_no}
                      onChange={e => setManualFlight(prev => ({ ...prev, flight_no: e.target.value }))}
                      placeholder="e.g. EY488"
                      className="w-full py-2 px-3 border border-input rounded-lg bg-background text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Dep. Airport</label>
                    <input
                      type="text"
                      value={flightDrawerLeg === 'return' ? 'KUL' : manualFlight.departure_airport}
                      onChange={e => flightDrawerLeg === 'onward' && setManualFlight(prev => ({ ...prev, departure_airport: e.target.value }))}
                      placeholder={flightDrawerLeg === 'return' ? 'KUL (fixed)' : 'e.g. LHR'}
                      readOnly={flightDrawerLeg === 'return'}
                      className="w-full py-2 px-3 border border-input rounded-lg bg-background text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Dep. Date</label>
                    <input
                      type="date"
                      value={manualFlight.departure_date}
                      onChange={e => setManualFlight(prev => ({ ...prev, departure_date: e.target.value }))}
                      className="w-full py-2 px-3 border border-input rounded-lg bg-background text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Dep. Time (ETD)</label>
                    <input
                      type="time"
                      value={manualFlight.departure_time}
                      onChange={e => setManualFlight(prev => ({ ...prev, departure_time: e.target.value }))}
                      className="w-full py-2 px-3 border border-input rounded-lg bg-background text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Arr. Airport</label>
                    <input
                      type="text"
                      value={flightDrawerLeg === 'onward' ? 'KUL' : manualFlight.arrival_airport}
                      onChange={e => flightDrawerLeg === 'return' && setManualFlight(prev => ({ ...prev, arrival_airport: e.target.value }))}
                      placeholder={flightDrawerLeg === 'onward' ? 'KUL (fixed)' : 'e.g. LHR'}
                      readOnly={flightDrawerLeg === 'onward'}
                      className="w-full py-2 px-3 border border-input rounded-lg bg-background text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Arr. Date</label>
                    <input
                      type="date"
                      value={manualFlight.arrival_date}
                      onChange={e => setManualFlight(prev => ({ ...prev, arrival_date: e.target.value }))}
                      className="w-full py-2 px-3 border border-input rounded-lg bg-background text-foreground text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-foreground mb-1">Arr. Time (ETA)</label>
                    <input
                      type="time"
                      value={manualFlight.arrival_time}
                      onChange={e => setManualFlight(prev => ({ ...prev, arrival_time: e.target.value }))}
                      className="w-full py-2 px-3 border border-input rounded-lg bg-background text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Terminal</label>
                    <input
                      type="text"
                      value={manualFlight.terminal}
                      onChange={e => setManualFlight(prev => ({ ...prev, terminal: e.target.value }))}
                      placeholder="e.g. T1, T2"
                      className="w-full py-2 px-3 border border-input rounded-lg bg-background text-foreground text-sm"
                    />
                  </div>
                </div>
              </div>

              {fetchedFlightData && (
                <div className="space-y-4">
                  <div className="p-5 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border">
                    <h4 className="font-semibold text-foreground mb-4">{fetchedFlightData.flight} – {fetchedFlightData.airlineName || fetchedFlightData.airlineCode}</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Route:</span> <span className="text-foreground">{fetchedFlightData.departureAirport} → {fetchedFlightData.arrivalAirport}</span></div>
                      <div><span className="text-muted-foreground">Departure:</span> <span className="text-foreground">{formatDateTimeAtAirport(fetchedFlightData.departureTime, fetchedFlightData.departureAirport)}</span></div>
                      <div><span className="text-muted-foreground">Arrival:</span> <span className="text-foreground">{formatDateTimeAtAirport(fetchedFlightData.arrivalTime, fetchedFlightData.arrivalAirport)}</span></div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-foreground mb-1">Terminal</label>
                        <input
                          type="text"
                          value={fetchedTerminalOverride}
                          onChange={e => setFetchedTerminalOverride(e.target.value)}
                          placeholder="e.g. T1, T2"
                          className="w-full py-2 px-3 border border-input rounded-lg bg-background text-foreground text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleSaveFlight}
                    disabled={flightSaveLoading}
                    className="w-full py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    {flightSaveLoading ? 'Saving...' : 'Save to Transfer'}
                  </button>
                </div>
              )}

              {!fetchedFlightData && (
                <button
                  onClick={handleSaveFlight}
                  disabled={flightSaveLoading || !manualFlight.departure_date || !manualFlight.arrival_date}
                  className="w-full py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  {flightSaveLoading ? 'Saving...' : 'Save Manual Entry to Transfer'}
                </button>
              )}
            </div>
          )}
        </Drawer>

        {/* Transfer Details Drawer */}
        <Drawer
          isOpen={!!(showDetailsModal && selectedTransfer)}
          onClose={() => { setShowDetailsModal(false); setSelectedTransfer(null) }}
          title={selectedTransfer ? (() => {
            const { companyName, clientName, travelerName } = getClientAndTravelerNames(selectedTransfer)
            return companyName || clientName || 'Unknown Customer'
          })() : ''}
          subtitle={selectedTransfer ? (() => {
            const { companyName, clientName, travelerName } = getClientAndTravelerNames(selectedTransfer)
            return travelerName || (clientName && clientName !== 'N/A' ? clientName : null)
          })() : null}
          size="lg"
          position="right"
          zIndex={1000}
        >
          {selectedTransfer && (() => {
            const { companyName, clientName, travelerName } = getClientAndTravelerNames(selectedTransfer)
            const hasReturn = selectedTransfer.return_transfer_details || selectedTransfer.return_flight_details
            const status = selectedTransfer.transfer_details?.transfer_status || 'pending'
            const { label: statusLabel, statusKey } = getTransferStatusDisplay(selectedTransfer)
            return (
              <div className="p-6 space-y-5">
                {/* Status + Round Trip */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${getStatusColor(statusKey)}`}>
                    {statusLabel}
                  </span>
                  {hasReturn && (
                    <span className="text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-medium">Round Trip</span>
                  )}
                </div>

                {/* Travelers in same car - visible to client (view only), editable by admin/ops */}
                {selectedTransfer.customer_id && (isRole('SUPER_ADMIN') || isRole('ADMIN') || isRole('OPERATIONS_MANAGER') || isRole('CLIENT')) && (
                  <div className="border-t border-border pt-4">
                    {(() => {
                      const maxTravelersPerCar = 3
                      const currentTravelerCount = 1 + (selectedTransfer.delegates || []).length
                      const isCarFull = currentTravelerCount >= maxTravelersPerCar
                      return (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Users size={16} className="text-muted-foreground" />
                              <h4 className="font-medium text-foreground m-0">Travelers in same car</h4>
                            </div>
                            {(isRole('SUPER_ADMIN') || isRole('ADMIN') || isRole('OPERATIONS_MANAGER')) && (
                              <div className="relative group">
                                {isCarFull ? (
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-md cursor-help transition-colors"
                                    disabled
                                  >
                                    <UserPlus size={14} />
                                    Add traveler
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setShowAddTravelerInSameCar(true)}
                                    className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-md hover:bg-primary/20 transition-colors"
                                    title={`Add traveler to same car (${currentTravelerCount}/${maxTravelersPerCar} spaces used)`}
                                  >
                                    <UserPlus size={14} />
                                    Add traveler
                                  </button>
                                )}
                                {isCarFull && (
                                  <div className="absolute top-full right-0 mt-2 w-72 p-3 bg-popover border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999]">
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
                                        <AlertCircle size={14} />
                                        Car Capacity Full
                                      </div>
                                      <div className="text-xs text-amber-600 dark:text-amber-400">
                                        Car capacity reached ({currentTravelerCount}/{maxTravelersPerCar}). Remove someone to add another traveler.
                                      </div>
                                    </div>
                                    <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover"></div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {/* Remove the upfront car capacity message - moved to hover */}
                          <div className="text-sm text-muted-foreground space-y-1 ml-6 pl-4 border-l-2 border-muted">
                            {travelerName && (
                              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="font-medium text-foreground truncate">{travelerName}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {selectedTransfer.traveler_id?.profile?.company_name ||
                                        selectedTransfer.customer_details?.company_name ||
                                        'Company not available'}
                                    </p>
                                  </div>
                                  <span className="shrink-0 rounded-full bg-primary/10 text-primary text-[11px] font-medium px-2 py-0.5">
                                    Main traveler
                                  </span>
                                </div>
                              </div>
                            )}
                            {(selectedTransfer.delegates || []).map((d, i) => {
                              const tid = d.traveler_id?._id || d.traveler_id;
                              const name = getDelegateDisplayName(d);
                              const delegateCompany =
                                d.traveler_id?.profile?.company_name ||
                                d.company_name ||
                                'Company not available';
                              const canEdit = isRole('SUPER_ADMIN') || isRole('ADMIN') || isRole('OPERATIONS_MANAGER');
                              return (
                                <div key={i} className="rounded-lg border border-border bg-background px-3 py-2">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="font-medium text-foreground truncate">{name}</p>
                                      <p className="text-xs text-muted-foreground truncate">{delegateCompany}</p>
                                    </div>
                                    <span className="shrink-0 rounded-full bg-muted text-muted-foreground text-[11px] font-medium px-2 py-0.5">
                                      Same car
                                    </span>
                                  </div>
                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveDelegate(tid)}
                                      disabled={removingDelegateId === String(tid)}
                                      className="mt-2 inline-flex items-center rounded-md border border-destructive/30 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                    >
                                      {removingDelegateId === String(tid) ? 'Removing...' : 'Remove'}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            {!travelerName && (!selectedTransfer.delegates || selectedTransfer.delegates.length === 0) && (
                              <p className="text-muted-foreground italic">No travelers assigned</p>
                            )}
                          </div>
                        </>
                        )
                      })()}
                  </div>
                )}

                {/* Onward Transfer */}
                {(() => {
                  const hasOnwardFlight = hasRealFlight(selectedTransfer.flight_details)
                  const isOnwardFlightMissing = !hasOnwardFlight
                  return (
                <div>
                  <h4 className="font-medium text-foreground mb-3 flex items-center gap-2 flex-wrap">
                    <Plane size={16} className="text-muted-foreground" />
                    Onward
                    {isOnwardFlightMissing && (
                      <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/60 text-yellow-800 dark:text-yellow-200 rounded text-xs">Flight Detail Missing</span>
                    )}
                    {canAddUpdateFlight && (
                      <span className="flex gap-1">
                        {isOnwardFlightMissing ? (
                          <button
                            onClick={() => openFlightDrawer('onward')}
                            className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90"
                          >
                            Add Flight
                          </button>
                        ) : (
                          <button
                            onClick={() => openFlightDrawer('onward', selectedTransfer.flight_details)}
                            className="px-2 py-1 text-xs font-medium bg-muted text-foreground rounded hover:bg-muted/80"
                          >
                            Update Flight
                          </button>
                        )}
                      </span>
                    )}
                  </h4>
                  <div className="ml-6 pl-4 border-l-2 border-muted space-y-3">
                    <div>
                      <span className="text-muted-foreground text-sm">Route</span>
                      <p className="font-medium text-foreground">{DEFAULT_AIRPORT} → {DEFAULT_HOTEL}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">Pickup Time</span>
                      <p className="font-medium text-foreground">
                        {formatTransferPickupLocal(selectedTransfer)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Vendor</p>
                        <p className="font-medium text-foreground">
                          {selectedTransfer.vendor_details?.vendor_name || <span className="italic text-muted-foreground">Not assigned</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Driver</p>
                        <p className="font-medium text-foreground">
                          {selectedTransfer.assigned_driver_details?.name || <span className="italic text-muted-foreground">Not assigned</span>}
                        </p>
                      </div>
                    </div>
                      {hasOnwardFlight && (
                      <div className="p-3 bg-muted/50 rounded border border-border">
                        <h5 className="font-medium text-sm mb-2">Flight</h5>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><strong>Flight:</strong> {getFlightNoDisplay(selectedTransfer.flight_details)}</div>
                          <div><strong>Airline:</strong> {getAirlineDisplay(selectedTransfer.flight_details)}</div>
                          <div><strong>Departure:</strong> {selectedTransfer.flight_details?.departure_time ? formatFlightDepartureLocal(selectedTransfer.flight_details) : 'TBD'}</div>
                          <div><strong>Arrival:</strong> {selectedTransfer.flight_details?.arrival_time ? formatFlightArrivalLocal(selectedTransfer.flight_details) : 'TBD'}</div>
                          <div><strong>Terminal:</strong> {getFlightFieldDisplay(selectedTransfer.flight_details?.terminal)}</div>
                        </div>
                      </div>
                    )}
                    {isOnwardFlightMissing && canAddUpdateFlight && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-200">
                        <AlertTriangle size={16} className="inline mr-2" />
                        Click &quot;Add Flight&quot; above to add onward flight details
                      </div>
                    )}
                  </div>
                </div>
                  )
                })()}

                {/* Return Transfer */}
                {(selectedTransfer.return_transfer_details || selectedTransfer.return_flight_details) && (() => {
                  const hasReturnFlight = hasRealFlight(selectedTransfer.return_flight_details)
                  const isReturnFlightMissing = !hasReturnFlight
                  const isReturnDepartureMissing = !selectedTransfer.return_transfer_details?.estimated_pickup_time || !selectedTransfer.return_flight_details?.departure_time
                  return (
                  <div className="border-t border-border pt-4">
                    <h4 className="font-medium text-foreground mb-3 flex items-center gap-2 flex-wrap">
                      <Plane size={16} className="text-muted-foreground rotate-180" />
                      Return
                      {isReturnFlightMissing && (
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/60 text-yellow-800 dark:text-yellow-200 rounded text-xs">Flight Detail Missing</span>
                      )}
                      {isReturnDepartureMissing && (
                        <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/60 text-orange-800 dark:text-orange-200 rounded text-xs">Departure Missing</span>
                      )}
                      {canAddUpdateFlight && (
                        <span className="flex gap-1">
                          {isReturnFlightMissing ? (
                            <button
                              onClick={() => openFlightDrawer('return')}
                              className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90"
                            >
                              Add Flight
                            </button>
                          ) : (
                            <button
                              onClick={() => openFlightDrawer('return', selectedTransfer.return_flight_details)}
                              className="px-2 py-1 text-xs font-medium bg-muted text-foreground rounded hover:bg-muted/80"
                            >
                              Update Flight
                            </button>
                          )}
                        </span>
                      )}
                    </h4>
                    <div className="ml-6 pl-4 border-l-2 border-muted space-y-3">
                      <div>
                        <span className="text-muted-foreground text-sm">Route</span>
                        <p className="font-medium text-foreground">{DEFAULT_HOTEL} → {DEFAULT_AIRPORT}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-sm">Pickup Time</span>
                        <p className="font-medium text-foreground">
                          {formatReturnPickupLocal(selectedTransfer)}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Vendor</p>
                          <p className="font-medium text-foreground">
                            {selectedTransfer.return_vendor_details?.vendor_name || selectedTransfer.vendor_details?.vendor_name || <span className="italic text-muted-foreground">Not assigned</span>}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Driver</p>
                          <p className="font-medium text-foreground">
                            {selectedTransfer.return_assigned_driver_details?.name || <span className="italic text-muted-foreground">Not assigned</span>}
                          </p>
                        </div>
                      </div>
                      {hasReturnFlight && (
                        <div className="p-3 bg-muted/50 rounded border border-border">
                          <h5 className="font-medium text-sm mb-2">Return Flight</h5>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><strong>Flight:</strong> {getFlightNoDisplay(selectedTransfer.return_flight_details)}</div>
                            <div><strong>Airline:</strong> {getAirlineDisplay(selectedTransfer.return_flight_details)}</div>
                            <div><strong>Departure:</strong> {selectedTransfer.return_flight_details?.departure_time ? formatFlightDepartureLocal(selectedTransfer.return_flight_details) : 'TBD'}</div>
                            <div><strong>Terminal:</strong> {getFlightFieldDisplay(selectedTransfer.return_flight_details?.terminal)}</div>
                          </div>
                        </div>
                      )}
                      {isReturnFlightMissing && canAddUpdateFlight && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-200">
                          <AlertTriangle size={16} className="inline mr-2" />
                          Click &quot;Add Flight&quot; above to add return flight details
                        </div>
                      )}
                    </div>
                    </div>
                  )
                })()}

              </div>
            )
          })()}
        </Drawer>

        {/* Add Traveler in Same Car Drawer */}
        {(isRole('SUPER_ADMIN') || isRole('ADMIN') || isRole('OPERATIONS_MANAGER')) && selectedTransfer && (
          <AddTravelerInSameCar
            transfer={selectedTransfer}
            isOpen={showAddTravelerInSameCar}
            onClose={() => setShowAddTravelerInSameCar(false)}
            onSuccess={(updatedTransfer) => {
              setSelectedTransfer(updatedTransfer)
              setTransfers(prev => prev.map(t => t._id === updatedTransfer._id ? updatedTransfer : t))
              setShowAddTravelerInSameCar(false)
            }}
          />
        )}
      </div>
    </div>
  )
}

export default TransfersEnhanced
