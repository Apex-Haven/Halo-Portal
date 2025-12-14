import React from 'react';
import { Mail, Phone, MapPin, Building, DollarSign, Star, Calendar, Clock } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import Drawer from './Drawer';

const VendorDetailsModal = ({ vendor, onClose }) => {
  const { isDark } = useTheme();
  if (!vendor) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return isDark ? '#34d399' : '#059669';
      case 'inactive': return isDark ? '#9ca3af' : '#6b7280';
      case 'suspended': return isDark ? '#f87171' : '#dc2626';
      case 'pending_approval': return isDark ? '#fbbf24' : '#d97706';
      default: return isDark ? '#9ca3af' : '#6b7280';
    }
  };

  const getStatusBg = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return isDark ? '#064e3b' : '#dcfce7';
      case 'inactive': return isDark ? '#374151' : '#f3f4f6';
      case 'suspended': return isDark ? '#7f1d1d' : '#fee2e2';
      case 'pending_approval': return isDark ? '#78350f' : '#fef3c7';
      default: return isDark ? '#374151' : '#f3f4f6';
    }
  };

  const renderStars = (rating) => {
    if (!rating || isNaN(rating) || rating < 0) return null;
    
    const stars = [];
    const numRating = Number(rating);
    const fullStars = Math.floor(numRating);

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} size={14} color="#fbbf24" fill="#fbbf24" />);
    }

    const emptyStars = Math.max(0, 5 - Math.ceil(numRating));
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} size={14} color="#d1d5db" />);
    }

    return stars;
  };

  const addr = vendor.businessDetails?.address;
  const addressStr = typeof addr === 'string' 
    ? addr 
    : (addr && typeof addr === 'object' 
      ? [addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ') 
      : 'N/A');

  return (
    <Drawer
      isOpen={true}
      onClose={onClose}
      title={vendor.companyName || 'Vendor Details'}
      subtitle={vendor.vendorId || vendor._id || 'N/A'}
      position="right"
      size="lg"
    >
      {/* Status Badge */}
      <div className="mb-6">
            <span className="px-3 py-1.5 rounded text-xs font-semibold capitalize"
              style={{ 
                backgroundColor: getStatusBg(vendor.status),
                color: getStatusColor(vendor.status)
              }}
            >
              {vendor.status || 'N/A'}
            </span>
        </div>
          {/* Rating */}
          {vendor.performance?.rating && (
            <div className="mb-6 flex items-center gap-2">
              {renderStars(vendor.performance.rating)}
              <span className="text-base font-semibold theme-text-heading">
                {Number(vendor.performance.rating).toFixed(1)} / 5.0
              </span>
            </div>
          )}

          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Contact Person */}
            <div className="theme-bg-secondary p-5 rounded-lg border theme-border">
              <div className="flex items-center mb-3">
                <Phone size={16} className="theme-text-muted mr-2" />
                <h3 className="text-base font-semibold theme-text-heading m-0">
                  Contact Person
                </h3>
              </div>
              <div className="text-sm theme-text-secondary">
                <div className="mb-2">
                  <strong className="theme-text-primary">Name:</strong> {vendor.contactPerson?.firstName || ''} {vendor.contactPerson?.lastName || ''}
                </div>
                <div className="mb-2 flex items-center gap-1">
                  <Mail size={14} className="text-gray-500 dark:text-gray-400" />
                  <span>{vendor.contactPerson?.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Phone size={14} className="text-gray-500 dark:text-gray-400" />
                  <span>{vendor.contactPerson?.phone || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Business Details */}
            <div className="theme-bg-secondary p-5 rounded-lg border theme-border">
              <div className="flex items-center mb-3">
                <Building size={16} className="theme-text-muted mr-2" />
                <h3 className="text-base font-semibold theme-text-heading m-0">
                  Business Details
                </h3>
              </div>
              <div className="text-sm theme-text-secondary">
                <div className="mb-2">
                  <strong className="theme-text-primary">License:</strong> {vendor.businessDetails?.licenseNumber || 'N/A'}
                </div>
                <div className="mb-2">
                  <strong className="theme-text-primary">Tax ID:</strong> {vendor.businessDetails?.taxId || 'N/A'}
                </div>
                {vendor.businessDetails?.website && (
                  <div className="mb-2">
                    <strong className="theme-text-primary">Website:</strong>{' '}
                    <a href={vendor.businessDetails.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                      {vendor.businessDetails.website}
                    </a>
                  </div>
                )}
                <div className="flex items-start gap-1">
                  <MapPin size={14} className="text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                  <span>{addressStr}</span>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="theme-bg-secondary p-5 rounded-lg border theme-border">
              <div className="flex items-center mb-3">
                <DollarSign size={16} className="theme-text-muted mr-2" />
                <h3 className="text-base font-semibold theme-text-heading m-0">
                  Pricing
                </h3>
              </div>
              <div className="text-sm theme-text-secondary">
                <div className="mb-2">
                  <strong className="theme-text-primary">Base Rate:</strong> {vendor.pricing?.baseRate || 0} {vendor.pricing?.currency || 'USD'}
                </div>
                <div className="mb-2">
                  <strong className="theme-text-primary">Per KM:</strong> {vendor.pricing?.perKmRate || 0} {vendor.pricing?.currency || 'USD'}
                </div>
                <div className="mb-2">
                  <strong className="theme-text-primary">Waiting Time:</strong> {vendor.pricing?.waitingTimeRate || 0} {vendor.pricing?.currency || 'USD'}
                </div>
                <div>
                  <strong className="theme-text-primary">Night Surcharge:</strong> {vendor.pricing?.nightSurcharge || 0} {vendor.pricing?.currency || 'USD'}
                </div>
              </div>
            </div>

            {/* Performance */}
            <div className="theme-bg-secondary p-5 rounded-lg border theme-border">
              <div className="flex items-center mb-3">
                <Star size={16} className="theme-text-muted mr-2" />
                <h3 className="text-base font-semibold theme-text-heading m-0">
                  Performance
                </h3>
              </div>
              <div className="text-sm theme-text-secondary">
                <div className="mb-2">
                  <strong className="theme-text-primary">Total Bookings:</strong> {vendor.performance?.totalBookings || 0}
                </div>
                <div className="mb-2">
                  <strong className="theme-text-primary">Completed:</strong> {vendor.performance?.completedBookings || 0}
                </div>
                <div className="mb-2">
                  <strong className="theme-text-primary">Cancelled:</strong> {vendor.performance?.cancelledBookings || 0}
                </div>
                <div>
                  <strong className="theme-text-primary">Response Time:</strong> {vendor.performance?.averageResponseTime || 0} min
                </div>
              </div>
            </div>
          </div>

          {/* Services */}
          {vendor.services && (
            <div className="theme-bg-secondary p-5 rounded-lg border theme-border mt-6">
              <h3 className="text-base font-semibold theme-text-heading mb-4">
                Services
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <strong className="theme-text-primary">Airport Transfers:</strong>{' '}
                  <span className={vendor.services.airportTransfers?.enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                    {vendor.services.airportTransfers?.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div>
                  <strong className="theme-text-primary">Hotel Transfers:</strong>{' '}
                  <span className={vendor.services.hotelTransfers?.enabled ? 'text-green-600 dark:text-green-400' : 'theme-text-muted'}>
                    {vendor.services.hotelTransfers?.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div>
                  <strong className="theme-text-primary">City Tours:</strong>{' '}
                  <span className={vendor.services.cityTours?.enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                    {vendor.services.cityTours?.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Preferences */}
          {vendor.preferences && (
            <div className="theme-bg-secondary p-5 rounded-lg border theme-border mt-6">
              <div className="flex items-center mb-3">
                <Clock size={16} className="theme-text-muted mr-2" />
                <h3 className="text-base font-semibold theme-text-heading m-0">
                  Preferences
                </h3>
              </div>
              <div className="text-sm theme-text-secondary">
                <div className="mb-2">
                  <strong className="theme-text-primary">Working Hours:</strong> {vendor.preferences.workingHours?.start || 'N/A'} - {vendor.preferences.workingHours?.end || 'N/A'}
                </div>
                <div className="mb-2">
                  <strong className="theme-text-primary">Auto Accept:</strong> {vendor.preferences.autoAcceptBookings ? 'Yes' : 'No'}
                </div>
                <div>
                  <strong className="theme-text-primary">Max Advance Booking:</strong> {vendor.preferences.maxAdvanceBookingDays || 0} days
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {vendor.notes && (
            <div className="theme-bg-secondary p-5 rounded-lg border theme-border mt-6">
              <h3 className="text-base font-semibold theme-text-heading mb-3">
                Notes
              </h3>
              <div className="text-sm theme-text-secondary">
                {vendor.notes}
              </div>
            </div>
          )}

          {/* Timestamps */}
          {(vendor.createdAt || vendor.updatedAt) && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex gap-4">
              {vendor.createdAt && (
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>Created: {formatDate(vendor.createdAt)}</span>
                </div>
              )}
              {vendor.updatedAt && (
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>Updated: {formatDate(vendor.updatedAt)}</span>
                </div>
              )}
            </div>
          )}
    </Drawer>
  );
};

export default VendorDetailsModal;

