import React, { useState, useEffect } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';
import Drawer from './Drawer';

const TransferEditModal = ({ transfer, onClose, onSuccess }) => {
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({
    customer_details: {
      name: '',
      email: '',
      contact_number: '',
      passenger_count: 1
    },
    flight_details: {
      flight_no: '',
      airline: '',
      departure_airport: '',
      arrival_airport: '',
      arrival_time: '',
      status: 'scheduled'
    },
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

  useEffect(() => {
    if (transfer) {
      setFormData({
        customer_details: {
          name: transfer.customer_details?.name || '',
          email: transfer.customer_details?.email || '',
          contact_number: transfer.customer_details?.contact_number || '',
          passenger_count: transfer.customer_details?.passenger_count || 1
        },
        flight_details: {
          flight_no: transfer.flight_details?.flight_no || '',
          airline: transfer.flight_details?.airline || '',
          departure_airport: transfer.flight_details?.departure_airport || '',
          arrival_airport: transfer.flight_details?.arrival_airport || '',
          arrival_time: transfer.flight_details?.arrival_time ? 
            new Date(transfer.flight_details.arrival_time).toISOString().slice(0, 16) : '',
          status: transfer.flight_details?.status || 'scheduled'
        },
        transfer_details: {
          pickup_location: transfer.transfer_details?.pickup_location || '',
          drop_location: transfer.transfer_details?.drop_location || '',
          transfer_type: transfer.transfer_details?.transfer_type || 'airport',
          estimated_pickup_time: transfer.transfer_details?.estimated_pickup_time ? 
            new Date(transfer.transfer_details.estimated_pickup_time).toISOString().slice(0, 16) : '',
          estimated_drop_time: transfer.transfer_details?.estimated_drop_time ? 
            new Date(transfer.transfer_details.estimated_drop_time).toISOString().slice(0, 16) : '',
          status: transfer.transfer_details?.status || 'pending'
        },
        notes: transfer.notes || ''
      });
    }
  }, [transfer]);

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    
    // Clear error when user starts typing
    if (errors[`${section}.${field}`]) {
      setErrors(prev => ({
        ...prev,
        [`${section}.${field}`]: ''
      }));
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
      
      // Convert datetime-local inputs to ISO strings
      const updateData = {
        ...formData,
        flight_details: {
          ...formData.flight_details,
          arrival_time: new Date(formData.flight_details.arrival_time).toISOString()
        },
        transfer_details: {
          ...formData.transfer_details,
          estimated_pickup_time: new Date(formData.transfer_details.estimated_pickup_time).toISOString(),
          estimated_drop_time: new Date(formData.transfer_details.estimated_drop_time).toISOString()
        }
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
                  Arrival Time *
                </label>
                <input
                  type="datetime-local"
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
