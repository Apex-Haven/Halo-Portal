import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const hotelPdfService = {
  /**
   * Extract images from booking links
   * @param {string[]} links - Array of booking links
   * @returns {Promise<Object>} Response with extracted images
   */
  async extractImages(links) {
    try {
      if (!Array.isArray(links) || links.length === 0) {
        throw new Error('Links array is required and must not be empty');
      }

      const response = await axios.post(
        `${API_BASE_URL}/hotel-pdf/extract-images`,
        { links },
        { 
          headers: getHeaders(),
          timeout: 300000 // 5 minute timeout for image extraction
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error extracting images:', error);
      
      // Handle specific error cases
      if (error.response) {
        // Handle 401 (token expired)
        if (error.response.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
          throw new Error('Session expired. Please log in again.');
        }
        
        // Handle 504 (timeout)
        if (error.response.status === 504) {
          throw new Error(error.response.data?.message || 'Image extraction timed out. Please try again with fewer links.');
        }
        
        throw new Error(error.response.data?.message || 'Failed to extract images');
      } else if (error.request) {
        // Network error or timeout
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          throw new Error('Request timed out. The image extraction is taking too long. Please try again with fewer links.');
        }
        throw new Error('Network error: Could not reach server');
      } else {
        throw new Error(error.message || 'Failed to extract images');
      }
    }
  },

  /**
   * Get proxied image URL (to avoid CORS)
   * @param {string} imageUrl - Original image URL
   * @returns {string} Proxied image URL
   */
  getProxiedImageUrl(imageUrl) {
    if (!imageUrl) return null;
    const encodedUrl = encodeURIComponent(imageUrl);
    return `${API_BASE_URL}/hotel-pdf/proxy-image?url=${encodedUrl}`;
  },

  /**
   * Fetch image as base64 through proxy
   * @param {string} imageUrl - Original image URL
   * @returns {Promise<string>} Base64 encoded image
   */
  async fetchImageAsBase64(imageUrl) {
    try {
      if (!imageUrl) {
        throw new Error('Image URL is required');
      }

      console.log('Fetching image as base64:', imageUrl);

      // Use proxy to avoid CORS
      const proxiedUrl = this.getProxiedImageUrl(imageUrl);
      console.log('Using proxied URL:', proxiedUrl);
      
      const response = await axios.get(proxiedUrl, {
        responseType: 'blob',
        headers: getHeaders(),
        timeout: 30000 // 30 second timeout
      });

      console.log('Image fetched, converting to base64...');

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          console.log('Image converted to base64 successfully');
          resolve(reader.result);
        };
        reader.onerror = (error) => {
          console.error('FileReader error:', error);
          reject(new Error('Failed to convert image to base64'));
        };
        reader.readAsDataURL(response.data);
      });
    } catch (error) {
      console.error('Error fetching image as base64 through proxy:', error);
      // Fallback: try direct URL (may fail due to CORS)
      console.log('Attempting direct URL fallback...');
      try {
        const response = await axios.get(imageUrl, {
          responseType: 'blob',
          timeout: 30000
        });
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            console.log('Image loaded via direct URL fallback');
            resolve(reader.result);
          };
          reader.onerror = () => {
            reject(new Error('Failed to convert image to base64'));
          };
          reader.readAsDataURL(response.data);
        });
      } catch (fallbackError) {
        console.error('Direct URL fallback also failed:', fallbackError);
        throw new Error(`Failed to load image: ${error.message}`);
      }
    }
  },

  /**
   * Health check for hotel PDF service
   * @returns {Promise<Object>} Service status
   */
  async healthCheck() {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/hotel-pdf/health`,
        { headers: getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error checking service health:', error);
      throw error;
    }
  }
};

export default hotelPdfService;

