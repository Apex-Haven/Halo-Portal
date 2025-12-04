import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, User, Mail, Phone, MapPin, Calendar, Filter, Plane, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import Dropdown from './Dropdown';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import Drawer from './Drawer';

const CustomerManagement = () => {
  const { isDark } = useTheme();
  const [customers, setCustomers] = useState([]);
  const [customerTransfers, setCustomerTransfers] = useState({}); // Map customerId -> latest transfer
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    profile: {
      firstName: '',
      lastName: '',
      phone: ''
    },
    preferences: {
      notifications: {
        email: true,
        sms: true,
        whatsapp: true,
        push: true
      },
      language: 'en',
      timezone: 'Asia/Kolkata'
    }
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (customers.length > 0) {
      fetchCustomerTransfers();
    }
  }, [customers]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/users/customers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      } else {
        throw new Error('Failed to fetch customers');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerTransfers = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };

      // Fetch transfers for all customers
      const transfersMap = {};
      
      // Get all transfers and map them to customers
      try {
        const transfersResponse = await fetch(`${API_BASE_URL}/transfers?limit=1000`, { headers });
        const transfersData = await transfersResponse.json();
        
        if (transfersData.success && transfersData.data) {
          transfersData.data.forEach(transfer => {
            const customerId = transfer.customer_id || transfer.customer_details?.email;
            if (customerId && (!transfersMap[customerId] || 
                new Date(transfer.flight_details?.arrival_time || transfer.flight_details?.scheduled_arrival) > 
                new Date(transfersMap[customerId]?.flight_details?.arrival_time || 0))) {
              transfersMap[customerId] = transfer;
            }
          });
        }
      } catch (err) {
        console.error('Error fetching transfers:', err);
      }
      
      setCustomerTransfers(transfersMap);
    } catch (error) {
      console.error('Error fetching customer transfers:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const url = editingCustomer 
        ? `http://localhost:7007/api/users/${editingCustomer._id}`
        : 'http://localhost:7007/api/users';
      
      const method = editingCustomer ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          role: 'TRAVELER'
        })
      });

      if (response.ok) {
        toast.success(editingCustomer ? 'Customer updated successfully!' : 'Customer created successfully!');
        setShowForm(false);
        setEditingCustomer(null);
        resetForm();
        fetchCustomers();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save customer');
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error(error.message || 'Failed to save customer');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      username: customer.username,
      email: customer.email,
      password: '', // Don't pre-fill password
      profile: {
        firstName: customer.profile?.firstName || '',
        lastName: customer.profile?.lastName || '',
        phone: customer.profile?.phone || ''
      },
      preferences: {
        notifications: {
          email: customer.preferences?.notifications?.email ?? true,
          sms: customer.preferences?.notifications?.sms ?? true,
          whatsapp: customer.preferences?.notifications?.whatsapp ?? true,
          push: customer.preferences?.notifications?.push ?? true
        },
        language: customer.preferences?.language || 'en',
        timezone: customer.preferences?.timezone || 'Asia/Kolkata'
      }
    });
    setShowForm(true);
  };

  const handleDelete = async (customerId) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:7007/api/users/${customerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Customer deleted successfully!');
        fetchCustomers();
      } else {
        throw new Error('Failed to delete customer');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      profile: {
        firstName: '',
        lastName: '',
        phone: ''
      },
      preferences: {
        notifications: {
          email: true,
          sms: true,
          whatsapp: true,
          push: true
        },
        language: 'en',
        timezone: 'Asia/Kolkata'
      }
    });
  };

  const filteredCustomers = customers.filter(customer => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        customer.username.toLowerCase().includes(search) ||
        customer.email.toLowerCase().includes(search) ||
        `${customer.profile?.firstName} ${customer.profile?.lastName}`.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }
    
    // Role filter
    if (filterRole !== 'all' && customer.role !== filterRole) {
      return false;
    }

    // Get customer's latest transfer
    const transfer = customerTransfers[customer.email] || customerTransfers[customer._id];
    
    // City filter (from transfer drop location)
    if (cityFilter !== 'all' && transfer) {
      const dropCity = transfer.transfer_details?.drop_location?.toLowerCase() || '';
      if (!dropCity.includes(cityFilter.toLowerCase())) {
        return false;
      }
    }

    // Vendor filter
    if (vendorFilter !== 'all' && transfer) {
      const vendorId = transfer.vendor_details?.vendor_id || transfer.vendor_id;
      if (vendorId !== vendorFilter) {
        return false;
      }
    }

    // Date filter
    if (dateFilter !== 'all' && transfer) {
      const flightDate = new Date(transfer.flight_details?.arrival_time || transfer.flight_details?.scheduled_arrival);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      if (dateFilter === 'today' && (flightDate < today || flightDate >= tomorrow)) {
        return false;
      }
      if (dateFilter === 'tomorrow' && (flightDate < tomorrow || flightDate >= nextWeek)) {
        return false;
      }
      if (dateFilter === 'this_week' && flightDate >= nextWeek) {
        return false;
      }
    }
    
    return true;
  });

  // Get unique cities from transfers
  const uniqueCities = [...new Set(
    Object.values(customerTransfers)
      .map(t => {
        const loc = t.transfer_details?.drop_location || '';
        // Extract city from location string
        return loc.split(',')[0]?.trim();
      })
      .filter(Boolean)
  )].sort();

  // Get unique vendors
  const uniqueVendors = [...new Set(
    Object.values(customerTransfers)
      .map(t => t.vendor_details?.vendor_id || t.vendor_id)
      .filter(Boolean)
  )];

  const getTransferStatus = (transfer) => {
    if (!transfer) return null;
    const status = transfer.transfer_details?.transfer_status || transfer.transfer_details?.status;
    return status;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'text-success-600 dark:text-success-500';
      case 'in_progress':
      case 'enroute': return 'text-primary-600 dark:text-primary-400';
      case 'assigned': return 'text-warning-600 dark:text-warning-500';
      case 'pending': return 'text-muted-foreground';
      case 'cancelled': return 'text-danger-600 dark:text-danger-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBg = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-success-50 dark:bg-success-950 border-success-200 dark:border-success-800';
      case 'in_progress':
      case 'enroute': return 'bg-primary-50 dark:bg-primary-950 border-primary-300 dark:border-primary-700';
      case 'assigned': return 'bg-warning-50 dark:bg-warning-950 border-warning-200 dark:border-warning-800';
      case 'pending': return 'bg-muted border-border';
      case 'cancelled': return 'bg-danger-50 dark:bg-danger-950 border-danger-200 dark:border-danger-800';
      default: return 'bg-muted border-border';
    }
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Customer Management
        </h1>
        <p className="text-base text-muted-foreground">
          Manage customer accounts and their transfer preferences
        </p>
      </div>

      {/* Controls */}
      <div className="bg-card rounded-xl p-5 shadow-sm border border-border mb-6 flex gap-4 items-center flex-wrap">
        <button
          onClick={() => {
            resetForm();
            setEditingCustomer(null);
            setShowForm(true);
          }}
          className="px-5 py-3 bg-primary text-primary-foreground border-none rounded-lg text-sm font-medium cursor-pointer flex items-center gap-2 transition-all hover:bg-primary/90"
        >
          <Plus size={16} />
          Add Customer
        </button>

        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full py-2.5 pl-10 pr-4 border border-input rounded-lg text-sm outline-none bg-background text-foreground focus:ring-2 focus:ring-ring"
            />
            <Search 
              size={16} 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" 
            />
          </div>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors border ${
            showFilters 
              ? 'bg-primary text-primary-foreground border-primary' 
              : 'bg-transparent text-foreground border-input hover:bg-accent'
          }`}
        >
          <Filter size={16} />
          Filters
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-card rounded-xl p-5 shadow-sm border border-border mb-6 flex gap-4 flex-wrap items-center">
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
            <label className="text-sm font-medium text-foreground">Vendor:</label>
            <Dropdown
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Vendors' },
                ...uniqueVendors.map(vendorId => ({
                  value: vendorId,
                  label: vendorId
                }))
              ]}
              minWidth="150px"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">Flight Date:</label>
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

          {(cityFilter !== 'all' || vendorFilter !== 'all' || dateFilter !== 'all') && (
            <button
              onClick={() => {
                setCityFilter('all');
                setVendorFilter('all');
                setDateFilter('all');
              }}
              className="flex items-center gap-1 px-3 py-2 bg-transparent border border-input rounded-md text-sm text-muted-foreground cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <X size={14} />
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Customer Form Drawer */}
      <Drawer
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingCustomer(null);
          setFormData({
            username: '',
            email: '',
            password: '',
            role: 'TRAVELER',
            profile: {
              firstName: '',
              lastName: '',
              phone: ''
            },
            preferences: {
              notifications: {
                email: true,
                sms: false,
                whatsapp: false,
                push: false
              },
              language: 'en',
              timezone: 'Asia/Kolkata'
            }
          });
        }}
        title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
        position="right"
        size="md"
      >
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.profile.firstName}
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: { ...formData.profile, firstName: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.profile.lastName}
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: { ...formData.profile, lastName: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password {editingCustomer ? '(leave blank to keep current)' : '*'}
                  </label>
                  <input
                    type="password"
                    required={!editingCustomer}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.profile.phone}
                    onChange={(e) => setFormData({
                      ...formData,
                      profile: { ...formData.profile, phone: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingCustomer(null);
                    resetForm();
                  }}
                  className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 dark:bg-blue-500 border-none rounded-md text-sm font-medium text-white cursor-pointer hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  {editingCustomer ? 'Update Customer' : 'Create Customer'}
                </button>
              </div>
            </form>
      </Drawer>

      {/* Customers List */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-x-auto overflow-y-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-muted border-t-primary rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading customers...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <User size={48} className="mx-auto mb-4 opacity-50" />
            <div className="text-base mb-2">No customers found</div>
            <div className="text-sm text-muted-foreground/70">
              {searchTerm || cityFilter !== 'all' || vendorFilter !== 'all' || dateFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'Add your first customer to get started'}
            </div>
          </div>
        ) : (
          <div className="min-w-full w-full">
            {/* Table Header */}
            <div className="grid grid-cols-[200px_180px_180px_180px_120px_100px] gap-4 px-5 py-4 bg-muted/30 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider items-center">
              <div>Customer</div>
              <div>Contact</div>
              <div>Upcoming Flight</div>
              <div>Assigned Vendor</div>
              <div>Status</div>
              <div>Actions</div>
            </div>
            
            {/* Table Rows */}
            {filteredCustomers.map((customer) => {
                  const transfer = customerTransfers[customer.email] || customerTransfers[customer._id];
                  const status = getTransferStatus(transfer);
                  
                  return (
                    <div
                      key={customer._id}
                      className="grid grid-cols-[200px_180px_180px_180px_120px_100px] gap-4 px-5 py-4 border-b border-border items-center text-sm transition-colors hover:bg-muted/30"
                    >
                      {/* Customer Name */}
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                          <User size={20} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0 overflow-hidden">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap overflow-hidden text-ellipsis">
                            {customer.profile?.firstName} {customer.profile?.lastName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis">
                            @{customer.username}
                          </div>
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="text-[13px] text-gray-700 dark:text-gray-300 overflow-hidden">
                        <div className="flex items-center gap-1 mb-1 whitespace-nowrap overflow-hidden text-ellipsis">
                          <Mail size={14} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                          <span className="overflow-hidden text-ellipsis">{customer.email}</span>
                        </div>
                        {customer.profile?.phone && (
                          <div className="flex items-center gap-1 whitespace-nowrap overflow-hidden text-ellipsis">
                            <Phone size={14} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                            <span className="overflow-hidden text-ellipsis">{customer.profile.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Upcoming Flight */}
                      <div className="overflow-hidden">
                        {transfer ? (
                          <div className="text-[13px] text-gray-700 dark:text-gray-300">
                            <div className="flex items-center gap-1 mb-1 whitespace-nowrap overflow-hidden">
                              <Plane size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                              <span className="font-medium overflow-hidden text-ellipsis">
                                {transfer.flight_details?.flight_no || 'N/A'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis">
                              {transfer.flight_details?.arrival_airport || transfer.flight_details?.arrivalAirport || ''}
                              {transfer.flight_details?.arrival_time && (
                                <> • {new Date(transfer.flight_details.arrival_time).toLocaleDateString()}</>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[13px] text-gray-400 dark:text-gray-500 italic">
                            No upcoming flights
                          </div>
                        )}
                      </div>

                      {/* Assigned Vendor */}
                      <div className="overflow-hidden">
                        {transfer && transfer.vendor_details ? (
                          <div 
                            onClick={() => navigate(`/vendors?search=${transfer.vendor_details.vendor_id}`)}
                            className="text-[13px] text-blue-600 dark:text-blue-400 cursor-pointer flex items-center gap-1 whitespace-nowrap overflow-hidden hover:underline"
                          >
                            <Truck size={14} className="flex-shrink-0" />
                            <span className="overflow-hidden text-ellipsis">
                              {transfer.vendor_details.vendor_name || transfer.vendor_details.vendor_id || 'N/A'}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[13px] text-gray-400 dark:text-gray-500 italic">
                            No vendor assigned
                          </div>
                        )}
                      </div>

                      {/* Status */}
                      <div>
                        {status ? (
                          <span className="px-2 py-1 rounded text-xs font-medium capitalize inline-block"
                            style={{ 
                              backgroundColor: getStatusBg(status),
                              color: getStatusColor(status)
                            }}
                          >
                            {status === 'in_progress' || status === 'enroute' ? 'In Transit' : status}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">No active transfer</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 justify-start">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="p-1.5 bg-transparent dark:bg-transparent border border-gray-300 dark:border-gray-600 rounded cursor-pointer flex items-center justify-center transition-all hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                          title="Edit customer"
                        >
                          <Edit size={14} className="text-gray-500 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer._id)}
                          className="p-1.5 bg-transparent dark:bg-transparent border border-red-200 dark:border-red-800 rounded cursor-pointer flex items-center justify-center transition-all hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700"
                          title="Delete customer"
                        >
                          <Trash2 size={14} className="text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CustomerManagement;
