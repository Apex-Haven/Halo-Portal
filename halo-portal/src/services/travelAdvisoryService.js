import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const travelAdvisoryService = {
  /**
   * Create or update client travel preferences
   */
  async createOrUpdatePreferences(data) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/travel-advisory/preferences`,
        data,
        { headers: getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating/updating preferences:', error);
      throw error;
    }
  },

  /**
   * Get all travel preferences
   */
  async getAllPreferences(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.country) params.append('country', filters.country);
      if (filters.clientId) params.append('clientId', filters.clientId);

      const response = await axios.get(
        `${API_BASE_URL}/travel-advisory/preferences?${params.toString()}`,
        { headers: getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching preferences:', error);
      throw error;
    }
  },

  /**
   * Get preferences for a specific client
   */
  async getClientPreferences(clientId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/travel-advisory/preferences/client/${clientId}`,
        { headers: getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching client preferences:', error);
      throw error;
    }
  },

  /**
   * Get single preference by ID
   */
  async getPreferenceById(preferenceId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/travel-advisory/preferences/${preferenceId}`,
        { headers: getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching preference:', error);
      throw error;
    }
  },

  /**
   * Generate recommendations for a preference
   */
  async generateRecommendations(preferenceId) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/travel-advisory/recommendations/${preferenceId}`,
        {},
        { headers: getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  },

  /**
   * Get recommendations for a preference
   */
  async getRecommendations(preferenceId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/travel-advisory/recommendations/${preferenceId}`,
        { headers: getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      throw error;
    }
  },

  /**
   * Select a hotel for a preference
   */
  async selectHotel(preferenceId, hotelId, notes = '') {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/travel-advisory/recommendations/${preferenceId}/select`,
        { hotelId, notes },
        { headers: getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error selecting hotel:', error);
      throw error;
    }
  },

  /**
   * Get dashboard data
   */
  async getDashboard(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.country) params.append('country', filters.country);

      const response = await axios.get(
        `${API_BASE_URL}/travel-advisory/dashboard?${params.toString()}`,
        { headers: getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      throw error;
    }
  },

  /**
   * Delete preferences
   */
  async deletePreferences(preferenceId) {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/travel-advisory/preferences/${preferenceId}`,
        { headers: getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting preferences:', error);
      throw error;
    }
  },

  /**
   * Get hotel booking links
   */
  async getHotelLinks(hotelId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/travel-advisory/hotels/${hotelId}/links`,
        { headers: getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching hotel links:', error);
      throw error;
    }
  },

  /**
   * Get hotel cards
   */
  async getHotelCards(hotelId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/travel-advisory/hotels/${hotelId}/cards`,
        { headers: getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching hotel cards:', error);
      throw error;
    }
  },

};

export default travelAdvisoryService;

