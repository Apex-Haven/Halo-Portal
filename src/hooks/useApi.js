import { useState, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    // Extract better error messages
    let message = 'An error occurred'
    
    if (error.response?.data) {
      // Check for specific error message
      if (error.response.data.message) {
        message = error.response.data.message
      } else if (error.response.data.error) {
        message = error.response.data.error
      } else if (typeof error.response.data === 'string') {
        message = error.response.data
      }
      
      // Handle rate limiting with retryAfter info
      if (error.response.status === 429) {
        const retryAfter = error.response.data.retryAfter
        if (retryAfter) {
          const minutes = Math.ceil(retryAfter / 60)
          message = `${error.response.data.message || 'Too many requests'}. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`
        }
      }
    } else if (error.message) {
      message = error.message
    }
    
    // Show error toast
    toast.error(message)
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    
    return Promise.reject(error)
  }
)

export const useApi = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const request = useCallback(async (method, url, data = null, config = {}) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.request({
        method,
        url,
        data,
        ...config
      })
      
      return response
    } catch (err) {
      setError(err.response?.data || err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const get = useCallback((url, config = {}) => {
    return request('GET', url, null, config)
  }, [request])

  const post = useCallback((url, data, config = {}) => {
    return request('POST', url, data, config)
  }, [request])

  const put = useCallback((url, data, config = {}) => {
    return request('PUT', url, data, config)
  }, [request])

  const patch = useCallback((url, data, config = {}) => {
    return request('PATCH', url, data, config)
  }, [request])

  const del = useCallback((url, config = {}) => {
    return request('DELETE', url, null, config)
  }, [request])

  return {
    loading,
    error,
    get,
    post,
    put,
    patch,
    delete: del,
    request
  }
}

export default api
