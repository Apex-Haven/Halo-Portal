import { createContext, useContext, useReducer, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

// Auth Context
const AuthContext = createContext()

// Auth Actions
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REGISTER_START: 'REGISTER_START',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILURE: 'REGISTER_FAILURE',
  LOAD_USER_START: 'LOAD_USER_START',
  LOAD_USER_SUCCESS: 'LOAD_USER_SUCCESS',
  LOAD_USER_FAILURE: 'LOAD_USER_FAILURE',
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  CLEAR_ERROR: 'CLEAR_ERROR'
}

// Initial State
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: true,
  error: null,
  role: null,
  permissions: []
}

// Auth Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
    case AUTH_ACTIONS.REGISTER_START:
    case AUTH_ACTIONS.LOAD_USER_START:
      return {
        ...state,
        loading: true,
        error: null
      }

    case AUTH_ACTIONS.LOGIN_SUCCESS:
    case AUTH_ACTIONS.REGISTER_SUCCESS:
      localStorage.setItem('token', action.payload.token)
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null,
        role: action.payload.user.role,
        permissions: getPermissions(action.payload.user.role)
      }

    case AUTH_ACTIONS.LOAD_USER_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        loading: false,
        error: null,
        role: action.payload.user.role,
        permissions: getPermissions(action.payload.user.role)
      }

    case AUTH_ACTIONS.LOGIN_FAILURE:
    case AUTH_ACTIONS.REGISTER_FAILURE:
    case AUTH_ACTIONS.LOAD_USER_FAILURE:
      localStorage.removeItem('token')
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload,
        role: null,
        permissions: []
      }

    case AUTH_ACTIONS.LOGOUT:
      localStorage.removeItem('token')
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        role: null,
        permissions: []
      }

    case AUTH_ACTIONS.UPDATE_PROFILE:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      }

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      }

    default:
      return state
  }
}

// Permission mapping based on roles
const getPermissions = (role) => {
  const permissions = {
    SUPER_ADMIN: [
      'manage_users',
      'manage_vendors',
      'manage_clients',
      'manage_drivers',
      'manage_travelers',
      'manage_transfers',
      'send_notifications',
      'view_reports',
      'manage_settings',
      'view_all_transfers',
      'delete_transfers',
      'assign_vendors_to_clients'
    ],
    ADMIN: [
      'manage_users',
      'manage_vendors',
      'manage_clients',
      'manage_drivers',
      'manage_travelers',
      'manage_transfers',
      'send_notifications',
      'view_reports',
      'manage_settings',
      'view_all_transfers',
      'delete_transfers',
      'assign_vendors_to_clients'
    ],
    VENDOR: [
      'manage_drivers',
      'view_vendor_transfers',
      'view_reports',
      'assign_drivers',
      'update_driver_status',
      'view_assigned_clients'
    ],
    CLIENT: [
      'manage_travelers',
      'view_own_transfers',
      'view_reports',
      'track_flight',
      'view_assigned_vendors'
    ],
    DRIVER: [
      'view_assigned_transfers',
      'update_driver_status',
      'update_location'
    ],
    TRAVELER: [
      'view_own_transfers',
      'track_flight'
    ]
  }
  
  return permissions[role] || []
}

// Role-based access control helpers
const hasPermission = (permissions, permission) => {
  return permissions.includes(permission)
}

const hasRole = (userRole, allowedRoles) => {
  return allowedRoles.includes(userRole)
}

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)
  const navigate = useNavigate()

  // Set up axios interceptor for token
  useEffect(() => {
    if (state.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [state.token])

  // Load user on app start
  useEffect(() => {
    // Only load user if we have a token but no user data yet
    // If we already have user data (e.g., from login), skip loading
    if (state.token && !state.user) {
      loadUser()
    } else if (!state.token) {
      // Only set loading to false if we don't have a token
      // This prevents stuck loading state
      dispatch({ type: AUTH_ACTIONS.LOAD_USER_FAILURE })
    } else if (state.user && state.loading) {
      // If we have user but still loading, clear loading state
      dispatch({ 
        type: AUTH_ACTIONS.LOAD_USER_SUCCESS,
        payload: { user: state.user }
      })
    }
  }, [])

  // Load user function
  const loadUser = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOAD_USER_START })
      
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
      const response = await axios.get(`${API_BASE_URL}/auth/me`)
      
      if (response.data.success) {
        dispatch({
          type: AUTH_ACTIONS.LOAD_USER_SUCCESS,
          payload: { user: response.data.data.user }
        })
      } else {
        throw new Error('Failed to load user')
      }
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.LOAD_USER_FAILURE,
        payload: error.response?.data?.message || 'Failed to load user'
      })
    }
  }

  // Login function
  const login = async (email, password) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START })
      
      // Real API authentication
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password
      })
      
      if (response.data.success) {
        const { user, token } = response.data.data;
        
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { user, token }
        })
        
        navigate('/')
        return { success: true }
      } else {
        throw new Error(response.data.message || 'Login failed')
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Login failed'
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: message
      })
      throw new Error(message)
    }
  }


  // Register function
  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.REGISTER_START })
      
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
      const response = await axios.post(`${API_BASE_URL}/auth/register`, userData)
      
      if (response.data.success) {
        dispatch({
          type: AUTH_ACTIONS.REGISTER_SUCCESS,
          payload: response.data.data
        })
        return { success: true }
      } else {
        throw new Error(response.data.message)
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed'
      dispatch({
        type: AUTH_ACTIONS.REGISTER_FAILURE,
        payload: errorMessage
      })
      return { success: false, error: errorMessage }
    }
  }

  // Logout function
  const logout = async () => {
    try {
      // In a real app, you might call a backend logout endpoint to invalidate server-side sessions
      // await axios.post('/api/auth/logout');
      dispatch({ type: AUTH_ACTIONS.LOGOUT })
      
      toast.success('Logged out successfully!')
      
      // Force navigation to root which will trigger ProtectedApp to show LoginPage
      navigate('/', { replace: true })
      
      return { success: true }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Logout failed'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Update profile function
  const updateProfile = async (profileData) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
      const response = await axios.put(`${API_BASE_URL}/auth/profile`, profileData)
      
      if (response.data.success) {
        dispatch({
          type: AUTH_ACTIONS.UPDATE_PROFILE,
          payload: response.data.data.user
        })
        return { success: true }
      } else {
        throw new Error(response.data.message)
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Profile update failed'
      return { success: false, error: errorMessage }
    }
  }

  // Change password function
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
      const response = await axios.put(`${API_BASE_URL}/auth/change-password`, {
        currentPassword,
        newPassword
      })
      
      if (response.data.success) {
        return { success: true }
      } else {
        throw new Error(response.data.message)
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Password change failed'
      return { success: false, error: errorMessage }
    }
  }

  // Clear error function
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR })
  }

  // Permission check functions
  const can = (permission) => {
    return hasPermission(state.permissions, permission)
  }

  const canAccess = (resource, action) => {
    // This would be more complex in a real app
    // For now, we'll use simple permission checks
    switch (resource) {
      case 'transfers':
        return can('view_all_transfers') || can('view_vendor_transfers') || can('view_assigned_transfers') || can('view_own_transfers')
      case 'vendors':
        return can('manage_vendors')
      case 'clients':
        return can('manage_clients')
      case 'drivers':
        return can('manage_drivers')
      case 'travelers':
        return can('manage_travelers')
      case 'users':
        return can('manage_users')
      case 'reports':
        return can('view_reports')
      case 'settings':
        return can('manage_settings')
      default:
        return false
    }
  }

  const isRole = (...roles) => {
    return hasRole(state.role, roles)
  }

  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    clearError,
    loadUser,
    can,
    canAccess,
    isRole
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Higher-order component for protected routes
export const withAuth = (WrappedComponent, requiredPermissions = []) => {
  return function ProtectedRoute(props) {
    const { isAuthenticated, loading, permissions } = useAuth()
    
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
        </div>
      )
    }
    
    if (!isAuthenticated) {
      return <LoginPage />
    }
    
    // Check permissions
    const hasRequiredPermissions = requiredPermissions.every(permission => 
      permissions.includes(permission)
    )
    
    if (!hasRequiredPermissions) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      )
    }
    
    return <WrappedComponent {...props} />
  }
}

// Role-based component wrapper
export const RoleGuard = ({ children, allowedRoles, fallback = null }) => {
  const { isRole } = useAuth()
  
  if (!isRole(...allowedRoles)) {
    return fallback
  }
  
  return children
}

// Permission-based component wrapper
export const PermissionGuard = ({ children, permission, fallback = null }) => {
  const { can } = useAuth()
  
  if (!can(permission)) {
    return fallback
  }
  
  return children
}

export default AuthContext
