import React, { useState } from 'react';
import { MapPin, User, Plane, Car, UserPlus, CheckCircle, Users, X, ArrowRight, Navigation } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks/useApi';
import Drawer from './Drawer';
import VendorDriverAssignment from './VendorDriverAssignment';
import AddTravelerInSameCar from './AddTravelerInSameCar';
import toast from 'react-hot-toast';
import { getClientAndTravelerNames, getDelegateDisplayName, getAirlineDisplay, hasRealFlight, getFlightNoDisplay, getFlightFieldDisplay, formatFlightArrivalLocal, formatFlightDepartureLocal, formatTransferPickupLocal, formatDateTimeAtAirport, getFlightRouteCodes, getFlightRouteWithNames, formatTimeAtAirport } from '../utils/transferUtils';

const TransferDetailsModal = ({ transfer, onClose, onTransferUpdated }) => {
  const { isDark } = useTheme();
  const { user, isRole } = useAuth();
  const api = useApi();
  const [showAssignDriver, setShowAssignDriver] = useState(false);
  const [showAddTravelerInSameCar, setShowAddTravelerInSameCar] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [removingDelegateId, setRemovingDelegateId] = useState(null);
  
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

  const handleRemoveDelegate = async (delegateTravelerId) => {
    if (!transfer?._id || !delegateTravelerId) return;
    setRemovingDelegateId(delegateTravelerId);
    try {
      const updatedDelegates = (transfer.delegates || [])
        .filter((d) => String(d.traveler_id?._id || d.traveler_id) !== String(delegateTravelerId))
        .map((d) => ({
          traveler_id: d.traveler_id?._id || d.traveler_id,
          flight_same_as_primary: d.flight_same_as_primary !== false,
        }));
      const response = await api.put(`/transfers/${transfer._id}/client-details`, { delegates: updatedDelegates });
      if (response?.success) {
        toast.success('Traveler removed from same car');
        onTransferUpdated?.(response.data || transfer);
      } else {
        toast.error(response?.message || 'Failed to remove traveler');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove traveler');
    } finally {
      setRemovingDelegateId(null);
    }
  };

  const transferStatus = transfer.transfer_details?.transfer_status || transfer.transfer_details?.status || 'pending';

  const { companyName, clientName, travelerName } = getClientAndTravelerNames(transfer);
  const subtitleText = travelerName || (clientName && clientName !== 'N/A' ? clientName : null);

  return (
    <Drawer
      isOpen={true}
      onClose={onClose}
      title={companyName || clientName || 'Unknown Customer'}
      subtitle={subtitleText}
      position="right"
      size="xl"
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
                  <strong className="text-gray-900 dark:text-white">Name:</strong>{' '}
                  {[transfer.customer_details?.salutation, transfer.customer_details?.name].filter(Boolean).join(' ') || 'N/A'}
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

            {/* Travelers in same car - visible to client (view only), editable by admin/ops */}
            {transfer.customer_id && (isRole('SUPER_ADMIN') || isRole('ADMIN') || isRole('OPERATIONS_MANAGER') || isRole('CLIENT')) && (
              <div className="bg-card border border-border p-5 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <Users size={16} className="text-gray-500 dark:text-gray-400 mr-2" />
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white m-0">
                      Travelers in same car
                    </h3>
                  </div>
                  {(isRole('SUPER_ADMIN') || isRole('ADMIN') || isRole('OPERATIONS_MANAGER')) && (
                    <button
                      onClick={() => setShowAddTravelerInSameCar(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <UserPlus size={14} />
                      Add traveler
                    </button>
                  )}
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  {travelerName && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400">•</span>
                      <span>{travelerName}</span>
                      <span className="text-xs text-muted-foreground">— main traveler</span>
                    </div>
                  )}
                  {(transfer.delegates || []).map((d, i) => {
                    const tid = d.traveler_id?._id || d.traveler_id;
                    const name = getDelegateDisplayName(d);
                    const canEdit = isRole('SUPER_ADMIN') || isRole('ADMIN') || isRole('OPERATIONS_MANAGER');
                    return (
                      <div key={i} className="flex items-center justify-between gap-2 group">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 dark:text-gray-400">•</span>
                          <span>{name}</span>
                        </div>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDelegate(tid)}
                            disabled={removingDelegateId === String(tid)}
                            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                            title="Remove from same car"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {!travelerName && (!transfer.delegates || transfer.delegates.length === 0) && (
                    <p className="text-muted-foreground italic">No travelers assigned</p>
                  )}
                </div>
              </div>
            )}

            {/* Flight Details — route, sector times, pickup context */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden md:col-span-2">
              <div className="flex items-center gap-2 px-5 pt-5 pb-2">
                <Plane size={18} className="text-primary shrink-0" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white m-0">
                  Inbound flight
                </h3>
              </div>
              <div className="px-5 pb-5 text-sm text-gray-700 dark:text-gray-300 space-y-4">
                {!hasRealFlight(transfer.flight_details) ? (
                  <p className="text-muted-foreground m-0">No flight detail</p>
                ) : (
                  <>
                    <div className="rounded-lg bg-muted/50 dark:bg-muted/20 border border-border px-4 py-3">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                          {getFlightNoDisplay(transfer.flight_details)}
                        </span>
                        <span className="text-sm text-muted-foreground">{getAirlineDisplay(transfer.flight_details)}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-base font-semibold text-foreground">
                        <span>{getFlightFieldDisplay(transfer.flight_details?.departure_airport)}</span>
                        <ArrowRight size={18} className="text-muted-foreground shrink-0" aria-hidden />
                        <span>{getFlightFieldDisplay(transfer.flight_details?.arrival_airport)}</span>
                      </div>
                      {(transfer.flight_details?.departure_airport_name || transfer.flight_details?.arrival_airport_name) && (
                        <p className="mt-2 text-xs text-muted-foreground leading-snug">
                          {getFlightRouteWithNames(transfer.flight_details)}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-lg border border-border bg-background/80 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                          Departure (origin airport)
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {getFlightFieldDisplay(transfer.flight_details?.departure_airport)}
                          {transfer.flight_details?.departure_airport_name ? (
                            <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                              {transfer.flight_details.departure_airport_name}
                            </span>
                          ) : null}
                        </p>
                        {transfer.flight_details?.departure_time ? (
                          <p className="mt-2 text-sm text-foreground">
                            {formatFlightDepartureLocal(transfer.flight_details)}
                          </p>
                        ) : (
                          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300/90">
                            TBD — origin departure time may appear after schedule sync
                          </p>
                        )}
                      </div>
                      <div className="rounded-lg border border-border bg-background/80 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                          Arrival (destination airport)
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {getFlightFieldDisplay(transfer.flight_details?.arrival_airport)}
                          {transfer.flight_details?.arrival_airport_name ? (
                            <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                              {transfer.flight_details.arrival_airport_name}
                            </span>
                          ) : null}
                        </p>
                        {transfer.flight_details?.arrival_time ? (
                          <p className="mt-2 text-sm text-foreground">
                            {formatFlightArrivalLocal(transfer.flight_details)}
                          </p>
                        ) : (
                          <p className="mt-2 text-sm text-muted-foreground">TBD</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        <span className="font-medium text-foreground">Status:</span>{' '}
                        {getFlightFieldDisplay(transfer.flight_details?.status)}
                      </span>
                      {transfer.flight_details?.departure_time && transfer.flight_details?.arrival_time && (
                        <span>
                          Block time (local):{' '}
                          {formatTimeAtAirport(transfer.flight_details.departure_time, transfer.flight_details.departure_airport)} →{' '}
                          {formatTimeAtAirport(transfer.flight_details.arrival_time, transfer.flight_details.arrival_airport)}
                        </span>
                      )}
                    </div>

                    {transfer.transfer_details?.estimated_pickup_time && (
                      <div className="rounded-lg border border-primary/25 bg-primary/5 dark:bg-primary/10 px-4 py-3">
                        <div className="flex items-start gap-3">
                          <Navigation size={18} className="text-primary shrink-0 mt-0.5" aria-hidden />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                              Ground pickup (after landing)
                            </p>
                            <p className="text-sm font-medium text-foreground mt-1">
                              {transfer.transfer_details?.pickup_location || 'Airport pickup'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Be ready / meet driver:{' '}
                              <span className="font-medium text-foreground">{formatTransferPickupLocal(transfer)}</span>
                              {transfer.flight_details?.arrival_airport ? (
                                <span className="text-muted-foreground">
                                  {' '}
                                  ({getFlightRouteCodes(transfer.flight_details)} — arrival side)
                                </span>
                              ) : null}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Return flight (compact) */}
              {hasRealFlight(transfer.return_flight_details) && (
                <div className="border-t border-border px-5 py-4 bg-muted/20 dark:bg-muted/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Plane size={16} className="text-muted-foreground" />
                    <h4 className="text-sm font-semibold text-foreground m-0">Return flight</h4>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3 space-y-3 text-sm">
                    <div className="flex flex-wrap gap-2 items-baseline">
                      <span className="font-bold">{getFlightNoDisplay(transfer.return_flight_details)}</span>
                      <span className="text-muted-foreground">{getAirlineDisplay(transfer.return_flight_details)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 font-medium">
                      {getFlightFieldDisplay(transfer.return_flight_details?.departure_airport)}
                      <ArrowRight size={16} className="text-muted-foreground" />
                      {getFlightFieldDisplay(transfer.return_flight_details?.arrival_airport)}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                      <div>
                        <span className="text-muted-foreground">Departs: </span>
                        {transfer.return_flight_details?.departure_time
                          ? formatFlightDepartureLocal(transfer.return_flight_details)
                          : 'TBD'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Arrives: </span>
                        {transfer.return_flight_details?.arrival_time
                          ? formatFlightArrivalLocal(transfer.return_flight_details)
                          : 'TBD'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Transfer route (ground segment) */}
            <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
              <div className="flex items-center mb-3">
                <MapPin size={16} className="text-primary mr-2 shrink-0" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white m-0">
                  Ground transfer route
                </h3>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
                <div className="rounded-md bg-muted/40 dark:bg-muted/15 border border-border/80 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Pickup</p>
                  <p className="font-medium text-foreground">{transfer.transfer_details?.pickup_location || 'N/A'}</p>
                  {!transfer.transfer_details?.estimated_pickup_time && (
                    <p className="text-xs text-muted-foreground mt-1">Pickup time follows inbound flight (see above).</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Drop-off</p>
                  <p className="font-medium text-foreground">{transfer.transfer_details?.drop_location || 'N/A'}</p>
                </div>
                {transfer.transfer_details?.event_place && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Event</p>
                    <p>{transfer.transfer_details.event_place}</p>
                  </div>
                )}
                {transfer.transfer_details?.estimated_drop_time && (
                  <div>
                    <p className="text-xs text-muted-foreground">Estimated drop-off</p>
                    <p className="font-medium">{formatDateTimeAtAirport(transfer.transfer_details.estimated_drop_time, 'KUL')}</p>
                  </div>
                )}
                {transfer.transfer_details?.special_notes && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
                    <p>{transfer.transfer_details.special_notes}</p>
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
                      <strong className="text-green-600 dark:text-green-400">✓ Pickup Time:</strong> {formatDateTimeAtAirport(transfer.assigned_driver_details.pickup_time, 'KUL')}
                    </div>
                  )}
                  {arrivedAtDrop && transfer.assigned_driver_details.drop_time && (
                    <div>
                      <strong className="text-green-600 dark:text-green-400">✓ Drop-off Time:</strong> {formatDateTimeAtAirport(transfer.assigned_driver_details.drop_time, 'KUL')}
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
                        {formatDateTimeAtAirport(transfer.assigned_driver_details.pickup_time, 'KUL')}
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
                        {formatDateTimeAtAirport(transfer.assigned_driver_details.drop_time, 'KUL')}
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
          }}
        />
      )}

      {/* Add Traveler in Same Car Drawer */}
      {(isRole('SUPER_ADMIN') || isRole('ADMIN') || isRole('OPERATIONS_MANAGER')) && (
        <AddTravelerInSameCar
          transfer={transfer}
          isOpen={showAddTravelerInSameCar}
          onClose={() => setShowAddTravelerInSameCar(false)}
          onSuccess={(updatedTransfer) => {
            if (onTransferUpdated) {
              onTransferUpdated(updatedTransfer)
            }
            setShowAddTravelerInSameCar(false)
          }}
        />
      )}
    </Drawer>
  );
};

export default TransferDetailsModal;

