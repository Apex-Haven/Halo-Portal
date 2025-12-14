import { useState, useEffect } from 'react'
import { Car, User, Phone, AlertCircle, CheckCircle, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import Drawer from './Drawer'
import Dropdown from './Dropdown'
import { motion, AnimatePresence } from 'framer-motion'

const VendorDriverAssignment = ({ transfer, isOpen, onClose, onSuccess }) => {
  const { user } = useAuth()
  const api = useApi()
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [selectedDriver, setSelectedDriver] = useState(null)

  useEffect(() => {
    if (isOpen && transfer) {
      fetchDrivers()
      // Pre-select if driver is already assigned
      if (transfer.assigned_driver_details?.driver_id) {
        setSelectedDriverId(transfer.assigned_driver_details.driver_id)
      } else {
        setSelectedDriverId('')
        setSelectedDriver(null)
      }
    }
  }, [isOpen, transfer])

  const fetchDrivers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/drivers')
      if (response.success) {
        setDrivers(response.data || [])
      }
    } catch (error) {
      console.error('Error fetching drivers:', error)
      toast.error('Failed to load drivers')
    } finally {
      setLoading(false)
    }
  }

  const handleDriverSelect = (driverId) => {
    setSelectedDriverId(driverId)
    const driver = drivers.find(d => d._id === driverId)
    setSelectedDriver(driver || null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedDriverId) {
      toast.error('Please select a driver')
      return
    }

    if (!selectedDriver) {
      toast.error('Invalid driver selection')
      return
    }

    setSubmitting(true)
    try {
      const driverName = `${selectedDriver.profile?.firstName || ''} ${selectedDriver.profile?.lastName || ''}`.trim() || selectedDriver.username
      
      const payload = {
        driver_id: selectedDriverId,
        name: driverName,
        contact_number: selectedDriver.profile?.phone || selectedDriver.email || '',
        vehicle_type: selectedDriver.driverDetails?.vehicleType || 'sedan',
        vehicle_number: selectedDriver.driverDetails?.vehicleNumber || 'TBD',
        status: 'assigned'
      }

      const response = await api.put(`/transfers/${transfer._id}/driver`, payload)
      
      if (response.success) {
        // Show success state with animation
        setShowSuccess(true)
        
        // Enhanced success toast with driver details
        toast.success(
          `✓ Driver assigned successfully!\n${driverName} will handle this transfer.`,
          {
            duration: 4000,
            icon: '🚗',
            style: {
              borderRadius: '10px',
              background: '#10b981',
              color: '#fff',
            },
          }
        )
        
        // Wait for animation, then close
        setTimeout(() => {
          setSelectedDriverId('')
          setSelectedDriver(null)
          setShowSuccess(false)
        if (onSuccess) {
          onSuccess(response.data || response)
        }
        onClose()
        }, 1500)
      } else {
        toast.error(response.message || 'Failed to assign driver')
      }
    } catch (error) {
      console.error('Error assigning driver:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to assign driver')
    } finally {
      setSubmitting(false)
    }
  }

  const driverOptions = [
    { value: '', label: 'Select a driver' },
    ...drivers.map(driver => {
      const name = `${driver.profile?.firstName || ''} ${driver.profile?.lastName || ''}`.trim() || driver.username
      const vehicle = driver.driverDetails?.vehicleNumber ? ` - ${driver.driverDetails.vehicleNumber}` : ''
      return {
      value: driver._id,
        label: `${name}${vehicle}`
      }
    })
  ]

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Driver"
      subtitle={`Transfer: ${transfer?._id || ''}`}
      position="right"
      size="md"
    >
      <div className="relative flex flex-col h-full">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4 space-y-6">
        {/* Driver Selection */}
        <div>
          <Dropdown
            label="Select Driver"
                value={selectedDriverId}
            onChange={(e) => handleDriverSelect(e.target.value)}
            options={loading ? [{ value: '', label: 'Loading drivers...' }] : driverOptions}
            placeholder={loading ? 'Loading drivers...' : 'Select a driver'}
            minWidth="100%"
                required
          />
          {drivers.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground mt-1">
              No drivers available. Please add drivers first.
            </p>
          )}
        </div>

            {/* Driver Details Display */}
            {selectedDriver && (
              <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground mb-3">Driver Details</h3>
                
                <div className="flex items-start gap-3">
                  <User size={18} className="text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="text-sm font-medium text-foreground">
                      {`${selectedDriver.profile?.firstName || ''} ${selectedDriver.profile?.lastName || ''}`.trim() || selectedDriver.username}
            </p>
                  </div>
        </div>

                <div className="flex items-start gap-3">
                  <Mail size={18} className="text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium text-foreground">
                      {selectedDriver.email || 'N/A'}
                    </p>
                  </div>
        </div>

                <div className="flex items-start gap-3">
                  <Phone size={18} className="text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium text-foreground">
                      {selectedDriver.profile?.phone || 'N/A'}
            </p>
                  </div>
        </div>

                <div className="flex items-start gap-3">
                  <Car size={18} className="text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Vehicle</p>
                    <p className="text-sm font-medium text-foreground">
                      {selectedDriver.driverDetails?.vehicleType 
                        ? `${selectedDriver.driverDetails.vehicleType.charAt(0).toUpperCase() + selectedDriver.driverDetails.vehicleType.slice(1)}`
                        : 'Not specified'
                      }
                      {selectedDriver.driverDetails?.vehicleNumber && (
                        <span className="text-muted-foreground ml-1">
                          ({selectedDriver.driverDetails.vehicleNumber})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
          )}
        </div>

          {/* Action Buttons - Fixed at bottom */}
          <div className="flex-shrink-0 border-t border-border px-6 py-4">
            <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
                  setSelectedDriverId('')
                  setSelectedDriver(null)
              onClose()
            }}
            className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitting || !selectedDriverId || drivers.length === 0}
          >
            {submitting ? 'Assigning...' : 'Assign Driver'}
          </button>
            </div>
        </div>
      </form>

        {/* Success Overlay with Animation */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="flex flex-col items-center gap-4"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <CheckCircle size={80} className="text-green-500" />
                </motion.div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-foreground mb-2">Driver Assigned!</h3>
                  <p className="text-muted-foreground">
                    {selectedDriver && (
                      `${selectedDriver.profile?.firstName || ''} ${selectedDriver.profile?.lastName || ''}`.trim() || selectedDriver.username
                    )} has been assigned to this transfer
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Drawer>
  )
}

export default VendorDriverAssignment

