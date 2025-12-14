import { useState, useEffect } from 'react';
import { X, MapPin, Calendar, DollarSign, Star, Building2, Plus, X as XIcon } from 'lucide-react';
import Drawer from './Drawer';
import Dropdown from './Dropdown';
import travelAdvisoryService from '../services/travelAdvisoryService';
import { useApi } from '../hooks/useApi';
import toast from 'react-hot-toast';

const AMENITIES = [
  { value: 'wifi', label: 'WiFi' },
  { value: 'parking', label: 'Parking' },
  { value: 'pool', label: 'Swimming Pool' },
  { value: 'gym', label: 'Gym/Fitness Center' },
  { value: 'spa', label: 'Spa' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'bar', label: 'Bar' },
  { value: 'roomService', label: 'Room Service' },
  { value: 'laundry', label: 'Laundry Service' },
  { value: 'elevator', label: 'Elevator' },
  { value: 'airConditioning', label: 'Air Conditioning' },
  { value: 'airportShuttle', label: 'Airport Shuttle' },
  { value: 'petFriendly', label: 'Pet Friendly' },
  { value: 'businessCenter', label: 'Business Center' },
  { value: 'conferenceRoom', label: 'Conference Room' }
];

const ClientPreferenceForm = ({ preference, onClose, onSave }) => {
  const api = useApi();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    country: '',
    targetAreas: [],
    checkInDate: '',
    checkOutDate: '',
    budgetMin: '',
    budgetMax: '',
    currency: 'INR',
    preferredStarRating: 3,
    requiredAmenities: [],
    conferenceLocation: {
      name: '',
      address: '',
      coordinates: {
        latitude: null,
        longitude: null
      }
    },
    maxDistanceFromConference: 10,
    specialRequirements: '',
    transferId: '',
    notes: ''
  });
  const [newArea, setNewArea] = useState('');

  useEffect(() => {
    fetchClients();
    if (preference) {
      // Populate form with existing preference data
      setFormData({
        clientId: preference.clientId?._id || preference.clientId || '',
        country: preference.country || '',
        targetAreas: preference.targetAreas || [],
        checkInDate: preference.checkInDate ? new Date(preference.checkInDate).toISOString().split('T')[0] : '',
        checkOutDate: preference.checkOutDate ? new Date(preference.checkOutDate).toISOString().split('T')[0] : '',
        budgetMin: preference.budgetMin || '',
        budgetMax: preference.budgetMax || '',
        currency: preference.currency || 'INR',
        preferredStarRating: preference.preferredStarRating || 3,
        requiredAmenities: preference.requiredAmenities || [],
        conferenceLocation: preference.conferenceLocation || {
          name: '',
          address: '',
          coordinates: { latitude: null, longitude: null }
        },
        maxDistanceFromConference: preference.maxDistanceFromConference || 10,
        specialRequirements: preference.specialRequirements || '',
        transferId: preference.transferId || '',
        notes: preference.notes || ''
      });
    }
  }, [preference]);

  const fetchClients = async () => {
    try {
      const response = await api.get('/users/clients');
      if (response.success) {
        setClients(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleConferenceChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      conferenceLocation: {
        ...prev.conferenceLocation,
        [field]: value
      }
    }));
  };

  const handleAddArea = () => {
    if (newArea.trim() && !formData.targetAreas.includes(newArea.trim())) {
      setFormData(prev => ({
        ...prev,
        targetAreas: [...prev.targetAreas, newArea.trim()]
      }));
      setNewArea('');
    }
  };

  const handleRemoveArea = (area) => {
    setFormData(prev => ({
      ...prev,
      targetAreas: prev.targetAreas.filter(a => a !== area)
    }));
  };

  const handleAmenityToggle = (amenity) => {
    setFormData(prev => ({
      ...prev,
      requiredAmenities: prev.requiredAmenities.includes(amenity)
        ? prev.requiredAmenities.filter(a => a !== amenity)
        : [...prev.requiredAmenities, amenity]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.clientId || !formData.country || !formData.checkInDate || !formData.checkOutDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (parseFloat(formData.budgetMin) >= parseFloat(formData.budgetMax)) {
      toast.error('Maximum budget must be greater than minimum budget');
      return;
    }

    try {
      setLoading(true);
      
      // Convert dates to ISO strings for backend
      const checkInDate = formData.checkInDate ? new Date(formData.checkInDate).toISOString() : null;
      const checkOutDate = formData.checkOutDate ? new Date(formData.checkOutDate).toISOString() : null;
      
      const payload = {
        clientId: formData.clientId,
        country: formData.country.trim(),
        targetAreas: formData.targetAreas.filter(area => area && area.trim()),
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        budgetMin: parseFloat(formData.budgetMin) || 0,
        budgetMax: parseFloat(formData.budgetMax) || 0,
        currency: formData.currency || 'INR',
        preferredStarRating: parseInt(formData.preferredStarRating) || 3,
        requiredAmenities: formData.requiredAmenities || [],
        maxDistanceFromConference: parseFloat(formData.maxDistanceFromConference) || 10,
        specialRequirements: formData.specialRequirements || '',
        transferId: formData.transferId || null,
        notes: formData.notes || ''
      };

      // Include preferenceId if editing existing preference
      if (preference && preference._id) {
        payload.preferenceId = preference._id;
      }

      // Clean up conference location if provided
      if (formData.conferenceLocation && formData.conferenceLocation.name && formData.conferenceLocation.name.trim()) {
        const coords = formData.conferenceLocation.coordinates;
        const hasValidCoordinates = coords && 
          coords.latitude != null && 
          coords.longitude != null &&
          !isNaN(coords.latitude) &&
          !isNaN(coords.longitude);
        
        payload.conferenceLocation = {
          name: formData.conferenceLocation.name.trim(),
          address: formData.conferenceLocation.address || '',
          ...(hasValidCoordinates ? {
            coordinates: {
              latitude: parseFloat(coords.latitude),
              longitude: parseFloat(coords.longitude)
            }
          } : {})
        };
      } else {
        payload.conferenceLocation = null;
      }

      console.log('Sending payload:', payload); // Debug log

      const response = await travelAdvisoryService.createOrUpdatePreferences(payload);
      if (response.success) {
        toast.success(preference ? 'Preferences updated successfully' : 'Preferences created successfully');
        onSave();
      } else {
        toast.error(response.message || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to save preferences';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const clientOptions = clients.map(client => ({
    value: client._id || client.id,
    label: `${client.profile?.firstName || ''} ${client.profile?.lastName || ''}`.trim() || client.username,
    email: client.email
  }));

  return (
    <Drawer
      isOpen={true}
      onClose={onClose}
      title={preference ? 'Edit Travel Preferences' : 'Add Travel Preferences'}
      subtitle="Enter client travel preferences and requirements"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
          {/* Client Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Client <span className="text-destructive">*</span>
            </label>
            <Dropdown
              name="clientId"
              value={formData.clientId}
              options={clientOptions}
              onChange={handleChange}
              placeholder="Select a client"
            />
          </div>

          {/* Country */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Country <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., India, USA, UK"
              required
            />
          </div>

          {/* Target Areas */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Target Areas/Localities
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddArea())}
                className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter area/locality and press Enter"
              />
              <button
                type="button"
                onClick={handleAddArea}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
            {formData.targetAreas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.targetAreas.map((area, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    {area}
                    <button
                      type="button"
                      onClick={() => handleRemoveArea(area)}
                      className="hover:text-primary/70"
                    >
                      <XIcon size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Check-in Date <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                name="checkInDate"
                value={formData.checkInDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Check-out Date <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                name="checkOutDate"
                value={formData.checkOutDate}
                onChange={handleChange}
                min={formData.checkInDate}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          {/* Budget */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Budget Range <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Min</label>
                    <input
                      type="number"
                      name="budgetMin"
                      value={formData.budgetMin}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="0"
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Max</label>
                    <input
                      type="number"
                      name="budgetMax"
                      value={formData.budgetMax}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="0"
                      min="0"
                      required
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Currency</label>
                <Dropdown
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  options={[
                    { value: 'INR', label: 'INR' },
                    { value: 'USD', label: 'USD' },
                    { value: 'EUR', label: 'EUR' },
                    { value: 'GBP', label: 'GBP' }
                  ]}
                  placeholder="Select Currency"
                />
              </div>
            </div>
          </div>

          {/* Star Rating */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Preferred Star Rating
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(rating => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, preferredStarRating: rating }))}
                  className={`flex-1 py-2 rounded-lg border transition-colors ${
                    formData.preferredStarRating === rating
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:bg-accent'
                  }`}
                >
                  {Array(rating).fill(0).map((_, i) => (
                    <Star key={i} size={16} className="inline fill-current" />
                  ))}
                </button>
              ))}
            </div>
          </div>

          {/* Amenities */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Required Amenities
            </label>
            <div className="grid grid-cols-3 gap-2">
              {AMENITIES.map(amenity => (
                <label
                  key={amenity.value}
                  className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-accent cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.requiredAmenities.includes(amenity.value)}
                    onChange={() => handleAmenityToggle(amenity.value)}
                    className="rounded border-border"
                  />
                  <span className="text-sm text-foreground">{amenity.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Conference Location */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
              <label className="text-sm font-medium text-foreground">Conference/Event Location (Optional)</label>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Conference Name</label>
                <input
                  type="text"
                  value={formData.conferenceLocation.name}
                  onChange={(e) => handleConferenceChange('name', e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Tech Conference 2024"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Address</label>
                <input
                  type="text"
                  value={formData.conferenceLocation.address}
                  onChange={(e) => handleConferenceChange('address', e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Full address of the conference venue"
                />
              </div>
              {formData.conferenceLocation.name && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Max Distance from Conference (km)
                  </label>
                  <input
                    type="number"
                    value={formData.maxDistanceFromConference}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxDistanceFromConference: parseFloat(e.target.value) || 10 }))}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    min="1"
                    max="100"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Special Requirements */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Special Requirements
            </label>
            <textarea
              name="specialRequirements"
              value={formData.specialRequirements}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Any special requirements or notes..."
            />
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Internal Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Internal notes (not visible to client)..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-border px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-lg bg-background text-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : preference ? 'Update Preferences' : 'Create Preferences'}
          </button>
        </div>
      </form>
    </Drawer>
  );
};

export default ClientPreferenceForm;

