import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';

// Helper to get headers with optional auth
const getHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const aiService = {
  /**
   * Get delay prediction for a specific transfer
   */
  async getPrediction(transferId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/ai/predict/${transferId}`, {
        headers: getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error getting AI prediction:', error);
      throw error;
    }
  },

  /**
   * Get delay predictions for all active transfers
   */
  async getAllPredictions() {
    try {
      const response = await axios.get(`${API_BASE_URL}/ai/predict-all`, {
        headers: getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error getting all predictions:', error);
      throw error;
    }
  },

  /**
   * Get high-risk flights
   */
  async getHighRiskFlights() {
    try {
      const response = await axios.get(`${API_BASE_URL}/ai/high-risk`, {
        headers: getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error getting high-risk flights:', error);
      throw error;
    }
  },

  /**
   * Get AI dashboard data
   */
  async getDashboardData() {
    try {
      const response = await axios.get(`${API_BASE_URL}/ai/dashboard`, {
        headers: getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error getting AI dashboard:', error);
      throw error;
    }
  },

  /**
   * Record actual delay for ML training
   */
  async recordActualDelay(transferId, actualDelayMinutes) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/ai/train/${transferId}`,
        { actualDelayMinutes },
        {
          headers: getHeaders()
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error recording actual delay:', error);
      throw error;
    }
  }
};

export default aiService;

