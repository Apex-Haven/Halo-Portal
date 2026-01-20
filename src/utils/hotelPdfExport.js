import jsPDF from 'jspdf';
import hotelPdfService from '../services/hotelPdfService';

/**
 * Convert image URL to base64 using proxy to avoid CORS
 * @param {string} url - Image URL
 * @returns {Promise<string>} Base64 encoded image
 */
const imageToBase64 = async (url) => {
  if (!url) {
    throw new Error('Image URL is required');
  }

  try {
    // Use the service method that fetches through proxy
    const base64 = await hotelPdfService.fetchImageAsBase64(url);
    return base64;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
};

/**
 * Add image to PDF with proper sizing
 * @param {jsPDF} doc - PDF document
 * @param {string} imageData - Base64 image data
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @returns {Promise<{width: number, height: number}>} Actual image dimensions used
 */
const addImageToPdf = (doc, imageData, x, y, maxWidth, maxHeight) => {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      
      img.onload = () => {
        let imgWidth = img.width;
        let imgHeight = img.height;
        
        // Calculate aspect ratio
        const aspectRatio = imgWidth / imgHeight;
        
        // Scale to fit within max dimensions
        if (imgWidth > maxWidth) {
          imgWidth = maxWidth;
          imgHeight = imgWidth / aspectRatio;
        }
        
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = imgHeight * aspectRatio;
        }
        
        doc.addImage(imageData, 'JPEG', x, y, imgWidth, imgHeight);
        resolve({ width: imgWidth, height: imgHeight });
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = imageData;
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Export hotel list to PDF in APEX HAVEN format
 * @param {Object} options - PDF generation options
 * @param {Array} options.hotels - Array of hotel objects with name, link, price, notes, images
 * @param {string} options.executiveName - Executive name
 * @param {string} options.clientName - Client name
 * @param {string} options.checkInDate - Check-in date
 * @param {string} options.checkOutDate - Check-out date
 * @param {string} options.destination - Destination/city name (for cover page)
 * @param {string} options.coverImageUrl - Optional cover page image URL
 * @returns {Promise<void>}
 */
export const exportHotelListToPDF = async ({
  hotels = [],
  executiveName = '',
  clientName = '',
  checkInDate = '',
  checkOutDate = '',
  destination = '',
  coverImageUrl = null
}) => {
  try {
    if (!hotels || hotels.length === 0) {
      throw new Error('No hotels to export');
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // ========== COVER PAGE ==========
    doc.addPage();
    
    // Use first hotel's first image as cover, or provided coverImageUrl
    let coverImage = coverImageUrl;
    if (!coverImage && hotels.length > 0) {
      const firstHotel = hotels[0];
      const firstHotelImages = firstHotel.images || (firstHotel.image ? [firstHotel.image] : []) || (firstHotel.primaryImage ? [firstHotel.primaryImage] : []);
      if (firstHotelImages.length > 0) {
        coverImage = firstHotelImages[0];
      }
    }
    
    // Add cover image if available
    if (coverImage) {
      try {
        console.log('Loading cover image:', coverImage);
        const coverImageBase64 = await imageToBase64(coverImage);
        console.log('Cover image loaded successfully');
        const coverImageHeight = pageHeight * 0.5; // 50% of page height
        const coverImageWidth = pageWidth;
        
        await addImageToPdf(
          doc,
          coverImageBase64,
          0,
          0,
          coverImageWidth,
          coverImageHeight
        );
      } catch (error) {
        console.warn('Failed to load cover image:', error);
        // Continue without cover image
      }
    }

    // APEX HAVEN Logo (top right)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('APEX HAVEN', pageWidth - margin, 15, { align: 'right' });

    // Title
    const titleY = coverImage ? pageHeight * 0.6 : pageHeight * 0.4;
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    
    const title = destination 
      ? `Selection of Hotels in ${destination}`
      : 'Hotel Recommendations';
    
    const monthYear = checkInDate 
      ? new Date(checkInDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const fullTitle = `${title} For ${monthYear}`;
    doc.text(fullTitle, pageWidth / 2, titleY, { align: 'center', maxWidth: pageWidth - (margin * 2) });

    // Date
    const dateStr = new Date().toLocaleDateString('en-US', { 
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(dateStr, pageWidth / 2, titleY + 15, { align: 'center' });

    // ========== HOTEL PAGES ==========
    for (let i = 0; i < hotels.length; i++) {
      const hotel = hotels[i];
      const hotelName = hotel.name || `Hotel Option ${i + 1}`;
      const hotelLink = hotel.link || '';
      const hotelPrice = hotel.price || '';
      const hotelNotes = hotel.notes || '';
      const hotelImages = hotel.images || (hotel.image ? [hotel.image] : []) || (hotel.primaryImage ? [hotel.primaryImage] : []);

      // New page for each hotel
      doc.addPage();

      // APEX HAVEN Logo (top right)
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('APEX HAVEN', pageWidth - margin, 15, { align: 'right' });

      // Hotel number and name
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`${i + 1}. ${hotelName.toUpperCase()}`, margin, 30);

      let yPosition = 45;

      // Hotel Images Grid (2x2 or 2x3)
      console.log(`Hotel ${i + 1} (${hotelName}) has ${hotelImages.length} images:`, hotelImages);
      
      if (hotelImages.length > 0) {
        const imagesToShow = hotelImages.slice(0, 6); // Max 6 images
        const gridCols = 2;
        const gridRows = Math.ceil(imagesToShow.length / gridCols);
        const imageWidth = (pageWidth - (margin * 2) - 10) / gridCols; // 10px gap
        const imageHeight = 60;

        let imagesLoaded = 0;
        for (let imgIndex = 0; imgIndex < imagesToShow.length; imgIndex++) {
          const row = Math.floor(imgIndex / gridCols);
          const col = imgIndex % gridCols;
          const x = margin + (col * (imageWidth + 10));
          const y = yPosition + (row * (imageHeight + 10));

          try {
            console.log(`[PDF] Loading image ${imgIndex + 1}/${imagesToShow.length} for hotel ${i + 1} (${hotelName}):`, imagesToShow[imgIndex]);
            const imageBase64 = await imageToBase64(imagesToShow[imgIndex]);
            console.log(`[PDF] Image ${imgIndex + 1} loaded successfully, adding to PDF...`);
            await addImageToPdf(
              doc,
              imageBase64,
              x,
              y,
              imageWidth,
              imageHeight
            );
            imagesLoaded++;
            console.log(`[PDF] Image ${imgIndex + 1} added to PDF successfully`);
          } catch (error) {
            console.error(`[PDF] Failed to load image ${imgIndex + 1} for hotel ${i + 1}:`, error);
            // Draw placeholder
            doc.setFillColor(240, 240, 240);
            doc.rect(x, y, imageWidth, imageHeight, 'F');
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text('Image unavailable', x + imageWidth / 2, y + imageHeight / 2, { align: 'center' });
          }
        }

        console.log(`[PDF] Hotel ${i + 1}: ${imagesLoaded}/${imagesToShow.length} images loaded successfully`);
        yPosition += (gridRows * (imageHeight + 10)) + 15;
      } else {
        console.warn(`[PDF] Hotel ${i + 1} (${hotelName}) has no images!`);
        // Show message that no images are available
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150, 150, 150);
        doc.text('No images available for this hotel', margin, yPosition);
        yPosition += 15;
      }

      // Location (if link provided)
      if (hotelLink) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text('Location:', margin, yPosition);
        doc.setTextColor(59, 130, 246); // Blue for link
        const linkText = hotelLink.length > 70 ? hotelLink.substring(0, 70) + '...' : hotelLink;
        doc.textWithLink(`(Map hyperlink) ${linkText}`, margin + 30, yPosition, { url: hotelLink });
        doc.setTextColor(0, 0, 0);
        yPosition += 8;
      }

      // Rate/Price
      if (hotelPrice) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`Rate: ${hotelPrice}`, margin, yPosition);
        yPosition += 8;
      }

      // Highlights/Notes
      if (hotelNotes) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Highlights:', margin, yPosition);
        yPosition += 7;

        // Split notes into bullet points (by newlines or semicolons)
        const highlights = hotelNotes
          .split(/[;\n]/)
          .map(h => h.trim())
          .filter(h => h.length > 0);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);

        highlights.forEach((highlight, idx) => {
          if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(`• ${highlight}`, margin + 5, yPosition);
          yPosition += 6;
        });
      }

      yPosition += 10;
    }

    // ========== FOOTER ON ALL PAGES ==========
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Watermark (subtle)
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      doc.setGState(doc.GState({ opacity: 0.2 }));
      doc.text(
        'APEX HAVEN - Internal Use Only',
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center', angle: 45 }
      );
      doc.setGState(doc.GState({ opacity: 1.0 }));
    }

    // Generate filename
    const clientSlug = clientName 
      ? clientName.replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 20)
      : destination
      ? destination.replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 20)
      : 'hotels';
    const dateSlug = new Date().toISOString().split('T')[0];
    const filename = `hotel-recommendations-${clientSlug}-${dateSlug}.pdf`;

    // Save PDF
    doc.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};
