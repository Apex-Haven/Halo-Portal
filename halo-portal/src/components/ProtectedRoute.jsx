import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ProtectedRoute = ({ children, allowedRoles = [], requiredPermissions = [], redirectTo = '/transfers' }) => {
  const { user, isRole, can, loading } = useAuth()
  const location = useLocation()

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If no user, redirect to login (shouldn't happen as ProtectedApp handles this, but safety check)
  if (!user) {
    return <Navigate to="/" replace />
  }

  // Check role-based access
  if (allowedRoles.length > 0) {
    const hasRole = allowedRoles.some(role => isRole(role))
    if (!hasRole) {
      return <Navigate to={redirectTo} replace state={{ from: location }} />
    }
  }

  // Check permission-based access
  if (requiredPermissions.length > 0) {
    const hasPermissions = requiredPermissions.every(permission => can(permission))
    if (!hasPermissions) {
      return <Navigate to={redirectTo} replace state={{ from: location }} />
    }
  }

  return children
}

export default ProtectedRoute

