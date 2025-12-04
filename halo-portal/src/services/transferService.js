import api from '../hooks/useApi'

export const transferService = {
  // Get all transfers with filtering and pagination
  async getTransfers(params = {}) {
    const queryParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value)
      }
    })
    
    const response = await api.get(`/transfers?${queryParams}`)
    return response
  },

  // Get transfer by ID
  async getTransfer(id) {
    const response = await api.get(`/transfers/${id}`)
    return response
  },

  // Create new transfer
  async createTransfer(transferData) {
    const response = await api.post('/transfers', transferData)
    return response
  },

  // Update transfer
  async updateTransfer(id, updateData) {
    const response = await api.put(`/transfers/${id}`, updateData)
    return response
  },

  // Assign driver to transfer
  async assignDriver(id, driverData) {
    const response = await api.put(`/transfers/${id}/driver`, driverData)
    return response
  },

  // Update driver status
  async updateDriverStatus(id, statusData) {
    const response = await api.put(`/transfers/${id}/driver/status`, statusData)
    return response
  },

  // Delete transfer
  async deleteTransfer(id) {
    const response = await api.delete(`/transfers/${id}`)
    return response
  },

  // Get transfer statistics
  async getTransferStats() {
    const response = await api.get('/transfers/stats')
    return response
  }
}

export default transferService
