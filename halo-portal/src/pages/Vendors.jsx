import { useState, useEffect } from 'react'
import { Search, Filter, Plus, Star, MapPin, Mail, Phone, Eye, Edit, X, Clock } from 'lucide-react'
import { vendorService } from '../services/vendorService'
import toast from 'react-hot-toast'
import VendorFormModal from '../components/VendorFormModal'
import VendorDetailsModal from '../components/VendorDetailsModal'
import Dropdown from '../components/Dropdown'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

const Vendors = () => {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalVendors: 0,
    activeVendors: 0,
    totalTransfers: 0,
    averageRating: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [cityFilter, setCityFilter] = useState('all')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [vendorTransfers, setVendorTransfers] = useState({}) // Map of vendorId -> transfer count
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchVendors()
    fetchVendorStats()
  }, [statusFilter])

  // Fetch transfer counts for each vendor
  useEffect(() => {
    if (vendors.length > 0) {
      fetchVendorTransferCounts()
    }
  }, [vendors])

  const fetchVendors = async () => {
    try {
      setLoading(true)
      const params = {}
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }
      if (searchTerm) {
        params.search = searchTerm
      }
      
      const response = await vendorService.getAllVendors(params)
      if (response && response.success) {
        setVendors(response.vendors || [])
      } else {
        throw new Error(response?.message || 'Failed to fetch vendors')
      }
    } catch (error) {
      console.error('Error fetching vendors:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to load vendors')
      setVendors([])
    } finally {
      setLoading(false)
    }
  }

  const fetchVendorStats = async () => {
    try {
      setStatsLoading(true)
      const response = await vendorService.getVendorStats()
      if (response && response.success && response.stats) {
        setStats({
          totalVendors: response.stats.totalVendors || 0,
          activeVendors: response.stats.activeVendors || 0,
          totalTransfers: response.stats.totalTransfers || response.stats.totalBookings || 0,
          averageRating: response.stats.averageRating || 0
        })
      } else {
        // Fallback: use vendors data if available
        if (vendors.length > 0) {
          calculateStatsFromVendors()
        }
      }
    } catch (error) {
      console.error('Error fetching vendor stats:', error)
      // Fallback: use vendors data if available
      if (vendors.length > 0) {
        calculateStatsFromVendors()
      }
    } finally {
      setStatsLoading(false)
    }
  }

  const calculateStatsFromVendors = () => {
    if (vendors.length === 0) return
    
    const activeCount = vendors.filter(v => (v.status || '').toLowerCase() === 'active').length
    const totalBookings = vendors.reduce((sum, v) => {
      return sum + (Number(v.performance?.totalBookings) || Number(v.total_transfers) || 0)
    }, 0)
    
    const ratings = vendors
      .map(v => Number(v.performance?.rating) || Number(v.rating) || 0)
      .filter(r => r > 0)
    
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0
    
    setStats({
      totalVendors: vendors.length,
      activeVendors: activeCount,
      totalTransfers: totalBookings,
      averageRating: Number(avgRating.toFixed(1))
    })
  }

  // Recalculate stats when vendors change (as fallback if API stats not available)
  useEffect(() => {
    if (vendors.length > 0 && !statsLoading && stats.totalVendors === 0) {
      calculateStatsFromVendors()
    }
  }, [vendors.length, statsLoading])

  const fetchVendorTransferCounts = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };

      // Fetch transfer counts for all vendors
      const transferCounts = {};
      
      for (const vendor of vendors) {
        const vendorId = vendor.vendorId || vendor._id;
        if (vendorId) {
          try {
            const response = await fetch(
              `${API_BASE_URL}/vendors/${vendorId}/transfers?limit=1`,
              { headers }
            ).then(res => res.json());
            
            if (response && response.pagination) {
              transferCounts[vendorId] = response.pagination.total || 0;
            } else {
              // Fallback to performance data
              transferCounts[vendorId] = vendor.performance?.totalBookings || 0;
            }
          } catch (err) {
            // Fallback to performance data
            transferCounts[vendorId] = vendor.performance?.totalBookings || 0;
          }
        }
      }
      
      setVendorTransfers(transferCounts);
    } catch (error) {
      console.error('Error fetching vendor transfer counts:', error);
    }
  }

  const filteredVendors = vendors.filter(vendor => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const addr = vendor.businessDetails?.address;
      const addressStr = typeof addr === 'string' 
        ? addr 
        : (addr && typeof addr === 'object' 
          ? [addr.street, addr.city, addr.state].filter(Boolean).join(' ') 
          : '');
      
      const matchesSearch = (
        vendor.companyName?.toLowerCase().includes(search) ||
        vendor.vendorId?.toLowerCase().includes(search) ||
        vendor.contactPerson?.firstName?.toLowerCase().includes(search) ||
        vendor.contactPerson?.lastName?.toLowerCase().includes(search) ||
        vendor.contactPerson?.email?.toLowerCase().includes(search) ||
        addressStr.toLowerCase().includes(search)
      )
      if (!matchesSearch) return false
    }

    // Status filter
    if (statusFilter !== 'all') {
      if ((vendor.status || '').toLowerCase() !== statusFilter.toLowerCase()) {
        return false
      }
    }

    // City filter
    if (cityFilter !== 'all') {
      const vendorCity = vendor.businessDetails?.address?.city || ''
      if (vendorCity.toLowerCase() !== cityFilter.toLowerCase()) {
        return false
      }
    }

    // Rating filter
    if (ratingFilter !== 'all') {
      const rating = Number(vendor.performance?.rating || vendor.rating || 0)
      const filterRating = Number(ratingFilter)
      if (rating < filterRating) {
        return false
      }
    }

    return true
  })

  // Get unique cities for filter
  const uniqueCities = [...new Set(
    vendors
      .map(v => v.businessDetails?.address?.city)
      .filter(Boolean)
  )].sort()

  const renderStars = (rating) => {
    if (!rating || isNaN(rating) || rating < 0) return null
    
    const stars = []
    const numRating = Number(rating)
    const fullStars = Math.floor(numRating)
    const hasHalfStar = numRating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} size={16} className="text-warning-500 fill-warning-500" />)
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" size={16} className="text-warning-500 fill-warning-500 opacity-50" />)
    }

    const emptyStars = Math.max(0, 5 - Math.ceil(numRating))
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} size={16} className="text-muted-foreground" />)
    }

    return stars
  }

  const handleAddVendor = () => {
    setSelectedVendor(null)
    setShowAddModal(true)
  }

  const handleEditVendor = (vendor) => {
    setSelectedVendor(vendor)
    setShowEditModal(true)
  }

  const handleViewVendor = async (vendor) => {
    try {
      // Fetch full vendor details if only partial data is available
      const vendorId = vendor._id || vendor.id
      if (vendorId) {
        const response = await vendorService.getVendor(vendorId)
        if (response && response.success) {
          setSelectedVendor(response.vendor)
        } else {
          setSelectedVendor(vendor)
        }
      } else {
        setSelectedVendor(vendor)
      }
      setShowViewModal(true)
    } catch (error) {
      console.error('Error fetching vendor details:', error)
      setSelectedVendor(vendor)
      setShowViewModal(true)
    }
  }

  const handleModalSuccess = () => {
    fetchVendors()
    fetchVendorStats()
  }

  const handleCloseModals = () => {
    setShowAddModal(false)
    setShowEditModal(false)
    setShowViewModal(false)
    setSelectedVendor(null)
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground m-0">
          Vendors
        </h1>
        <p className="text-muted-foreground mt-2 mb-0">
          Manage transfer service partners
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <h3 className="text-muted-foreground text-sm mb-2">Active Vendors</h3>
          {statsLoading ? (
            <div className="text-3xl font-bold text-foreground">...</div>
          ) : (
            <>
              <div className="text-3xl font-bold text-foreground">{stats.activeVendors}</div>
              <div className="text-success-600 dark:text-success-500 text-sm">Total: {stats.totalVendors}</div>
            </>
          )}
        </div>
        
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <h3 className="text-muted-foreground text-sm mb-2">Total Transfers</h3>
          {statsLoading ? (
            <div className="text-3xl font-bold text-foreground">...</div>
          ) : (
            <>
              <div className="text-3xl font-bold text-foreground">{stats.totalTransfers.toLocaleString()}</div>
              <div className="text-success-600 dark:text-success-500 text-sm">Across all vendors</div>
            </>
          )}
        </div>
        
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <h3 className="text-muted-foreground text-sm mb-2">Average Rating</h3>
          {statsLoading ? (
            <div className="text-3xl font-bold text-foreground">...</div>
          ) : (
            <>
              <div className="text-3xl font-bold text-foreground">{stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}</div>
              <div className="text-success-600 dark:text-success-500 text-sm">Based on {stats.activeVendors} active vendors</div>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-card p-6 rounded-xl shadow-sm border border-border mb-6">
        <div className={`flex gap-4 items-center flex-wrap ${showFilters ? 'mb-4' : ''}`}>
          <div className="relative flex-1 min-w-[300px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search vendors..."
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
          
          <button 
            onClick={handleAddVendor}
            className="flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground border-none rounded-lg text-sm font-medium cursor-pointer hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} />
            Add Vendor
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="p-4 bg-muted/30 rounded-lg border border-border flex gap-4 flex-wrap items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">Status:</label>
              <Dropdown
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'pending_approval', label: 'Pending' },
                  { value: 'suspended', label: 'Suspended' }
                ]}
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">City:</label>
              <Dropdown
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Cities' },
                  ...uniqueCities.map(city => ({
                    value: city,
                    label: city
                  }))
                ]}
                minWidth="150px"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">Rating:</label>
              <Dropdown
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Ratings' },
                  { value: '4', label: '4+ Stars' },
                  { value: '4.5', label: '4.5+ Stars' },
                  { value: '5', label: '5 Stars' }
                ]}
              />
            </div>

            {(statusFilter !== 'all' || cityFilter !== 'all' || ratingFilter !== 'all') && (
              <button
                onClick={() => {
                  setStatusFilter('all')
                  setCityFilter('all')
                  setRatingFilter('all')
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

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="bg-card p-6 rounded-xl shadow-sm border border-border">
              <div className="h-5 bg-muted rounded mb-4"></div>
              <div className="h-4 bg-muted rounded mb-2 w-3/5"></div>
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-4 bg-muted rounded w-2/5"></div>
            </div>
          ))
        ) : filteredVendors.length > 0 ? (
          filteredVendors.map((vendor, index) => (
            <div key={vendor._id || vendor.id || vendor.vendorId || `vendor-${index}`} className="bg-card p-6 rounded-xl shadow-sm border border-border">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground m-0 mb-1">
                    {vendor.companyName || vendor.name || 'Unknown Vendor'}
                  </h3>
                  <div className="flex items-center gap-1 mb-2">
                    <span className={`bg-success-50 dark:bg-success-950 text-success-600 dark:text-success-500 px-2 py-0.5 rounded text-xs font-medium capitalize border border-success-200 dark:border-success-800`}>
                      {vendor.status || 'pending'}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {renderStars(vendor.performance?.rating || vendor.rating || 0)}
                      <span className="text-sm font-medium text-foreground ml-1">
                        {(() => {
                          const rating = vendor.performance?.rating || vendor.rating || 0;
                          return (rating > 0 && !isNaN(rating)) ? Number(rating).toFixed(1) : 'N/A';
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleViewVendor(vendor)}
                    className="p-2 bg-transparent border border-input rounded-md cursor-pointer flex items-center justify-center hover:bg-accent transition-colors"
                  >
                    <Eye size={16} className="text-muted-foreground" />
                  </button>
                  <button 
                    onClick={() => handleEditVendor(vendor)}
                    className="p-2 bg-transparent border border-input rounded-md cursor-pointer flex items-center justify-center hover:bg-accent transition-colors"
                  >
                    <Edit size={16} className="text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Mail size={14} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{vendor.contactPerson?.email || vendor.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Phone size={14} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{vendor.contactPerson?.phone || vendor.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {(() => {
                      const addr = vendor.businessDetails?.address;
                      if (typeof addr === 'string') return addr;
                      if (addr && typeof addr === 'object') {
                        return [addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ') || addr.country || 'N/A';
                      }
                      return vendor.location || 'N/A';
                    })()}
                  </span>
                </div>
              </div>

              <div className="bg-muted/30 p-4 rounded-lg mb-4">
                <div className="text-sm font-medium text-foreground mb-3">
                  Performance
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <span className="text-muted-foreground">Total Bookings:</span>
                    <span className="font-medium text-foreground ml-1">
                      {Number(vendor.performance?.totalBookings || vendor.total_transfers || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Completed:</span>
                    <span className="font-medium text-foreground ml-1">
                      {Number(vendor.performance?.completedBookings || vendor.completed_transfers || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cancelled:</span>
                    <span className="font-medium text-destructive ml-1">
                      {Number(vendor.performance?.cancelledBookings || vendor.cancelled_transfers || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Assigned:</span>
                    <span 
                      onClick={() => navigate(`/transfers?vendor=${vendor.vendorId || vendor._id}`)}
                      className="font-medium text-primary ml-1 cursor-pointer underline hover:text-primary/80"
                    >
                      {vendorTransfers[vendor.vendorId || vendor._id] || vendor.performance?.totalBookings || 0}
                    </span>
                  </div>
                </div>
                {vendor.performance?.lastActive && (
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground/70 mt-2 pt-2 border-t border-border">
                    <Clock size={12} />
                    <span>Last Active: {new Date(vendor.performance.lastActive).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => handleViewVendor(vendor)}
                  className="flex-1 px-4 py-2 bg-transparent border border-input rounded-md text-sm font-medium text-foreground cursor-pointer hover:bg-accent transition-colors"
                >
                  View Details
                </button>
                <button 
                  onClick={() => handleEditVendor(vendor)}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground border-none rounded-md text-sm font-medium cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center p-12 text-muted-foreground">
            <div className="text-base mb-2">
              No vendors found
            </div>
            <div className="text-sm text-muted-foreground/70">
              Try adjusting your search criteria
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <VendorFormModal
          vendor={null}
          onClose={handleCloseModals}
          onSuccess={handleModalSuccess}
        />
      )}

      {showEditModal && selectedVendor && (
        <VendorFormModal
          vendor={selectedVendor}
          onClose={handleCloseModals}
          onSuccess={handleModalSuccess}
        />
      )}

      {showViewModal && selectedVendor && (
        <VendorDetailsModal
          vendor={selectedVendor}
          onClose={handleCloseModals}
        />
      )}
    </div>
  )
}

export default Vendors