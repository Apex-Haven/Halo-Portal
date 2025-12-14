import React, { useState, useEffect } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { vendorService } from '../services/vendorService';
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';
import Drawer from './Drawer';

const VendorFormModal = ({ vendor, onClose, onSuccess }) => {
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: {
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    },
    businessDetails: {
      licenseNumber: '',
      taxId: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      website: ''
    },
    services: {
      airportTransfers: {
        enabled: true,
        vehicleTypes: [],
        capacity: { min: 1, max: 8 },
        coverage: []
      },
      hotelTransfers: {
        enabled: true,
        vehicleTypes: [],
        coverage: []
      },
      cityTours: {
        enabled: false,
        vehicleTypes: [],
        languages: []
      }
    },
    pricing: {
      baseRate: 0,
      currency: 'USD',
      perKmRate: 0,
      waitingTimeRate: 0,
      nightSurcharge: 0
    },
    status: 'pending_approval',
    preferences: {
      workingHours: {
        start: '06:00',
        end: '22:00',
        timezone: 'UTC'
      },
      notificationSettings: {
        email: true,
        sms: true,
        whatsapp: true,
        push: true
      },
      autoAcceptBookings: false,
      maxAdvanceBookingDays: 30
    },
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (vendor) {
      setFormData({
        companyName: vendor.companyName || '',
        contactPerson: {
          firstName: vendor.contactPerson?.firstName || '',
          lastName: vendor.contactPerson?.lastName || '',
          email: vendor.contactPerson?.email || '',
          phone: vendor.contactPerson?.phone || ''
        },
        businessDetails: {
          licenseNumber: vendor.businessDetails?.licenseNumber || '',
          taxId: vendor.businessDetails?.taxId || '',
          address: {
            street: vendor.businessDetails?.address?.street || '',
            city: vendor.businessDetails?.address?.city || '',
            state: vendor.businessDetails?.address?.state || '',
            zipCode: vendor.businessDetails?.address?.zipCode || '',
            country: vendor.businessDetails?.address?.country || ''
          },
          website: vendor.businessDetails?.website || ''
        },
        services: vendor.services || formData.services,
        pricing: vendor.pricing || formData.pricing,
        status: vendor.status || 'pending_approval',
        preferences: vendor.preferences || formData.preferences,
        notes: vendor.notes || ''
      });
    }
  }, [vendor]);

  const handleInputChange = (path, value) => {
    setFormData(prev => {
      const keys = path.split('.');
      const newData = { ...prev };
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
    
    // Clear error when user starts typing
    if (errors[path]) {
      setErrors(prev => ({
        ...prev,
        [path]: ''
      }));
    }
  };

  const handleArrayChange = (path, value, checked) => {
    setFormData(prev => {
      const keys = path.split('.');
      const newData = { ...prev };
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      const array = current[keys[keys.length - 1]] || [];
      if (checked) {
        current[keys[keys.length - 1]] = [...array, value];
      } else {
        current[keys[keys.length - 1]] = array.filter(item => item !== value);
      }
      return newData;
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.companyName.trim()) {
      newErrors['companyName'] = 'Company name is required';
    }
    if (!formData.contactPerson.firstName.trim()) {
      newErrors['contactPerson.firstName'] = 'First name is required';
    }
    if (!formData.contactPerson.lastName.trim()) {
      newErrors['contactPerson.lastName'] = 'Last name is required';
    }
    if (!formData.contactPerson.email.trim()) {
      newErrors['contactPerson.email'] = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.contactPerson.email)) {
      newErrors['contactPerson.email'] = 'Invalid email format';
    }
    if (!formData.contactPerson.phone.trim()) {
      newErrors['contactPerson.phone'] = 'Phone is required';
    } else if (!/^\+[1-9]\d{1,14}$/.test(formData.contactPerson.phone)) {
      newErrors['contactPerson.phone'] = 'Phone must be in international format (e.g., +1234567890)';
    }
    if (!formData.businessDetails.licenseNumber.trim()) {
      newErrors['businessDetails.licenseNumber'] = 'License number is required';
    }
    if (!formData.businessDetails.taxId.trim()) {
      newErrors['businessDetails.taxId'] = 'Tax ID is required';
    }
    if (!formData.businessDetails.address.street.trim()) {
      newErrors['businessDetails.address.street'] = 'Street address is required';
    }
    if (!formData.businessDetails.address.city.trim()) {
      newErrors['businessDetails.address.city'] = 'City is required';
    }
    if (!formData.businessDetails.address.state.trim()) {
      newErrors['businessDetails.address.state'] = 'State is required';
    }
    if (!formData.businessDetails.address.zipCode.trim()) {
      newErrors['businessDetails.address.zipCode'] = 'Zip code is required';
    }
    if (!formData.businessDetails.address.country.trim()) {
      newErrors['businessDetails.address.country'] = 'Country is required';
    }
    if (formData.pricing.baseRate < 0) {
      newErrors['pricing.baseRate'] = 'Base rate must be non-negative';
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

    setLoading(true);

    try {
      // Clean up form data before sending
      const cleanedData = { ...formData };
      
      // Remove vendorId if empty (let backend generate it)
      if (!vendor && (!cleanedData.vendorId || cleanedData.vendorId.trim() === '')) {
        delete cleanedData.vendorId;
      }
      
      // Handle website - set to undefined if empty so it's truly optional
      if (cleanedData.businessDetails?.website === '') {
        cleanedData.businessDetails = {
          ...cleanedData.businessDetails,
          website: undefined
        };
      }
      
      let response;
      if (vendor) {
        response = await vendorService.updateVendor(vendor._id || vendor.id, cleanedData);
      } else {
        response = await vendorService.createVendor(cleanedData);
      }

      if (response && response.success) {
        toast.success(vendor ? 'Vendor updated successfully!' : 'Vendor created successfully!');
        if (onSuccess) onSuccess(response.vendor);
        if (onClose) onClose();
      } else {
        toast.error(response?.message || `Failed to ${vendor ? 'update' : 'create'} vendor`);
      }
    } catch (error) {
      console.error(`Error ${vendor ? 'updating' : 'creating'} vendor:`, error);
      toast.error(error.response?.data?.message || error.message || `Failed to ${vendor ? 'update' : 'create'} vendor`);
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

  const vehicleTypes = ['sedan', 'suv', 'van', 'bus', 'luxury', 'electric'];
  const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR'];
  const statuses = ['active', 'inactive', 'suspended', 'pending_approval'];

  return (
    <Drawer
      isOpen={true}
      onClose={onClose}
      title={vendor ? 'Edit Vendor' : 'Add New Vendor'}
      subtitle={vendor ? (vendor.vendorId || vendor._id) : 'Create a new vendor account'}
      position="right"
      size="xl"
    >
      <form onSubmit={handleSubmit}>
          {/* Company Information */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Company Information
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors['companyName'] 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Enter company name"
                />
                <ErrorMessage error={errors['companyName']} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {statuses.map(status => (
                    <option key={status} value={status} className="bg-white dark:bg-gray-700">{status.replace('_', ' ').toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Contact Person */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Contact Person
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.contactPerson.firstName}
                  onChange={(e) => handleInputChange('contactPerson.firstName', e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors['contactPerson.firstName'] 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="First name"
                />
                <ErrorMessage error={errors['contactPerson.firstName']} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.contactPerson.lastName}
                  onChange={(e) => handleInputChange('contactPerson.lastName', e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors['contactPerson.lastName'] 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Last name"
                />
                <ErrorMessage error={errors['contactPerson.lastName']} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.contactPerson.email}
                  onChange={(e) => handleInputChange('contactPerson.email', e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors['contactPerson.email'] 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="email@example.com"
                />
                <ErrorMessage error={errors['contactPerson.email']} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Phone * (e.g., +1234567890)
                </label>
                <input
                  type="tel"
                  value={formData.contactPerson.phone}
                  onChange={(e) => handleInputChange('contactPerson.phone', e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors['contactPerson.phone'] 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="+1234567890"
                />
                <ErrorMessage error={errors['contactPerson.phone']} />
              </div>
            </div>
          </div>

          {/* Business Details */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Business Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  License Number *
                </label>
                <input
                  type="text"
                  value={formData.businessDetails.licenseNumber}
                  onChange={(e) => handleInputChange('businessDetails.licenseNumber', e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors['businessDetails.licenseNumber'] 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="License number"
                />
                <ErrorMessage error={errors['businessDetails.licenseNumber']} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Tax ID *
                </label>
                <input
                  type="text"
                  value={formData.businessDetails.taxId}
                  onChange={(e) => handleInputChange('businessDetails.taxId', e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors['businessDetails.taxId'] 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Tax ID"
                />
                <ErrorMessage error={errors['businessDetails.taxId']} />
              </div>

              <div className="col-span-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.businessDetails.website}
                  onChange={(e) => handleInputChange('businessDetails.website', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://example.com"
                />
              </div>

              <div className="col-span-full">
                <h4 className="text-base font-medium text-gray-900 dark:text-white mb-3">Address *</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <input
                      type="text"
                      value={formData.businessDetails.address.street}
                      onChange={(e) => handleInputChange('businessDetails.address.street', e.target.value)}
                      className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                        errors['businessDetails.address.street'] 
                          ? 'border-red-500 dark:border-red-500' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="Street address"
                    />
                    <ErrorMessage error={errors['businessDetails.address.street']} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <input
                        type="text"
                        value={formData.businessDetails.address.city}
                        onChange={(e) => handleInputChange('businessDetails.address.city', e.target.value)}
                        className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                          errors['businessDetails.address.city'] 
                            ? 'border-red-500 dark:border-red-500' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="City"
                      />
                      <ErrorMessage error={errors['businessDetails.address.city']} />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={formData.businessDetails.address.state}
                        onChange={(e) => handleInputChange('businessDetails.address.state', e.target.value)}
                        className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                          errors['businessDetails.address.state'] 
                            ? 'border-red-500 dark:border-red-500' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="State"
                      />
                      <ErrorMessage error={errors['businessDetails.address.state']} />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={formData.businessDetails.address.zipCode}
                        onChange={(e) => handleInputChange('businessDetails.address.zipCode', e.target.value)}
                        className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                          errors['businessDetails.address.zipCode'] 
                            ? 'border-red-500 dark:border-red-500' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="Zip Code"
                      />
                      <ErrorMessage error={errors['businessDetails.address.zipCode']} />
                    </div>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={formData.businessDetails.address.country}
                      onChange={(e) => handleInputChange('businessDetails.address.country', e.target.value)}
                      className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                        errors['businessDetails.address.country'] 
                          ? 'border-red-500 dark:border-red-500' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="Country"
                    />
                    <ErrorMessage error={errors['businessDetails.address.country']} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Pricing
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Base Rate *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.pricing.baseRate}
                  onChange={(e) => handleInputChange('pricing.baseRate', parseFloat(e.target.value) || 0)}
                  className={`w-full px-3 py-2.5 border rounded-md text-sm outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors['pricing.baseRate'] 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                <ErrorMessage error={errors['pricing.baseRate']} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Currency *
                </label>
                <select
                  value={formData.pricing.currency}
                  onChange={(e) => handleInputChange('pricing.currency', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {currencies.map(curr => (
                    <option key={curr} value={curr} className="bg-white dark:bg-gray-700">{curr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Per KM Rate
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.pricing.perKmRate}
                  onChange={(e) => handleInputChange('pricing.perKmRate', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Waiting Time Rate
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.pricing.waitingTimeRate}
                  onChange={(e) => handleInputChange('pricing.waitingTimeRate', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Night Surcharge
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.pricing.nightSurcharge}
                  onChange={(e) => handleInputChange('pricing.nightSurcharge', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
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
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-y"
              placeholder="Enter any additional notes..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-transparent border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2.5 border-none rounded-md text-sm font-medium text-white flex items-center gap-2 ${
                loading 
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                  : 'bg-blue-600 dark:bg-blue-500 cursor-pointer hover:bg-blue-700 dark:hover:bg-blue-600'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin" />
                  {vendor ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save size={16} />
                  {vendor ? 'Update Vendor' : 'Create Vendor'}
                </>
              )}
            </button>
          </div>
        </form>
    </Drawer>
  );
};

export default VendorFormModal;

