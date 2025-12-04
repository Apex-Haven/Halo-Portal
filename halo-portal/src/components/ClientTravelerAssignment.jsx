import { useState, useEffect } from 'react';
import { Users, User, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApi } from '../hooks/useApi';
import { useNavigate } from 'react-router-dom';
import Drawer from './Drawer';
import Dropdown from './Dropdown';
import { motion, AnimatePresence } from 'framer-motion';

const ClientTravelerAssignment = ({ transfer, isOpen, onClose, onSuccess }) => {
  const api = useApi();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [travelers, setTravelers] = useState([]);
  const [selectedTravelerId, setSelectedTravelerId] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      fetchTravelers();
      // Pre-select if traveler is already assigned
      if (transfer?.traveler_id) {
        setSelectedTravelerId(transfer.traveler_id);
      }
    }
  }, [isOpen, transfer]);

  const fetchTravelers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/travelers');
      if (response.success) {
        setTravelers(response.data || []);
      } else {
        console.error('Failed to fetch travelers:', response);
        toast.error(response.message || 'Failed to load travelers');
      }
    } catch (error) {
      console.error('Error fetching travelers:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to load travelers');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedTravelerId('');
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    if (!selectedTravelerId) {
      newErrors.traveler = 'Please select a traveler';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please select a traveler');
      return;
    }

    setSubmitting(true);
    try {
      const selectedTraveler = travelers.find(t => t._id === selectedTravelerId);
      
      const payload = {
        traveler_id: selectedTravelerId,
        traveler_details: {
          name: `${selectedTraveler.profile?.firstName || ''} ${selectedTraveler.profile?.lastName || ''}`.trim(),
          email: selectedTraveler.email,
          phone: selectedTraveler.profile?.phone || ''
        }
      };

      const response = await api.put(`/transfers/${transfer._id}/traveler`, payload);

      if (response.success) {
        setShowSuccess(true);
        toast.success(
          `✓ Traveler assigned successfully!\n${payload.traveler_details.name} has been assigned to this transfer.`,
          {
            duration: 4000,
            icon: '👤',
            style: {
              borderRadius: '10px',
              background: '#10b981',
              color: '#fff',
            },
          }
        );
        
        setTimeout(() => {
          resetForm();
          setShowSuccess(false);
          if (onSuccess) {
            onSuccess(response.data || response);
          }
          onClose();
        }, 1500);
      } else {
        toast.error(response.message || 'Failed to assign traveler');
      }
    } catch (error) {
      console.error('Error assigning traveler:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to assign traveler');
    } finally {
      setSubmitting(false);
    }
  };

  const travelerOptions = [
    { value: '', label: 'Select a traveler' },
    ...travelers.map(traveler => ({
      value: traveler._id,
      label: `${traveler.profile?.firstName || ''} ${traveler.profile?.lastName || ''} - ${traveler.email}`
    }))
  ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Traveler"
      subtitle={`Transfer: ${transfer?._id || ''}`}
      position="right"
      size="md"
    >
      <div className="relative h-full">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Form Content */}
          <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
            <div className="space-y-6">
              {/* Info Section */}
              <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <Users size={20} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-foreground mb-1">
                      Assign Traveler to Transfer
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Select a traveler from your list to assign to this transfer. The traveler will be notified.
                    </p>
                  </div>
                </div>
              </div>

              {/* Transfer Info */}
              <div className="p-4 bg-card rounded-xl border border-border">
                <h4 className="text-sm font-semibold text-foreground mb-3">Transfer Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transfer ID:</span>
                    <span className="font-mono font-semibold text-foreground">{transfer?._id}</span>
                  </div>
                  {transfer?.transfer_details?.pickup_location && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pickup:</span>
                      <span className="font-semibold text-foreground">{transfer.transfer_details.pickup_location}</span>
                    </div>
                  )}
                  {transfer?.transfer_details?.drop_location && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Drop-off:</span>
                      <span className="font-semibold text-foreground">{transfer.transfer_details.drop_location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Traveler Selection */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Select Traveler *
                  </label>
                  {loading ? (
                    <div className="text-sm text-muted-foreground">Loading travelers...</div>
                  ) : travelers.length === 0 ? (
                    <div className="p-5 bg-muted/50 rounded-lg border border-border text-center">
                      <User size={32} className="mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm font-semibold text-foreground mb-2">No travelers found</p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Create a traveler first to assign them to this transfer
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate('/travelers');
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all"
                      >
                        <Plus size={16} />
                        Create Traveler
                      </button>
                    </div>
                  ) : (
                    <>
                      <Dropdown
                        name="traveler"
                        value={selectedTravelerId}
                        onChange={(e) => {
                          setSelectedTravelerId(e.target.value);
                          setErrors({ ...errors, traveler: '' });
                        }}
                        options={travelerOptions}
                        placeholder="Select a traveler"
                        minWidth="100%"
                      />
                      {errors.traveler && (
                        <span className="text-red-500 text-xs mt-1.5 block font-medium">
                          {errors.traveler}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Selected Traveler Info */}
                {selectedTravelerId && travelers.find(t => t._id === selectedTravelerId) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-green-500/10 rounded-xl border border-green-500/20"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <CheckCircle size={20} className="text-green-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-foreground mb-1">
                          Selected Traveler
                        </h4>
                        {(() => {
                          const traveler = travelers.find(t => t._id === selectedTravelerId);
                          return (
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Name:</span>
                                <span className="font-semibold text-foreground">
                                  {traveler.profile?.firstName} {traveler.profile?.lastName}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Email:</span>
                                <span className="font-semibold text-foreground">{traveler.email}</span>
                              </div>
                              {traveler.profile?.phone && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Phone:</span>
                                  <span className="font-semibold text-foreground">{traveler.profile.phone}</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="flex-shrink-0 border-t border-border bg-muted/30 backdrop-blur-sm">
            <div className="flex gap-3 px-6 py-5">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="flex-1 px-4 py-2.5 bg-background border-2 border-border rounded-lg text-foreground font-semibold hover:bg-muted transition-all"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitting || loading || travelers.length === 0}
              >
                {submitting ? 'Assigning...' : 'Assign Traveler'}
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
                  <h3 className="text-2xl font-bold text-foreground mb-2">Traveler Assigned!</h3>
                  <p className="text-muted-foreground">
                    Traveler has been successfully assigned to this transfer
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Drawer>
  );
};

export default ClientTravelerAssignment;

