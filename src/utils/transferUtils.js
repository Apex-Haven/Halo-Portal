/**
 * Utility functions for transfer-related operations
 */

/**
 * Get the display name for a transfer
 * Priority: Traveler name → Customer name → Apex ID (fallback)
 * 
 * @param {Object} transfer - The transfer object
 * @returns {string} Display name for the transfer
 */
export const getTransferDisplayName = (transfer) => {
  if (!transfer) return 'N/A';
  
  // Priority 1: Traveler name (if assigned)
  if (transfer.traveler_details?.name) {
    return transfer.traveler_details.name;
  }
  
  // Priority 2: Customer name
  if (transfer.customer_details?.name) {
    return transfer.customer_details.name;
  }
  
  // Fallback: Apex ID
  return transfer._id || 'N/A';
};

/**
 * Get client and traveler names from a transfer
 * 
 * @param {Object} transfer - The transfer object
 * @returns {Object} Object with clientName, travelerName, and displayText
 */
export const getClientAndTravelerNames = (transfer) => {
  if (!transfer) {
    return {
      clientName: 'N/A',
      travelerName: null,
      displayText: 'N/A'
    };
  }
  
  const clientName = transfer.customer_details?.name || 'N/A';
  const travelerName = transfer.traveler_details?.name || null;
  
  let displayText = clientName;
  if (travelerName) {
    displayText = `${clientName}\n${travelerName}`;
  }
  
  return {
    clientName,
    travelerName,
    displayText
  };
};
