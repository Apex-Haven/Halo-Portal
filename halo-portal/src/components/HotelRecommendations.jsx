import { useState, useEffect, useCallback, useRef } from 'react';
import { X, MapPin, Star, DollarSign, Wifi, Car, Dumbbell, Utensils, Sparkles, CheckCircle, Filter } from 'lucide-react';
import Drawer from './Drawer';
import HotelCard from './HotelCard';
import travelAdvisoryService from '../services/travelAdvisoryService';
import toast from 'react-hot-toast';

const HotelRecommendations = ({ preference, onClose, onSelectHotel }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('relevance'); // relevance, price, distance
  const [filterDistance, setFilterDistance] = useState('all'); // all, within5km, within10km, within20km
  const fetchingRef = useRef(false); // Prevent duplicate fetches

  const fetchRecommendations = useCallback(async () => {
    // Prevent duplicate fetches
    if (fetchingRef.current) {
      return;
    }

    if (!preference || !preference._id) {
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      
      // First try to get existing recommendations
      let response = await travelAdvisoryService.getRecommendations(preference._id);
      
      // If no recommendations found, try to auto-generate
      if (response.success && (!response.recommendations || response.recommendations.length === 0)) {
        try {
          // Try to generate recommendations
          const generateResponse = await travelAdvisoryService.generateRecommendations(preference._id);
          if (generateResponse.success && generateResponse.recommendations) {
            response = generateResponse;
          }
        } catch (genError) {
          console.error('Error auto-generating recommendations:', genError);
          // Continue with empty recommendations
        }
      }
      
      if (response.success) {
        const recs = response.recommendations || [];
        setRecommendations(recs);
        
        if (recs.length === 0) {
          toast.error('No recommendations available. Please try generating again.', { duration: 5000 });
        }
      } else {
        console.error('Failed to fetch recommendations:', response);
        toast.error('Failed to load recommendations');
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast.error('Failed to load recommendations');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [preference?._id]);

  useEffect(() => {
    if (preference && preference._id) {
      fetchRecommendations();
    }
    // Cleanup: reset fetching flag when component unmounts or preference changes
    return () => {
      fetchingRef.current = false;
    };
  }, [preference?._id, fetchRecommendations]);

  const handleSelectHotel = async (hotelId, notes = '') => {
    try {
      await onSelectHotel(preference._id, hotelId, notes);
    } catch (error) {
      console.error('Error selecting hotel:', error);
    }
  };

  const getRelevanceColor = (score) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  const getRelevanceBadge = (score) => {
    if (score >= 80) return { label: 'Excellent Match', color: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' };
    if (score >= 60) return { label: 'Good Match', color: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' };
    return { label: 'Fair Match', color: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300' };
  };

  const sortedRecommendations = [...recommendations].sort((a, b) => {
    if (sortBy === 'relevance') {
      return b.relevanceScore - a.relevanceScore;
    } else if (sortBy === 'price') {
      const priceA = a.hotelId?.pricing?.basePrice || a.hotel?.pricing?.basePrice || 0;
      const priceB = b.hotelId?.pricing?.basePrice || b.hotel?.pricing?.basePrice || 0;
      return priceA - priceB;
    } else if (sortBy === 'distance') {
      const distA = a.distanceFromConference || a.distanceFromTargetArea || 999;
      const distB = b.distanceFromConference || b.distanceFromTargetArea || 999;
      return distA - distB;
    }
    return 0;
  });

  const filteredRecommendations = sortedRecommendations.filter(rec => {
    if (filterDistance === 'all') return true;
    const distance = rec.distanceFromConference || 999;
    if (filterDistance === 'within5km') return distance <= 5;
    if (filterDistance === 'within10km') return distance <= 10;
    if (filterDistance === 'within20km') return distance <= 20;
    return true;
  });

  // Extract hotel data from recommendation
  const getHotelFromRec = (rec) => {
    // Try multiple sources for hotel data
    if (rec.hotel && typeof rec.hotel === 'object') {
      return rec.hotel;
    }
    if (rec.hotelId && typeof rec.hotelId === 'object' && rec.hotelId.name) {
      return rec.hotelId; // Populated hotel document
    }
    // Fallback to empty object
    return {};
  };

  const formatCurrency = (amount, currency = 'INR') => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Drawer
      isOpen={true}
      onClose={onClose}
      title="Hotel Recommendations"
      subtitle={`Recommendations for ${preference.clientId?.profile?.firstName || preference.clientId?.username}`}
      size="xl"
    >
      <div className="flex flex-col h-full">
        {/* Filters and Sort */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="relevance">Relevance Score</option>
                <option value="price">Price (Low to High)</option>
                <option value="distance">Distance</option>
              </select>
            </div>
            {preference.conferenceLocation && (
              <div className="flex-1">
                <label className="block text-xs text-muted-foreground mb-1">Distance from Conference</label>
                <select
                  value={filterDistance}
                  onChange={(e) => setFilterDistance(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                >
                  <option value="all">All Distances</option>
                  <option value="within5km">Within 5 km</option>
                  <option value="within10km">Within 10 km</option>
                  <option value="within20km">Within 20 km</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Recommendations List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading recommendations...</p>
            </div>
          ) : filteredRecommendations.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="mx-auto mb-4 text-muted-foreground" size={48} />
              <p className="text-muted-foreground">No recommendations found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecommendations.map((rec, index) => {
                // Extract hotel data from recommendation
                const hotelData = getHotelFromRec(rec);
                
                return (
                  <div key={rec.hotelId?._id || rec.hotelId || rec.hotel?.hotelId || index} className="relative">
                    <HotelCard
                      hotel={hotelData}
                      recommendation={rec}
                      onSelect={() => handleSelectHotel(rec.hotelId?._id || rec.hotelId || rec.hotel?.hotelId)}
                    />
                    {/* Additional match details overlay */}
                    {(rec.distanceFromConference !== null || rec.distanceFromTargetArea !== null) && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                        {rec.distanceFromConference !== null && (
                          <div className="text-muted-foreground">
                            Conference: {rec.distanceFromConference.toFixed(1)} km
                          </div>
                        )}
                        {rec.distanceFromTargetArea !== null && (
                          <div className="text-muted-foreground">
                            Target Area: {rec.distanceFromTargetArea.toFixed(1)} km
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};

export default HotelRecommendations;

