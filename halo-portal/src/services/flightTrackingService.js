const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export const flightTrackingService = {
  // Get flight information by flight number
  async getFlightInfo(flightNumber) {
    try {
      const response = await fetch(`${API_BASE_URL}/flight-tracking/flight/${flightNumber}`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching flight info:', error);
      throw error;
    }
  },

  // Get flight status
  async getFlightStatus(flightNumber) {
    try {
      const response = await fetch(`${API_BASE_URL}/flight-tracking/status/${flightNumber}`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching flight status:', error);
      throw error;
    }
  },

  // Get airport information
  async getAirportInfo(iataCode) {
    try {
      const response = await fetch(`${API_BASE_URL}/flight-tracking/airport/${iataCode}`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching airport info:', error);
      throw error;
    }
  },

  // Search flights
  async searchFlights(query, type = 'flight') {
    try {
      const response = await fetch(`${API_BASE_URL}/flight-tracking/search?query=${encodeURIComponent(query)}&type=${type}`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error searching flights:', error);
      throw error;
    }
  },

  // Format flight data for display
  formatFlightData(flightData) {
    if (!flightData) return null;

    return {
      flightNumber: flightData.flightNumber,
      airline: flightData.airline,
      aircraft: flightData.aircraft,
      status: flightData.status,
      departure: {
        airport: flightData.departure?.airport,
        iata: flightData.departure?.iata,
        scheduled: flightData.departure?.scheduled,
        actual: flightData.departure?.actual,
        terminal: flightData.departure?.terminal,
        gate: flightData.departure?.gate,
        delay: flightData.departure?.delay
      },
      arrival: {
        airport: flightData.arrival?.airport,
        iata: flightData.arrival?.iata,
        scheduled: flightData.arrival?.scheduled,
        actual: flightData.arrival?.actual,
        terminal: flightData.arrival?.terminal,
        gate: flightData.arrival?.gate,
        delay: flightData.arrival?.delay
      },
      live: flightData.live,
      source: flightData.source
    };
  },

  // Get status color for UI
  getStatusColor(status) {
    switch (status?.toLowerCase()) {
      case 'scheduled': return '#2563eb';
      case 'boarding': return '#f59e0b';
      case 'departed': return '#059669';
      case 'in-flight': return '#7c3aed';
      case 'landed': return '#059669';
      case 'delayed': return '#dc2626';
      case 'cancelled': return '#dc2626';
      case 'diverted': return '#f59e0b';
      default: return '#6b7280';
    }
  },

  // Get status description
  getStatusDescription(status) {
    switch (status?.toLowerCase()) {
      case 'scheduled': return 'Flight is scheduled to depart';
      case 'boarding': return 'Passengers are boarding';
      case 'departed': return 'Flight has departed';
      case 'in-flight': return 'Flight is in progress';
      case 'landed': return 'Flight has landed';
      case 'delayed': return 'Flight is delayed';
      case 'cancelled': return 'Flight has been cancelled';
      case 'diverted': return 'Flight has been diverted';
      default: return 'Status unknown';
    }
  },

  // Format time for display
  formatTime(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      month: 'short',
      day: 'numeric'
    });
  },

  // Calculate delay
  calculateDelay(scheduled, actual) {
    if (!scheduled || !actual) return null;
    
    const scheduledTime = new Date(scheduled);
    const actualTime = new Date(actual);
    const delayMinutes = Math.round((actualTime - scheduledTime) / (1000 * 60));
    
    return delayMinutes > 0 ? delayMinutes : 0;
  }
};

export default flightTrackingService;
