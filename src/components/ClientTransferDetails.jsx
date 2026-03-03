import { useState, useEffect } from 'react'
import { Plane, AlertCircle, Users as UsersIcon, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import DatePicker from 'react-datepicker'
import { startOfDay, isSameDay } from 'date-fns'
import 'react-datepicker/dist/react-datepicker.css'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import Drawer from './Drawer'
import Dropdown from './Dropdown'

const getTravelerName = (t) => {
  if (!t) return ''
  if (typeof t === 'object' && t.profile) return `${t.profile.firstName || ''} ${t.profile.lastName || ''}`.trim() || t.email || ''
  return ''
}

const ClientTransferDetails = ({ transfer, isOpen, onClose, onSuccess }) => {
  const { user } = useAuth()
  const api = useApi()
  const [submitting, setSubmitting] = useState(false)
  const [travelers, setTravelers] = useState([])
  const [formData, setFormData] = useState({
    flightNo: '',
    airline: '',
    departureAirport: '',
    arrivalAirport: '',
    departureTime: '',
    arrivalTime: '',
    jobPosition: '',
    companyName: '',
    consentEmail: false,
    consentWhatsapp: false,
    whatsappNumber: '',
    flightBooked: false,
    additionalDelegates: [],
    includeReturn: true, // Mandatory by default
    returnFlightNo: '',
    returnAirline: '',
    returnDepartureAirport: '',
    returnArrivalAirport: '',
    returnDepartureTime: '',
    returnArrivalTime: '',
    returnPickupLocation: '',
    returnDropLocation: '',
    returnEventPlace: ''
  })
  const [errors, setErrors] = useState({})
  const [addDelegateSelectValue, setAddDelegateSelectValue] = useState('')

  // Format Date as YYYY-MM-DDTHH:mm for datetime-local (local time)
  const toDatetimeLocal = (d) => {
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  // Minimum time for filter: now rounded up to next 15 min (so past slots are disabled in UI)
  const getMinTimeForFilter = () => {
    const d = new Date()
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15)
    d.setSeconds(0, 0)
    return d
  }

  // Default arrival to 24 hours after departure (same date/time not allowed)
  const getDefaultArrivalTime = (departureTime) => {
    if (!departureTime) return ''
    const d = new Date(departureTime)
    d.setHours(d.getHours() + 24)
    return toDatetimeLocal(d)
  }

  useEffect(() => {
    if (isOpen && transfer) {
      const flightDetails = transfer.flight_details || {}
      const cd = transfer.customer_details || {}
      let additionalDelegates = []
      if (transfer.delegates && transfer.delegates.length > 0) {
        additionalDelegates = transfer.delegates.map((d) => {
          const tid = d.traveler_id?._id || d.traveler_id
          const tfd = d.flight_details || {}
          let dep2 = tfd.departure_time ? toDatetimeLocal(new Date(tfd.departure_time)) : ''
          let arr2 = tfd.arrival_time ? toDatetimeLocal(new Date(tfd.arrival_time)) : ''
          if (dep2 && (!arr2 || new Date(arr2) <= new Date(dep2))) {
            const d2 = new Date(dep2)
            d2.setHours(d2.getHours() + 24)
            arr2 = toDatetimeLocal(d2)
          }
          return {
            travelerId: tid?.toString?.() || tid,
            travelerName: getTravelerName(d.traveler_id),
            flightSameAsPrimary: d.flight_same_as_primary !== false,
            flightNo2: tfd.flight_no === 'XX000' || tfd.flight_no === 'TBD' ? '' : tfd.flight_no || '',
            airline2: tfd.airline === 'TBD' ? '' : tfd.airline || '',
            departureAirport2: tfd.departure_airport === 'TBD' ? '' : tfd.departure_airport || '',
            arrivalAirport2: tfd.arrival_airport === 'TBD' ? '' : tfd.arrival_airport || '',
            departureTime2: dep2,
            arrivalTime2: arr2
          }
        })
      } else if (transfer.traveler_details && (transfer.traveler_details.name || transfer.traveler_details.email)) {
        const td = transfer.traveler_details
        const tfd = transfer.traveler_flight_details || {}
        let dep2 = tfd.departure_time ? toDatetimeLocal(new Date(tfd.departure_time)) : ''
        let arr2 = tfd.arrival_time ? toDatetimeLocal(new Date(tfd.arrival_time)) : ''
        if (dep2 && (!arr2 || new Date(arr2) <= new Date(dep2))) {
          const d2 = new Date(dep2)
          d2.setHours(d2.getHours() + 24)
          arr2 = toDatetimeLocal(d2)
        }
        additionalDelegates = [{
          travelerId: transfer.traveler_id?.toString?.() || transfer.traveler_id || null,
          travelerName: td.name || td.email || '',
          flightSameAsPrimary: td.flight_same_as_delegate_1 !== false,
          flightNo2: tfd.flight_no === 'XX000' || tfd.flight_no === 'TBD' ? '' : tfd.flight_no || '',
          airline2: tfd.airline === 'TBD' ? '' : tfd.airline || '',
          departureAirport2: tfd.departure_airport === 'TBD' ? '' : tfd.departure_airport || '',
          arrivalAirport2: tfd.arrival_airport === 'TBD' ? '' : tfd.arrival_airport || '',
          departureTime2: dep2,
          arrivalTime2: arr2
        }]
      }
      let departureTime = flightDetails.departure_time ? toDatetimeLocal(new Date(flightDetails.departure_time)) : ''
      let arrivalTime = flightDetails.arrival_time ? toDatetimeLocal(new Date(flightDetails.arrival_time)) : ''
      if (departureTime && (!arrivalTime || new Date(arrivalTime) <= new Date(departureTime))) {
        const d = new Date(departureTime)
        d.setHours(d.getHours() + 24)
        arrivalTime = toDatetimeLocal(d)
      }
      const rfd = transfer.return_flight_details || {}
      const rtd = transfer.return_transfer_details || {}
      let returnDep = rfd.departure_time ? toDatetimeLocal(new Date(rfd.departure_time)) : ''
      let returnArr = rfd.arrival_time ? toDatetimeLocal(new Date(rfd.arrival_time)) : ''
      if (returnDep && (!returnArr || new Date(returnArr) <= new Date(returnDep))) {
        const d = new Date(returnDep)
        d.setHours(d.getHours() + 24)
        returnArr = toDatetimeLocal(d)
      }
      const hasReturn = !!(transfer.return_flight_details || transfer.return_transfer_details)
      setFormData({
        flightNo: flightDetails.flight_no === 'XX000' || flightDetails.flight_no === 'TBD' ? '' : flightDetails.flight_no || '',
        airline: flightDetails.airline === 'TBD' ? '' : flightDetails.airline || '',
        departureAirport: flightDetails.departure_airport === 'TBD' ? '' : flightDetails.departure_airport || '',
        arrivalAirport: flightDetails.arrival_airport === 'TBD' ? '' : flightDetails.arrival_airport || '',
        departureTime,
        arrivalTime,
        jobPosition: cd.job_position || '',
        companyName: cd.company_name || '',
        consentEmail: !!cd.consent_email,
        consentWhatsapp: !!cd.consent_whatsapp,
        whatsappNumber: cd.whatsapp_number || '',
        flightBooked: !!cd.flight_booked,
        additionalDelegates,
        includeReturn: true, // Always show return section (mandatory)
        returnFlightNo: rfd.flight_no === 'XX000' || rfd.flight_no === 'TBD' ? '' : rfd.flight_no || '',
        returnAirline: rfd.airline === 'TBD' ? '' : rfd.airline || '',
        returnDepartureAirport: rfd.departure_airport === 'TBD' ? '' : rfd.departure_airport || '',
        returnArrivalAirport: rfd.arrival_airport === 'TBD' ? '' : rfd.arrival_airport || '',
        returnDepartureTime: returnDep,
        returnArrivalTime: returnArr,
        returnPickupLocation: rtd.pickup_location || '',
        returnDropLocation: rtd.drop_location || '',
        returnEventPlace: rtd.event_place || ''
      })
    }
  }, [isOpen, transfer])

  useEffect(() => {
    if (isOpen) {
      api.get('/travelers').then((r) => {
        if (r.success && Array.isArray(r.data)) setTravelers(r.data)
      }).catch(() => setTravelers([]))
    }
  }, [isOpen])

  const resetForm = () => {
    setFormData({
      flightNo: '',
      airline: '',
      departureAirport: '',
      arrivalAirport: '',
      departureTime: '',
      arrivalTime: '',
      jobPosition: '',
      companyName: '',
      consentEmail: false,
      consentWhatsapp: false,
      whatsappNumber: '',
      flightBooked: false,
      additionalDelegates: [],
      includeReturn: true,
      returnFlightNo: '',
      returnAirline: '',
      returnDepartureAirport: '',
      returnArrivalAirport: '',
      returnDepartureTime: '',
      returnArrivalTime: '',
      returnPickupLocation: '',
      returnDropLocation: '',
      returnEventPlace: ''
    })
    setErrors({})
  }
  const hasDelegates = (formData.additionalDelegates || []).length > 0

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
    
    const now = new Date()
    if (!formData.departureTime) {
      newErrors.departureTime = 'Departure time is required'
    } else if (new Date(formData.departureTime) < now) {
      newErrors.departureTime = 'Cannot select a past date or time'
    }
    
    if (!formData.arrivalTime) {
      newErrors.arrivalTime = 'Arrival time is required'
    } else if (new Date(formData.arrivalTime) < now) {
      newErrors.arrivalTime = 'Cannot select a past date or time'
    }
    
    if (formData.departureTime && formData.arrivalTime && !newErrors.departureTime && !newErrors.arrivalTime) {
      const depTime = new Date(formData.departureTime)
      const arrTime = new Date(formData.arrivalTime)
      if (arrTime <= depTime) {
        newErrors.arrivalTime = 'Arrival time must be after departure time'
      }
    }
    ;(formData.additionalDelegates || []).forEach((d, idx) => {
      if (!d.flightSameAsPrimary) {
        if (!d.flightNo2?.trim()) newErrors[`delegates.${idx}.flightNo2`] = 'Flight number is required'
        if (!d.departureTime2) newErrors[`delegates.${idx}.departureTime2`] = 'Departure time is required'
        if (!d.arrivalTime2) newErrors[`delegates.${idx}.arrivalTime2`] = 'Arrival time is required'
        if (d.departureTime2 && d.arrivalTime2 && new Date(d.arrivalTime2) <= new Date(d.departureTime2)) {
          newErrors[`delegates.${idx}.arrivalTime2`] = 'Arrival must be after departure'
        }
      }
    })
    if (formData.includeReturn) {
      if (!formData.returnFlightNo?.trim()) newErrors.returnFlightNo = 'Return flight number is required'
      if (!formData.returnAirline?.trim()) newErrors.returnAirline = 'Return airline is required'
      if (!formData.returnDepartureAirport?.trim()) newErrors.returnDepartureAirport = 'Return departure airport is required'
      if (!formData.returnArrivalAirport?.trim()) newErrors.returnArrivalAirport = 'Return arrival airport is required'
      if (!formData.returnDepartureTime) newErrors.returnDepartureTime = 'Return departure time is required'
      if (!formData.returnArrivalTime) newErrors.returnArrivalTime = 'Return arrival time is required'
      if (formData.returnDepartureTime && formData.returnArrivalTime && new Date(formData.returnArrivalTime) <= new Date(formData.returnDepartureTime)) {
        newErrors.returnArrivalTime = 'Return arrival must be after return departure'
      }
      if (!formData.returnPickupLocation?.trim()) newErrors.returnPickupLocation = 'Return pickup location is required'
      if (!formData.returnDropLocation?.trim()) newErrors.returnDropLocation = 'Return drop location is required'
      if (!formData.returnEventPlace?.trim()) newErrors.returnEventPlace = 'Return event place is required'
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
        customer_details: {
          job_position: formData.jobPosition?.trim() || undefined,
          company_name: formData.companyName?.trim() || undefined,
          consent_email: formData.consentEmail || undefined,
          consent_whatsapp: formData.consentWhatsapp || undefined,
          whatsapp_number: formData.whatsappNumber?.trim() || undefined,
          flight_booked: formData.flightBooked || undefined
        },
        flight_details: {
          flight_no: formData.flightNo.trim().toUpperCase(),
          airline: formData.airline.trim(),
          departure_airport: formData.departureAirport.trim(),
          arrival_airport: formData.arrivalAirport.trim(),
          departure_time: new Date(formData.departureTime).toISOString(),
          arrival_time: new Date(formData.arrivalTime).toISOString(),
          status: 'on_time',
          delay_minutes: 0
        }
      }
      const delegates = (formData.additionalDelegates || []).filter((d) => d.travelerId)
      const legacyDelegate = (formData.additionalDelegates || []).find((d) => !d.travelerId)
      if (delegates.length > 0) {
        payload.delegates = delegates.map((d) => {
          const entry = { traveler_id: d.travelerId, flight_same_as_primary: d.flightSameAsPrimary !== false }
          if (!entry.flight_same_as_primary && d.departureTime2 && d.arrivalTime2) {
            entry.flight_details = {
              flight_no: (d.flightNo2 || 'XX000').trim().toUpperCase(),
              airline: (d.airline2 || 'TBD').trim(),
              departure_airport: (d.departureAirport2 || 'TBD').trim(),
              arrival_airport: (d.arrivalAirport2 || 'TBD').trim(),
              departure_time: new Date(d.departureTime2).toISOString(),
              arrival_time: new Date(d.arrivalTime2).toISOString(),
              status: 'on_time',
              delay_minutes: 0
            }
          }
          return entry
        })
      }
      if (legacyDelegate) {
        payload.traveler_details = {
          name: legacyDelegate.travelerName?.trim() || '',
          email: '',
          contact_number: '',
          flight_same_as_delegate_1: legacyDelegate.flightSameAsPrimary !== false
        }
        if (!legacyDelegate.flightSameAsPrimary && legacyDelegate.departureTime2 && legacyDelegate.arrivalTime2) {
          payload.traveler_flight_details = {
            flight_no: (legacyDelegate.flightNo2 || 'XX000').trim().toUpperCase(),
            airline: (legacyDelegate.airline2 || 'TBD').trim(),
            departure_airport: (legacyDelegate.departureAirport2 || 'TBD').trim(),
            arrival_airport: (legacyDelegate.arrivalAirport2 || 'TBD').trim(),
            departure_time: new Date(legacyDelegate.departureTime2).toISOString(),
            arrival_time: new Date(legacyDelegate.arrivalTime2).toISOString(),
            status: 'on_time',
            delay_minutes: 0
          }
        }
      }
      if (formData.includeReturn && formData.returnFlightNo?.trim() && formData.returnAirline?.trim() && formData.returnDepartureAirport?.trim() && formData.returnArrivalAirport?.trim() && formData.returnDepartureTime && formData.returnArrivalTime && formData.returnPickupLocation?.trim() && formData.returnDropLocation?.trim() && formData.returnEventPlace?.trim()) {
        payload.return_flight_details = {
          flight_no: formData.returnFlightNo.trim().toUpperCase(),
          airline: formData.returnAirline.trim(),
          departure_airport: formData.returnDepartureAirport.trim(),
          arrival_airport: formData.returnArrivalAirport.trim(),
          departure_time: new Date(formData.returnDepartureTime).toISOString(),
          arrival_time: new Date(formData.returnArrivalTime).toISOString(),
          status: 'on_time',
          delay_minutes: 0
        }
        payload.return_transfer_details = {
          pickup_location: formData.returnPickupLocation.trim(),
          drop_location: formData.returnDropLocation.trim(),
          event_place: formData.returnEventPlace.trim(),
          estimated_pickup_time: new Date(formData.returnDepartureTime).toISOString(),
          special_notes: ''
        }
      } else {
        payload.return_flight_details = null
        payload.return_transfer_details = null
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

  const delegateNames = (formData.additionalDelegates || []).map((d) => d.travelerName).filter(Boolean)
  const travelerName = delegateNames.length > 0 ? delegateNames.join(', ') : (transfer?.traveler_details?.name || transfer?.customer_details?.name || null)
  const subtitle = (
    <span className="block text-muted-foreground">
      {transfer?._id && <span className="font-mono text-xs tracking-wide text-foreground/90">{transfer._id}</span>}
      {travelerName && (
        <span className="block mt-1.5 text-sm">
          {formData.additionalDelegates?.length > 1 ? 'Delegates: ' : 'Delegate: '}
          <span className="font-medium text-foreground">{travelerName}</span>
        </span>
      )}
    </span>
  )

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Flight details"
      subtitle={subtitle}
      position="right"
      size="md"
    >
      <div className="flex flex-col h-full">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4 space-y-6">
            {/* Delegate 1 optional details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Your details (Delegate 1)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Job Position / Designation</label>
                  <input type="text" value={formData.jobPosition} onChange={(e) => setFormData({ ...formData, jobPosition: e.target.value })} className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground" placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Company Name</label>
                  <input type="text" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground" placeholder="Optional" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
                  <input type="checkbox" checked={formData.consentEmail} onChange={(e) => setFormData({ ...formData, consentEmail: e.target.checked })} className="rounded border-input" />
                  I agree to receive email communication regarding airport transfers and event travel.
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
                  <input type="checkbox" checked={formData.consentWhatsapp} onChange={(e) => setFormData({ ...formData, consentWhatsapp: e.target.checked })} className="rounded border-input" />
                  I consent to receive WhatsApp notifications for pickup schedules and updates.
                </label>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">WhatsApp number (if different)</label>
                  <input type="tel" value={formData.whatsappNumber} onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })} className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground" placeholder="+1234567890" />
                </div>
              </div>
            </div>

            {/* Flight Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Plane size={20} className="text-primary" />
                Flight Details (Delegate 1)
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
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground placeholder:text-muted-foreground placeholder:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring ${
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
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground placeholder:text-muted-foreground placeholder:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring ${
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
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground placeholder:text-muted-foreground placeholder:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring ${
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
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground placeholder:text-muted-foreground placeholder:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring ${
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
                <DatePicker
                  selected={formData.departureTime ? new Date(formData.departureTime) : null}
                  onChange={(date) => {
                    if (!date) {
                      setFormData((prev) => ({ ...prev, departureTime: '', arrivalTime: '' }))
                      return
                    }
                    const departureTime = toDatetimeLocal(date)
                    setErrors((err) => ({ ...err, departureTime: undefined }))
                    let arrivalTime = formData.arrivalTime
                    if (arrivalTime && new Date(arrivalTime) <= new Date(departureTime)) {
                      arrivalTime = ''
                    }
                    if (!arrivalTime) arrivalTime = getDefaultArrivalTime(departureTime)
                    setFormData({ ...formData, departureTime, arrivalTime })
                  }}
                  minDate={startOfDay(new Date())}
                  showTimeSelect
                  timeIntervals={15}
                  timeCaption="Time"
                  dateFormat="dd MMM yyyy, HH:mm"
                  placeholderText="Select date and time"
                  filterTime={(time) => time.getTime() >= getMinTimeForFilter().getTime()}
                  popperClassName="halo-datepicker-popper"
                  calendarClassName="halo-datepicker-calendar"
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring dark:[color-scheme:dark] ${
                    errors.departureTime ? 'border-destructive' : 'border-input'
                  }`}
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
                <DatePicker
                  selected={formData.arrivalTime ? new Date(formData.arrivalTime) : null}
                  onChange={(date) => {
                    if (!date) {
                      setFormData((prev) => ({ ...prev, arrivalTime: '' }))
                      return
                    }
                    const arrivalTime = toDatetimeLocal(date)
                    setErrors((err) => ({ ...err, arrivalTime: undefined }))
                    setFormData({ ...formData, arrivalTime })
                  }}
                  minDate={
                    formData.departureTime
                      ? startOfDay(new Date(formData.departureTime))
                      : startOfDay(new Date())
                  }
                  showTimeSelect
                  timeIntervals={15}
                  timeCaption="Time"
                  dateFormat="dd MMM yyyy, HH:mm"
                  placeholderText="Select date and time"
                  filterTime={(time) => {
                    const minT = getMinTimeForFilter()
                    if (time.getTime() < minT.getTime()) return false
                    if (formData.departureTime) {
                      const dep = new Date(formData.departureTime)
                      if (isSameDay(time, dep)) return time.getTime() > dep.getTime()
                    }
                    return true
                  }}
                  popperClassName="halo-datepicker-popper"
                  calendarClassName="halo-datepicker-calendar"
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring dark:[color-scheme:dark] ${
                    errors.arrivalTime ? 'border-destructive' : 'border-input'
                  }`}
                />
                {errors.arrivalTime && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.arrivalTime}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-border">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!formData.includeReturn}
                  onChange={(e) => setFormData((prev) => ({ ...prev, includeReturn: e.target.checked }))}
                  className="rounded border-input"
                />
                Include return transfer (round trip)
              </label>
            </div>

            {formData.includeReturn && (
              <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/30">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Plane size={20} className="text-primary" />
                  Return transfer
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Return Flight Number <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.returnFlightNo}
                      onChange={(e) => setFormData({ ...formData, returnFlightNo: e.target.value.toUpperCase() })}
                      className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground placeholder:text-muted-foreground placeholder:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring ${
                        errors.returnFlightNo ? 'border-destructive' : 'border-input'
                      }`}
                      placeholder="e.g., AI203, EK502"
                      maxLength="6"
                    />
                    {errors.returnFlightNo && <p className="text-xs text-destructive mt-1">{errors.returnFlightNo}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Return Airline <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.returnAirline}
                      onChange={(e) => setFormData({ ...formData, returnAirline: e.target.value })}
                      className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground placeholder:text-muted-foreground placeholder:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring ${
                        errors.returnAirline ? 'border-destructive' : 'border-input'
                      }`}
                      placeholder="e.g., Air India, Emirates"
                    />
                    {errors.returnAirline && <p className="text-xs text-destructive mt-1">{errors.returnAirline}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Return Departure Airport <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.returnDepartureAirport}
                      onChange={(e) => setFormData({ ...formData, returnDepartureAirport: e.target.value.toUpperCase() })}
                      className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground placeholder:text-muted-foreground placeholder:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring ${
                        errors.returnDepartureAirport ? 'border-destructive' : 'border-input'
                      }`}
                      placeholder="e.g., BOM, DEL"
                      maxLength="3"
                    />
                    {errors.returnDepartureAirport && <p className="text-xs text-destructive mt-1">{errors.returnDepartureAirport}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Return Arrival Airport <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.returnArrivalAirport}
                      onChange={(e) => setFormData({ ...formData, returnArrivalAirport: e.target.value.toUpperCase() })}
                      className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground placeholder:text-muted-foreground placeholder:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring ${
                        errors.returnArrivalAirport ? 'border-destructive' : 'border-input'
                      }`}
                      placeholder="e.g., DXB, JFK"
                      maxLength="3"
                    />
                    {errors.returnArrivalAirport && <p className="text-xs text-destructive mt-1">{errors.returnArrivalAirport}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Return Departure Time <span className="text-destructive">*</span>
                    </label>
                    <DatePicker
                      selected={formData.returnDepartureTime ? new Date(formData.returnDepartureTime) : null}
                      onChange={(date) => {
                        if (!date) {
                          setFormData((prev) => ({ ...prev, returnDepartureTime: '', returnArrivalTime: '' }))
                          return
                        }
                        const departureTime2 = toDatetimeLocal(date)
                        setErrors((err) => ({ ...err, returnDepartureTime: undefined }))
                        let arrivalTime2 = formData.returnArrivalTime
                        if (arrivalTime2 && new Date(arrivalTime2) <= new Date(departureTime2)) arrivalTime2 = ''
                        if (!arrivalTime2) arrivalTime2 = getDefaultArrivalTime(departureTime2)
                        setFormData({ ...formData, returnDepartureTime: departureTime2, returnArrivalTime: arrivalTime2 })
                      }}
                      minDate={startOfDay(new Date())}
                      showTimeSelect
                      timeIntervals={15}
                      timeCaption="Time"
                      dateFormat="dd MMM yyyy, HH:mm"
                      placeholderText="Select date and time"
                      filterTime={(time) => time.getTime() >= getMinTimeForFilter().getTime()}
                      popperClassName="halo-datepicker-popper"
                      calendarClassName="halo-datepicker-calendar"
                      className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring dark:[color-scheme:dark] ${
                        errors.returnDepartureTime ? 'border-destructive' : 'border-input'
                      }`}
                    />
                    {errors.returnDepartureTime && <p className="text-xs text-destructive mt-1">{errors.returnDepartureTime}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Return Arrival Time <span className="text-destructive">*</span>
                    </label>
                    <DatePicker
                      selected={formData.returnArrivalTime ? new Date(formData.returnArrivalTime) : null}
                      onChange={(date) => {
                        if (!date) {
                          setFormData((prev) => ({ ...prev, returnArrivalTime: '' }))
                          return
                        }
                        const arrivalTime2 = toDatetimeLocal(date)
                        setErrors((err) => ({ ...err, returnArrivalTime: undefined }))
                        setFormData({ ...formData, returnArrivalTime: arrivalTime2 })
                      }}
                      minDate={
                        formData.returnDepartureTime
                          ? startOfDay(new Date(formData.returnDepartureTime))
                          : startOfDay(new Date())
                      }
                      showTimeSelect
                      timeIntervals={15}
                      timeCaption="Time"
                      dateFormat="dd MMM yyyy, HH:mm"
                      placeholderText="Select date and time"
                      filterTime={(time) => {
                        const minT = getMinTimeForFilter()
                        if (time.getTime() < minT.getTime()) return false
                        if (formData.returnDepartureTime) {
                          const dep = new Date(formData.returnDepartureTime)
                          if (isSameDay(time, dep)) return time.getTime() > dep.getTime()
                        }
                        return true
                      }}
                      popperClassName="halo-datepicker-popper"
                      calendarClassName="halo-datepicker-calendar"
                      className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring dark:[color-scheme:dark] ${
                        errors.returnArrivalTime ? 'border-destructive' : 'border-input'
                      }`}
                    />
                    {errors.returnArrivalTime && <p className="text-xs text-destructive mt-1">{errors.returnArrivalTime}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Return pickup location <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.returnPickupLocation}
                      onChange={(e) => setFormData({ ...formData, returnPickupLocation: e.target.value })}
                      className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground ${
                        errors.returnPickupLocation ? 'border-destructive' : 'border-input'
                      }`}
                      placeholder="e.g., Hotel / Venue"
                    />
                    {errors.returnPickupLocation && <p className="text-xs text-destructive mt-1">{errors.returnPickupLocation}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Return drop location <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.returnDropLocation}
                      onChange={(e) => setFormData({ ...formData, returnDropLocation: e.target.value })}
                      className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground ${
                        errors.returnDropLocation ? 'border-destructive' : 'border-input'
                      }`}
                      placeholder="e.g., Airport"
                    />
                    {errors.returnDropLocation && <p className="text-xs text-destructive mt-1">{errors.returnDropLocation}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Return event place <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.returnEventPlace}
                      onChange={(e) => setFormData({ ...formData, returnEventPlace: e.target.value })}
                      className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground ${
                        errors.returnEventPlace ? 'border-destructive' : 'border-input'
                      }`}
                      placeholder="e.g., Venue / Airport terminal"
                    />
                    {errors.returnEventPlace && <p className="text-xs text-destructive mt-1">{errors.returnEventPlace}</p>}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4 pt-6 border-t border-border">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <UsersIcon size={20} className="text-primary" />
                Additional delegates
              </h3>
              <p className="text-sm text-muted-foreground">Add delegates from your Travelers. Manage delegate details on the Travelers page.</p>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Add delegate</label>
                <Dropdown
                  name="addDelegate"
                  value={addDelegateSelectValue}
                  onChange={(e) => {
                    const id = e.target.value
                    if (!id) return
                    const t = travelers.find((x) => (x._id || x.id) === id)
                    const name = t ? getTravelerName(t) : ''
                    const used = (formData.additionalDelegates || []).map((d) => d.travelerId).filter(Boolean)
                    if (used.includes(id)) return
                    setFormData((prev) => ({
                      ...prev,
                      additionalDelegates: [...(prev.additionalDelegates || []), {
                        travelerId: id,
                        travelerName: name,
                        flightSameAsPrimary: true,
                        flightNo2: '',
                        airline2: '',
                        departureAirport2: '',
                        arrivalAirport2: '',
                        departureTime2: '',
                        arrivalTime2: ''
                      }]
                    }))
                    setAddDelegateSelectValue('')
                  }}
                  options={[
                    { value: '', label: 'Select a traveler...' },
                    ...(travelers || []).filter((t) => !(formData.additionalDelegates || []).some((d) => d.travelerId === (t._id || t.id))).map((t) => ({
                      value: t._id || t.id,
                      label: `${getTravelerName(t) || t.email} (${t.email})`
                    }))
                  ]}
                  placeholder="Select a traveler..."
                  minWidth="100%"
                />
              </div>
              {(formData.additionalDelegates || []).map((d, idx) => (
                <div key={d.travelerId || idx} className="p-4 rounded-lg border border-border bg-muted/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{d.travelerName || 'Delegate'}</span>
                    <button type="button" onClick={() => setFormData((prev) => ({ ...prev, additionalDelegates: prev.additionalDelegates.filter((_, i) => i !== idx) }))} className="text-red-600 hover:text-red-700 p-1">
                      <XCircle size={18} />
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Flight same as primary?</label>
                    <Dropdown
                      name={`flightSameAsPrimary_${idx}`}
                      value={d.flightSameAsPrimary ? 'yes' : 'no'}
                      onChange={(e) => setFormData((prev) => ({ ...prev, additionalDelegates: prev.additionalDelegates.map((item, i) => (i === idx ? { ...item, flightSameAsPrimary: e.target.value === 'yes' } : item)) }))}
                      options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
                      minWidth="100%"
                    />
                  </div>
                  {!d.flightSameAsPrimary && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Flight Number *</label>
                        <input type="text" value={d.flightNo2 || ''} onChange={(e) => setFormData((prev) => ({ ...prev, additionalDelegates: prev.additionalDelegates.map((item, i) => (i === idx ? { ...item, flightNo2: e.target.value.toUpperCase() } : item)) }))} className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground ${errors[`delegates.${idx}.flightNo2`] ? 'border-destructive' : 'border-input'}`} placeholder="e.g. AI202" />
                        {errors[`delegates.${idx}.flightNo2`] && <p className="text-xs text-destructive mt-1">{errors[`delegates.${idx}.flightNo2`]}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Airline</label>
                        <input type="text" value={d.airline2 || ''} onChange={(e) => setFormData((prev) => ({ ...prev, additionalDelegates: prev.additionalDelegates.map((item, i) => (i === idx ? { ...item, airline2: e.target.value } : item)) }))} className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground" placeholder="TBD" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Departure Airport</label>
                        <input type="text" value={d.departureAirport2 || ''} onChange={(e) => setFormData((prev) => ({ ...prev, additionalDelegates: prev.additionalDelegates.map((item, i) => (i === idx ? { ...item, departureAirport2: e.target.value.toUpperCase() } : item)) }))} className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground" maxLength="3" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Arrival Airport</label>
                        <input type="text" value={d.arrivalAirport2 || ''} onChange={(e) => setFormData((prev) => ({ ...prev, additionalDelegates: prev.additionalDelegates.map((item, i) => (i === idx ? { ...item, arrivalAirport2: e.target.value.toUpperCase() } : item)) }))} className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground" maxLength="3" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Departure Time *</label>
                        <DatePicker selected={d.departureTime2 ? new Date(d.departureTime2) : null} onChange={(date) => {
                          if (!date) setFormData((prev) => ({ ...prev, additionalDelegates: prev.additionalDelegates.map((item, i) => (i === idx ? { ...item, departureTime2: '', arrivalTime2: '' } : item)) }))
                          else {
                            const dep = toDatetimeLocal(date)
                            let arr = d.arrivalTime2
                            if (arr && new Date(arr) <= new Date(dep)) arr = getDefaultArrivalTime(dep)
                            setFormData((prev) => ({ ...prev, additionalDelegates: prev.additionalDelegates.map((item, i) => (i === idx ? { ...item, departureTime2: dep, arrivalTime2: arr || item.arrivalTime2 } : item)) }))
                          }
                        }} minDate={startOfDay(new Date())} showTimeSelect timeIntervals={15} dateFormat="dd MMM yyyy, HH:mm" placeholderText="Select" filterTime={(time) => time.getTime() >= getMinTimeForFilter().getTime()} popperClassName="halo-datepicker-popper" calendarClassName="halo-datepicker-calendar" className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground ${errors[`delegates.${idx}.departureTime2`] ? 'border-destructive' : 'border-input'}`} />
                        {errors[`delegates.${idx}.departureTime2`] && <p className="text-xs text-destructive mt-1">{errors[`delegates.${idx}.departureTime2`]}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Arrival Time *</label>
                        <DatePicker selected={d.arrivalTime2 ? new Date(d.arrivalTime2) : null} onChange={(date) => setFormData((prev) => ({ ...prev, additionalDelegates: prev.additionalDelegates.map((item, i) => (i === idx ? { ...item, arrivalTime2: date ? toDatetimeLocal(date) : '' } : item)) }))} minDate={d.departureTime2 ? startOfDay(new Date(d.departureTime2)) : startOfDay(new Date())} showTimeSelect timeIntervals={15} dateFormat="dd MMM yyyy, HH:mm" placeholderText="Select" filterTime={(time) => {
                          const minT = getMinTimeForFilter()
                          if (time.getTime() < minT.getTime()) return false
                          if (d.departureTime2) { const dep = new Date(d.departureTime2); if (isSameDay(time, dep)) return time.getTime() > dep.getTime() }
                          return true
                        }} popperClassName="halo-datepicker-popper" calendarClassName="halo-datepicker-calendar" className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground ${errors[`delegates.${idx}.arrivalTime2`] ? 'border-destructive' : 'border-input'}`} />
                        {errors[`delegates.${idx}.arrivalTime2`] && <p className="text-xs text-destructive mt-1">{errors[`delegates.${idx}.arrivalTime2`]}</p>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
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

