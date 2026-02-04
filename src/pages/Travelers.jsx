import { useState, useEffect } from 'react'
import { Search, Plus, Edit, Trash2, User, ChevronDown, ChevronUp, Filter, Info } from 'lucide-react'
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

  const handleDeleteTraveler = async (travelerId) => {
    if (!window.confirm('Are you sure you want to delete this traveler?')) return

    try {
      const response = await api.delete(`/travelers/${travelerId}`)
      if (response.success) {
        toast.success('Traveler deleted successfully')
        fetchTravelers()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete traveler')
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

      {/* Search and Filter */}
      <div className="flex gap-4">
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
      </div>

      {/* Travelers List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : groupedTravelers.length > 0 ? (
        <div className="space-y-4">
          {groupedTravelers.map((group) => (
            <div key={group.clientId} className="bg-card border border-border rounded-lg overflow-hidden">
              {/* Client Header */}
              <button
                onClick={() => toggleClientCollapse(group.clientId)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
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
              
              {/* Travelers Grid */}
              {!collapsedClients.has(group.clientId) && (
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.travelers.map((traveler) => (
                      <div
                        key={traveler._id}
                        className="bg-background border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
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
    </div>
  )
}

export default Travelers

