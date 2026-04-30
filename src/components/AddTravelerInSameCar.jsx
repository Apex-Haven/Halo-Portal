import React, { useState, useEffect, useRef } from 'react';
import { Users, UserPlus, Search, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks/useApi';
import Drawer from './Drawer';
import toast from 'react-hot-toast';

const MAX_TRAVELERS_PER_CAR = 3;

/**
 * Add a traveler to the same car (delegate) for a transfer.
 * Uses PUT /transfers/:id/client-details with delegates array.
 */
const AddTravelerInSameCar = ({ transfer, isOpen, onClose, onSuccess }) => {
  const api = useApi();
  const [travelers, setTravelers] = useState([]);
  const [loadingTravelers, setLoadingTravelers] = useState(false);
  const [selectedTravelerId, setSelectedTravelerId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const customerId = transfer?.customer_id ? String(transfer.customer_id) : null;
  // traveler_id may be a populated object { _id, profile } — must extract id or String() breaks filtering
  const primaryTravelerId = transfer?.traveler_id
    ? String(transfer.traveler_id._id || transfer.traveler_id)
    : null;
  const existingDelegates = transfer?.delegates || [];
  const currentTravelerCount = 1 + existingDelegates.length;
  const isAtCapacity = currentTravelerCount >= MAX_TRAVELERS_PER_CAR;
  const existingDelegateIds = new Set(
    existingDelegates.map((d) => String(d.traveler_id?._id || d.traveler_id)).filter(Boolean)
  );

  // Fetch travelers for the same customer (client)
  useEffect(() => {
    if (!isOpen || !customerId) return;
    const fetchTravelers = async () => {
      setLoadingTravelers(true);
      try {
        const response = await api.get('/travelers');
        if (response?.success && Array.isArray(response.data)) {
          const forClient = response.data.filter((t) => {
            const createdBy = t.createdBy?._id || t.createdBy;
            return createdBy && String(createdBy) === customerId;
          });
          setTravelers(forClient);
        } else {
          setTravelers([]);
        }
      } catch (err) {
        console.error('Failed to fetch travelers:', err);
        setTravelers([]);
      } finally {
        setLoadingTravelers(false);
      }
    };
    fetchTravelers();
  }, [isOpen, customerId]);

  const getTravelerLabel = (t) => {
    const name = [t.profile?.firstName, t.profile?.lastName].filter(Boolean).join(' ').trim();
    return name || t.email || t.username || t._id;
  };

  const availableTravelers = travelers.filter((t) => {
    const id = String(t._id);
    return id !== primaryTravelerId && !existingDelegateIds.has(id);
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const filteredTravelers = availableTravelers.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const name = getTravelerLabel(t).toLowerCase();
    const email = (t.email || '').toLowerCase();
    const username = (t.username || '').toLowerCase();
    return name.includes(q) || email.includes(q) || username.includes(q);
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isAtCapacity) {
      toast.error(`Maximum ${MAX_TRAVELERS_PER_CAR} travelers allowed in the same car`);
      return;
    }
    if (!selectedTravelerId || !transfer?._id) {
      toast.error('Please select a traveler');
      return;
    }
    setSubmitting(true);
    try {
      const newDelegate = {
        traveler_id: selectedTravelerId,
        flight_same_as_primary: true,
      };
      const updatedDelegates = [
        ...existingDelegates.map((d) => ({
          traveler_id: d.traveler_id?._id || d.traveler_id,
          flight_same_as_primary: d.flight_same_as_primary !== false,
        })),
        newDelegate,
      ];
      const response = await api.put(`/transfers/${transfer._id}/client-details`, {
        delegates: updatedDelegates,
      });
      if (response?.success) {
        toast.success('Traveler added to same car');
        setSelectedTravelerId('');
        onSuccess?.(response.data || transfer);
        onClose?.();
      } else {
        toast.error(response?.message || 'Failed to add traveler');
      }
    } catch (err) {
      // useApi shows toast on error
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTraveler = availableTravelers.find((t) => String(t._id) === selectedTravelerId);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Add traveler in same car"
      subtitle="Link another traveler traveling with the primary passenger"
      position="right"
      size="md"
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
          {!customerId ? (
            <p className="text-sm text-muted-foreground">No customer linked to this transfer.</p>
          ) : loadingTravelers ? (
            <p className="text-sm text-muted-foreground">Loading travelers...</p>
          ) : isAtCapacity ? (
            <div className="space-y-2">
              <p className="text-sm text-foreground font-medium">
                This car is already full ({currentTravelerCount}/{MAX_TRAVELERS_PER_CAR} travelers).
              </p>
              <p className="text-sm text-muted-foreground">
                Remove someone from "Travelers in same car" before adding another traveler.
              </p>
            </div>
          ) : availableTravelers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No other travelers found for this customer. All travelers may already be linked.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div ref={dropdownRef} className="relative">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Select traveler to add
                </label>
                <div
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="px-3 py-2 border border-input rounded-lg text-sm cursor-pointer bg-background text-foreground flex items-center justify-between hover:border-primary/60"
                >
                  <span className={selectedTraveler ? 'text-foreground' : 'text-muted-foreground'}>
                    {selectedTraveler ? `${getTravelerLabel(selectedTraveler)}${selectedTraveler.email ? ` (${selectedTraveler.email})` : ''}` : 'Select a traveler'}
                  </span>
                  <ChevronDown size={16} className={`text-muted-foreground flex-shrink-0 ml-2 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </div>
                {dropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                    <div className="p-2 border-b border-border">
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search by name or email..."
                          className="w-full pl-8 pr-3 py-2 text-sm border border-input rounded-md bg-background text-foreground outline-none focus:ring-2 focus:ring-ring"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                      {filteredTravelers.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-muted-foreground text-center">No travelers match</div>
                      ) : (
                        filteredTravelers.map((t) => (
                          <div
                            key={t._id}
                            onClick={() => {
                              setSelectedTravelerId(t._id);
                              setDropdownOpen(false);
                              setSearchQuery('');
                            }}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground ${
                              String(selectedTravelerId) === String(t._id) ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'
                            }`}
                          >
                            {getTravelerLabel(t)}{t.email ? ` (${t.email})` : ''}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                The selected traveler will be linked to this transfer and share the same car.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={!selectedTravelerId || submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus size={16} />
                  {submitting ? 'Adding...' : 'Add to same car'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-border rounded-lg font-medium text-sm hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Drawer>
  );
};

export default AddTravelerInSameCar;
