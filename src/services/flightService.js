import api from '../hooks/useApi'

export const flightService = {
  // Get flight status by flight number
  async getFlightStatus(flightNumber) {
    const response = await api.get(`/flights/${flightNumber}`)
    return response
  },

  // Update transfer flight status
  async updateTransferFlightStatus(transferId, statusData) {
    const response = await api.put(`/flights/transfers/${transferId}/status`, statusData)
    return response
  },

  // Sync flight status from external API
  async syncFlightStatus(transferId) {
    const response = await api.post(`/flights/transfers/${transferId}/sync`)
    return response
  },

  // Batch sync multiple flights
  async batchSyncFlights(flightNumbers) {
    const response = await api.post('/flights/batch/sync', { flight_numbers: flightNumbers })
    return response
  },

  // Get flights requiring attention
  async getFlightsRequiringAttention(hours = 24) {
    const response = await api.get(`/flights/attention/required?hours=${hours}`)
    return response
  }
}

export default flightService
