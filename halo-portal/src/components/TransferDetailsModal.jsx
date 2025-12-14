import React, { useState } from 'react';
import { Calendar, MapPin, User, Phone, Mail, Plane, Car, Clock, UserPlus, CheckCircle, Users } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks/useApi';
import Drawer from './Drawer';
import VendorDriverAssignment from './VendorDriverAssignment';
import toast from 'react-hot-toast';

const TransferDetailsModal = ({ transfer, onClose, onTransferUpdated }) => {
  const { isDark } = useTheme();
  const { user, isRole } = useAuth();
  const api = useApi();
  const [showAssignDriver, setShowAssignDriver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  if (!transfer) return null;
  
  const isVendor = isRole('VENDOR');
  const hasDriver = transfer.assigned_driver_details && (
    transfer.assigned_driver_details.name || 
    transfer.assigned_driver_details.driver_name
  );
  
  // Check if vendor owns this transfer
  const vendorOwnsTransfer = isVendor && transfer.vendor_id && 
    String(transfer.vendor_id) === String(user?._id || user?.id);
  
  const travelerPickedUp = transfer.assigned_driver_details?.traveler_picked_up || false;
  const arrivedAtDrop = transfer.assigned_driver_details?.arrived_at_drop || false;

  const handleConfirmAction = async (action) => {
    if (!transfer._id) return;
    
    setSubmitting(true);
    try {
      const response = await api.put(`/transfers/${transfer._id}/driver/confirm`, { action });
      
      if (response.success) {
        toast.success(
          action === 'pickup' 
            ? '✅ Traveler pickup confirmed!' 
            : '✅ Drop-off confirmed! Transfer completed!',
          {
            duration: 4000,
            icon: '🎉',
          }
        );
        
        if (onTransferUpdated) {
          onTransferUpdated(response.data || transfer);
        }
      } else {
        toast.error(response.message || 'Failed to confirm action');
      }
    } catch (error) {
      console.error('Error confirming action:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to confirm action');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
    return new Date(dateString).toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const transferStatus = transfer.transfer_details?.transfer_status || transfer.transfer_details?.status || 'pending';

  return (
    <Drawer
      isOpen={true}
      onClose={onClose}
      title="Transfer Details"
      subtitle={transfer._id}
      position="right"
      size="lg"
    >
      <div className="flex flex-col h-full">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
          {/* Status Badge */}
          <div className="mb-6">
            <span className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize ${
              transferStatus === 'completed' 
                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                : transferStatus === 'in_progress'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : transferStatus === 'assigned'
                ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                : transferStatus === 'cancelled'
                ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}>
              {transferStatus.replace('_', ' ')}
            </span>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Customer Details */}
            <div className="bg-card border border-border p-5 rounded-lg shadow-sm">
              <div className="flex items-center mb-3">
                <User size={16} className="text-gray-500 dark:text-gray-400 mr-2" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white m-0">
                  Customer Details
                </h3>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <div className="mb-2">
                  <strong className="text-gray-900 dark:text-white">Name:</strong> {transfer.customer_details?.name || 'N/A'}
                </div>
                <div className="mb-2">
                  <strong className="text-gray-900 dark:text-white">Email:</strong> {transfer.customer_details?.email || 'N/A'}
                </div>
                <div className="mb-2">
                  <strong className="text-gray-900 dark:text-white">Phone:</strong> {transfer.customer_details?.contact_number || 'N/A'}
                </div>
                <div>
                  <strong className="text-gray-900 dark:text-white">Passengers:</strong> {transfer.customer_details?.no_of_passengers || transfer.customer_details?.passenger_count || 0}
                </div>
              </div>
            </div>

            {/* Flight Details */}
            <div className="bg-card border border-border p-5 rounded-lg shadow-sm">
              <div className="flex items-center mb-3">
                <Plane size={16} className="text-gray-500 dark:text-gray-400 mr-2" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white m-0">
                  Flight Details
                </h3>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <div className="mb-2">
                  <strong className="text-gray-900 dark:text-white">Flight:</strong> {transfer.flight_details?.flight_no || transfer.flight_details?.flight_number || 'N/A'}
                </div>
                <div className="mb-2">
                  <strong className="text-gray-900 dark:text-white">Airline:</strong> {transfer.flight_details?.airline || 'N/A'}
                </div>
                <div className="mb-2">
                  <strong className="text-gray-900 dark:text-white">From:</strong> {transfer.flight_details?.departure_airport || 'N/A'}
                </div>
                <div className="mb-2">
                  <strong className="text-gray-900 dark:text-white">To:</strong> {transfer.flight_details?.arrival_airport || 'N/A'}
                </div>
                {transfer.flight_details?.arrival_time && (
                <div className="mb-2">
                  <strong className="text-gray-900 dark:text-white">Arrival:</strong> {formatDate(transfer.flight_details.arrival_time)}
                </div>
                )}
                <div>
                  <strong className="text-gray-900 dark:text-white">Status:</strong> {transfer.flight_details?.status || 'N/A'}
                </div>
              </div>
            </div>

            {/* Transfer Details */}
            <div className="bg-card border border-border p-5 rounded-lg shadow-sm">
              <div className="flex items-center mb-3">
                <MapPin size={16} className="text-gray-500 dark:text-gray-400 mr-2" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white m-0">
                  Transfer Details
                </h3>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <div className="mb-2">
                  <strong className="text-gray-900 dark:text-white">From:</strong> {transfer.transfer_details?.pickup_location || 'N/A'}
                </div>
                <div className="mb-2">
                  <strong className="text-gray-900 dark:text-white">To:</strong> {transfer.transfer_details?.drop_location || 'N/A'}
                </div>
                {transfer.transfer_details?.event_place && (
                <div className="mb-2">
                    <strong className="text-gray-900 dark:text-white">Event Place:</strong> {transfer.transfer_details.event_place}
                </div>
                )}
                {transfer.transfer_details?.estimated_pickup_time && (
                <div className="mb-2">
                  <strong className="text-gray-900 dark:text-white">Pickup Time:</strong> {formatDate(transfer.transfer_details.estimated_pickup_time)}
                </div>
                )}
                {transfer.transfer_details?.estimated_drop_time && (
                  <div className="mb-2">
                  <strong className="text-gray-900 dark:text-white">Drop Time:</strong> {formatDate(transfer.transfer_details.estimated_drop_time)}
                </div>
                )}
                {transfer.transfer_details?.special_notes && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <strong className="text-gray-900 dark:text-white">Notes:</strong> {transfer.transfer_details.special_notes}
                  </div>
                )}
              </div>
            </div>

            {/* Driver Details */}
            <div className="bg-card border border-border p-5 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <Car size={16} className="text-gray-500 dark:text-gray-400 mr-2" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white m-0">
                    Driver Details
                  </h3>
                </div>
                {isVendor && !hasDriver && (
                  <button
                    onClick={() => setShowAssignDriver(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <UserPlus size={14} />
                    Assign Driver
                  </button>
                )}
              </div>
              {transfer.assigned_driver_details ? (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <div className="mb-2">
                    <strong className="text-gray-900 dark:text-white">Name:</strong> {transfer.assigned_driver_details.name || transfer.assigned_driver_details.driver_name || 'N/A'}
                  </div>
                  <div className="mb-2">
                    <strong className="text-gray-900 dark:text-white">Phone:</strong> {transfer.assigned_driver_details.contact_number || transfer.assigned_driver_details.driver_phone || 'N/A'}
                  </div>
                  <div className="mb-2">
                    <strong className="text-gray-900 dark:text-white">Vehicle:</strong> {transfer.assigned_driver_details.vehicle_type || 'N/A'}
                  </div>
                  <div className="mb-2">
                    <strong className="text-gray-900 dark:text-white">Vehicle Number:</strong> {transfer.assigned_driver_details.vehicle_number || transfer.assigned_driver_details.vehicle_license || 'N/A'}
                  </div>
                  <div className="mb-2">
                    <strong className="text-gray-900 dark:text-white">Status:</strong> {transfer.assigned_driver_details.status || transfer.assigned_driver_details.driver_status || 'assigned'}
                  </div>
                  {travelerPickedUp && transfer.assigned_driver_details.pickup_time && (
                    <div className="mb-2">
                      <strong className="text-green-600 dark:text-green-400">✓ Pickup Time:</strong> {formatDate(transfer.assigned_driver_details.pickup_time)}
                    </div>
                  )}
                  {arrivedAtDrop && transfer.assigned_driver_details.drop_time && (
                    <div>
                      <strong className="text-green-600 dark:text-green-400">✓ Drop-off Time:</strong> {formatDate(transfer.assigned_driver_details.drop_time)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No driver assigned
                </div>
              )}
            </div>
            </div>
          </div>

        {/* Fixed Footer with Vendor Actions */}
        {vendorOwnsTransfer && hasDriver && (
          <div className="flex-shrink-0 border-t border-border px-6 py-4 bg-card">
            <div className="bg-gradient-to-r from-primary/10 to-green-500/10 border-2 border-primary/20 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <Users size={18} className="text-primary" />
                <h3 className="text-base font-semibold text-foreground m-0">
                  Update Driver Status
                </h3>
              </div>
              
              <div className="space-y-2">
                {/* Pickup Confirmation Button */}
                {!travelerPickedUp ? (
                  <button
                    onClick={() => handleConfirmAction('pickup')}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    <CheckCircle size={18} />
                    <span>Mark Traveler Picked Up</span>
                  </button>
                ) : (
                  <div className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg font-semibold text-sm border-2 border-green-300 dark:border-green-700">
                    <CheckCircle size={18} />
                    <span>✓ Traveler Picked Up</span>
                    {transfer.assigned_driver_details.pickup_time && (
                      <span className="text-xs ml-auto">
                        {formatDate(transfer.assigned_driver_details.pickup_time)}
                      </span>
                    )}
                  </div>
                )}

                {/* Drop-off Confirmation Button */}
                {travelerPickedUp && !arrivedAtDrop && (
                  <button
                    onClick={() => handleConfirmAction('drop')}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    <MapPin size={18} />
                    <span>Mark Drop-off Complete</span>
                  </button>
                )}
                
                {arrivedAtDrop && (
                  <div className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-semibold text-sm border-2 border-blue-300 dark:border-blue-700">
                    <CheckCircle size={18} />
                    <span>✓ Transfer Completed</span>
                    {transfer.assigned_driver_details.drop_time && (
                      <span className="text-xs ml-auto">
                        {formatDate(transfer.assigned_driver_details.drop_time)}
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {!travelerPickedUp && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Update when your driver has picked up the traveler
                </p>
              )}
              {travelerPickedUp && !arrivedAtDrop && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Update when your driver has completed the drop-off
                </p>
              )}
              </div>
            </div>
          )}
      </div>

      {/* Vendor Driver Assignment Drawer */}
      {isVendor && (
        <VendorDriverAssignment
          transfer={transfer}
          isOpen={showAssignDriver}
          onClose={() => setShowAssignDriver(false)}
          onSuccess={(updatedTransfer) => {
            if (onTransferUpdated) {
              onTransferUpdated(updatedTransfer)
            }
            setShowAssignDriver(false)
            // Refresh the transfer data by calling onTransferUpdated
            // The parent component should refetch the transfer
          }}
        />
      )}
    </Drawer>
  );
};

export default TransferDetailsModal;

