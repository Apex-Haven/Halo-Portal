import api from '../hooks/useApi'

export const notificationService = {
  // Send manual notification
  async sendManualNotification(transferId, notificationData) {
    const response = await api.post(`/notifications/${transferId}/send`, notificationData)
    return response
  },

  // Send pickup reminder
  async sendPickupReminder(transferId) {
    const response = await api.post(`/notifications/${transferId}/pickup-reminder`)
    return response
  },

  // Send driver dispatch reminder
  async sendDriverDispatchReminder(transferId) {
    const response = await api.post(`/notifications/${transferId}/driver-dispatch-reminder`)
    return response
  },

  // Get notification history
  async getNotificationHistory(transferId) {
    const response = await api.get(`/notifications/${transferId}/history`)
    return response
  },

  // Update notification preferences
  async updateNotificationPreferences(transferId, preferences) {
    const response = await api.put(`/notifications/${transferId}/preferences`, preferences)
    return response
  },

  // Send bulk notifications
  async sendBulkNotifications(notificationData) {
    const response = await api.post('/notifications/bulk/send', notificationData)
    return response
  },

  // Get notification statistics
  async getNotificationStats(period = 7) {
    const response = await api.get(`/notifications/stats?period=${period}`)
    return response
  }
}

// In-app notifications (bell icon in header)
export const inAppNotificationApi = {
  async getList(params = {}) {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/in-app-notifications${q ? `?${q}` : ''}`)
    return res?.data ?? { notifications: [], total: 0, unreadCount: 0 }
  },
  async getUnreadCount() {
    const res = await api.get('/in-app-notifications/unread-count')
    return res?.data?.count ?? 0
  },
  async markRead(id) {
    const res = await api.patch(`/in-app-notifications/${id}/read`)
    return res
  },
  async markAllRead() {
    const res = await api.patch('/in-app-notifications/read-all')
    return res
  }
}

export default notificationService
