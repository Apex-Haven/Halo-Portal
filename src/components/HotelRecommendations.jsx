import { useState, useEffect, useCallback, useRef } from 'react';
import { X, MapPin, Star, DollarSign, Wifi, Car, Dumbbell, Utensils, Sparkles, CheckCircle, Filter, Download } from 'lucide-react';
import Drawer from './Drawer';
import HotelCard from './HotelCard';
import Dropdown from './Dropdown';
import travelAdvisoryService from '../services/travelAdvisoryService';
import { exportTravelAdvisoryToPDF } from '../utils/pdfExport';
import toast from 'react-hot-toast';

const HotelRecommendations = ({ preference, onClose, onSelectHotel }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [sortBy, setSortBy] = useState('relevance'); // relevance, price, distance
  const [filterDistance, setFilterDistance] = useState('all'); // all, within5km, within10km, within20km
  const fetchingRef = useRef(false); // Prevent duplicate fetches

  const fetchRecommendations = useCallback(async () => {
    // Prevent duplicate fetches
    if (fetchingRef.current) {
      return;
    }

    if (!preference || !preference._id) {
      console.warn('No preference or preference ID provided');
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      
      // First try to get existing recommendations
      let response = await travelAdvisoryService.getRecommendations(preference._id);
      
      // If no recommendations found, don't auto-generate - let user trigger it manually
      // This prevents unexpected API calls and gives user control
      if (response.success) {
        const recs = response.recommendations || [];
        console.log('📋 Received recommendations:', recs.length);
        if (recs.length > 0) {
          console.log('🏨 Sample recommendation:', {
            hasHotel: !!recs[0].hotel,
            hasHotelId: !!recs[0].hotelId,
            hotelName: recs[0].hotel?.name || recs[0].hotelId?.name || 'N/A',
            hotelStructure: Object.keys(recs[0].hotel || {})
          });
        }
        setRecommendations(recs);
        // Empty results are handled by the UI showing "No recommendations found"
      } else {
        const errorMessage = response.message || 'Failed to load recommendations';
        console.error('Failed to fetch recommendations:', response);
        // Only show error if it's an actual error, not just empty results
        if (response.message && !response.message.toLowerCase().includes('not found') && !response.message.toLowerCase().includes('no recommendations')) {
          toast.error(errorMessage, { duration: 4000 });
        }
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load recommendations';
      toast.error(errorMessage, { duration: 4000 });
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

  const handleExportPDF = async () => {
    if (!preference) {
      toast.error('Preference data not available');
      return;
    }

    if (filteredRecommendations.length === 0) {
      toast.error('No recommendations to export');
      return;
    }

    try {
      setExportLoading(true);
      toast.loading('Generating PDF...', { id: 'export-pdf' });
      
      await exportTravelAdvisoryToPDF(preference, filteredRecommendations);
      
      toast.success('PDF exported successfully!', { id: 'export-pdf' });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error(error.message || 'Failed to export PDF', { id: 'export-pdf' });
    } finally {
      setExportLoading(false);
    }
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
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">Sort By</label>
              <Dropdown
                name="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                options={[
                  { value: 'relevance', label: 'Relevance Score' },
                  { value: 'price', label: 'Price (Low to High)' },
                  { value: 'distance', label: 'Distance' }
                ]}
                placeholder="Sort By"
              />
            </div>
            {preference.conferenceLocation && (
              <div className="flex-1">
                <label className="block text-xs text-muted-foreground mb-1">Distance from Conference</label>
                <Dropdown
                  name="filterDistance"
                  value={filterDistance}
                  onChange={(e) => setFilterDistance(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Distances' },
                    { value: 'within5km', label: 'Within 5 km' },
                    { value: 'within10km', label: 'Within 10 km' },
                    { value: 'within20km', label: 'Within 20 km' }
                  ]}
                  placeholder="Filter by Distance"
                />
              </div>
            )}
            <div className="flex-shrink-0">
              <button
                onClick={handleExportPDF}
                disabled={exportLoading || filteredRecommendations.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={16} />
                {exportLoading ? 'Exporting...' : 'Export PDF'}
              </button>
            </div>
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
                    {((rec.distanceFromConference != null && typeof rec.distanceFromConference === 'number') || 
                      (rec.distanceFromTargetArea != null && typeof rec.distanceFromTargetArea === 'number')) && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                        {rec.distanceFromConference != null && typeof rec.distanceFromConference === 'number' && (
                          <div className="text-muted-foreground">
                            Conference: {rec.distanceFromConference.toFixed(1)} km
                          </div>
                        )}
                        {rec.distanceFromTargetArea != null && typeof rec.distanceFromTargetArea === 'number' && (
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

