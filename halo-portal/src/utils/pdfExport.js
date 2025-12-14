import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Export travel advisory preference with hotel recommendations to PDF
 * @param {Object} preference - The travel preference object
 * @param {Array} recommendations - Array of hotel recommendations
 * @returns {Promise<void>}
 */
export const exportTravelAdvisoryToPDF = async (preference, recommendations = []) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Helper function to add a new page if needed
    const checkPageBreak = (requiredHeight = 20) => {
      if (yPosition + requiredHeight > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
        return true;
      }
      return false;
    };

    // Header with HALO branding
    doc.setFillColor(59, 130, 246); // Primary blue
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('HALO', 20, 25);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Travel Advisory Report', 20, 35);

    // Generation date
    doc.setFontSize(10);
    const dateStr = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    doc.text(`Generated: ${dateStr}`, pageWidth - 20, 35, { align: 'right' });

    yPosition = 50;

    // Client Information Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Client Information', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const clientName = preference.clientId?.profile?.firstName && preference.clientId?.profile?.lastName
      ? `${preference.clientId.profile.firstName} ${preference.clientId.profile.lastName}`
      : preference.clientId?.username || 'N/A';
    const clientEmail = preference.clientId?.email || 'N/A';

    doc.text(`Name: ${clientName}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Email: ${clientEmail}`, 20, yPosition);
    yPosition += 10;

    // Travel Details Section
    checkPageBreak(30);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Travel Details', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    const formatDate = (date) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    };

    const formatCurrency = (amount, currency = 'INR') => {
      if (!amount) return 'N/A';
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0
      }).format(amount);
    };

    doc.text(`Country: ${preference.country || 'N/A'}`, 20, yPosition);
    yPosition += 7;

    if (preference.targetAreas && preference.targetAreas.length > 0) {
      doc.text(`Target Areas: ${preference.targetAreas.join(', ')}`, 20, yPosition);
      yPosition += 7;
    }

    doc.text(`Check-in: ${formatDate(preference.checkInDate)}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Check-out: ${formatDate(preference.checkOutDate)}`, 20, yPosition);
    yPosition += 7;

    const budgetRange = `${formatCurrency(preference.budgetMin, preference.currency)} - ${formatCurrency(preference.budgetMax, preference.currency)}`;
    doc.text(`Budget: ${budgetRange}`, 20, yPosition);
    yPosition += 7;

    if (preference.preferredStarRating) {
      doc.text(`Preferred Star Rating: ${preference.preferredStarRating} stars`, 20, yPosition);
      yPosition += 7;
    }

    if (preference.conferenceLocation && preference.conferenceLocation.name) {
      yPosition += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('Conference Location:', 20, yPosition);
      yPosition += 7;
      doc.setFont('helvetica', 'normal');
      doc.text(`  ${preference.conferenceLocation.name}`, 20, yPosition);
      yPosition += 7;
      if (preference.conferenceLocation.address) {
        doc.text(`  ${preference.conferenceLocation.address}`, 20, yPosition);
        yPosition += 7;
      }
      if (preference.maxDistanceFromConference) {
        doc.text(`  Max Distance: ${preference.maxDistanceFromConference} km`, 20, yPosition);
        yPosition += 7;
      }
    }

    if (preference.requiredAmenities && preference.requiredAmenities.length > 0) {
      yPosition += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('Required Amenities:', 20, yPosition);
      yPosition += 7;
      doc.setFont('helvetica', 'normal');
      const amenitiesText = preference.requiredAmenities.join(', ');
      // Split long amenities text across multiple lines if needed
      const splitText = doc.splitTextToSize(`  ${amenitiesText}`, pageWidth - 40);
      doc.text(splitText, 20, yPosition);
      yPosition += splitText.length * 7;
    }

    if (preference.specialRequirements) {
      yPosition += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('Special Requirements:', 20, yPosition);
      yPosition += 7;
      doc.setFont('helvetica', 'normal');
      const requirementsText = doc.splitTextToSize(`  ${preference.specialRequirements}`, pageWidth - 40);
      doc.text(requirementsText, 20, yPosition);
      yPosition += requirementsText.length * 7;
    }

    yPosition += 10;

    // Hotel Recommendations Section
    if (recommendations && recommendations.length > 0) {
      checkPageBreak(30);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`Hotel Recommendations (${recommendations.length})`, 20, yPosition);
      yPosition += 15;

      // Prepare table data
      const tableData = recommendations.map((rec, index) => {
        const hotel = rec.hotel || rec.hotelId || {};
        const name = hotel.name || hotel.card?.name || 'Hotel Name';
        const address = hotel.address || hotel.location?.address || hotel.card?.address || 'N/A';
        const rating = hotel.starRating || hotel.rating?.score || hotel.card?.rating || 0;
        const price = hotel.pricing?.basePrice || hotel.price || hotel.card?.price || 0;
        const currency = hotel.pricing?.currency || hotel.currency || hotel.card?.currency || preference.currency || 'INR';
        const relevanceScore = rec.relevanceScore || 0;
        const distance = rec.distanceFromConference || rec.distanceFromTargetArea || null;

        return [
          index + 1,
          name,
          address.substring(0, 40) + (address.length > 40 ? '...' : ''),
          rating > 0 ? `${rating.toFixed(1)} ⭐` : 'N/A',
          formatCurrency(price, currency),
          relevanceScore > 0 ? `${relevanceScore.toFixed(0)}%` : 'N/A',
          distance !== null ? `${distance.toFixed(1)} km` : 'N/A'
        ];
      });

      // Create table
      autoTable(doc, {
        startY: yPosition,
        head: [['#', 'Hotel Name', 'Address', 'Rating', 'Price/Night', 'Match %', 'Distance']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [0, 0, 0]
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 50 },
          2: { cellWidth: 45 },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 35, halign: 'right' },
          5: { cellWidth: 25, halign: 'center' },
          6: { cellWidth: 25, halign: 'center' }
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9 }
      });

      // Get final Y position after table
      yPosition = doc.lastAutoTable.finalY + 15;

      // Add detailed hotel information
      if (recommendations.length <= 5) {
        // Only add details if we have 5 or fewer hotels to avoid PDF being too long
        recommendations.forEach((rec, index) => {
          checkPageBreak(40);
          
          const hotel = rec.hotel || rec.hotelId || {};
          const name = hotel.name || hotel.card?.name || 'Hotel Name';
          const relevanceScore = rec.relevanceScore || 0;

          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`${index + 1}. ${name}`, 20, yPosition);
          yPosition += 8;

          // Relevance badge color
          let badgeColor = [255, 165, 0]; // Orange
          if (relevanceScore >= 80) badgeColor = [34, 197, 94]; // Green
          else if (relevanceScore >= 60) badgeColor = [234, 179, 8]; // Yellow

          doc.setFillColor(...badgeColor);
          doc.rect(20, yPosition - 2, 30, 6, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.text(`${relevanceScore.toFixed(0)}% Match`, 22, yPosition + 2);
          doc.setTextColor(0, 0, 0);

          yPosition += 10;

          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');

          const address = hotel.address || hotel.location?.address || hotel.card?.address;
          if (address) {
            const addressLines = doc.splitTextToSize(`Address: ${address}`, pageWidth - 40);
            doc.text(addressLines, 20, yPosition);
            yPosition += addressLines.length * 5 + 3;
          }

          const rating = hotel.starRating || hotel.rating?.score || hotel.card?.rating;
          if (rating) {
            doc.text(`Rating: ${rating.toFixed(1)} stars`, 20, yPosition);
            yPosition += 6;
          }

          const price = hotel.pricing?.basePrice || hotel.price || hotel.card?.price;
          const currency = hotel.pricing?.currency || hotel.currency || hotel.card?.currency || preference.currency || 'INR';
          if (price) {
            doc.text(`Price: ${formatCurrency(price, currency)} per night`, 20, yPosition);
            yPosition += 6;
          }

          const distance = rec.distanceFromConference || rec.distanceFromTargetArea;
          if (distance !== null) {
            doc.text(`Distance: ${distance.toFixed(1)} km from ${rec.distanceFromConference ? 'conference' : 'target area'}`, 20, yPosition);
            yPosition += 6;
          }

          yPosition += 5;
        });
      }
    } else {
      checkPageBreak(20);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(128, 128, 128);
      doc.text('No hotel recommendations available yet.', 20, yPosition);
      yPosition += 10;
    }

    // Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${i} of ${totalPages} | HALO Travel Advisory System`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Generate filename
    const clientNameSlug = clientName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const dateSlug = new Date().toISOString().split('T')[0];
    const filename = `travel-advisory-${clientNameSlug}-${dateSlug}.pdf`;

    // Save PDF
    doc.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};

