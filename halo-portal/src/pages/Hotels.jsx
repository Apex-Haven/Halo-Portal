import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Search, Filter, Edit, Trash2, MapPin, Star, IndianRupee, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import HotelSearch from '../components/HotelSearch';
import Dropdown from '../components/Dropdown';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';

const HotelManagement = () => {
  const navigate = useNavigate();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [showHotelSearch, setShowHotelSearch] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/hotels`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      const data = await response.json();
      if (data.success) {
        setHotels(data.hotels);
      }
    } catch (error) {
      console.error('Error fetching hotels:', error);
      toast.error('Failed to load hotels');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchHotel = () => {
    setShowHotelSearch(true);
  };

  const handleSelectHotel = (hotel) => {
    // Show assignment modal
    setSelectedHotel(hotel);
    setShowAssignModal(true);
    setShowHotelSearch(false);
  };

  const handleAssignHotel = async (hotel, customerId) => {
    // Implementation for assigning hotel to customer
    console.log('Assign hotel:', hotel, 'to customer:', customerId);
    // Add actual assignment logic here
    toast.success('Hotel assigned to customer');
    setShowAssignModal(false);
  };

  const filteredHotels = hotels.filter(hotel => {
    const matchesSearch = !searchTerm || 
      hotel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hotel.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCity = selectedCity === 'all' || hotel.city === selectedCity;
    
    return matchesSearch && matchesCity;
  });

  const cities = [...new Set(hotels.map(h => h.city))];

  if (showHotelSearch) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setShowHotelSearch(false)}
            className="flex items-center gap-2 px-4 py-2.5 bg-transparent border border-input rounded-lg cursor-pointer text-sm text-foreground hover:bg-accent transition-colors"
          >
            ← Back to Hotels
          </button>
          <h2 className="text-3xl font-bold text-foreground">
            Search & Add Hotels
          </h2>
        </div>
        <HotelSearch
          onSelectHotel={handleSelectHotel}
          onAssignHotel={handleAssignHotel}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Hotel Management</h1>
          <p className="text-muted-foreground mt-1">Manage and search hotels for customer packages</p>
        </div>
        <button
          onClick={handleSearchHotel}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Search Hotels
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search hotels..."
                className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">City</label>
            <Dropdown
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              options={[
                { value: 'all', label: 'All Cities' },
                ...cities.map(city => ({
                  value: city,
                  label: city
                }))
              ]}
              style={{ width: '100%' }}
            />
          </div>
          <div className="flex items-end">
            <div className="text-sm text-muted-foreground">
              {filteredHotels.length} hotels found
            </div>
          </div>
        </div>
      </div>

      {/* Hotels List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : filteredHotels.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl shadow-sm border border-border">
          <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No hotels found. Try searching for new hotels.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHotels.map(hotel => (
            <div key={hotel._id} className="bg-card rounded-xl shadow-sm border border-border p-6 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground">{hotel.name}</h3>
                  <p className="text-muted-foreground flex items-center gap-2 mt-1">
                    <MapPin className="w-4 h-4" />
                    {hotel.city}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: hotel.starRating || 0 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="font-bold text-foreground">{hotel.rating?.score || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1 text-success-600 dark:text-success-500">
                  <IndianRupee className="w-4 h-4" />
                  <span className="font-bold">{hotel.pricing?.basePrice?.toLocaleString('en-IN')}/night</span>
                </div>
              </div>

              {hotel.assignedToCustomers && hotel.assignedToCustomers.length > 0 && (
                <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{hotel.assignedToCustomers.length} customer(s)</span>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm transition-colors">
                  Assign to Customer
                </button>
                <button className="px-4 py-2 border border-input rounded-lg hover:bg-accent text-foreground transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="px-4 py-2 border border-input rounded-lg hover:bg-accent text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HotelManagement;
