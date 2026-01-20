import { useState } from 'react';
import { 
  Plus, Trash2, Download, Link as LinkIcon, Image as ImageIcon,
  Calendar, User, FileText, Loader, ExternalLink, X, MapPin
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import hotelPdfService from '../services/hotelPdfService';
import { exportHotelListToPDF } from '../utils/hotelPdfExport';
import toast from 'react-hot-toast';

const HotelPdfBuilder = () => {
  const { user } = useAuth();
  
  // Form state
  const [hotels, setHotels] = useState([]);
  const [currentHotel, setCurrentHotel] = useState({
    name: '',
    link: '',
    price: '',
    notes: ''
  });
  
  // Metadata state
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
  
  // UI state
  const [extractingImages, setExtractingImages] = useState(false);
  const [extractingIndex, setExtractingIndex] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Add hotel to list
  const handleAddHotel = async () => {
    if (!currentHotel.link.trim()) {
      toast.error('Booking link is required');
      return;
    }

    // Validate URL
    try {
      new URL(currentHotel.link);
    } catch (e) {
      toast.error('Please enter a valid URL');
      return;
    }

    const newHotel = {
      ...currentHotel,
      id: Date.now(), // Temporary ID
      images: [], // All images
      image: null, // Primary image for preview
      primaryImage: null,
      extracting: true
    };

    setHotels([...hotels, newHotel]);
    setCurrentHotel({ name: '', link: '', price: '', notes: '' });

    // Extract image for this hotel
    const hotelIndex = hotels.length;
    await extractImageForHotel(hotelIndex, newHotel.link);
  };

  // Extract image for a specific hotel
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
              images: result.images, // Store all images
              image: result.primaryImage, // Keep primary for preview
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

  // Remove hotel from list
  const handleRemoveHotel = (index) => {
    setHotels(hotels.filter((_, i) => i !== index));
  };

  // Re-extract image for a hotel
  const handleReExtractImage = async (index) => {
    const hotel = hotels[index];
    if (hotel.link) {
      await extractImageForHotel(index, hotel.link);
    }
  };

  // Generate PDF - automatically extract images if missing
  const handleGeneratePdf = async () => {
    if (hotels.length === 0) {
      toast.error('Please add at least one hotel');
      return;
    }

    try {
      setGeneratingPdf(true);
      toast.loading('Extracting hotel data and images...', { id: 'pdf' });

      // Step 1: Extract images for hotels that don't have them
      const hotelsWithImages = [];
      const linksToExtract = [];

      for (let i = 0; i < hotels.length; i++) {
        const hotel = hotels[i];
        const hasImages = hotel.images && hotel.images.length > 0;
        
        if (!hasImages && hotel.link) {
          // Need to extract images for this hotel
          linksToExtract.push({ index: i, link: hotel.link });
        } else {
          // Already has images, use them
          hotelsWithImages[i] = hotel;
        }
      }

      // Extract images for hotels that need them
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
              // No images found, keep original hotel data
              hotelsWithImages[index] = hotels[index];
            }
          });
        }
      }

      // Step 2: Generate PDF with all hotel data
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

      console.log('Generating PDF with hotels:', finalHotels.map(h => ({
        name: h.name,
        imagesCount: h.images?.length || 0,
        images: h.images
      })));

      await exportHotelListToPDF({
        hotels: finalHotels,
        executiveName,
        clientName,
        destination,
        checkInDate,
        checkOutDate,
        coverImageUrl: null // Will use first hotel's image automatically
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Hotel PDF Builder</h1>
          <p className="text-muted-foreground mt-1">
            Create branded hotel recommendation PDFs with clickable links
          </p>
        </div>
      </div>

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
                              e.target.nextSibling.style.display = 'flex';
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
    </div>
  );
};

export default HotelPdfBuilder;

