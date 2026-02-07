import { useState, useEffect } from 'react'
import { Search, Plus, Edit, Trash2, Car, Users, Building2, ChevronDown, ChevronUp, Filter, RefreshCw, CheckCircle, XCircle, AlertCircle, Info, CheckSquare, Square, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import Drawer from '../components/Drawer'
import Dropdown from '../components/Dropdown'

const Drivers = () => {
  const { user: currentUser, isRole } = useAuth()
  const api = useApi()
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [vendorFilter, setVendorFilter] = useState('all')
  const [collapsedVendors, setCollapsedVendors] = useState(new Set())
  const [showForm, setShowForm] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [assignedClients, setAssignedClients] = useState({})
  const [vendors, setVendors] = useState([])
  const [loadingVendors, setLoadingVendors] = useState(false)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [syncSheetId, setSyncSheetId] = useState('')
  const [syncSheetName, setSyncSheetName] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncResults, setSyncResults] = useState(null)
  const [syncProgress, setSyncProgress] = useState({ message: '', percentage: 0 })
  const [selectedDrivers, setSelectedDrivers] = useState(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 })
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    licenseNumber: '',
    vehicleType: '',
    vehicleNumber: '',
    experience: '',
    vendorId: ''
  })

  useEffect(() => {
    if (currentUser && (currentUser.role === 'VENDOR' || currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN')) {
      fetchDrivers()
    }
  }, [currentUser])

  useEffect(() => {
    if (isRole('SUPER_ADMIN', 'ADMIN')) {
      fetchVendors()
    }
  }, [currentUser])

  useEffect(() => {
    if (drivers.length > 0) {
      fetchAssignedClients()
    }
  }, [drivers])

  const fetchDrivers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/drivers')
      if (response.success) {
        setDrivers(response.data || [])
      }
    } catch (error) {
      console.error('Error fetching drivers:', error)
      toast.error('Failed to load drivers')
    } finally {
      setLoading(false)
    }
  }

  const fetchVendors = async () => {
    try {
      setLoadingVendors(true)
      const response = await api.get('/users/vendors')
      if (response.success) {
        setVendors(response.data || [])
      }
    } catch (error) {
      console.error('Error fetching vendors:', error)
      toast.error('Failed to load vendors')
    } finally {
      setLoadingVendors(false)
    }
  }

  const fetchAssignedClients = async () => {
    const clientsMap = {}
    for (const driver of drivers) {
      try {
        const response = await api.get(`/drivers/${driver._id}/assigned-clients`)
        if (response.success) {
          clientsMap[driver._id] = response.data || []
        }
      } catch (error) {
        console.error(`Error fetching clients for driver ${driver._id}:`, error)
      }
    }
    setAssignedClients(clientsMap)
  }

  const handleCreateDriver = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        profile: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone
        },
        driverDetails: {
          licenseNumber: formData.licenseNumber,
          vehicleType: formData.vehicleType,
          vehicleNumber: formData.vehicleNumber,
          experience: parseInt(formData.experience) || 0
        }
      }

      // If admin selected a vendor, include it in the payload
      if (isRole('SUPER_ADMIN', 'ADMIN') && formData.vendorId) {
        payload.vendorId = formData.vendorId
      }

      const response = await api.post('/drivers', payload)
      if (response.success) {
        toast.success('Driver created successfully')
        setShowForm(false)
        resetForm()
        fetchDrivers()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create driver')
    }
  }

  const handleUpdateDriver = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        profile: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone
        },
        driverDetails: {
          licenseNumber: formData.licenseNumber,
          vehicleType: formData.vehicleType,
          vehicleNumber: formData.vehicleNumber,
          experience: parseInt(formData.experience) || 0
        }
      }

      if (formData.password) {
        payload.password = formData.password
      }

      const response = await api.put(`/drivers/${selectedDriver._id}`, payload)
      if (response.success) {
        toast.success('Driver updated successfully')
        setShowForm(false)
        resetForm()
        fetchDrivers()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update driver')
    }
  }

  const handleSyncFromSheets = async (e) => {
    e.preventDefault()
    if (!syncSheetId.trim()) {
      toast.error('Please enter a Google Sheet ID')
      return
    }

    let progressInterval = null

    try {
      setSyncing(true)
      setSyncResults(null)
      setSyncProgress({ message: 'Fetching data from Google Sheets...', percentage: 10 })
      
      // Simulate progress while waiting (updates every 2 seconds)
      progressInterval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev.percentage < 90) {
            return {
              message: prev.percentage < 50 ? 'Fetching data from Google Sheets...' : 'Processing drivers...',
              percentage: Math.min(prev.percentage + 5, 90)
            }
          }
          return prev
        })
      }, 2000)
      
      // Use a longer timeout for sync operations (5 minutes = 300000ms)
      const response = await api.post('/drivers/sync-from-sheets', {
        sheetId: syncSheetId.trim(),
        sheetName: syncSheetName.trim() || undefined
      }, {
        timeout: 300000 // 5 minutes timeout
      })

      if (progressInterval) {
        clearInterval(progressInterval)
      }
      setSyncProgress({ message: 'Processing completed!', percentage: 100 })

      if (response.success) {
        setSyncResults(response.data)
        toast.success(response.message || 'Sync completed successfully')
        // Refresh drivers list
        await fetchDrivers()
      } else {
        toast.error(response.message || 'Sync failed')
        setSyncResults(response.data || { errors: [] })
      }
    } catch (error) {
      console.error('Error syncing from Google Sheets:', error)
      
      // Clear progress interval if it exists
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        toast.error('Sync timed out. The sheet might be too large. Please try with a smaller dataset or contact support.')
        setSyncProgress({ message: 'Sync timed out', percentage: 0 })
      } else {
        toast.error(error.response?.data?.message || 'Failed to sync from Google Sheets')
        if (error.response?.data?.data) {
          setSyncResults(error.response.data.data)
        }
      }
    } finally {
      setSyncing(false)
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      setTimeout(() => {
        setSyncProgress({ message: '', percentage: 0 })
      }, 2000)
    }
  }

  const handleToggleSelect = (driverId) => {
    setSelectedDrivers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(driverId)) {
        newSet.delete(driverId)
      } else {
        newSet.add(driverId)
      }
      return newSet
    })
  }

  const handleBulkDelete = async () => {
    if (selectedDrivers.size === 0) {
      toast.error('Please select at least one driver to delete')
      return
    }

    setShowDeleteConfirm(true)
  }

  const confirmBulkDelete = async () => {
    try {
      setDeleting(true)
      const driverIds = Array.from(selectedDrivers)
      const total = driverIds.length
      setDeleteProgress({ current: 0, total })

      // Process in batches to show progress and avoid timeout
      const batchSize = 20 // Delete 20 at a time
      let deletedCount = 0
      let failedCount = 0

      for (let i = 0; i < driverIds.length; i += batchSize) {
        const batch = driverIds.slice(i, i + batchSize)
        
        try {
          const response = await api.request('DELETE', '/drivers/bulk', { driverIds: batch })
          
          if (response.success) {
            deletedCount += response.data.deletedCount || batch.length
          } else {
            failedCount += batch.length
          }
        } catch (error) {
          console.error(`Error deleting batch ${i / batchSize + 1}:`, error)
          failedCount += batch.length
        }

        // Update progress
        const current = Math.min(i + batchSize, total)
        setDeleteProgress({ current, total })
        
        // Small delay to prevent overwhelming the server
        if (i + batchSize < driverIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      if (deletedCount > 0) {
        toast.success(`Successfully deleted ${deletedCount} driver(s)${failedCount > 0 ? `. ${failedCount} failed.` : ''}`)
      } else {
        toast.error(`Failed to delete drivers. ${failedCount} failed.`)
      }

      setSelectedDrivers(new Set())
      setShowDeleteConfirm(false)
      setDeleteProgress({ current: 0, total: 0 })
      fetchDrivers()
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error(error.response?.data?.message || 'Failed to delete drivers')
      setDeleteProgress({ current: 0, total: 0 })
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteDriver = async (driverId) => {
    if (!window.confirm('Are you sure you want to delete this driver?')) return

    try {
      const response = await api.delete(`/drivers/${driverId}`)
      if (response.success) {
        toast.success('Driver deleted successfully')
        fetchDrivers()
        // Remove from selection if selected
        setSelectedDrivers(prev => {
          const newSet = new Set(prev)
          newSet.delete(driverId)
          return newSet
        })
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete driver')
    }
  }

  const handleEditDriver = (driver) => {
    setSelectedDriver(driver)
    setFormData({
      username: driver.username || '',
      email: driver.email || '',
      password: '',
      firstName: driver.profile?.firstName || '',
      lastName: driver.profile?.lastName || '',
      phone: driver.profile?.phone || '',
      licenseNumber: driver.driverDetails?.licenseNumber || '',
      vehicleType: driver.driverDetails?.vehicleType || '',
      vehicleNumber: driver.driverDetails?.vehicleNumber || '',
      experience: driver.driverDetails?.experience?.toString() || ''
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      licenseNumber: '',
      vehicleType: '',
      vehicleNumber: '',
      experience: '',
      vendorId: ''
    })
    setSelectedDriver(null)
  }

  // Get vendor name from driver
  const getVendorName = (driver) => {
    // First check if vendorId is populated (object)
    if (driver.vendorId && typeof driver.vendorId === 'object') {
      const vendor = driver.vendorId
      return vendor.vendorDetails?.companyName || 
             vendor.companyName || 
             (vendor.profile?.firstName && vendor.profile?.lastName 
               ? `${vendor.profile.firstName} ${vendor.profile.lastName}`.trim()
               : vendor.username || vendor.email || 'Unknown Vendor')
    }
    
    // If vendorId is a string ID, try to find it in the vendors list
    if (driver.vendorId && typeof driver.vendorId === 'string') {
      const vendor = vendors.find(v => v._id === driver.vendorId)
      if (vendor) {
        return vendor.vendorDetails?.companyName || 
               vendor.companyName || 
               (vendor.profile?.firstName && vendor.profile?.lastName 
                 ? `${vendor.profile.firstName} ${vendor.profile.lastName}`.trim()
                 : vendor.username || vendor.email || 'Unknown Vendor')
      }
    }
    
    // Fallback to createdBy if vendorId is not available
    if (driver.createdBy && typeof driver.createdBy === 'object') {
      const creator = driver.createdBy
      return creator.vendorDetails?.companyName || 
             creator.companyName || 
             (creator.profile?.firstName && creator.profile?.lastName 
               ? `${creator.profile.firstName} ${creator.profile.lastName}`.trim()
               : creator.username || creator.email || 'Unassigned')
    }
    
    return 'Unassigned'
  }

  // Get unique vendors from drivers
  const uniqueVendors = Array.from(
    new Set(
      drivers
        .map(d => {
          const vendorId = d.vendorId?._id || d.vendorId || d.createdBy?._id || d.createdBy || 'unassigned'
          return vendorId.toString()
        })
        .filter(Boolean)
    )
  ).map(vendorId => {
    const driver = drivers.find(d => {
      const id = d.vendorId?._id || d.vendorId || d.createdBy?._id || d.createdBy
      return id && id.toString() === vendorId
    })
    if (!driver) return null
    return {
      id: vendorId,
      name: getVendorName(driver),
      driver: driver
    }
  }).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name))

  // Add "Unassigned" if there are drivers without vendor
  const hasUnassigned = drivers.some(d => !d.vendorId && !d.createdBy)
  if (hasUnassigned && !uniqueVendors.find(v => v.id === 'unassigned')) {
    uniqueVendors.push({
      id: 'unassigned',
      name: 'Unassigned',
      driver: null
    })
  }

  // Filter drivers by search term and vendor filter
  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = 
      driver.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${driver.profile?.firstName} ${driver.profile?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getVendorName(driver).toLowerCase().includes(searchTerm.toLowerCase())
    
    if (!matchesSearch) return false
    
    if (vendorFilter === 'all') return true
    
    const driverVendorId = driver.vendorId?._id || driver.vendorId || driver.createdBy?._id || driver.createdBy || 'unassigned'
    return driverVendorId.toString() === vendorFilter
  })

  // Group drivers by vendor
  const groupedDrivers = uniqueVendors.reduce((acc, vendor) => {
    const vendorDrivers = filteredDrivers.filter(d => {
      const driverVendorId = d.vendorId?._id || d.vendorId || d.createdBy?._id || d.createdBy || 'unassigned'
      return driverVendorId.toString() === vendor.id
    })
    if (vendorDrivers.length > 0) {
      acc.push({
        vendor: vendor.name,
        vendorId: vendor.id,
        drivers: vendorDrivers
      })
    }
    return acc
  }, [])

  const handleSelectAllForVendor = (vendorId) => {
    const vendorDrivers = filteredDrivers.filter(d => {
      const driverVendorId = d.vendorId?._id || d.vendorId || d.createdBy?._id || d.createdBy || 'unassigned'
      return driverVendorId.toString() === vendorId
    })
    
    const allSelected = vendorDrivers.length > 0 && vendorDrivers.every(d => selectedDrivers.has(d._id))
    
    if (allSelected) {
      // Deselect all drivers in this vendor group
      setSelectedDrivers(prev => {
        const newSet = new Set(prev)
        vendorDrivers.forEach(d => newSet.delete(d._id))
        return newSet
      })
    } else {
      // Select all drivers in this vendor group
      setSelectedDrivers(prev => {
        const newSet = new Set(prev)
        vendorDrivers.forEach(d => newSet.add(d._id))
        return newSet
      })
    }
  }

  const handleExportToExcel = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Please login to export drivers');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/drivers/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('token');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || 'Failed to export drivers');
        return;
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'drivers-export.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Drivers exported successfully!');
    } catch (error) {
      console.error('Error exporting drivers:', error);
      toast.error('Failed to export drivers. Please try again.');
    }
  }

  const toggleVendorCollapse = (vendorId) => {
    setCollapsedVendors(prev => {
      const newSet = new Set(prev)
      if (newSet.has(vendorId)) {
        newSet.delete(vendorId)
      } else {
        newSet.add(vendorId)
      }
      return newSet
    })
  }

  // Vendor filter options
  const vendorFilterOptions = [
    { value: 'all', label: 'All Vendors' },
    ...uniqueVendors.map(vendor => ({
      value: vendor.id,
      label: `${vendor.name} (${drivers.filter(d => {
        const driverVendorId = d.vendorId?._id || d.vendorId || d.createdBy?._id || d.createdBy || 'unassigned'
        return driverVendorId.toString() === vendor.id
      }).length})`
    }))
  ]


  if (!currentUser || !['VENDOR', 'SUPER_ADMIN', 'ADMIN'].includes(currentUser.role)) {
    return (
      <div className="p-8 text-center">
        <div className="text-lg font-semibold text-foreground mb-2">Access Denied</div>
        <div className="text-sm text-muted-foreground">You don't have permission to access this page.</div>
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Drivers</h1>
            <p className="text-gray-500 dark:text-gray-400 text-base">Manage your drivers</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors"
              title="Export drivers to Excel"
            >
              <Download size={20} />
              Export to Excel
            </button>
            <button
              onClick={() => {
                setShowSyncModal(true)
                setSyncSheetId('')
                setSyncSheetName('')
                setSyncResults(null)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors border border-border"
            >
              <RefreshCw size={20} />
              Sync from Google Sheets
            </button>
            <button
              onClick={() => {
                resetForm()
                setShowForm(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus size={20} />
              Add Driver
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
          <input
            type="text"
            placeholder="Search drivers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="w-64">
          <Dropdown
            name="vendorFilter"
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            options={vendorFilterOptions}
            placeholder="Filter by vendor"
            minWidth="100%"
          />
        </div>
        {selectedDrivers.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {selectedDrivers.size} selected
            </span>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
            >
              <Trash2 size={18} />
              Delete Selected
            </button>
          </div>
        )}
      </div>

      {/* Drivers List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : groupedDrivers.length > 0 ? (
        <div className="space-y-4 mt-6">
          {groupedDrivers.map((group) => (
            <div key={group.vendorId} className="bg-card border border-border rounded-lg overflow-hidden">
              {/* Vendor Header */}
              <div className="w-full flex items-center justify-between px-4 py-3 bg-muted/30">
                <button
                  onClick={() => toggleVendorCollapse(group.vendorId)}
                  className="flex-1 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Filter size={16} className="text-muted-foreground" />
                    <span className="font-semibold text-foreground">
                      Vendor: {group.vendor}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({group.drivers.length} driver{group.drivers.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  {collapsedVendors.has(group.vendorId) ? (
                    <ChevronDown size={20} className="text-muted-foreground" />
                  ) : (
                    <ChevronUp size={20} className="text-muted-foreground" />
                  )}
                </button>
                {!collapsedVendors.has(group.vendorId) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectAllForVendor(group.vendorId)
                    }}
                    className="ml-3 flex items-center gap-2 px-3 py-1.5 text-sm bg-background border border-border rounded-lg hover:bg-muted transition-colors"
                    title="Select all drivers in this vendor group"
                  >
                    {group.drivers.length > 0 && group.drivers.every(d => selectedDrivers.has(d._id)) ? (
                      <>
                        <CheckSquare size={16} className="text-primary" />
                        Deselect All
                      </>
                    ) : (
                      <>
                        <Square size={16} className="text-muted-foreground" />
                        Select All
                      </>
                    )}
                  </button>
                )}
              </div>
              
              {/* Drivers Grid */}
              {!collapsedVendors.has(group.vendorId) && (
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.drivers.map((driver) => (
                      <div
                        key={driver._id}
                        className="group bg-background border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1">
                            <button
                              onClick={() => handleToggleSelect(driver._id)}
                              className={`mt-1 transition-opacity ${
                                selectedDrivers.has(driver._id) 
                                  ? 'opacity-100' 
                                  : 'opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              {selectedDrivers.has(driver._id) ? (
                                <CheckSquare size={20} className="text-primary" />
                              ) : (
                                <Square size={20} className="text-muted-foreground" />
                              )}
                            </button>
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Car size={20} className="text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-foreground">
                                {driver.profile?.firstName} {driver.profile?.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground">{driver.email}</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditDriver(driver)}
                              className="p-2 text-primary hover:bg-primary/10 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteDriver(driver._id)}
                              className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">
                          Vendor: {getVendorName(driver)}
                        </div>
                        {driver.driverDetails && (
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {driver.driverDetails.vehicleType && (
                              <div>Vehicle: {driver.driverDetails.vehicleType}</div>
                            )}
                            {driver.driverDetails.vehicleNumber && (
                              <div>Vehicle #: {driver.driverDetails.vehicleNumber}</div>
                            )}
                            {driver.driverDetails.experience !== undefined && (
                              <div>Experience: {driver.driverDetails.experience} years</div>
                            )}
                          </div>
                        )}
                        {assignedClients[driver._id] && assignedClients[driver._id].length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Users size={14} />
                              <span>{assignedClients[driver._id].length} assigned client{assignedClients[driver._id].length > 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-base mb-2">No drivers found</div>
          <div className="text-sm text-muted-foreground/70">
            {searchTerm || vendorFilter !== 'all' ? 'Try adjusting your search or filter' : 'Add your first driver to get started'}
          </div>
        </div>
      )}

      {/* Create/Edit Driver Drawer */}
      <Drawer
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          resetForm()
        }}
        title={selectedDriver ? 'Edit Driver' : 'Add Driver'}
        subtitle={selectedDriver ? 'Update driver information' : 'Create a new driver account'}
        position="right"
        size="lg"
      >
        <form onSubmit={selectedDriver ? handleUpdateDriver : handleCreateDriver} className="flex flex-col h-full">
          {/* Form Content */}
          <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
            <div className="space-y-4">
              {/* Vendor Selection - Only for admins when creating new driver */}
              {!selectedDriver && isRole('SUPER_ADMIN', 'ADMIN') && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Vendor</label>
                  <Dropdown
                    name="vendorId"
                    value={formData.vendorId}
                    onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                    options={[
                      { value: '', label: 'Select a vendor (optional)' },
                      ...vendors.map(vendor => ({
                        value: vendor._id,
                        label: `${vendor.profile?.firstName || ''} ${vendor.profile?.lastName || ''}`.trim() || vendor.username || vendor.email
                      }))
                    ]}
                    placeholder="Select a vendor"
                    minWidth="100%"
                  />
                  {loadingVendors && (
                    <p className="text-xs text-muted-foreground mt-1">Loading vendors...</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Select a vendor to assign this driver to. If not selected, driver will be assigned to you.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Password {selectedDriver && '(leave blank to keep current)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  required={!selectedDriver}
                  minLength={selectedDriver ? 0 : 6}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">License Number</label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Vehicle Type</label>
                <input
                  type="text"
                  value={formData.vehicleType}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g., Sedan, SUV, Van"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Vehicle Number</label>
                <input
                  type="text"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Experience (years)</label>
                <input
                  type="number"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  min="0"
                />
              </div>
            </div>
              </div>

          {/* Fixed Footer */}
          <div className="flex-shrink-0 border-t border-border bg-muted/30 backdrop-blur-sm">
            <div className="flex gap-3 px-6 py-5">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                className="flex-1 px-4 py-2.5 bg-background border-2 border-border rounded-lg text-foreground font-semibold hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
                >
                  {selectedDriver ? 'Update Driver' : 'Create Driver'}
                </button>
            </div>
              </div>
            </form>
      </Drawer>

      {/* Sync from Google Sheets Drawer */}
      <Drawer
        isOpen={showSyncModal}
        onClose={() => {
          setShowSyncModal(false)
          setSyncSheetId('')
          setSyncSheetName('')
          setSyncResults(null)
        }}
        title="Sync from Google Sheets"
        subtitle="Import drivers from a Google Sheet"
        position="right"
        size="lg"
      >
        <div className="flex flex-col h-full">
          {/* Instructions */}
          <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                  <Info size={18} />
                  How to use:
                </h3>
                <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1.5 list-decimal list-inside">
                  <li>Create a Google Sheet with the following columns: <strong>FirstName</strong>, <strong>LastName</strong>, <strong>Email</strong>, <strong>Phone</strong> (optional), <strong>Vendor</strong> (optional), <strong>Username</strong> (optional), <strong>Password</strong> (optional), <strong>LicenseNumber</strong> (optional), <strong>VehicleType</strong> (optional), <strong>VehicleNumber</strong> (optional), <strong>Experience</strong> (optional)</li>
                  <li>Make the sheet <strong>public</strong> (File → Share → Anyone with the link can view)</li>
                  <li>Copy the Sheet ID from the URL (the long string between <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">/d/</code> and <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">/edit</code>)</li>
                  <li>Paste the Sheet ID below and click "Sync"</li>
                </ol>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-3">
                  <strong>Note:</strong> Existing drivers with matching emails will be updated. New drivers will be created. If the "Vendor" column is specified in the sheet, that vendor will be used. Otherwise, drivers will be assigned to you.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Google Sheet ID <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={syncSheetId}
                  onChange={(e) => setSyncSheetId(e.target.value)}
                  placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={syncing}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Found in the Google Sheet URL: <code className="bg-muted px-1 rounded">https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit</code>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Sheet Name (Optional)
                </label>
                <input
                  type="text"
                  value={syncSheetName}
                  onChange={(e) => setSyncSheetName(e.target.value)}
                  placeholder="e.g., Drivers, Sheet1, or leave empty for first sheet"
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={syncing}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  If your Google Sheet has multiple tabs, enter the exact tab name here (case-sensitive). Examples: "Drivers", "Sheet1", "My Drivers List". Leave empty to use the first sheet.
                </p>
              </div>

              {/* Progress Bar */}
              {syncing && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">
                      {syncProgress.message || 'Syncing drivers...'}
                    </span>
                    {syncProgress.percentage > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {syncProgress.percentage}%
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${syncProgress.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This may take a few minutes for large sheets. Please don't close this window.
                  </p>
                </div>
              )}

              {/* Sync Results */}
              {syncResults && (
                <div className="mt-6 space-y-3">
                  <h3 className="font-semibold text-foreground">Sync Results</h3>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                        <span className="text-xs font-medium text-green-700 dark:text-green-300">Created</span>
                      </div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {syncResults.created || 0}
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <RefreshCw size={16} className="text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Updated</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {syncResults.updated || 0}
                      </div>
                    </div>
                    
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle size={16} className="text-yellow-600 dark:text-yellow-400" />
                        <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">Skipped</span>
                      </div>
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {syncResults.skipped || 0}
                      </div>
                    </div>
                  </div>

                  {syncResults.errors && syncResults.errors.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
                        <XCircle size={18} />
                        Errors ({syncResults.errors.length})
                      </h4>
                      <div className="max-h-48 overflow-y-auto space-y-1.5">
                        {syncResults.errors.map((error, index) => (
                          <div key={index} className="text-xs text-red-600 dark:text-red-400">
                            <strong>Row {error.row}</strong> ({error.email}): {error.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-border bg-muted/30 backdrop-blur-sm">
            <div className="flex gap-3 px-6 py-5">
              <button
                type="button"
                onClick={() => {
                  setShowSyncModal(false)
                  setSyncSheetId('')
                  setSyncSheetName('')
                  setSyncResults(null)
                }}
                className="flex-1 px-4 py-2.5 bg-background border-2 border-border rounded-lg text-foreground font-semibold hover:bg-muted transition-all"
                disabled={syncing}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSyncFromSheets}
                className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
                disabled={syncing || !syncSheetId.trim()}
              >
                {syncing ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw size={18} />
                    Sync
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </Drawer>

      {/* Bulk Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 size={24} className="text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Delete Drivers</h3>
                <p className="text-sm text-muted-foreground">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-foreground mb-6">
              Are you sure you want to delete <strong>{selectedDrivers.size}</strong> driver{selectedDrivers.size !== 1 ? 's' : ''}? 
              This will permanently remove {selectedDrivers.size === 1 ? 'this driver' : 'these drivers'} from the system.
            </p>
            
            {/* Progress Bar */}
            {deleting && deleteProgress.total > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    Deleting drivers...
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {deleteProgress.current} / {deleteProgress.total} ({Math.round((deleteProgress.current / deleteProgress.total) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleting(false)
                  setDeleteProgress({ current: 0, total: 0 })
                }}
                className="flex-1 px-4 py-2 bg-background border-2 border-border rounded-lg text-foreground font-semibold hover:bg-muted transition-all"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg font-semibold hover:bg-destructive/90 transition-all flex items-center justify-center gap-2"
              >
                {deleting ? (
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
    </div>
  )
}

export default Drivers

