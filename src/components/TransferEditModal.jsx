import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Users as UsersIcon, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';
import { useApi } from '../hooks/useApi';
import Drawer from './Drawer';

const getTravelerName = (t) => {
  if (!t) return '';
  if (typeof t === 'object' && t.profile) return `${t.profile.firstName || ''} ${t.profile.lastName || ''}`.trim() || t.email || '';
  return '';
};

const TransferEditModal = ({ transfer, onClose, onSuccess }) => {
  const { isDark } = useTheme();
  const api = useApi();
  const [travelers, setTravelers] = useState([]);
  const [formData, setFormData] = useState({
    customer_details: {
      name: '',
      email: '',
      contact_number: '',
      passenger_count: 1,
      job_position: '',
      company_name: '',
      consent_email: false,
      consent_whatsapp: false,
      whatsapp_number: '',
      flight_booked: false
    },
    flight_details: {
      flight_no: '',
      airline: '',
      departure_airport: '',
      arrival_airport: '',
      departure_time: '',
      arrival_time: '',
      status: 'scheduled'
    },
    traveler_details: null,
    traveler_flight_details: null,
    delegates: [],
    transfer_details: {
      pickup_location: '',
      drop_location: '',
      transfer_type: 'airport',
      estimated_pickup_time: '',
      estimated_drop_time: '',
      status: 'pending'
    },
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Minimum datetime for inputs (no past): format YYYY-MM-DDTHH:mm for datetime-local
  const getMinDatetimeNow = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [minDatetimeNow, setMinDatetimeNow] = useState(() => getMinDatetimeNow());

  // Keep min current every minute so older times cannot be selected
  useEffect(() => {
    if (!transfer) return;
    setMinDatetimeNow(getMinDatetimeNow());
    const interval = setInterval(() => setMinDatetimeNow(getMinDatetimeNow()), 60 * 1000);
    return () => clearInterval(interval);
  }, [transfer]);

  const toDatetimeLocal = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  useEffect(() => {
    if (transfer) {
      const cd = transfer.customer_details || {};
      const fd = transfer.flight_details || {};
      const td = transfer.traveler_details || null;
      const tfd = transfer.traveler_flight_details || null;
      let delegates = [];
      if (transfer.delegates && transfer.delegates.length > 0) {
        delegates = transfer.delegates.map((d) => {
          const tid = d.traveler_id?._id || d.traveler_id;
          const tfd0 = d.flight_details || {};
          return {
            traveler_id: tid?.toString?.() || tid,
            travelerName: getTravelerName(d.traveler_id),
            flight_same_as_primary: d.flight_same_as_primary !== false,
            flight_details: tfd0.departure_time || tfd0.arrival_time ? {
              ...tfd0,
              departure_time: tfd0.departure_time ? toDatetimeLocal(tfd0.departure_time) : '',
              arrival_time: tfd0.arrival_time ? toDatetimeLocal(tfd0.arrival_time) : ''
            } : null
          };
        });
      } else if (td && (td.name || td.email)) {
        delegates = [{
          traveler_id: transfer.traveler_id?.toString?.() || transfer.traveler_id || null,
          travelerName: td.name || td.email || '',
          flight_same_as_primary: td.flight_same_as_delegate_1 !== false,
          flight_details: tfd && (tfd.departure_time || tfd.arrival_time) ? {
            ...tfd,
            departure_time: tfd.departure_time ? toDatetimeLocal(tfd.departure_time) : '',
            arrival_time: tfd.arrival_time ? toDatetimeLocal(tfd.arrival_time) : ''
          } : null
        }];
      }
      setFormData({
        customer_details: {
          name: cd.name || '',
          email: cd.email || '',
          contact_number: cd.contact_number || '',
          passenger_count: cd.passenger_count ?? cd.no_of_passengers ?? 1,
          job_position: cd.job_position || '',
          company_name: cd.company_name || '',
          consent_email: !!cd.consent_email,
          consent_whatsapp: !!cd.consent_whatsapp,
          whatsapp_number: cd.whatsapp_number || '',
          flight_booked: !!cd.flight_booked
        },
        flight_details: {
          flight_no: fd.flight_no || '',
          airline: fd.airline || '',
          departure_airport: fd.departure_airport || '',
          arrival_airport: fd.arrival_airport || '',
          departure_time: fd.departure_time ? toDatetimeLocal(fd.departure_time) : '',
          arrival_time: fd.arrival_time ? toDatetimeLocal(fd.arrival_time) : '',
          status: fd.status || 'scheduled'
        },
        traveler_details: td ? { ...td } : null,
        traveler_flight_details: tfd ? { ...tfd, departure_time: tfd.departure_time ? toDatetimeLocal(tfd.departure_time) : '', arrival_time: tfd.arrival_time ? toDatetimeLocal(tfd.arrival_time) : '' } : null,
        delegates,
        transfer_details: {
          pickup_location: transfer.transfer_details?.pickup_location || '',
          drop_location: transfer.transfer_details?.drop_location || '',
          transfer_type: transfer.transfer_details?.transfer_type || 'airport',
          estimated_pickup_time: transfer.transfer_details?.estimated_pickup_time ? toDatetimeLocal(transfer.transfer_details.estimated_pickup_time) : '',
          estimated_drop_time: transfer.transfer_details?.estimated_drop_time ? toDatetimeLocal(transfer.transfer_details.estimated_drop_time) : '',
          status: transfer.transfer_details?.status || 'pending'
        },
        notes: transfer.notes || ''
      });
    }
  }, [transfer]);

  useEffect(() => {
    if (transfer) {
      api.get('/travelers').then((r) => {
        if (r.success && Array.isArray(r.data)) setTravelers(r.data);
      }).catch(() => setTravelers([]));
    }
  }, [transfer]);

  const handleInputChange = (section, field, value) => {
    const dateTimeFields = ['arrival_time', 'departure_time', 'estimated_pickup_time', 'estimated_drop_time'];
    if (dateTimeFields.includes(field) && value && new Date(value) < new Date()) {
      setErrors(prev => ({ ...prev, [`${section}.${field}`]: 'Cannot select a past date or time' }));
      setFormData(prev => ({ ...prev, [section]: { ...prev[section], [field]: '' } }));
      return;
    }
    setFormData(prev => {
      const next = { ...prev };
      if (section === 'traveler_details' || section === 'traveler_flight_details') {
        next[section] = next[section] ? { ...next[section], [field]: value } : { [field]: value };
        // When user sets "Flight same as Delegate 1?" to No, initialize Delegate 2 flight from Delegate 1 so the block is editable
        if (section === 'traveler_details' && field === 'flight_same_as_delegate_1' && value === false && !next.traveler_flight_details) {
          const fd = prev.flight_details;
          next.traveler_flight_details = {
            flight_no: fd?.flight_no || '',
            airline: fd?.airline || '',
            departure_airport: fd?.departure_airport || '',
            arrival_airport: fd?.arrival_airport || '',
            departure_time: fd?.departure_time || '',
            arrival_time: fd?.arrival_time || '',
            status: fd?.status || 'scheduled'
          };
        }
      } else {
        next[section] = { ...prev[section], [field]: value };
      }
      return next;
    });
    if (errors[`${section}.${field}`]) {
      setErrors(prev => ({ ...prev, [`${section}.${field}`]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Customer validation
    if (!formData.customer_details.name.trim()) {
      newErrors['customer_details.name'] = 'Customer name is required';
    }
    if (!formData.customer_details.email.trim()) {
      newErrors['customer_details.email'] = 'Customer email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.customer_details.email)) {
      newErrors['customer_details.email'] = 'Invalid email format';
    }
    if (!formData.customer_details.contact_number.trim()) {
      newErrors['customer_details.contact_number'] = 'Contact number is required';
    }
    if (formData.customer_details.passenger_count < 1) {
      newErrors['customer_details.passenger_count'] = 'At least 1 passenger required';
    }

    // Flight validation
    if (!formData.flight_details.flight_no.trim()) {
      newErrors['flight_details.flight_no'] = 'Flight number is required';
    }
    if (!formData.flight_details.airline.trim()) {
      newErrors['flight_details.airline'] = 'Airline is required';
    }
    if (!formData.flight_details.arrival_airport.trim()) {
      newErrors['flight_details.arrival_airport'] = 'Arrival airport is required';
    }
    if (!formData.flight_details.arrival_time) {
      newErrors['flight_details.arrival_time'] = 'Arrival time is required';
    } else if (new Date(formData.flight_details.arrival_time) < new Date()) {
      newErrors['flight_details.arrival_time'] = 'Cannot select a past date or time';
    }

    // Transfer validation
    if (!formData.transfer_details.pickup_location.trim()) {
      newErrors['transfer_details.pickup_location'] = 'Pickup location is required';
    }
    if (!formData.transfer_details.drop_location.trim()) {
      newErrors['transfer_details.drop_location'] = 'Drop location is required';
    }
    if (!formData.transfer_details.estimated_pickup_time) {
      newErrors['transfer_details.estimated_pickup_time'] = 'Estimated pickup time is required';
    }
    if (!formData.transfer_details.estimated_drop_time) {
      newErrors['transfer_details.estimated_drop_time'] = 'Estimated drop time is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login to update transfers');
      return;
    }

    setLoading(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
      
      const fd = formData.flight_details;
      const flight_details = {
        ...fd,
        departure_time: fd.departure_time ? new Date(fd.departure_time).toISOString() : undefined,
        arrival_time: fd.arrival_time ? new Date(fd.arrival_time).toISOString() : undefined
      };
      const transfer_details = {
        ...formData.transfer_details,
        estimated_pickup_time: formData.transfer_details.estimated_pickup_time ? new Date(formData.transfer_details.estimated_pickup_time).toISOString() : undefined,
        estimated_drop_time: formData.transfer_details.estimated_drop_time ? new Date(formData.transfer_details.estimated_drop_time).toISOString() : undefined
      };
      const delegates = (formData.delegates || []).map((d) => {
        const tid = typeof d.traveler_id === 'object' && d.traveler_id?._id ? d.traveler_id._id : d.traveler_id;
        const entry = {
          traveler_id: tid?.toString?.() || tid,
          flight_same_as_primary: d.flight_same_as_primary !== false,
          flight_details: d.flight_details || null
        };
        if (entry.flight_details && (entry.flight_details.departure_time || entry.flight_details.arrival_time)) {
          entry.flight_details = {
            ...entry.flight_details,
            departure_time: entry.flight_details.departure_time ? new Date(entry.flight_details.departure_time).toISOString() : undefined,
            arrival_time: entry.flight_details.arrival_time ? new Date(entry.flight_details.arrival_time).toISOString() : undefined
          };
        }
        return entry;
      });
      const updateData = {
        ...formData,
        flight_details,
        transfer_details,
        delegates
      };

      const response = await fetch(`${API_BASE_URL}/transfers/${transfer._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (response.status === 401) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('token');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
        return;
      }

      if (response.status === 403) {
        toast.error('You do not have permission to update transfers.');
        return;
      }

      if (data.success) {
        toast.success('Transfer updated successfully!');
        if (onSuccess) onSuccess(data.data);
        if (onClose) onClose();
      } else {
        toast.error(data.message || 'Failed to update transfer');
      }
    } catch (error) {
      console.error('Error updating transfer:', error);
      toast.error('Failed to update transfer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const ErrorMessage = ({ error }) => {
    if (!error) return null;
    return (
      <div className="flex items-center mt-1 text-red-600 dark:text-red-400">
        <AlertCircle size={12} className="mr-1" />
        <span className="text-xs">{error}</span>
      </div>
    );
  };

  return (
    <Drawer
      isOpen={true}
      onClose={onClose}
      title="Edit Transfer"
      subtitle={transfer?._id}
      position="right"
      size="xl"
    >
      <form onSubmit={handleSubmit}>
          {/* Customer Details */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Customer Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={formData.customer_details.name}
                  onChange={(e) => handleInputChange('customer_details', 'name', e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors['customer_details.name'] 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Enter customer name"
                />
                <ErrorMessage error={errors['customer_details.name']} />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.customer_details.email}
                  onChange={(e) => handleInputChange('customer_details', 'email', e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors['customer_details.email'] 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Enter email address"
                />
                <ErrorMessage error={errors['customer_details.email']} />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Contact Number *
                </label>
                <input
                  type="tel"
                  value={formData.customer_details.contact_number}
                  onChange={(e) => handleInputChange('customer_details', 'contact_number', e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors['customer_details.contact_number'] 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Enter contact number"
                />
                <ErrorMessage error={errors['customer_details.contact_number']} />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Passenger Count *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.customer_details.passenger_count}
                  onChange={(e) => handleInputChange('customer_details', 'passenger_count', parseInt(e.target.value))}
                  className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors['customer_details.passenger_count'] 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                <ErrorMessage error={errors['customer_details.passenger_count']} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Job Position</label>
                <input type="text" value={formData.customer_details.job_position || ''} onChange={(e) => handleInputChange('customer_details', 'job_position', e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Company Name</label>
                <input type="text" value={formData.customer_details.company_name || ''} onChange={(e) => handleInputChange('customer_details', 'company_name', e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Optional" />
              </div>
              <div className="md:col-span-2 flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={!!formData.customer_details.consent_email} onChange={(e) => handleInputChange('customer_details', 'consent_email', e.target.checked)} className="rounded border-gray-300" />
                  Consent to email communication
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={!!formData.customer_details.consent_whatsapp} onChange={(e) => handleInputChange('customer_details', 'consent_whatsapp', e.target.checked)} className="rounded border-gray-300" />
                  Consent to WhatsApp notifications
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">WhatsApp number (if different)</label>
                  <input type="tel" value={formData.customer_details.whatsapp_number || ''} onChange={(e) => handleInputChange('customer_details', 'whatsapp_number', e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="+1234567890" />
                </div>
              </div>
            </div>
          </div>

          {/* Flight Details */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Flight Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Flight Number *
                </label>
                <input
                  type="text"
                  value={formData.flight_details.flight_no}
                  onChange={(e) => handleInputChange('flight_details', 'flight_no', e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors['flight_details.flight_no'] 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="e.g., AI202"
                />
                <ErrorMessage error={errors['flight_details.flight_no']} />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Airline *
                </label>
                <input
                  type="text"
                  value={formData.flight_details.airline}
                  onChange={(e) => handleInputChange('flight_details', 'airline', e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors['flight_details.airline'] 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="e.g., Air India"
                />
                <ErrorMessage error={errors['flight_details.airline']} />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Departure Airport
                </label>
                <input
                  type="text"
                  value={formData.flight_details.departure_airport}
                  onChange={(e) => handleInputChange('flight_details', 'departure_airport', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., DEL"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Arrival Airport *
                </label>
                <input
                  type="text"
                  value={formData.flight_details.arrival_airport}
                  onChange={(e) => handleInputChange('flight_details', 'arrival_airport', e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors['flight_details.arrival_airport'] 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="e.g., BOM"
                />
                <ErrorMessage error={errors['flight_details.arrival_airport']} />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Departure Time
                </label>
                <input
                  type="datetime-local"
                  min={minDatetimeNow}
                  value={formData.flight_details.departure_time || ''}
                  onChange={(e) => handleInputChange('flight_details', 'departure_time', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Arrival Time *
                </label>
                <input
                  type="datetime-local"
                  min={minDatetimeNow}
                  value={formData.flight_details.arrival_time}
                  onChange={(e) => handleInputChange('flight_details', 'arrival_time', e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors['flight_details.arrival_time'] 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                <ErrorMessage error={errors['flight_details.arrival_time']} />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Flight Status
                </label>
                <select
                  value={formData.flight_details.status}
                  onChange={(e) => handleInputChange('flight_details', 'status', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="delayed">Delayed</option>
                  <option value="on_time">On Time</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <UsersIcon size={20} className="text-primary" />
              Additional delegates
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Delegates are managed on the Travelers page. Add or remove delegates for this transfer below.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Add delegate</label>
              <select
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) return;
                  const t = travelers.find((x) => (x._id || x.id) === id);
                  const name = t ? getTravelerName(t) : '';
                  const used = (formData.delegates || []).map((d) => d.traveler_id).filter(Boolean);
                  if (used.includes(id)) return;
                  setFormData((prev) => ({
                    ...prev,
                    delegates: [...(prev.delegates || []), {
                      traveler_id: id,
                      travelerName: name,
                      flight_same_as_primary: true,
                      flight_details: null
                    }]
                  }));
                  e.target.value = '';
                }}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select a traveler...</option>
                {(travelers || []).filter((t) => !(formData.delegates || []).some((d) => ((typeof d.traveler_id === 'object' ? d.traveler_id?._id : d.traveler_id) || '') === (t._id || t.id))).map((t) => (
                  <option key={t._id || t.id} value={t._id || t.id}>
                    {getTravelerName(t) || t.email} ({t.email})
                  </option>
                ))}
              </select>
            </div>
            {(formData.delegates || []).map((d, idx) => (
              <div key={d.traveler_id || idx} className="p-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 space-y-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-white">{d.travelerName || 'Delegate'}</span>
                  <button type="button" onClick={() => setFormData((prev) => ({ ...prev, delegates: prev.delegates.filter((_, i) => i !== idx) }))} className="text-red-600 hover:text-red-700 p-1">
                    <XCircle size={18} />
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Flight same as primary?</label>
                  <select
                    value={d.flight_same_as_primary ? 'yes' : 'no'}
                    onChange={(e) => {
                      const isSame = e.target.value === 'yes';
                      setFormData((prev) => {
                        const fd = prev.flight_details;
                        return {
                          ...prev,
                          delegates: prev.delegates.map((item, i) =>
                            i === idx
                              ? {
                                  ...item,
                                  flight_same_as_primary: isSame,
                                  flight_details: isSame ? null : (item.flight_details && (item.flight_details.departure_time || item.flight_details.arrival_time) ? item.flight_details : {
                                    flight_no: fd?.flight_no || '',
                                    airline: fd?.airline || '',
                                    departure_airport: fd?.departure_airport || '',
                                    arrival_airport: fd?.arrival_airport || '',
                                    departure_time: fd?.departure_time || '',
                                    arrival_time: fd?.arrival_time || ''
                                  })
                                }
                              : item
                          )
                        };
                      });
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                {d.flight_same_as_primary === false && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Flight Number</label>
                      <input type="text" value={d.flight_details?.flight_no || ''} onChange={(e) => setFormData((prev) => ({ ...prev, delegates: prev.delegates.map((item, i) => (i === idx ? { ...item, flight_details: { ...(item.flight_details || {}), flight_no: e.target.value } } : item)) }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Airline</label>
                      <input type="text" value={d.flight_details?.airline || ''} onChange={(e) => setFormData((prev) => ({ ...prev, delegates: prev.delegates.map((item, i) => (i === idx ? { ...item, flight_details: { ...(item.flight_details || {}), airline: e.target.value } } : item)) }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Departure Airport</label>
                      <input type="text" value={d.flight_details?.departure_airport || ''} onChange={(e) => setFormData((prev) => ({ ...prev, delegates: prev.delegates.map((item, i) => (i === idx ? { ...item, flight_details: { ...(item.flight_details || {}), departure_airport: e.target.value } } : item)) }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" maxLength="3" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Arrival Airport</label>
                      <input type="text" value={d.flight_details?.arrival_airport || ''} onChange={(e) => setFormData((prev) => ({ ...prev, delegates: prev.delegates.map((item, i) => (i === idx ? { ...item, flight_details: { ...(item.flight_details || {}), arrival_airport: e.target.value } } : item)) }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" maxLength="3" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Departure Time</label>
                      <input type="datetime-local" min={minDatetimeNow} value={d.flight_details?.departure_time || ''} onChange={(e) => setFormData((prev) => ({ ...prev, delegates: prev.delegates.map((item, i) => (i === idx ? { ...item, flight_details: { ...(item.flight_details || {}), departure_time: e.target.value } } : item)) }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Arrival Time</label>
                      <input type="datetime-local" min={minDatetimeNow} value={d.flight_details?.arrival_time || ''} onChange={(e) => setFormData((prev) => ({ ...prev, delegates: prev.delegates.map((item, i) => (i === idx ? { ...item, flight_details: { ...(item.flight_details || {}), arrival_time: e.target.value } } : item)) }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Transfer Details */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Transfer Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Pickup Location *
                </label>
                <input
                  type="text"
                  value={formData.transfer_details.pickup_location}
                  onChange={(e) => handleInputChange('transfer_details', 'pickup_location', e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors['transfer_details.pickup_location'] 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="e.g., Mumbai Airport Terminal 2"
                />
                <ErrorMessage error={errors['transfer_details.pickup_location']} />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Drop Location *
                </label>
                <input
                  type="text"
                  value={formData.transfer_details.drop_location}
                  onChange={(e) => handleInputChange('transfer_details', 'drop_location', e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors['transfer_details.drop_location'] 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="e.g., Hotel Taj Palace"
                />
                <ErrorMessage error={errors['transfer_details.drop_location']} />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Transfer Type
                </label>
                <select
                  value={formData.transfer_details.transfer_type}
                  onChange={(e) => handleInputChange('transfer_details', 'transfer_type', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="airport">Airport Transfer</option>
                  <option value="hotel">Hotel Transfer</option>
                  <option value="city">City Transfer</option>
                  <option value="intercity">Intercity Transfer</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Transfer Status
                </label>
                <select
                  value={formData.transfer_details.status}
                  onChange={(e) => handleInputChange('transfer_details', 'status', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Estimated Pickup Time *
                </label>
                <input
                  type="datetime-local"
                  min={minDatetimeNow}
                  value={formData.transfer_details.estimated_pickup_time}
                  onChange={(e) => handleInputChange('transfer_details', 'estimated_pickup_time', e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors['transfer_details.estimated_pickup_time'] 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                <ErrorMessage error={errors['transfer_details.estimated_pickup_time']} />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Estimated Drop Time *
                </label>
                <input
                  type="datetime-local"
                  min={minDatetimeNow}
                  value={formData.transfer_details.estimated_drop_time}
                  onChange={(e) => handleInputChange('transfer_details', 'estimated_drop_time', e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors['transfer_details.estimated_drop_time'] 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                <ErrorMessage error={errors['transfer_details.estimated_drop_time']} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Additional Notes
            </h3>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-y"
              placeholder="Enter any additional notes or special instructions..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-transparent border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2.5 border-none rounded-md text-sm font-medium text-white flex items-center gap-2 transition-all ${
                loading 
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                  : 'bg-blue-600 dark:bg-blue-500 cursor-pointer hover:bg-blue-700 dark:hover:bg-blue-600'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Update Transfer
                </>
              )}
            </button>
          </div>
        </form>
    </Drawer>
  );
};

export default TransferEditModal;
