import { useState, useEffect } from 'react'
import { Search, Plus, Edit, Trash2, User, Building, Users, Shield, Info, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import Drawer from '../components/Drawer'
import Dropdown from '../components/Dropdown'

const UserManagement = () => {
  const { user: currentUser } = useAuth()
  const api = useApi()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showPhoneTooltip, setShowPhoneTooltip] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'VENDOR',
    firstName: '',
    lastName: '',
    phone: '',
    companyName: ''
  })
  const [vendors, setVendors] = useState([])
  const [clientTravelers, setClientTravelers] = useState({}) // Map of clientId -> travelers array
  const [vendorDrivers, setVendorDrivers] = useState({}) // Map of vendorId -> drivers array
  const [showAssignedModal, setShowAssignedModal] = useState(false)
  const [assignedModalData, setAssignedModalData] = useState({ type: null, userId: null, title: '' })

  useEffect(() => {
    if (currentUser && (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN')) {
      fetchUsers()
      fetchVendors()
    }
  }, [currentUser])

  useEffect(() => {
    if (users.length > 0) {
      // Fetch all travelers and drivers once, then filter client-side
      fetchClientTravelers()
      fetchVendorDrivers()
    }
  }, [users])


  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/users')
      if (response.success) {
        setUsers(response.data || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const fetchVendors = async () => {
    try {
      const response = await api.get('/users/vendors')
      if (response.success) {
        setVendors(response.data || [])
      }
    } catch (error) {
      console.error('Error fetching vendors:', error)
    }
  }

  const fetchClientTravelers = async () => {
    try {
      // Fetch all travelers once
      const response = await api.get('/travelers')
      if (response.success) {
        const allTravelers = response.data || []
        const travelersMap = {}
        
        // Group travelers by client (createdBy)
        allTravelers.forEach(traveler => {
          const createdById = traveler.createdBy?._id || traveler.createdBy
          if (createdById) {
            const clientId = createdById.toString()
            if (!travelersMap[clientId]) {
              travelersMap[clientId] = []
            }
            travelersMap[clientId].push(traveler)
          }
        })
        
        setClientTravelers(travelersMap)
      }
    } catch (error) {
      console.error('Error fetching travelers:', error)
      setClientTravelers({})
    }
  }

  const fetchVendorDrivers = async () => {
    try {
      // Fetch all drivers once
      const response = await api.get('/drivers')
      if (response.success) {
        const allDrivers = response.data || []
        const driversMap = {}
        
        // Group drivers by vendor (vendorId or createdBy)
        allDrivers.forEach(driver => {
          const vendorId = driver.vendorId?._id || driver.vendorId || driver.createdBy?._id || driver.createdBy
          if (vendorId) {
            const vendorIdStr = vendorId.toString()
            if (!driversMap[vendorIdStr]) {
              driversMap[vendorIdStr] = []
            }
            driversMap[vendorIdStr].push(driver)
          }
        })
        
        setVendorDrivers(driversMap)
      }
    } catch (error) {
      console.error('Error fetching drivers:', error)
      setVendorDrivers({})
    }
  }


  const handleCreateUser = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        profile: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone
        }
      }

      if (formData.role === 'VENDOR' && formData.companyName) {
        payload.vendorDetails = {
          companyName: formData.companyName
        }
      }

      const response = await api.post('/users', payload)
      if (response.success) {
        toast.success(`${formData.role} account created successfully`)
        setShowForm(false)
        setSelectedUser(null)
        resetForm()
        fetchUsers()
        fetchVendors()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to create user')
    }
  }

  const handleEditUser = async (e) => {
    e.preventDefault()
    if (!selectedUser) return

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

      // Only include password if provided
      if (formData.password && formData.password.trim() !== '') {
        payload.password = formData.password
      }

      if (selectedUser.role === 'VENDOR' && formData.companyName) {
        payload.vendorDetails = {
          companyName: formData.companyName
        }
      }

      const response = await api.put(`/users/${selectedUser._id}`, payload)
      if (response.success) {
        toast.success('User updated successfully')
        setShowForm(false)
        setSelectedUser(null)
        resetForm()
        fetchUsers()
        fetchVendors()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to update user')
    }
  }

  const handleEditClick = (user) => {
    setSelectedUser(user)
    setFormData({
      username: user.username || '',
      email: user.email || '',
      password: '',
      role: user.role,
      firstName: user.profile?.firstName || '',
      lastName: user.profile?.lastName || '',
      phone: user.profile?.phone || '',
      companyName: user.vendorDetails?.companyName || ''
    })
    setShowForm(true)
  }

  const handleDeleteClick = (user) => {
    setUserToDelete(user)
    setShowDeleteConfirm(true)
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return

    try {
      const response = await api.delete(`/users/${userToDelete._id}`)
      if (response.success) {
        toast.success('User deleted successfully')
        setShowDeleteConfirm(false)
        setUserToDelete(null)
        fetchUsers()
        fetchVendors()
        fetchClients()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to delete user')
    }
  }


  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'VENDOR',
      firstName: '',
      lastName: '',
      phone: '',
      companyName: ''
    })
    setSelectedUser(null)
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.profile?.firstName} ${user.profile?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    
    return matchesSearch && matchesRole
  })

  const canDelete = (user) => {
    if (user.isProtected) return false
    if (user.role === 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') return false
    return true
  }

  if (!currentUser || (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN')) {
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">User Management</h1>
            <p className="text-gray-500 dark:text-gray-400 text-base">Manage vendors, clients, and admins</p>
          </div>
          <button
            onClick={() => {
              setSelectedUser(null)
              resetForm()
              setShowForm(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus size={20} />
            Create User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Dropdown
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Roles' },
            { value: 'SUPER_ADMIN', label: 'Super Admin' },
            { value: 'ADMIN', label: 'Admin' },
            { value: 'VENDOR', label: 'Vendor' },
            { value: 'CLIENT', label: 'Client' }
          ]}
          placeholder="All Roles"
          minWidth="150px"
        />
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filteredUsers.length > 0 ? (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">User</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Role</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Assigned</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id} className="border-b border-border hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        {user.role === 'VENDOR' ? <Building size={16} className="text-primary" /> :
                         user.role === 'CLIENT' ? <Users size={16} className="text-primary" /> :
                         <Shield size={16} className="text-primary" />}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {user.profile?.firstName} {user.profile?.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.role === 'SUPER_ADMIN' ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' :
                      user.role === 'ADMIN' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                      user.role === 'VENDOR' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                      'bg-orange-500/20 text-orange-600 dark:text-orange-400'
                    }`}>
                      {user.role}
                    </span>
                    {user.isProtected && (
                      <span className="ml-2 text-xs text-muted-foreground">(Protected)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    {user.role === 'VENDOR' && (
                      <div className="space-y-1">
                        {vendorDrivers[user._id]?.length > 0 && (
                          <div 
                            className="text-xs text-muted-foreground cursor-pointer relative"
                            onClick={(e) => {
                              e.stopPropagation()
                              setAssignedModalData({
                                type: 'drivers',
                                userId: user._id,
                                title: `Drivers for ${user.profile?.firstName} ${user.profile?.lastName}`
                              })
                              setShowAssignedModal(true)
                            }}
                          >
                            <span className="font-medium text-foreground hover:text-primary transition-colors">{vendorDrivers[user._id].length}</span> driver{vendorDrivers[user._id].length > 1 ? 's' : ''}
                          </div>
                        )}
                        {user.assignedClients?.length > 0 && (
                          <div 
                            className="text-xs text-muted-foreground cursor-pointer relative"
                            onClick={(e) => {
                              e.stopPropagation()
                              setAssignedModalData({
                                type: 'clients',
                                userId: user._id,
                                title: `Assigned Clients for ${user.profile?.firstName} ${user.profile?.lastName}`
                              })
                              setShowAssignedModal(true)
                            }}
                          >
                            <span className="font-medium text-foreground hover:text-primary transition-colors">{user.assignedClients.length}</span> client{user.assignedClients.length > 1 ? 's' : ''}
                          </div>
                        )}
                        {(!vendorDrivers[user._id] || vendorDrivers[user._id].length === 0) && (!user.assignedClients || user.assignedClients.length === 0) && (
                          <div className="text-xs text-muted-foreground">-</div>
                        )}
                      </div>
                    )}
                    {user.role === 'CLIENT' && (
                      <div className="space-y-1">
                        {clientTravelers[user._id]?.length > 0 && (
                          <div 
                            className="text-xs text-muted-foreground cursor-pointer relative"
                            onClick={(e) => {
                              e.stopPropagation()
                              setAssignedModalData({
                                type: 'travelers',
                                userId: user._id,
                                title: `Travelers for ${user.profile?.firstName} ${user.profile?.lastName}`
                              })
                              setShowAssignedModal(true)
                            }}
                          >
                            <span className="font-medium text-foreground hover:text-primary transition-colors">{clientTravelers[user._id].length}</span> traveler{clientTravelers[user._id].length > 1 ? 's' : ''}
                          </div>
                        )}
                        {user.assignedVendors?.length > 0 && (
                          <div 
                            className="text-xs text-muted-foreground cursor-pointer relative"
                            onClick={(e) => {
                              e.stopPropagation()
                              setAssignedModalData({
                                type: 'vendors',
                                userId: user._id,
                                title: `Assigned Vendors for ${user.profile?.firstName} ${user.profile?.lastName}`
                              })
                              setShowAssignedModal(true)
                            }}
                          >
                            <span className="font-medium text-foreground hover:text-primary transition-colors">{user.assignedVendors.length}</span> vendor{user.assignedVendors.length > 1 ? 's' : ''}
                          </div>
                        )}
                        {(!clientTravelers[user._id] || clientTravelers[user._id].length === 0) && (!user.assignedVendors || user.assignedVendors.length === 0) && (
                          <div className="text-xs text-muted-foreground">-</div>
                        )}
                      </div>
                    )}
                    {user.role !== 'VENDOR' && user.role !== 'CLIENT' && (
                      <div className="text-xs text-muted-foreground">-</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditClick(user)}
                        className="p-2 text-primary hover:bg-primary/10 rounded transition-colors"
                        title="Edit User"
                      >
                        <Edit size={16} />
                      </button>
                      {canDelete(user) && (
                        <button
                          onClick={() => handleDeleteClick(user)}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
                          title="Delete User"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-base mb-2">No users found</div>
          <div className="text-sm text-muted-foreground/70">Try adjusting your search or filters</div>
        </div>
      )}

      {/* Create/Edit User Drawer */}
      <Drawer
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setSelectedUser(null)
          resetForm()
        }}
        title={selectedUser ? 'Edit User' : 'Create User'}
        subtitle={selectedUser ? 'Update user information' : 'Add a new vendor or client account'}
        position="right"
        size="md"
      >
        <div className="flex flex-col h-full">
          <form onSubmit={selectedUser ? handleEditUser : handleCreateUser} className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4 space-y-4">
              {!selectedUser && (
                <div>
                  <Dropdown
                    label="Role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    options={[
                      ...(currentUser?.role === 'SUPER_ADMIN' 
                        ? [{ value: 'ADMIN', label: 'Admin' }]
                        : []),
                      { value: 'VENDOR', label: 'Vendor' },
                      { value: 'CLIENT', label: 'Client' }
                    ]}
                    placeholder="Select role"
                    minWidth="100%"
                  />
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
                  Password {selectedUser && '(leave blank to keep current)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  required={!selectedUser}
                  minLength={selectedUser ? 0 : 6}
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

              {(formData.role === 'VENDOR' || selectedUser?.role === 'VENDOR') && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Company Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}
            </div>

            {/* Buttons - Fixed at bottom */}
            <div className="flex-shrink-0 border-t border-border bg-muted/30 backdrop-blur-sm">
              <div className="flex gap-3 px-6 py-5">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setSelectedUser(null)
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
                  {selectedUser ? 'Update User' : 'Create User'}
                </button>
              </div>
              </div>
            </form>
        </div>
      </Drawer>

      {/* Assigned Items Modal */}
      {showAssignedModal && assignedModalData.type && assignedModalData.userId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">
                {assignedModalData.title}
              </h2>
              <button
                onClick={() => {
                  setShowAssignedModal(false)
                  setAssignedModalData({ type: null, userId: null, title: '' })
                }}
                className="p-2 hover:bg-muted rounded transition-colors"
              >
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-3">
                {assignedModalData.type === 'drivers' && (
                  vendorDrivers[assignedModalData.userId]?.length > 0 ? (
                    vendorDrivers[assignedModalData.userId].map((driver, idx) => (
                      <div key={driver._id || idx} className="p-4 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User size={20} className="text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-foreground">
                              {driver.profile?.firstName} {driver.profile?.lastName}
                            </div>
                            {driver.email && (
                              <div className="text-sm text-muted-foreground mt-1">{driver.email}</div>
                            )}
                            {driver.driverDetails?.vehicleType && (
                              <div className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                                <span className="font-medium">Vehicle:</span>
                                <span>{driver.driverDetails.vehicleType}</span>
                                {driver.driverDetails.vehicleNumber && (
                                  <>
                                    <span>•</span>
                                    <span>{driver.driverDetails.vehicleNumber}</span>
                                  </>
                                )}
                              </div>
                            )}
                            {driver.profile?.phone && (
                              <div className="text-sm text-muted-foreground mt-1">
                                Phone: {driver.profile.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No drivers found</div>
                  )
                )}

                {assignedModalData.type === 'travelers' && (
                  clientTravelers[assignedModalData.userId]?.length > 0 ? (
                    clientTravelers[assignedModalData.userId].map((traveler, idx) => (
                      <div key={traveler._id || idx} className="p-4 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User size={20} className="text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-foreground">
                              {traveler.profile?.firstName} {traveler.profile?.lastName}
                            </div>
                            {traveler.email && (
                              <div className="text-sm text-muted-foreground mt-1">{traveler.email}</div>
                            )}
                            {traveler.profile?.phone && (
                              <div className="text-sm text-muted-foreground mt-1">
                                Phone: {traveler.profile.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No travelers found</div>
                  )
                )}

                {assignedModalData.type === 'clients' && (
                  users.find(u => u._id === assignedModalData.userId)?.assignedClients?.length > 0 ? (
                    users.find(u => u._id === assignedModalData.userId)?.assignedClients.map((client, idx) => (
                      <div key={client._id || client || idx} className="p-4 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Users size={20} className="text-primary" />
                          </div>
                          <div className="flex-1">
                            {typeof client === 'object' && client.profile ? (
                              <>
                                <div className="font-semibold text-foreground">
                                  {client.profile.firstName} {client.profile.lastName}
                                </div>
                                {client.email && (
                                  <div className="text-sm text-muted-foreground mt-1">{client.email}</div>
                                )}
                              </>
                            ) : (
                              <div className="text-sm text-muted-foreground">Client ID: {client}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No assigned clients found</div>
                  )
                )}

                {assignedModalData.type === 'vendors' && (
                  users.find(u => u._id === assignedModalData.userId)?.assignedVendors?.length > 0 ? (
                    users.find(u => u._id === assignedModalData.userId)?.assignedVendors.map((vendor, idx) => (
                      <div key={vendor._id || vendor || idx} className="p-4 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Building size={20} className="text-primary" />
                          </div>
                          <div className="flex-1">
                            {typeof vendor === 'object' && vendor.profile ? (
                              <>
                                <div className="font-semibold text-foreground">
                                  {vendor.profile.firstName} {vendor.profile.lastName}
                                </div>
                                {vendor.email && (
                                  <div className="text-sm text-muted-foreground mt-1">{vendor.email}</div>
                                )}
                                {vendor.vendorDetails?.companyName && (
                                  <div className="text-sm text-muted-foreground mt-1">
                                    Company: {vendor.vendorDetails.companyName}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-sm text-muted-foreground">Vendor ID: {vendor}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No assigned vendors found</div>
                  )
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-muted/30">
              <button
                onClick={() => {
                  setShowAssignedModal(false)
                  setAssignedModalData({ type: null, userId: null, title: '' })
                }}
                className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <Trash2 size={24} className="text-destructive" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground mb-2">Delete User</h2>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete this user? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {userToDelete.role === 'VENDOR' ? <Building size={18} className="text-primary" /> :
                   userToDelete.role === 'CLIENT' ? <Users size={18} className="text-primary" /> :
                   <Shield size={18} className="text-primary" />}
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    {userToDelete.profile?.firstName} {userToDelete.profile?.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground">{userToDelete.email}</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setUserToDelete(null)
                }}
                className="flex-1 px-4 py-2.5 bg-background border-2 border-border rounded-lg text-foreground font-semibold hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="flex-1 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg font-semibold hover:bg-destructive/90 transition-all shadow-lg"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default UserManagement

