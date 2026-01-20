import { ExternalLink, Star, MapPin, DollarSign, CheckCircle } from 'lucide-react';

/**
 * Hotel Card Component
 * Displays hotel cards with booking links from multiple platforms
 */
const HotelCard = ({ hotel, recommendation, onSelect }) => {
  const card = hotel.card || recommendation?.card;
  const bookingLinks = hotel.bookingLinks || recommendation?.bookingLinks || {};
  const prices = hotel.prices || recommendation?.prices || {};
  const bestPrice = card?.bestPrice || recommendation?.bestPrice;

  // Get hotel details - try multiple sources with proper fallback chain
  // Handle both old format (hotel.price) and new format (hotel.pricing.basePrice)
  const name = hotel?.name || 
               card?.name || 
               recommendation?.hotel?.name || 
               recommendation?.hotelId?.name || 
               hotel?.card?.name ||
               'Hotel Name';
  
  // Extract image URL - handle both string URLs and image objects { url: "...", source: "..." }
  const getImageUrl = (img) => {
    if (!img) return null;
    if (typeof img === 'string') return img;
    if (typeof img === 'object' && img.url) return img.url;
    return null;
  };
  
  const image = getImageUrl(card?.image) || 
                getImageUrl(hotel?.images?.[0]) || 
                getImageUrl(hotel?.image) || 
                getImageUrl(recommendation?.hotel?.images?.[0]) || 
                getImageUrl(recommendation?.hotel?.image) || 
                getImageUrl(recommendation?.hotelData?.images?.[0]) ||
                getImageUrl(recommendation?.hotelData?.image) ||
                '/images/hotel-placeholder.jpg';
  
  const address = card?.address || 
                  hotel?.location?.address || 
                  hotel?.address || 
                  recommendation?.hotel?.location?.address || 
                  recommendation?.hotel?.address || 
                  '';
  
  const rating = card?.rating || 
                 hotel?.starRating || 
                 hotel?.rating?.score || 
                 hotel?.rating || 
                 recommendation?.hotel?.starRating || 
                 recommendation?.hotel?.rating?.score || 
                 0;
  
  const reviewCount = card?.reviewCount || 
                      hotel?.rating?.count || 
                      hotel?.reviewCount || 
                      recommendation?.hotel?.rating?.count || 
                      recommendation?.hotel?.reviewCount || 
                      0;
  
  // Handle pricing - try new format first (pricing.basePrice), then old format (price)
  const price = card?.price || 
                hotel?.pricing?.basePrice || 
                hotel?.price || 
                recommendation?.hotel?.pricing?.basePrice || 
                recommendation?.hotel?.price || 
                recommendation?.price || 
                0;
  
  const currency = card?.currency || 
                   hotel?.pricing?.currency || 
                   hotel?.currency || 
                   recommendation?.hotel?.pricing?.currency || 
                   recommendation?.hotel?.currency || 
                   recommendation?.currency || 
                   'INR';
  
  const relevanceScore = recommendation?.relevanceScore || 0;

  // Format currency properly
  const formatCurrency = (amount, curr = currency) => {
    if (!amount) return 'N/A';
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: curr,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    } catch (error) {
      // Fallback if currency code is invalid
      return `${curr} ${amount.toFixed(0)}`;
    }
  };

  // Format platform names
  const formatPlatformName = (platform) => {
    const names = {
      'booking.com': 'Booking.com',
      'agoda': 'Agoda',
      'makemytrip': 'MakeMyTrip',
      'yatra': 'Yatra',
      'cleartrip': 'Cleartrip',
      'expedia': 'Expedia',
      'hotels.com': 'Hotels.com'
    };
    return names[platform?.toLowerCase()] || platform;
  };

  // Get relevance badge color
  const getRelevanceColor = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
  };

  // Render stars
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />);
    }
    if (hasHalfStar) {
      stars.push(<Star key="half" size={16} className="fill-yellow-400/50 text-yellow-400" />);
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} size={16} className="text-gray-300 dark:text-gray-600" />);
    }

    return stars;
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Hotel Image */}
      <div className="relative h-48 bg-muted overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Only update if not already placeholder to prevent infinite loops
            if (e.target.src !== '/images/hotel-placeholder.jpg' && !e.target.src.includes('placeholder')) {
              console.warn(`Image failed to load: ${e.target.src}, using placeholder`);
              e.target.src = '/images/hotel-placeholder.jpg';
            }
          }}
          onLoad={() => {
            // Log successful image loads from TripAdvisor CDN for debugging
            if (image && image.includes('tripadvisor.com')) {
              console.log(`✅ TripAdvisor image loaded successfully: ${image.substring(0, 80)}...`);
            }
          }}
          loading="lazy"
        />
        {relevanceScore > 0 && (
          <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold ${getRelevanceColor(relevanceScore)}`}>
            {relevanceScore.toFixed(0)}% Match
          </div>
        )}
      </div>

      {/* Hotel Content */}
      <div className="p-4">
        {/* Hotel Name and Location */}
        <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-1">{name}</h3>
        {address && (
          <div className="flex items-center text-sm text-muted-foreground mb-2">
            <MapPin size={14} className="mr-1" />
            <span className="line-clamp-1">{address}</span>
          </div>
        )}

        {/* Rating and Reviews */}
        {(rating > 0 || reviewCount > 0) && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1">
              {renderStars(rating)}
            </div>
            <span className="text-sm font-medium text-foreground">{rating.toFixed(1)}</span>
            {reviewCount > 0 && (
              <span className="text-sm text-muted-foreground">({reviewCount} reviews)</span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold text-foreground">
            {formatCurrency(price, currency)}
          </span>
          <span className="text-sm text-muted-foreground">per night</span>
        </div>

        {/* Price Comparison */}
        {Object.keys(prices).length > 1 && (
          <div className="mb-3 p-2 bg-muted rounded text-xs">
            <div className="font-medium text-foreground mb-1">Prices across platforms:</div>
            <div className="space-y-1">
              {Object.entries(prices).map(([platform, priceData]) => {
                const amount = typeof priceData === 'object' ? priceData.amount : priceData;
                const priceCurrency = typeof priceData === 'object' ? priceData.currency : currency;
                const isBest = bestPrice?.platform === platform;
                return (
                  <div key={platform} className="flex justify-between items-center">
                    <span className="text-muted-foreground">{formatPlatformName(platform)}:</span>
                    <span className={`font-medium ${isBest ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                      {formatCurrency(amount, priceCurrency)}
                      {isBest && <CheckCircle size={12} className="inline ml-1" />}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Booking Links */}
        {Object.keys(bookingLinks).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(bookingLinks).map(([platform, url]) => {
              const isBest = bestPrice?.platform === platform;
              return (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isBest
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {isBest && <CheckCircle size={16} />}
                  <span>Book on {formatPlatformName(platform)}</span>
                  <ExternalLink size={14} />
                </a>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-2">
            No booking links available
          </div>
        )}
      </div>
    </div>
  );
};

export default HotelCard;

