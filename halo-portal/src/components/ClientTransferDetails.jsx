import { useState, useEffect } from 'react'
import { Plane, Users, Briefcase, FileText, AlertCircle, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import Drawer from './Drawer'

const ClientTransferDetails = ({ transfer, isOpen, onClose, onSuccess }) => {
  const { user } = useAuth()
  const api = useApi()
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    flightNo: '',
    airline: '',
    departureAirport: '',
    arrivalAirport: '',
    departureTime: '',
    arrivalTime: '',
    passengers: 1,
    luggage: 0,
    specialNotes: ''
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen && transfer) {
      // Pre-fill form with existing data
      const flightDetails = transfer.flight_details || {}
      const customerDetails = transfer.customer_details || {}
      const transferDetails = transfer.transfer_details || {}
      
      setFormData({
        flightNo: flightDetails.flight_no === 'XX000' ? '' : flightDetails.flight_no || '',
        airline: flightDetails.airline === 'TBD' ? '' : flightDetails.airline || '',
        departureAirport: flightDetails.departure_airport === 'TBD' ? '' : flightDetails.departure_airport || '',
        arrivalAirport: flightDetails.arrival_airport === 'TBD' ? '' : flightDetails.arrival_airport || '',
        departureTime: flightDetails.departure_time ? new Date(flightDetails.departure_time).toISOString().slice(0, 16) : '',
        arrivalTime: flightDetails.arrival_time ? new Date(flightDetails.arrival_time).toISOString().slice(0, 16) : '',
        passengers: customerDetails.no_of_passengers || 1,
        luggage: customerDetails.luggage_count || 0,
        specialNotes: transferDetails.special_notes || ''
      })
    }
  }, [isOpen, transfer])

  const resetForm = () => {
    setFormData({
      flightNo: '',
      airline: '',
      departureAirport: '',
      arrivalAirport: '',
      departureTime: '',
      arrivalTime: '',
      passengers: 1,
      luggage: 0,
      specialNotes: ''
    })
    setErrors({})
  }

  const validateForm = () => {
    const newErrors = {}
    
    // Flight number validation (2 letters + 3-4 digits)
    if (!formData.flightNo.trim()) {
      newErrors.flightNo = 'Flight number is required'
    } else if (!/^[A-Z]{2}\d{3,4}$/i.test(formData.flightNo.trim())) {
      newErrors.flightNo = 'Flight number must be in format like AI202, EK501'
    }
    
    if (!formData.airline.trim()) {
      newErrors.airline = 'Airline name is required'
    }
    
    if (!formData.departureAirport.trim()) {
      newErrors.departureAirport = 'Departure airport code is required'
    } else if (!/^[A-Z]{3}$/i.test(formData.departureAirport.trim())) {
      newErrors.departureAirport = 'Must be a 3-letter airport code (e.g., BOM, DEL)'
    }
    
    if (!formData.arrivalAirport.trim()) {
      newErrors.arrivalAirport = 'Arrival airport code is required'
    } else if (!/^[A-Z]{3}$/i.test(formData.arrivalAirport.trim())) {
      newErrors.arrivalAirport = 'Must be a 3-letter airport code (e.g., DXB, JFK)'
    }
    
    if (!formData.departureTime) {
      newErrors.departureTime = 'Departure time is required'
    }
    
    if (!formData.arrivalTime) {
      newErrors.arrivalTime = 'Arrival time is required'
    }
    
    if (formData.departureTime && formData.arrivalTime) {
      const depTime = new Date(formData.departureTime)
      const arrTime = new Date(formData.arrivalTime)
      if (arrTime <= depTime) {
        newErrors.arrivalTime = 'Arrival time must be after departure time'
      }
    }
    
    if (formData.passengers < 1) {
      newErrors.passengers = 'At least 1 passenger is required'
    }
    
    if (formData.luggage < 0) {
      newErrors.luggage = 'Luggage count cannot be negative'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        flight_details: {
          flight_no: formData.flightNo.trim().toUpperCase(),
          airline: formData.airline.trim(),
          departure_airport: formData.departureAirport.trim(),
          arrival_airport: formData.arrivalAirport.trim(),
          departure_time: new Date(formData.departureTime).toISOString(),
          arrival_time: new Date(formData.arrivalTime).toISOString(),
          status: 'on_time',
          delay_minutes: 0
        },
        customer_details: {
          no_of_passengers: parseInt(formData.passengers),
          luggage_count: parseInt(formData.luggage)
        },
        transfer_details: {
          special_notes: formData.specialNotes.trim()
        }
      }

      const response = await api.put(`/transfers/${transfer._id}/client-details`, payload)
      
      if (response.success) {
        toast.success('Transfer details updated successfully!')
        resetForm()
        if (onSuccess) {
          onSuccess(response.data || response)
        }
        onClose()
      } else {
        toast.error(response.message || 'Failed to update transfer details')
      }
    } catch (error) {
      console.error('Error updating transfer details:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to update transfer details')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Update Transfer Details"
      subtitle={`Transfer: ${transfer?._id || ''}`}
      position="right"
      size="md"
    >
      <div className="flex flex-col h-full">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4 space-y-6">
            {/* Flight Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Plane size={20} className="text-primary" />
                Flight Details
              </h3>

              {/* Flight Number */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Flight Number <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.flightNo}
                  onChange={(e) => setFormData({ ...formData, flightNo: e.target.value.toUpperCase() })}
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                    errors.flightNo ? 'border-destructive' : 'border-input'
                  }`}
                  placeholder="e.g., AI202, EK501"
                  maxLength="6"
                  required
                />
                {errors.flightNo && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.flightNo}
                  </p>
                )}
              </div>

              {/* Airline */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Airline <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.airline}
                  onChange={(e) => setFormData({ ...formData, airline: e.target.value })}
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                    errors.airline ? 'border-destructive' : 'border-input'
                  }`}
                  placeholder="e.g., Air India, Emirates"
                  required
                />
                {errors.airline && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.airline}
                  </p>
                )}
              </div>

              {/* Departure Airport */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Departure Airport Code <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.departureAirport}
                  onChange={(e) => setFormData({ ...formData, departureAirport: e.target.value.toUpperCase() })}
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                    errors.departureAirport ? 'border-destructive' : 'border-input'
                  }`}
                  placeholder="e.g., BOM, DEL, JFK"
                  maxLength="3"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  3-letter IATA airport code
                </p>
                {errors.departureAirport && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.departureAirport}
                  </p>
                )}
              </div>

              {/* Arrival Airport */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Arrival Airport Code <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.arrivalAirport}
                  onChange={(e) => setFormData({ ...formData, arrivalAirport: e.target.value.toUpperCase() })}
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                    errors.arrivalAirport ? 'border-destructive' : 'border-input'
                  }`}
                  placeholder="e.g., DXB, LHR, SYD"
                  maxLength="3"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  3-letter IATA airport code
                </p>
                {errors.arrivalAirport && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.arrivalAirport}
                  </p>
                )}
              </div>

              {/* Departure Time */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Departure Time <span className="text-destructive">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.departureTime}
                  onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                    errors.departureTime ? 'border-destructive' : 'border-input'
                  }`}
                  required
                />
                {errors.departureTime && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.departureTime}
                  </p>
                )}
              </div>

              {/* Arrival Time */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Arrival Time <span className="text-destructive">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.arrivalTime}
                  onChange={(e) => setFormData({ ...formData, arrivalTime: e.target.value })}
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                    errors.arrivalTime ? 'border-destructive' : 'border-input'
                  }`}
                  required
                />
                {errors.arrivalTime && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.arrivalTime}
                  </p>
                )}
              </div>
            </div>

            {/* Passenger & Luggage Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Users size={20} className="text-primary" />
                Passenger & Luggage
              </h3>

              {/* Number of Passengers */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Number of Passengers <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.passengers}
                  onChange={(e) => setFormData({ ...formData, passengers: parseInt(e.target.value) || 1 })}
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                    errors.passengers ? 'border-destructive' : 'border-input'
                  }`}
                  required
                />
                {errors.passengers && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.passengers}
                  </p>
                )}
              </div>

              {/* Luggage Count */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Luggage Count
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={formData.luggage}
                  onChange={(e) => setFormData({ ...formData, luggage: parseInt(e.target.value) || 0 })}
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                    errors.luggage ? 'border-destructive' : 'border-input'
                  }`}
                />
                {errors.luggage && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.luggage}
                  </p>
                )}
              </div>
            </div>

            {/* Special Notes Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FileText size={20} className="text-primary" />
                Special Notes
              </h3>

              {/* Special Notes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Special Instructions (Optional)
                </label>
                <textarea
                  value={formData.specialNotes}
                  onChange={(e) => setFormData({ ...formData, specialNotes: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="Any special requirements or notes..."
                  rows="4"
                  maxLength="500"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.specialNotes.length}/500 characters
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons - Fixed at bottom */}
          <div className="flex-shrink-0 border-t border-border bg-muted/30 backdrop-blur-sm">
            <div className="flex gap-3 px-6 py-5">
              <button
                type="button"
                onClick={() => {
                  resetForm()
                  onClose()
                }}
                className="flex-1 px-4 py-2.5 bg-background border-2 border-border rounded-lg text-foreground font-semibold hover:bg-muted transition-all"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitting}
              >
                {submitting ? 'Updating...' : 'Update Details'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Drawer>
  )
}

export default ClientTransferDetails

