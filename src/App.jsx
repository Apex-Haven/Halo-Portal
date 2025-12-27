import { Routes, Route } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import LoginPage from './pages/LoginPage'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Transfers from './pages/Transfers'
import Tracking from './pages/Tracking'
import Vendors from './pages/Vendors'
import Flights from './pages/Flights'
import FlightTracking from './components/FlightTracking'
import CustomerManagement from './components/CustomerManagement'
import Reports from './pages/Reports'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import UserManagement from './pages/UserManagement'
import Travelers from './pages/Travelers'
import Drivers from './pages/Drivers'
import TravelAdvisory from './pages/TravelAdvisory'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'

// Protected App Component
const ProtectedApp = () => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading HALO...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <div className="min-h-screen bg-background">
      <Layout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1"
        >
          <Routes>
            {/* Admin/Super Admin only routes */}
            <Route path="/" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']} redirectTo="/transfers">
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/vendors" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']} redirectTo="/transfers">
                <Vendors />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']} redirectTo="/transfers">
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']} redirectTo="/transfers">
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/user-management" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']} redirectTo="/transfers">
                <UserManagement />
              </ProtectedRoute>
            } />
            
            {/* Client and Admin routes */}
            <Route path="/travelers" element={
              <ProtectedRoute allowedRoles={['CLIENT', 'SUPER_ADMIN', 'ADMIN']} redirectTo="/transfers">
                <Travelers />
              </ProtectedRoute>
            } />
            <Route path="/flights" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CLIENT', 'TRAVELER']} redirectTo="/transfers">
                <Flights />
              </ProtectedRoute>
            } />
            
            {/* Vendor and Admin routes */}
            <Route path="/drivers" element={
              <ProtectedRoute allowedRoles={['VENDOR', 'SUPER_ADMIN', 'ADMIN']} redirectTo="/transfers">
                <Drivers />
              </ProtectedRoute>
            } />
            <Route path="/travel-advisory" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER']} redirectTo="/transfers">
                <TravelAdvisory />
              </ProtectedRoute>
            } />
            
            {/* Common routes (accessible by multiple roles) */}
            <Route path="/transfers" element={<Transfers />} />
            <Route path="/flight-tracking" element={<FlightTracking />} />
            <Route path="/customers" element={<CustomerManagement />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.div>
      </Layout>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Public tracking route - accessible without authentication but with layout */}
          <Route path="/tracking" element={
            <div className="min-h-screen bg-background">
              <Layout>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1"
                >
                  <Tracking />
                </motion.div>
              </Layout>
            </div>
          } />
          {/* All other routes require authentication */}
          <Route path="*" element={<ProtectedApp />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App