import { useState, useEffect } from 'react'
import { Search, Plus, Edit, Trash2, User, ChevronDown, ChevronUp, Filter, Info, RefreshCw, CheckCircle, XCircle, AlertCircle, CheckSquare, Square, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import Drawer from '../components/Drawer'
import Dropdown from '../components/Dropdown'

const Travelers = () => {
  const { user: currentUser, isRole } = useAuth()
  const api = useApi()
  const [travelers, setTravelers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [clientFilter, setClientFilter] = useState('all')
  const [collapsedClients, setCollapsedClients] = useState(new Set())
  const [showPhoneTooltip, setShowPhoneTooltip] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedTraveler, setSelectedTraveler] = useState(null)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    clientId: ''
  })
  const [clients, setClients] = useState([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [syncSheetId, setSyncSheetId] = useState('')
  const [syncSheetName, setSyncSheetName] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncResults, setSyncResults] = useState(null)
  const [syncProgress, setSyncProgress] = useState({ message: '', percentage: 0 })
  const [selectedTravelers, setSelectedTravelers] = useState(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 })

  useEffect(() => {
    if (currentUser && isRole('CLIENT', 'SUPER_ADMIN', 'ADMIN')) {
      fetchTravelers()
    }
  }, [currentUser])

  useEffect(() => {
    if (showForm && !selectedTraveler && isRole('SUPER_ADMIN', 'ADMIN')) {
      fetchClients()
    }
  }, [showForm, selectedTraveler, currentUser])

  const fetchTravelers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/travelers')
      if (response.success) {
        setTravelers(response.data || [])
      }
    } catch (error) {
      console.error('Error fetching travelers:', error)
      toast.error('Failed to load travelers')
    } finally {
      setLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      setLoadingClients(true)
      const response = await api.get('/users/clients')
      if (response.success) {
        setClients(response.data || [])
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
      toast.error('Failed to load clients')
    } finally {
      setLoadingClients(false)
    }
  }

  const handleCreateTraveler = async (e) => {
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
        }
      }

      // If admin selected a client, include it in the payload
      if (isRole('SUPER_ADMIN', 'ADMIN') && formData.clientId) {
        payload.clientId = formData.clientId
      }

      const response = await api.post('/travelers', payload)
      if (response.success) {
        toast.success('Traveler created successfully')
        setShowForm(false)
        resetForm()
        fetchTravelers()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create traveler')
    }
  }

  const handleUpdateTraveler = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        profile: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone
        }
      }

      if (formData.password) {
        payload.password = formData.password
      }

      const response = await api.put(`/travelers/${selectedTraveler._id}`, payload)
      if (response.success) {
        toast.success('Traveler updated successfully')
        setShowForm(false)
        resetForm()
        fetchTravelers()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update traveler')
    }
  }

  const handleSyncFromSheets = async (e) => {
    e.preventDefault()
    if (!syncSheetId.trim()) {
      toast.error('Please enter a Google Sheet ID')
      return
    }

    try {
      setSyncing(true)
      setSyncResults(null)
      setSyncProgress({ message: 'Fetching data from Google Sheets...', percentage: 10 })
      
      // Simulate progress while waiting (updates every 2 seconds)
      let progressInterval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev.percentage < 90) {
            return {
              message: prev.percentage < 50 ? 'Fetching data from Google Sheets...' : 'Processing travelers...',
              percentage: Math.min(prev.percentage + 5, 90)
            }
          }
          return prev
        })
      }, 2000)
      
      // Use a longer timeout for sync operations (5 minutes = 300000ms)
      const response = await api.post('/travelers/sync-from-sheets', {
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
        // Refresh travelers list
        await fetchTravelers()
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
      setTimeout(() => {
        setSyncProgress({ message: '', percentage: 0 })
      }, 2000)
    }
  }

  const handleDeleteTraveler = async (travelerId) => {
    if (!window.confirm('Are you sure you want to delete this traveler?')) return

    try {
      const response = await api.delete(`/travelers/${travelerId}`)
      if (response.success) {
        toast.success('Traveler deleted successfully')
        fetchTravelers()
        // Remove from selection if selected
        setSelectedTravelers(prev => {
          const newSet = new Set(prev)
          newSet.delete(travelerId)
          return newSet
        })
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete traveler')
    }
  }

  const handleToggleSelect = (travelerId) => {
    setSelectedTravelers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(travelerId)) {
        newSet.delete(travelerId)
      } else {
        newSet.add(travelerId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedTravelers.size === filteredTravelers.length && filteredTravelers.length > 0) {
      // Deselect all
      setSelectedTravelers(new Set())
    } else {
      // Select all filtered travelers
      setSelectedTravelers(new Set(filteredTravelers.map(t => t._id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedTravelers.size === 0) {
      toast.error('Please select at least one traveler to delete')
      return
    }

    setShowDeleteConfirm(true)
  }

  const confirmBulkDelete = async () => {
    try {
      setDeleting(true)
      const travelerIds = Array.from(selectedTravelers)
      const total = travelerIds.length
      setDeleteProgress({ current: 0, total })

      // Process in batches to show progress and avoid timeout
      const batchSize = 20 // Delete 20 at a time
      let deletedCount = 0
      let failedCount = 0

      for (let i = 0; i < travelerIds.length; i += batchSize) {
        const batch = travelerIds.slice(i, i + batchSize)
        
        try {
          const response = await api.request('DELETE', '/travelers/bulk', { travelerIds: batch })
          
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
        if (i + batchSize < travelerIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      if (deletedCount > 0) {
        toast.success(`Successfully deleted ${deletedCount} traveler(s)${failedCount > 0 ? `. ${failedCount} failed.` : ''}`)
      } else {
        toast.error(`Failed to delete travelers. ${failedCount} failed.`)
      }

      setSelectedTravelers(new Set())
      setShowDeleteConfirm(false)
      setDeleteProgress({ current: 0, total: 0 })
      fetchTravelers()
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error(error.response?.data?.message || 'Failed to delete travelers')
      setDeleteProgress({ current: 0, total: 0 })
    } finally {
      setDeleting(false)
    }
  }

  const handleEditTraveler = (traveler) => {
    setSelectedTraveler(traveler)
    setFormData({
      username: traveler.username || '',
      email: traveler.email || '',
      password: '',
      firstName: traveler.profile?.firstName || '',
      lastName: traveler.profile?.lastName || '',
      phone: traveler.profile?.phone || ''
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
      clientId: ''
    })
    setSelectedTraveler(null)
  }

  // Get unique clients from travelers
  const getClientName = (traveler) => {
    if (!traveler.createdBy) return 'Unassigned'
    const client = traveler.createdBy
    if (typeof client === 'object' && client.profile) {
      return `${client.profile.firstName || ''} ${client.profile.lastName || ''}`.trim() || client.username || 'Unknown Client'
    }
    return 'Unknown Client'
  }

  const uniqueClients = Array.from(
    new Set(
      travelers
        .map(t => {
          const clientId = t.createdBy?._id || t.createdBy || 'unassigned'
          return clientId.toString()
        })
        .filter(Boolean)
    )
  ).map(clientId => {
    const traveler = travelers.find(t => {
      const id = t.createdBy?._id || t.createdBy
      return id && id.toString() === clientId
    })
    if (!traveler) return null
    return {
      id: clientId,
      name: getClientName(traveler),
      traveler: traveler
    }
  }).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name))

  // Add "Unassigned" if there are travelers without createdBy
  const hasUnassigned = travelers.some(t => !t.createdBy)
  if (hasUnassigned && !uniqueClients.find(c => c.id === 'unassigned')) {
    uniqueClients.push({
      id: 'unassigned',
      name: 'Unassigned',
      traveler: null
    })
  }

  // Filter travelers by search term and client filter
  const filteredTravelers = travelers.filter(traveler => {
    const matchesSearch = 
      traveler.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      traveler.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${traveler.profile?.firstName} ${traveler.profile?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getClientName(traveler).toLowerCase().includes(searchTerm.toLowerCase())
    
    if (!matchesSearch) return false
    
    if (clientFilter === 'all') return true
    
    const travelerClientId = traveler.createdBy?._id || traveler.createdBy || 'unassigned'
    return travelerClientId.toString() === clientFilter
  })

  // Group travelers by client
  const groupedTravelers = uniqueClients.reduce((acc, client) => {
    const clientTravelers = filteredTravelers.filter(t => {
      const travelerClientId = t.createdBy?._id || t.createdBy || 'unassigned'
      return travelerClientId.toString() === client.id
    })
    if (clientTravelers.length > 0) {
      acc.push({
        client: client.name,
        clientId: client.id,
        travelers: clientTravelers
      })
    }
    return acc
  }, [])

  const toggleClientCollapse = (clientId) => {
    setCollapsedClients(prev => {
      const newSet = new Set(prev)
      if (newSet.has(clientId)) {
        newSet.delete(clientId)
      } else {
        newSet.add(clientId)
      }
      return newSet
    })
  }

  const handleSelectAllForClient = (clientId) => {
    const clientTravelers = filteredTravelers.filter(t => {
      const travelerClientId = t.createdBy?._id || t.createdBy || 'unassigned'
      return travelerClientId.toString() === clientId
    })
    
    const allSelected = clientTravelers.length > 0 && clientTravelers.every(t => selectedTravelers.has(t._id))
    
    if (allSelected) {
      // Deselect all travelers in this client group
      setSelectedTravelers(prev => {
        const newSet = new Set(prev)
        clientTravelers.forEach(t => newSet.delete(t._id))
        return newSet
      })
    } else {
      // Select all travelers in this client group
      setSelectedTravelers(prev => {
        const newSet = new Set(prev)
        clientTravelers.forEach(t => newSet.add(t._id))
        return newSet
      })
    }
  }

  const handleExportToExcel = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Please login to export travelers');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/travelers/export`, {
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
        toast.error(errorData.message || 'Failed to export travelers');
        return;
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'travelers-export.xlsx';
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

      toast.success('Travelers exported successfully!');
    } catch (error) {
      console.error('Error exporting travelers:', error);
      toast.error('Failed to export travelers. Please try again.');
    }
  }

  // Client filter options
  const clientFilterOptions = [
    { value: 'all', label: 'All Clients' },
    ...uniqueClients.map(client => ({
      value: client.id,
      label: `${client.name} (${travelers.filter(t => {
        const travelerClientId = t.createdBy?._id || t.createdBy || 'unassigned'
        return travelerClientId.toString() === client.id
      }).length})`
    }))
  ]

  if (!currentUser || !isRole('CLIENT', 'SUPER_ADMIN', 'ADMIN')) {
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Travelers</h1>
            <p className="text-gray-500 dark:text-gray-400 text-base">Manage your travelers</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors"
              title="Export travelers to Excel"
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
              Add Traveler
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
            placeholder="Search travelers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="w-64">
          <Dropdown
            name="clientFilter"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            options={clientFilterOptions}
            placeholder="Filter by client"
            minWidth="100%"
          />
        </div>
        {selectedTravelers.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {selectedTravelers.size} selected
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

      {/* Travelers List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : groupedTravelers.length > 0 ? (
        <div className="space-y-4 mt-6">
          {groupedTravelers.map((group) => (
            <div key={group.clientId} className="bg-card border border-border rounded-lg overflow-hidden">
              {/* Client Header */}
              <div className="w-full flex items-center justify-between px-4 py-3 bg-muted/30">
                <button
                  onClick={() => toggleClientCollapse(group.clientId)}
                  className="flex-1 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Filter size={16} className="text-muted-foreground" />
                    <span className="font-semibold text-foreground">
                      Client: {group.client}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({group.travelers.length} traveler{group.travelers.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  {collapsedClients.has(group.clientId) ? (
                    <ChevronDown size={20} className="text-muted-foreground" />
                  ) : (
                    <ChevronUp size={20} className="text-muted-foreground" />
                  )}
                </button>
                {!collapsedClients.has(group.clientId) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectAllForClient(group.clientId)
                    }}
                    className="ml-3 flex items-center gap-2 px-3 py-1.5 text-sm bg-background border border-border rounded-lg hover:bg-muted transition-colors"
                    title="Select all travelers in this client group"
                  >
                    {group.travelers.length > 0 && group.travelers.every(t => selectedTravelers.has(t._id)) ? (
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
              
              {/* Travelers Grid */}
              {!collapsedClients.has(group.clientId) && (
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.travelers.map((traveler) => (
                      <div
                        key={traveler._id}
                        className={`group bg-background border rounded-lg p-4 hover:shadow-md transition-shadow ${
                          selectedTravelers.has(traveler._id) 
                            ? 'border-primary ring-2 ring-primary/20' 
                            : 'border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1">
                            <button
                              onClick={() => handleToggleSelect(traveler._id)}
                              className={`mt-1 transition-opacity ${
                                selectedTravelers.has(traveler._id) 
                                  ? 'opacity-100' 
                                  : 'opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              {selectedTravelers.has(traveler._id) ? (
                                <CheckSquare size={18} className="text-primary" />
                              ) : (
                                <Square size={18} className="text-muted-foreground" />
                              )}
                            </button>
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User size={20} className="text-primary" />
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">
                                {traveler.profile?.firstName} {traveler.profile?.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground">{traveler.email}</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditTraveler(traveler)}
                              className="p-2 text-primary hover:bg-primary/10 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteTraveler(traveler._id)}
                              className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">
                          Client: {getClientName(traveler)}
                        </div>
                        {traveler.profile?.phone && (
                          <div className="text-sm text-muted-foreground">
                            Phone: {traveler.profile.phone}
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
          <div className="text-base mb-2">No travelers found</div>
          <div className="text-sm text-muted-foreground/70">
            {searchTerm || clientFilter !== 'all' ? 'Try adjusting your search or filter' : 'Add your first traveler to get started'}
          </div>
        </div>
      )}

      {/* Create/Edit Traveler Drawer */}
      <Drawer
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          resetForm()
        }}
        title={selectedTraveler ? 'Edit Traveler' : 'Add Traveler'}
        subtitle={selectedTraveler ? 'Update traveler information' : 'Create a new traveler account'}
        position="right"
        size="md"
      >
        <form onSubmit={selectedTraveler ? handleUpdateTraveler : handleCreateTraveler} className="flex flex-col h-full">
          {/* Form Content */}
          <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
            <div className="space-y-4">
              {/* Client Selection - Only for admins when creating new traveler */}
              {!selectedTraveler && isRole('SUPER_ADMIN', 'ADMIN') && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Client</label>
                  <Dropdown
                    name="clientId"
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    options={[
                      { value: '', label: 'Select a client (optional)' },
                      ...clients.map(client => ({
                        value: client._id,
                        label: `${client.profile?.firstName || ''} ${client.profile?.lastName || ''}`.trim() || client.username || client.email
                      }))
                    ]}
                    placeholder="Select a client"
                    minWidth="100%"
                  />
                  {loadingClients && (
                    <p className="text-xs text-muted-foreground mt-1">Loading clients...</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Select a client to assign this traveler to. If not selected, traveler will be assigned to you.
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
                  Password {selectedTraveler && '(leave blank to keep current)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  required={!selectedTraveler}
                  minLength={selectedTraveler ? 0 : 6}
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
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1">
                  Phone
                  <div className="relative inline-flex items-center">
                    <button
                      type="button"
                      onMouseEnter={() => setShowPhoneTooltip(true)}
                      onMouseLeave={() => setShowPhoneTooltip(false)}
                      onClick={() => setShowPhoneTooltip(!showPhoneTooltip)}
                      className="focus:outline-none p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      title="Phone format requirements"
                    >
                      <Info size={18} className="text-blue-600 dark:text-blue-400 cursor-help hover:text-blue-700 dark:hover:text-blue-300 transition-colors" />
                    </button>
                    {showPhoneTooltip && (
                      <div className="absolute left-0 bottom-full mb-2 z-50 w-72 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl border border-gray-700">
                        <div className="font-semibold mb-2 text-sm">Phone Format Requirements:</div>
                        <ul className="space-y-1.5 list-disc list-inside text-xs">
                          <li>Must start with <code className="bg-gray-700 px-1.5 py-0.5 rounded">+</code></li>
                          <li>Followed by country code (1-9, not 0)</li>
                          <li>Then 1-14 more digits</li>
                          <li>No spaces allowed</li>
                          <li className="mt-2 font-semibold">Example: <code className="bg-gray-700 px-1.5 py-0.5 rounded">+918108457911</code></li>
                        </ul>
                        <div className="absolute left-4 -bottom-1.5 w-3 h-3 bg-gray-900 dark:bg-gray-800 border-r border-b border-gray-700 transform rotate-45"></div>
                      </div>
                    )}
                  </div>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    // Remove spaces and keep only valid characters (+ and digits)
                    const cleaned = e.target.value.replace(/\s/g, '')
                    setFormData({ ...formData, phone: cleaned })
                  }}
                  placeholder="+918108457911"
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Info size={12} />
                  Format: +[country code][number] (e.g., +918108457911)
                </p>
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
                  {selectedTraveler ? 'Update Traveler' : 'Create Traveler'}
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
        subtitle="Import travelers from a Google Sheet"
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
                  <li>Create a Google Sheet with the following columns: <strong>FirstName</strong>, <strong>LastName</strong>, <strong>Email</strong>, <strong>Phone</strong> (optional), <strong>Client</strong> (optional), <strong>Username</strong> (optional), <strong>Password</strong> (optional)</li>
                  <li>Make the sheet <strong>public</strong> (File → Share → Anyone with the link can view)</li>
                  <li>Copy the Sheet ID from the URL (the long string between <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">/d/</code> and <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">/edit</code>)</li>
                  <li>Paste the Sheet ID below and click "Sync"</li>
                </ol>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-3">
                  <strong>Note:</strong> Existing travelers with matching emails will be updated. New travelers will be created. If the "Client" column is specified in the sheet, that client will be used. Otherwise, travelers will be assigned to you.
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
                  placeholder="e.g., Travelers, Sheet1, or leave empty for first sheet"
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={syncing}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  If your Google Sheet has multiple tabs, enter the exact tab name here (case-sensitive). Examples: "Travelers", "Sheet1", "My Travelers List". Leave empty to use the first sheet.
                </p>
              </div>

              {/* Progress Bar */}
              {syncing && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">
                      {syncProgress.message || 'Syncing travelers...'}
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
                <h3 className="text-lg font-semibold text-foreground">Delete Travelers</h3>
                <p className="text-sm text-muted-foreground">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-foreground mb-6">
              Are you sure you want to delete <strong>{selectedTravelers.size}</strong> traveler{selectedTravelers.size !== 1 ? 's' : ''}? 
              This will permanently remove {selectedTravelers.size === 1 ? 'this traveler' : 'these travelers'} from the system.
            </p>
            
            {/* Progress Bar */}
            {deleting && deleteProgress.total > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    Deleting travelers...
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

export default Travelers

