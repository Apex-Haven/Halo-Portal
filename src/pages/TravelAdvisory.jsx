import { useState, useEffect } from 'react';
import { 
  MapPin, Calendar, Star, Filter, Search, Plus, 
  Eye, Sparkles, CheckCircle, Clock, XCircle, AlertCircle,
  Building2, Users, User, TrendingUp, Map, Download, Edit, Trash2,
  Link as LinkIcon, Image as ImageIcon, FileText, Loader, ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import travelAdvisoryService from '../services/travelAdvisoryService';
import { exportTravelAdvisoryToPDF } from '../utils/pdfExport';
import hotelPdfService from '../services/hotelPdfService';
import { exportHotelListToPDF } from '../utils/hotelPdfExport';
import toast from 'react-hot-toast';
import ClientPreferenceForm from '../components/ClientPreferenceForm';
import HotelRecommendations from '../components/HotelRecommendations';
import Dropdown from '../components/Dropdown';
import ConfirmModal from '../components/ConfirmModal';

const TravelAdvisory = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('travel-advisory');

  // Travel Advisory State
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

  // Hotel PDF Builder State
  const [hotels, setHotels] = useState([]);
  const [currentHotel, setCurrentHotel] = useState({
    name: '',
    link: '',
    price: '',
    notes: ''
  });
  const [executiveName, setExecutiveName] = useState(
    user?.profile?.firstName && user?.profile?.lastName
      ? `${user.profile.firstName} ${user.profile.lastName}`
      : user?.username || ''
  );
  const [clientName, setClientName] = useState('');
  const [destination, setDestination] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [extractingImages, setExtractingImages] = useState(false);
  const [extractingIndex, setExtractingIndex] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Check if user can see Hotel PDF Builder tab
  const canSeeHotelPdfBuilder = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  useEffect(() => {
    if (activeTab === 'travel-advisory') {
      fetchDashboard();
    }
  }, [statusFilter, countryFilter, activeTab]);

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

  // Travel Advisory Functions
  const handleGenerateRecommendations = async (preferenceId) => {
    try {
      const preference = preferences.find(p => p._id === preferenceId);
      if (!preference) {
        toast.error('Preference not found', { id: 'generate' });
        return;
      }

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
          toast('No recommendations found matching your criteria. Try adjusting your preferences.', { 
            id: 'generate', 
            duration: 6000,
            icon: '⚠️',
            style: {
              background: '#fbbf24',
              color: '#78350f',
            }
          });
        }
        
        await fetchDashboard();
        
        const updatedPreference = response.preference || preference;
        
        if (count > 0 && updatedPreference) {
          const stablePreference = {
            ...updatedPreference,
            _id: updatedPreference._id || preferenceId
          };
          
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

  // Hotel PDF Builder Functions
  const handleAddHotel = async () => {
    if (!currentHotel.link.trim()) {
      toast.error('Booking link is required');
      return;
    }

    try {
      new URL(currentHotel.link);
    } catch (e) {
      toast.error('Please enter a valid URL');
      return;
    }

    const newHotel = {
      ...currentHotel,
      id: Date.now(),
      images: [],
      image: null,
      primaryImage: null,
      extracting: true
    };

    setHotels([...hotels, newHotel]);
    setCurrentHotel({ name: '', link: '', price: '', notes: '' });

    const hotelIndex = hotels.length;
    await extractImageForHotel(hotelIndex, newHotel.link);
  };

  const extractImageForHotel = async (index, link) => {
    try {
      setExtractingIndex(index);
      const response = await hotelPdfService.extractImages([link]);
      
      if (response.success && response.results && response.results.length > 0) {
        const result = response.results[0];
        if (result.success && result.images && result.images.length > 0) {
          setHotels(prevHotels => {
            const updated = [...prevHotels];
            updated[index] = {
              ...updated[index],
              images: result.images,
              image: result.primaryImage,
              primaryImage: result.primaryImage,
              extracting: false
            };
            return updated;
          });
          toast.success(`Extracted ${result.images.length} image${result.images.length !== 1 ? 's' : ''}`);
        } else {
          setHotels(prevHotels => {
            const updated = [...prevHotels];
            updated[index] = {
              ...updated[index],
              images: [],
              extracting: false
            };
            return updated;
          });
          toast('No images found for this link', { icon: 'ℹ️' });
        }
      } else {
        setHotels(prevHotels => {
          const updated = [...prevHotels];
          updated[index] = {
            ...updated[index],
            extracting: false
          };
          return updated;
        });
        toast('Could not extract image', { icon: '⚠️' });
      }
    } catch (error) {
      console.error('Error extracting image:', error);
      setHotels(prevHotels => {
        const updated = [...prevHotels];
        updated[index] = {
          ...updated[index],
          extracting: false
        };
        return updated;
      });
      toast.error(error.message || 'Failed to extract image');
    } finally {
      setExtractingIndex(null);
    }
  };

  const handleRemoveHotel = (index) => {
    setHotels(hotels.filter((_, i) => i !== index));
  };

  const handleReExtractImage = async (index) => {
    const hotel = hotels[index];
    if (hotel.link) {
      await extractImageForHotel(index, hotel.link);
    }
  };

  const handleGeneratePdf = async () => {
    if (hotels.length === 0) {
      toast.error('Please add at least one hotel');
      return;
    }

    try {
      setGeneratingPdf(true);
      toast.loading('Extracting hotel data and images...', { id: 'pdf' });

      const hotelsWithImages = [];
      const linksToExtract = [];

      for (let i = 0; i < hotels.length; i++) {
        const hotel = hotels[i];
        const hasImages = hotel.images && hotel.images.length > 0;
        
        if (!hasImages && hotel.link) {
          linksToExtract.push({ index: i, link: hotel.link });
        } else {
          hotelsWithImages[i] = hotel;
        }
      }

      if (linksToExtract.length > 0) {
        toast.loading(`Extracting images from ${linksToExtract.length} hotel link${linksToExtract.length > 1 ? 's' : ''}...`, { id: 'pdf' });
        
        const links = linksToExtract.map(item => item.link);
        const response = await hotelPdfService.extractImages(links);
        
        if (response.success && response.results) {
          response.results.forEach((result, resultIndex) => {
            const { index } = linksToExtract[resultIndex];
            if (result.success && result.images && result.images.length > 0) {
              hotelsWithImages[index] = {
                ...hotels[index],
                images: result.images,
                image: result.primaryImage,
                primaryImage: result.primaryImage
              };
            } else {
              hotelsWithImages[index] = hotels[index];
            }
          });
        }
      }

      toast.loading('Generating PDF with images...', { id: 'pdf' });

      const finalHotels = hotels.map((h, i) => {
        const hotelWithImages = hotelsWithImages[i] || h;
        return {
          name: hotelWithImages.name || h.name,
          link: hotelWithImages.link || h.link,
          price: hotelWithImages.price || h.price,
          notes: hotelWithImages.notes || h.notes,
          images: hotelWithImages.images || (hotelWithImages.image ? [hotelWithImages.image] : []) || (hotelWithImages.primaryImage ? [hotelWithImages.primaryImage] : []) || [],
          image: hotelWithImages.image || hotelWithImages.primaryImage,
          primaryImage: hotelWithImages.primaryImage
        };
      });

      await exportHotelListToPDF({
        hotels: finalHotels,
        executiveName,
        clientName,
        destination,
        checkInDate,
        checkOutDate,
        coverImageUrl: null
      });

      toast.success('PDF generated successfully!', { id: 'pdf' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(error.message || 'Failed to generate PDF', { id: 'pdf' });
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Hotels & Advisory</h1>
            <p className="text-gray-500 dark:text-gray-400 text-base">Manage hotel recommendations and build PDFs</p>
          </div>
          {activeTab === 'travel-advisory' && (
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
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card rounded-xl shadow-sm border border-border mb-6">
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('travel-advisory')}
            className={`flex-1 px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'travel-advisory'
                ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <MapPin size={18} />
              Travel Advisory
            </div>
          </button>
          {canSeeHotelPdfBuilder && (
            <button
              onClick={() => setActiveTab('hotel-pdf-builder')}
              className={`flex-1 px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'hotel-pdf-builder'
                  ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
            <div className="flex items-center justify-center gap-2">
              <FileText size={18} />
              Hotel PDF Builder
            </div>
          </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'travel-advisory' ? (
            <>
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
              <div className="bg-card p-4 rounded-lg border border-border mb-6">
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
            </>
          ) : (
            <>
              {/* Hotel PDF Builder Tab */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Form */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Add Hotel Form */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      Add Hotel
                    </h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Hotel Name <span className="text-muted-foreground">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={currentHotel.name}
                          onChange={(e) => setCurrentHotel({ ...currentHotel, name: e.target.value })}
                          placeholder="e.g., Taj Palace Mumbai"
                          className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Booking Link <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={currentHotel.link}
                            onChange={(e) => setCurrentHotel({ ...currentHotel, link: e.target.value })}
                            placeholder="https://www.booking.com/..."
                            className="flex-1 px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <LinkIcon className="w-5 h-5 text-muted-foreground self-center" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Price <span className="text-muted-foreground">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={currentHotel.price}
                          onChange={(e) => setCurrentHotel({ ...currentHotel, price: e.target.value })}
                          placeholder="e.g., ₹12,500 / night"
                          className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Notes <span className="text-muted-foreground">(optional)</span>
                        </label>
                        <textarea
                          value={currentHotel.notes}
                          onChange={(e) => setCurrentHotel({ ...currentHotel, notes: e.target.value })}
                          placeholder="e.g., Near airport, breakfast included"
                          rows={3}
                          className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        />
                      </div>

                      <button
                        onClick={handleAddHotel}
                        disabled={!currentHotel.link.trim()}
                        className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Hotel
                      </button>
                    </div>
                  </div>

                  {/* Hotel List Preview */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h2 className="text-xl font-semibold mb-4">
                      Hotels ({hotels.length})
                    </h2>

                    {hotels.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No hotels added yet. Add your first hotel above.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {hotels.map((hotel, index) => (
                          <div
                            key={hotel.id || index}
                            className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex gap-4">
                              {/* Hotel Image */}
                              <div className="flex-shrink-0">
                                {hotel.extracting ? (
                                  <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                                    <Loader className="w-6 h-6 animate-spin text-primary" />
                                  </div>
                                ) : hotel.image ? (
                                  <img
                                    src={hotel.image}
                                    alt={hotel.name || 'Hotel'}
                                    className="w-24 h-24 object-cover rounded-lg"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      if (e.target.nextSibling) {
                                        e.target.nextSibling.style.display = 'flex';
                                      }
                                    }}
                                  />
                                ) : null}
                                {!hotel.extracting && !hotel.image && (
                                  <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                                  </div>
                                )}
                              </div>

                              {/* Hotel Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-lg">
                                      {hotel.name || `Hotel ${index + 1}`}
                                    </h3>
                                    
                                    {hotel.price && (
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {hotel.price}
                                      </p>
                                    )}

                                    {hotel.link && (
                                      <a
                                        href={hotel.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-primary hover:underline flex items-center gap-1 mt-2"
                                      >
                                        View Booking <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}

                                    {hotel.notes && (
                                      <p className="text-sm text-muted-foreground mt-2">
                                        {hotel.notes}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex gap-2">
                                    {!hotel.extracting && (
                                      <button
                                        onClick={() => handleReExtractImage(index)}
                                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
                                        title="Re-extract image"
                                      >
                                        <ImageIcon className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleRemoveHotel(index)}
                                      className="p-2 text-destructive hover:bg-destructive/10 rounded"
                                      title="Remove hotel"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Metadata & Generate */}
                <div className="space-y-6">
                  {/* Metadata Form */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      PDF Metadata
                    </h2>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 flex items-center gap-1">
                          <User className="w-4 h-4" />
                          Executive Name
                        </label>
                        <input
                          type="text"
                          value={executiveName}
                          onChange={(e) => setExecutiveName(e.target.value)}
                          placeholder="Executive name"
                          className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 flex items-center gap-1">
                          <User className="w-4 h-4" />
                          Client Name
                        </label>
                        <input
                          type="text"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="Client name"
                          className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          Destination / City
                        </label>
                        <input
                          type="text"
                          value={destination}
                          onChange={(e) => setDestination(e.target.value)}
                          placeholder="e.g., London, UK"
                          className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 flex items-center gap-1">
                          <ImageIcon className="w-4 h-4" />
                          Cover Image URL <span className="text-muted-foreground text-xs">(optional)</span>
                        </label>
                        <input
                          type="url"
                          value={coverImageUrl}
                          onChange={(e) => setCoverImageUrl(e.target.value)}
                          placeholder="https://example.com/city-image.jpg"
                          className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Large city/destination image for cover page
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Check-in Date
                        </label>
                        <input
                          type="date"
                          value={checkInDate}
                          onChange={(e) => setCheckInDate(e.target.value)}
                          className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Check-out Date
                        </label>
                        <input
                          type="date"
                          value={checkOutDate}
                          onChange={(e) => setCheckOutDate(e.target.value)}
                          className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Generate PDF Button */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <button
                      onClick={handleGeneratePdf}
                      disabled={hotels.length === 0 || generatingPdf}
                      className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {generatingPdf ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Generating PDF...
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          Generate PDF
                        </>
                      )}
                    </button>
                    
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      PDF will include all hotels with images and clickable links
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

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
