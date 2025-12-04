import api from '../hooks/useApi'

export const vendorService = {
  // Get all vendors
  async getAllVendors(params = {}) {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value)
      }
    })
    const response = await api.get(`/vendors?${queryParams}`)
    return response
  },

  // Get single vendor
  async getVendor(vendorId) {
    const response = await api.get(`/vendors/${vendorId}`)
    return response
  },

  // Create vendor
  async createVendor(vendorData) {
    const response = await api.post('/vendors', vendorData)
    return response
  },

  // Update vendor
  async updateVendor(vendorId, vendorData) {
    const response = await api.put(`/vendors/${vendorId}`, vendorData)
    return response
  },

  // Delete vendor
  async deleteVendor(vendorId) {
    const response = await api.delete(`/vendors/${vendorId}`)
    return response
  },

  // Assign customer to vendor
  async assignCustomer(vendorId, customerData) {
    const response = await api.post(`/vendors/${vendorId}/assign-customer`, customerData)
    return response
  },

  // Get vendor transfers
  async getVendorTransfers(vendorId, params = {}) {
    const queryParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value)
      }
    })
    
    const response = await api.get(`/vendors/${vendorId}/transfers?${queryParams}`)
    return response
  },

  // Get vendor dashboard data
  async getVendorDashboard(vendorId) {
    const response = await api.get(`/vendors/${vendorId}/dashboard`)
    return response
  },

  // Get vendor performance metrics
  async getVendorPerformance(vendorId, period = 30) {
    const response = await api.get(`/vendors/${vendorId}/performance?period=${period}`)
    return response
  },

  // Assign driver to vendor transfer
  async assignDriverToVendorTransfer(vendorId, transferId, driverData) {
    const response = await api.put(`/vendors/${vendorId}/transfers/${transferId}/driver`, driverData)
    return response
  },

  // Update vendor driver status
  async updateVendorDriverStatus(vendorId, transferId, statusData) {
    const response = await api.put(`/vendors/${vendorId}/transfers/${transferId}/driver/status`, statusData)
    return response
  },

  // Get vendor statistics overview
  async getVendorStats() {
    const response = await api.get('/vendors/stats/overview')
    return response
  }
}

export default vendorService
