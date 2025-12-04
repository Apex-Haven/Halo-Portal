import { useState, useEffect } from 'react';
import { 
  MapPin, Calendar, DollarSign, Star, Filter, Search, Plus, 
  Eye, Sparkles, CheckCircle, Clock, XCircle, AlertCircle,
  Building2, Users, TrendingUp, Map
} from 'lucide-react';
import travelAdvisoryService from '../services/travelAdvisoryService';
import toast from 'react-hot-toast';
import ClientPreferenceForm from '../components/ClientPreferenceForm';
import HotelRecommendations from '../components/HotelRecommendations';

const TravelAdvisory = () => {
  const [preferences, setPreferences] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    active: 0,
    recommendationsGenerated: 0,
    hotelSelected: 0,
    completed: 0,
    withConference: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedPreference, setSelectedPreference] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [editingPreference, setEditingPreference] = useState(null);

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, countryFilter]); // Only re-fetch when filters change

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (countryFilter !== 'all') filters.country = countryFilter;

      const response = await travelAdvisoryService.getDashboard(filters);
      if (response.success) {
        setPreferences(response.preferences || []);
        setStats(response.stats || {});
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Failed to load travel advisory data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRecommendations = async (preferenceId) => {
    try {
      toast.loading('Generating recommendations...', { id: 'generate' });
      const response = await travelAdvisoryService.generateRecommendations(preferenceId);
      
      if (response.success) {
        const count = response.recommendationsGenerated || response.recommendations?.length || 0;
        toast.success(`Generated ${count} recommendations`, { id: 'generate' });
        
        // Refresh dashboard to get updated status
        await fetchDashboard();
        
        // Use preference from response or find it from state
        const updatedPreference = response.preference || preferences.find(p => p._id === preferenceId);
        
        // Auto-open recommendations drawer if we have recommendations
        if (count > 0 && updatedPreference) {
          // Create a stable preference object to prevent unnecessary re-renders
          const stablePreference = {
            ...updatedPreference,
            _id: updatedPreference._id || preferenceId
          };
          
          // Don't attach recommendations directly - let the component fetch them
          setSelectedPreference(stablePreference);
          setShowRecommendations(true);
        } else if (count === 0) {
          toast.error('No recommendations were generated. Please check your preferences.', { id: 'generate', duration: 5000 });
        }
      }
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast.error('Failed to generate recommendations', { id: 'generate' });
    }
  };

  const handleViewRecommendations = async (preference) => {
    setSelectedPreference(preference);
    setShowRecommendations(true);
  };

  const handleSelectHotel = async (preferenceId, hotelId, notes = '') => {
    try {
      toast.loading('Selecting hotel...', { id: 'select' });
      const response = await travelAdvisoryService.selectHotel(preferenceId, hotelId, notes);
      if (response.success) {
        toast.success('Hotel selected successfully', { id: 'select' });
        fetchDashboard();
        setShowRecommendations(false);
      }
    } catch (error) {
      console.error('Error selecting hotel:', error);
      toast.error('Failed to select hotel', { id: 'select' });
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', icon: Clock, label: 'Draft' },
      active: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300', icon: AlertCircle, label: 'Active' },
      recommendations_generated: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-700 dark:text-purple-300', icon: Sparkles, label: 'Recommendations Ready' },
      hotel_selected: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300', icon: CheckCircle, label: 'Hotel Selected' },
      completed: { bg: 'bg-emerald-100 dark:bg-emerald-900', text: 'text-emerald-700 dark:text-emerald-700', icon: CheckCircle, label: 'Completed' },
      cancelled: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300', icon: XCircle, label: 'Cancelled' }
    };

    const badge = badges[status] || badges.draft;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon size={12} />
        {badge.label}
      </span>
    );
  };

  const filteredPreferences = preferences.filter(pref => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const clientName = pref.clientId?.profile?.firstName || pref.clientId?.username || '';
      const country = pref.country || '';
      return clientName.toLowerCase().includes(searchLower) || 
             country.toLowerCase().includes(searchLower);
    }
    return true;
  });

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Travel Advisory</h1>
          <p className="text-muted-foreground">Manage hotel recommendations for clients</p>
        </div>
        <button
          onClick={() => {
            setEditingPreference(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus size={20} />
          Add Preferences
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Clients</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </div>
            <Users className="text-primary" size={24} />
          </div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Recommendations Ready</p>
              <p className="text-2xl font-bold text-foreground">{stats.recommendationsGenerated}</p>
            </div>
            <Sparkles className="text-purple-500" size={24} />
          </div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Hotels Selected</p>
              <p className="text-2xl font-bold text-foreground">{stats.hotelSelected}</p>
            </div>
            <CheckCircle className="text-green-500" size={24} />
          </div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">With Conference</p>
              <p className="text-2xl font-bold text-foreground">{stats.withConference}</p>
            </div>
            <Building2 className="text-blue-500" size={24} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card p-4 rounded-lg border border-border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
            <input
              type="text"
              placeholder="Search by client name or country..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="recommendations_generated">Recommendations Ready</option>
            <option value="hotel_selected">Hotel Selected</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Countries</option>
            {[...new Set(preferences.map(p => p.country))].map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Preferences List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading preferences...</p>
        </div>
      ) : filteredPreferences.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <MapPin className="mx-auto mb-4 text-muted-foreground" size={48} />
          <p className="text-muted-foreground">No preferences found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPreferences.map((pref) => (
            <div key={pref._id} className="bg-card p-6 rounded-lg border border-border hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {pref.clientId?.profile?.firstName} {pref.clientId?.profile?.lastName} 
                      {!pref.clientId?.profile?.firstName && pref.clientId?.username}
                    </h3>
                    {getStatusBadge(pref.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{pref.clientId?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {pref.status === 'draft' || pref.status === 'active' ? (
                    <button
                      onClick={() => handleGenerateRecommendations(pref._id)}
                      className="px-3 py-1.5 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-1.5"
                    >
                      <Sparkles size={14} />
                      Generate Recommendations
                    </button>
                  ) : pref.status === 'recommendations_generated' ? (
                    <button
                      onClick={() => handleViewRecommendations(pref)}
                      className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                    >
                      <Eye size={14} />
                      View Recommendations
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin size={16} className="text-muted-foreground" />
                  <span className="text-foreground font-medium">{pref.country}</span>
                  {pref.targetAreas && pref.targetAreas.length > 0 && (
                    <span className="text-muted-foreground">({pref.targetAreas.join(', ')})</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={16} className="text-muted-foreground" />
                  <span className="text-foreground">
                    {formatDate(pref.checkInDate)} - {formatDate(pref.checkOutDate)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign size={16} className="text-muted-foreground" />
                  <span className="text-foreground">
                    {formatCurrency(pref.budgetMin, pref.currency)} - {formatCurrency(pref.budgetMax, pref.currency)}
                  </span>
                </div>
              </div>

              {pref.conferenceLocation && pref.conferenceLocation.name && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 size={16} className="text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-blue-900 dark:text-blue-100">Conference:</span>
                    <span className="text-blue-700 dark:text-blue-300">{pref.conferenceLocation.name}</span>
                    {pref.conferenceLocation.address && (
                      <span className="text-blue-600 dark:text-blue-400 text-xs">({pref.conferenceLocation.address})</span>
                    )}
                  </div>
                </div>
              )}

              {pref.selectedHotel && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                    <span className="font-medium text-green-900 dark:text-green-100">Selected Hotel:</span>
                    <span className="text-green-700 dark:text-green-300">
                      {typeof pref.selectedHotel === 'object' ? pref.selectedHotel.name : 'Hotel Selected'}
                    </span>
                  </div>
                </div>
              )}

              {pref.recommendations && pref.recommendations.length > 0 && (
                <div className="mt-4 text-sm text-muted-foreground">
                  {pref.recommendations.length} recommendation{pref.recommendations.length !== 1 ? 's' : ''} available
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Preference Form Modal */}
      {showForm && (
        <ClientPreferenceForm
          preference={editingPreference}
          onClose={() => {
            setShowForm(false);
            setEditingPreference(null);
          }}
          onSave={() => {
            setShowForm(false);
            setEditingPreference(null);
            fetchDashboard();
          }}
        />
      )}

      {/* Recommendations Modal */}
      {showRecommendations && selectedPreference && (
        <HotelRecommendations
          preference={selectedPreference}
          onClose={() => {
            setShowRecommendations(false);
            setSelectedPreference(null);
          }}
          onSelectHotel={handleSelectHotel}
        />
      )}
    </div>
  );
};

export default TravelAdvisory;

