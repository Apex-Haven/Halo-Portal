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
    const message = error.response?.data?.message || error.message || 'An error occurred'
    
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
