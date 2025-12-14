import { useState, useEffect } from 'react'
import { Search, Plus, Edit, Trash2, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import Drawer from '../components/Drawer'

const Travelers = () => {
  const { user: currentUser } = useAuth()
  const api = useApi()
  const [travelers, setTravelers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedTraveler, setSelectedTraveler] = useState(null)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: ''
  })

  useEffect(() => {
    if (currentUser && currentUser.role === 'CLIENT') {
      fetchTravelers()
    }
  }, [currentUser])

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
      phone: ''
    })
    setSelectedTraveler(null)
  }

  const filteredTravelers = travelers.filter(traveler =>
    traveler.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    traveler.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${traveler.profile?.firstName} ${traveler.profile?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!currentUser || currentUser.role !== 'CLIENT') {
    return (
      <div className="p-8 text-center">
        <div className="text-lg font-semibold text-foreground mb-2">Access Denied</div>
        <div className="text-sm text-muted-foreground">You don't have permission to access this page.</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Travelers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your travelers</p>
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
        <input
          type="text"
          placeholder="Search travelers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Travelers List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filteredTravelers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTravelers.map((traveler) => (
            <div
              key={traveler._id}
              className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
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
              {traveler.profile?.phone && (
                <div className="text-sm text-muted-foreground">
                  Phone: {traveler.profile.phone}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-base mb-2">No travelers found</div>
          <div className="text-sm text-muted-foreground/70">
            {searchTerm ? 'Try adjusting your search' : 'Add your first traveler to get started'}
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
                <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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

