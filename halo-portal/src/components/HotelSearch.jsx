import React, { useState } from 'react';
import { Search, MapPin, Star, IndianRupee, Wifi, Car, Dumbbell, Utensils, Heart, Users, Calendar, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';

const HotelSearch = ({ onSelectHotel, onAssignHotel }) => {
  const [searchCity, setSearchCity] = useState('');
  const [filters, setFilters] = useState({
    minStarRating: '',
    maxPrice: '',
    minPrice: '',
    minRating: '',
    amenities: [],
    sortBy: 'rating' // 'rating', 'price_low', 'price_high', 'name'
  });
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Goa', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Jaipur', 'Agra', 'Udaipur', 'Kochi', 'Shimla', 'Manali', 'Darjeeling', 'Rishikesh'];

  const handleSearch = async () => {
    if (!searchCity.trim()) {
      toast.error('Please enter a city');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/hotels/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          city: searchCity,
          filters: Object.fromEntries(
            Object.entries(filters).filter(([_, v]) => v !== '' && v !== null)
          ),
          limit: 50
        })
      });

      const data = await response.json();

      if (data.success) {
        // Sort results based on selected sort option
        let sortedHotels = [...data.hotels];
        if (filters.sortBy === 'rating') {
          sortedHotels.sort((a, b) => (b.rating?.score || 0) - (a.rating?.score || 0));
        } else if (filters.sortBy === 'price_low') {
          sortedHotels.sort((a, b) => (a.pricing?.basePrice || 0) - (b.pricing?.basePrice || 0));
        } else if (filters.sortBy === 'price_high') {
          sortedHotels.sort((a, b) => (b.pricing?.basePrice || 0) - (a.pricing?.basePrice || 0));
        } else if (filters.sortBy === 'name') {
          sortedHotels.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }
        
        setSearchResults(sortedHotels);
        toast.success(`Found ${data.totalResults || data.hotels.length} hotels in ${data.city}`);
      } else {
        toast.error(data.message || 'Failed to search hotels');
      }
    } catch (error) {
      console.error('Hotel search error:', error);
      toast.error('Failed to search hotels');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignHotel = async (hotel) => {
    // Implementation for assigning hotel to customer
    if (onAssignHotel) {
      onAssignHotel(hotel, selectedCustomer);
    }
  };

  const getAmenityIcon = (amenity) => {
    const icons = {
      wifi: Wifi,
      parking: Car,
      gym: Dumbbell,
      restaurant: Utensils,
      spa: Heart,
      pool: Users
    };
    return icons[amenity] || Wifi;
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Search Hotels</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">City</label>
            <select
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter city"
            >
              <option value="">Select City</option>
              {cities.map(city => (
                <option key={city} value={city} className="bg-white dark:bg-gray-700">{city}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Min Star Rating</label>
            <select
              value={filters.minStarRating}
              onChange={(e) => setFilters({ ...filters, minStarRating: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Any</option>
              <option value="5" className="bg-white dark:bg-gray-700">5 Stars</option>
              <option value="4" className="bg-white dark:bg-gray-700">4 Stars</option>
              <option value="3" className="bg-white dark:bg-gray-700">3 Stars</option>
              <option value="2" className="bg-white dark:bg-gray-700">2 Stars</option>
              <option value="1" className="bg-white dark:bg-gray-700">1 Star</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Min Price (₹/night)</label>
            <input
              type="number"
              value={filters.minPrice}
              onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="e.g., 1000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max Price (₹/night)</label>
            <input
              type="number"
              value={filters.maxPrice}
              onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="e.g., 5000"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={loading || !searchCity}
              className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              {loading ? 'Searching...' : 'Search Hotels'}
            </button>
          </div>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Search Results ({searchResults.length})</h3>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  Data from: {searchResults[0]?.sources?.map(s => s.platform).join(', ') || 'Mock'}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Sort by:</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => {
                      setFilters({ ...filters, sortBy: e.target.value });
                      // Re-sort results
                      let sorted = [...searchResults];
                      if (e.target.value === 'rating') {
                        sorted.sort((a, b) => (b.rating?.score || 0) - (a.rating?.score || 0));
                      } else if (e.target.value === 'price_low') {
                        sorted.sort((a, b) => (a.pricing?.basePrice || 0) - (b.pricing?.basePrice || 0));
                      } else if (e.target.value === 'price_high') {
                        sorted.sort((a, b) => (b.pricing?.basePrice || 0) - (a.pricing?.basePrice || 0));
                      } else if (e.target.value === 'name') {
                        sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                      }
                      setSearchResults(sorted);
                    }}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="rating" className="bg-white dark:bg-gray-700">Highest Rated</option>
                    <option value="price_low" className="bg-white dark:bg-gray-700">Price: Low to High</option>
                    <option value="price_high" className="bg-white dark:bg-gray-700">Price: High to Low</option>
                    <option value="name" className="bg-white dark:bg-gray-700">Name A-Z</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {searchResults.map((hotel, index) => (
            <div key={hotel.hotelId || index} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Hotel Info */}
                <div className="lg:col-span-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-xl font-bold">{hotel.name}</h4>
                      <p className="text-gray-600 flex items-center gap-2 mt-1">
                        <MapPin className="w-4 h-4" />
                        {hotel.location?.address || hotel.city}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: hotel.starRating || 0 }).map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span className="font-bold">{hotel.rating?.score || 'N/A'}</span>
                      <span className="text-gray-500 text-sm">
                        ({hotel.rating?.reviews || 0} reviews)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <IndianRupee className="w-4 h-4" />
                      <span className="font-bold text-green-600">
                        {hotel.pricing?.basePrice?.toLocaleString('en-IN')}
                      </span>
                      <span>/night</span>
                      {hotel.pricing?.discount > 0 && (
                        <span className="text-xs text-gray-500 line-through">
                          {Math.round(hotel.pricing.basePrice * (1 + hotel.pricing.discount / 100)).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amenities */}
                  {hotel.amenities && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {Object.entries(hotel.amenities)
                        .filter(([_, available]) => available)
                        .map(([amenity, _]) => {
                          const Icon = getAmenityIcon(amenity);
                          return (
                            <span
                              key={amenity}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm capitalize"
                            >
                              <Icon className="w-4 h-4 text-blue-600" />
                              {amenity}
                            </span>
                          );
                        })}
                    </div>
                  )}

                  {/* Sources */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Available on:</span>
                    {hotel.sources?.map((source, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-50 rounded text-xs">
                        {source.platform}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {onAssignHotel && (
                    <button
                      onClick={() => onSelectHotel && onSelectHotel(hotel)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Assign to Customer
                    </button>
                  )}
                  {onSelectHotel && (
                    <button
                      onClick={() => onSelectHotel(hotel)}
                      className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {searchResults.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Search className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Search for hotels in your city to get started</p>
        </div>
      )}
    </div>
  );
};

export default HotelSearch;
