import { useState, useEffect } from 'react'
import { Search, Plus, Edit, Trash2, Car, Users, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import Drawer from '../components/Drawer'

const Drivers = () => {
  const { user: currentUser } = useAuth()
  const api = useApi()
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [assignedClients, setAssignedClients] = useState({})
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
    experience: ''
  })

  useEffect(() => {
    if (currentUser && (currentUser.role === 'VENDOR' || currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN')) {
      fetchDrivers()
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

  const handleDeleteDriver = async (driverId) => {
    if (!window.confirm('Are you sure you want to delete this driver?')) return

    try {
      const response = await api.delete(`/drivers/${driverId}`)
      if (response.success) {
        toast.success('Driver deleted successfully')
        fetchDrivers()
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
      experience: ''
    })
    setSelectedDriver(null)
  }

  const filteredDrivers = drivers.filter(driver =>
    driver.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${driver.profile?.firstName} ${driver.profile?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!currentUser || !['VENDOR', 'SUPER_ADMIN', 'ADMIN'].includes(currentUser.role)) {
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
          <h1 className="text-2xl font-bold text-foreground">Drivers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your drivers</p>
        </div>
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
        <input
          type="text"
          placeholder="Search drivers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Drivers List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filteredDrivers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrivers.map((driver) => (
            <div
              key={driver._id}
              className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Car size={20} className="text-primary" />
                  </div>
                  <div>
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

              {/* Show vendor info for admins */}
              {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') && (driver.vendorId || driver.createdBy) && (
                <div className="mb-2 pb-2 border-b border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Building2 size={14} />
                    <span>
                      Vendor: {(() => {
                        // Check vendorId first (populated vendor object)
                        const vendor = driver.vendorId || driver.createdBy;
                        if (!vendor) return 'Unknown';
                        if (typeof vendor === 'object') {
                          // Try different possible fields
                          return vendor.vendorDetails?.companyName || 
                                 vendor.companyName || 
                                 (vendor.profile?.firstName && vendor.profile?.lastName 
                                   ? `${vendor.profile.firstName} ${vendor.profile.lastName}` 
                                   : vendor.username || vendor.email || 'Unknown');
                        }
                        return 'Unknown';
                      })()}
                    </span>
                  </div>
                </div>
              )}

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
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-base mb-2">No drivers found</div>
          <div className="text-sm text-muted-foreground/70">
            {searchTerm ? 'Try adjusting your search' : 'Add your first driver to get started'}
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
    </div>
  )
}

export default Drivers

