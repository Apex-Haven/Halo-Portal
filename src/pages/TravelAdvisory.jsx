import { useState, useEffect } from 'react';
import { 
  MapPin, Calendar, DollarSign, Star, Filter, Search, Plus, 
  Eye, Sparkles, CheckCircle, Clock, XCircle, AlertCircle,
  Building2, Users, TrendingUp, Map, Download, Edit, Trash2
} from 'lucide-react';
import travelAdvisoryService from '../services/travelAdvisoryService';
import { exportTravelAdvisoryToPDF } from '../utils/pdfExport';
import toast from 'react-hot-toast';
import ClientPreferenceForm from '../components/ClientPreferenceForm';
import HotelRecommendations from '../components/HotelRecommendations';
import Dropdown from '../components/Dropdown';
import ConfirmModal from '../components/ConfirmModal';

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
  const [exportingPreferenceId, setExportingPreferenceId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, preferenceId: null });
  const [generatingPreferenceId, setGeneratingPreferenceId] = useState(null);

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
      // Validate preference exists
      const preference = preferences.find(p => p._id === preferenceId);
      if (!preference) {
        toast.error('Preference not found', { id: 'generate' });
        return;
      }

      // Validate required fields
      if (!preference.country) {
        toast.error('Country is required to generate recommendations', { id: 'generate' });
        return;
      }

      if (!preference.checkInDate || !preference.checkOutDate) {
        toast.error('Check-in and check-out dates are required', { id: 'generate' });
        return;
      }

      if (!preference.budgetMin || !preference.budgetMax) {
        toast.error('Budget range is required', { id: 'generate' });
        return;
      }

      setGeneratingPreferenceId(preferenceId);
      toast.loading('Generating recommendations...', { id: 'generate' });
      const response = await travelAdvisoryService.generateRecommendations(preferenceId);
      
      if (response.success) {
        const count = response.recommendationsGenerated || response.recommendations?.length || 0;
        
        if (count > 0) {
          toast.success(`Generated ${count} recommendation${count !== 1 ? 's' : ''}`, { id: 'generate' });
        } else {
          toast.warning('No recommendations found matching your criteria. Try adjusting your preferences.', { id: 'generate', duration: 6000 });
        }
        
        // Refresh dashboard to get updated status
        await fetchDashboard();
        
        // Use preference from response or find it from state
        const updatedPreference = response.preference || preference;
        
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
        }
      } else {
        const errorMessage = response.message || 'Failed to generate recommendations';
        toast.error(errorMessage, { id: 'generate', duration: 5000 });
      }
    } catch (error) {
      console.error('Error generating recommendations:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to generate recommendations. Please try again.';
      toast.error(errorMessage, { id: 'generate', duration: 5000 });
    } finally {
      setGeneratingPreferenceId(null);
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

  const handleExportPDF = async (preference) => {
    if (!preference || !preference._id) {
      toast.error('Preference data not available');
      return;
    }

    try {
      setExportingPreferenceId(preference._id);
      toast.loading('Loading recommendations for export...', { id: 'export-pdf' });

      // Fetch recommendations for this preference
      const response = await travelAdvisoryService.getRecommendations(preference._id);
      
      if (response.success && response.recommendations && response.recommendations.length > 0) {
        toast.loading('Generating PDF...', { id: 'export-pdf' });
        await exportTravelAdvisoryToPDF(preference, response.recommendations);
        toast.success('PDF exported successfully!', { id: 'export-pdf' });
      } else {
        toast.error('No recommendations available to export. Please generate recommendations first.', { id: 'export-pdf', duration: 5000 });
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      const errorMessage = error.message || 'Failed to export PDF. Please try again.';
      toast.error(errorMessage, { id: 'export-pdf' });
    } finally {
      setExportingPreferenceId(null);
    }
  };

  const handleEditPreference = (preference) => {
    setEditingPreference(preference);
    setShowForm(true);
  };

  const handleDeletePreference = (preferenceId) => {
    setDeleteConfirm({ isOpen: true, preferenceId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.preferenceId) return;

    try {
      toast.loading('Deleting preference...', { id: 'delete' });
      const response = await travelAdvisoryService.deletePreferences(deleteConfirm.preferenceId);
      
      if (response.success) {
        toast.success('Preference deleted successfully', { id: 'delete' });
        fetchDashboard();
      } else {
        toast.error(response.message || 'Failed to delete preference', { id: 'delete' });
      }
    } catch (error) {
      console.error('Error deleting preference:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete preference';
      toast.error(errorMessage, { id: 'delete' });
    } finally {
      setDeleteConfirm({ isOpen: false, preferenceId: null });
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
      const name = pref.name || '';
      const clientName = pref.clientId?.profile?.firstName || pref.clientId?.username || '';
      const country = pref.country || '';
      return name.toLowerCase().includes(searchLower) ||
             clientName.toLowerCase().includes(searchLower) || 
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
          <Dropdown
            name="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'draft', label: 'Draft' },
              { value: 'active', label: 'Active' },
              { value: 'recommendations_generated', label: 'Recommendations Ready' },
              { value: 'hotel_selected', label: 'Hotel Selected' },
              { value: 'completed', label: 'Completed' }
            ]}
            placeholder="All Status"
            style={{ minWidth: '180px' }}
          />
          <Dropdown
            name="countryFilter"
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Countries' },
              ...[...new Set(preferences.map(p => p.country).filter(Boolean))].map(country => ({
                value: country,
                label: country
              }))
            ]}
            placeholder="All Countries"
            style={{ minWidth: '180px' }}
          />
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
                      {pref.name || `${pref.clientId?.profile?.firstName || pref.clientId?.username}'s Preference`}
                    </h3>
                    {getStatusBadge(pref.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {pref.clientId?.profile?.firstName} {pref.clientId?.profile?.lastName} 
                    {!pref.clientId?.profile?.firstName && pref.clientId?.username}
                    {pref.clientId?.email && ` • ${pref.clientId.email}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {pref.status === 'draft' || pref.status === 'active' ? (
                    <button
                      onClick={() => handleGenerateRecommendations(pref._id)}
                      disabled={generatingPreferenceId === pref._id}
                      className="px-3 py-1.5 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Sparkles size={14} />
                      {generatingPreferenceId === pref._id ? 'Generating...' : 'Generate Recommendations'}
                    </button>
                  ) : pref.status === 'recommendations_generated' || pref.status === 'hotel_selected' ? (
                    <>
                      <button
                        onClick={() => handleViewRecommendations(pref)}
                        className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                      >
                        <Eye size={14} />
                        View Recommendations
                      </button>
                      <button
                        onClick={() => handleGenerateRecommendations(pref._id)}
                        disabled={generatingPreferenceId === pref._id}
                        className="px-3 py-1.5 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Regenerate recommendations with latest data"
                      >
                        <Sparkles size={14} />
                        {generatingPreferenceId === pref._id ? 'Generating...' : 'Generate Again'}
                      </button>
                      <button
                        onClick={() => handleExportPDF(pref)}
                        disabled={exportingPreferenceId === pref._id}
                        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download size={14} />
                        {exportingPreferenceId === pref._id ? 'Exporting...' : 'Export PDF'}
                      </button>
                    </>
                  ) : null}
                  <button
                    onClick={() => handleEditPreference(pref)}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                    title="Edit Preference"
                  >
                    <Edit size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeletePreference(pref._id)}
                    className="px-3 py-1.5 text-sm bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors flex items-center gap-1.5"
                    title="Delete Preference"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, preferenceId: null })}
        onConfirm={confirmDelete}
        title="Delete Travel Preference"
        message="Are you sure you want to delete this travel preference? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default TravelAdvisory;

