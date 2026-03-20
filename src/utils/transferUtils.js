/**
 * Utility functions for transfer-related operations
 */

/** Fixed locations for all transfers */
export const DEFAULT_AIRPORT = 'Kuala Lumpur International Airport (KUL)'
export const DEFAULT_HOTEL = 'Grand Hyatt Kuala Lumpur'

const getOrdinal = (n) => {
  if (n >= 11 && n <= 13) return 'th'
  const last = n % 10
  if (last === 1) return 'st'
  if (last === 2) return 'nd'
  if (last === 3) return 'rd'
  return 'th'
}

/**
 * Format date as "10th March 2026" and time as "2:10 AM"
 * @param {string|Date} dateStr - ISO date string or Date
 * @returns {string} Formatted "10th March 2026, 2:10 AM"
 */
export const formatDateTimeFriendly = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  const day = d.getDate()
  const month = d.toLocaleDateString('en-GB', { month: 'long' })
  const year = d.getFullYear()
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${day}${getOrdinal(day)} ${month} ${year}, ${time}`
}

/**
 * Format date only as "10th March 2026"
 * @param {string|Date} dateStr - ISO date string or Date
 * @returns {string} Formatted "10th March 2026"
 */
export const formatDateFriendly = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  const day = d.getDate()
  const month = d.toLocaleDateString('en-GB', { month: 'long' })
  const year = d.getFullYear()
  return `${day}${getOrdinal(day)} ${month} ${year}`
}

/**
 * Format time only as "2:10 AM" (12-hour AM/PM)
 * @param {string|Date} dateStr - ISO date string or Date
 * @returns {string} Formatted "2:10 AM"
 */
export const formatTimeFriendly = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

/**
 * Get company name from a transfer (customer or traveler)
 * @param {Object} transfer - The transfer object
 * @returns {string|null} Company name or null
 */
export const getCompanyName = (transfer) => {
  if (!transfer) return null;
  return (
    transfer.customer_details?.company_name ||
    transfer.traveler_details?.company_name ||
    null
  );
};

/**
 * Get the display name for a transfer
 * Format: Company Name - Traveler Name (company first, traveler second)
 * Fallback: Customer name → Apex ID
 *
 * @param {Object} transfer - The transfer object
 * @returns {string} Display name for the transfer
 */
export const getTransferDisplayName = (transfer) => {
  if (!transfer) return 'N/A';

  const companyName = getCompanyName(transfer);
  const travelerName = transfer.traveler_details?.name || null;
  const rawName = transfer.customer_details?.name || null;
  const salutation = transfer.customer_details?.salutation?.trim();
  const clientName = rawName ? (salutation ? `${salutation} ${rawName}` : rawName) : null;

  if (companyName && travelerName) {
    return `${companyName} - ${travelerName}`;
  }
  if (companyName) {
    return companyName;
  }
  if (travelerName) {
    return travelerName;
  }
  if (clientName) {
    return clientName;
  }
  return transfer._id || 'N/A';
};

/**
 * Get client, company, and traveler names from a transfer
 * Company is shown first, traveler second (throughout the site)
 *
 * @param {Object} transfer - The transfer object
 * @returns {Object} Object with companyName, clientName, travelerName, displayText
 */
export const getClientAndTravelerNames = (transfer) => {
  if (!transfer) {
    return {
      companyName: null,
      clientName: 'N/A',
      travelerName: null,
      displayText: 'N/A'
    };
  }

  const companyName = getCompanyName(transfer) || null;
  const rawName = transfer.customer_details?.name || 'N/A';
  const salutation = transfer.customer_details?.salutation?.trim();
  const clientName = salutation ? `${salutation} ${rawName}`.trim() : rawName;
  const travelerName = transfer.traveler_details?.name || null;

  // Primary display: Company first, then traveler
  let displayText = companyName || clientName;
  if (travelerName) {
    displayText = companyName
      ? `${companyName} - ${travelerName}`
      : `${clientName} - ${travelerName}`;
  }

  return {
    companyName,
    clientName,
    travelerName,
    displayText
  };
};

/**
 * Get client-friendly status display for monitoring travelers
 * Shows what's actually pending: vendor, driver, return driver, or progress
 *
 * @param {Object} transfer - The transfer object
 * @returns {{ label: string, statusKey: string, description: string }} Display label, status key for styling, and short description
 */
export const getTransferStatusDisplay = (transfer) => {
  if (!transfer) return { label: 'Pending', statusKey: 'pending', description: 'Transfer is being set up' };

  const onwardStatus = (transfer.transfer_details?.transfer_status || 'pending').toLowerCase().replace(/\s/g, '_');
  const returnStatus = (transfer.return_transfer_details?.transfer_status || 'pending').toLowerCase().replace(/\s/g, '_');
  const hasVendor = !!transfer.vendor_details?.vendor_name || !!transfer.vendor_details?.vendor_id;
  const hasOnwardDriver = !!transfer.assigned_driver_details?.name || !!transfer.assigned_driver_details?.driver_name;
  const hasReturnTransfer = !!(transfer.return_transfer_details || transfer.return_flight_details);
  const onwardCompleted = onwardStatus === 'completed';
  const returnCompleted = returnStatus === 'completed';
  const returnInProgress = ['in_progress', 'enroute', 'waiting'].includes(returnStatus);
  const hasReturnDriver = !!transfer.return_assigned_driver_details?.name || !!transfer.return_assigned_driver_details?.driver_name;

  if (onwardStatus === 'cancelled' || returnStatus === 'cancelled') return { label: 'Cancelled', statusKey: 'cancelled', description: 'This transfer was cancelled' };

  // Completed states – distinguish onward, return, and final
  if (hasReturnTransfer) {
    if (onwardCompleted && returnCompleted) return { label: 'Completed', statusKey: 'completed', description: 'Round trip completed successfully' };
    if (onwardCompleted && returnInProgress) return { label: 'Return in progress', statusKey: 'in_progress', description: 'Return leg is in progress' };
    if (onwardCompleted && !returnCompleted) return { label: 'Onward completed', statusKey: 'completed', description: 'Arrival completed, return leg pending' };
  } else {
    if (onwardCompleted) return { label: 'Completed', statusKey: 'completed', description: 'Transfer completed successfully' };
  }

  if (onwardStatus === 'in_progress' || onwardStatus === 'enroute' || onwardStatus === 'waiting') return { label: 'In progress', statusKey: 'in_progress', description: 'Driver is on the way or transfer in progress' };

  // Round trip: onward done, return needs driver
  if (hasReturnTransfer && onwardCompleted && !hasReturnDriver) {
    return { label: 'Return driver pending', statusKey: 'pending', description: 'Return leg is waiting for driver assignment' };
  }

  // No vendor yet
  if (!hasVendor) {
    return { label: 'Vendor assignment pending', statusKey: 'pending', description: 'A vendor is being assigned for this transfer' };
  }

  // Has vendor, no onward driver
  if (!hasOnwardDriver) {
    return { label: 'Driver assignment pending', statusKey: 'pending', description: 'Vendor assigned, driver will be assigned shortly' };
  }

  // Assigned – vendor and driver ready
  if (onwardStatus === 'assigned') {
    return { label: 'Assigned', statusKey: 'assigned', description: 'Driver assigned and ready for pickup' };
  }

  return { label: onwardStatus.replace(/_/g, ' '), statusKey: onwardStatus, description: 'Transfer is being set up' };
};

/**
 * Get display for a single leg (onward or return) – for sections that show leg-specific status
 * @param {Object} transfer - The transfer object
 * @param {'onward'|'return'} leg - Which leg
 * @returns {{ label: string, statusKey: string }}
 */
export const getLegStatusDisplay = (transfer, leg = 'onward') => {
  if (!transfer) return { label: 'Pending', statusKey: 'pending' };
  const details = leg === 'return' ? transfer.return_transfer_details : transfer.transfer_details;
  const status = (details?.transfer_status || details?.status || 'pending').toLowerCase().replace(/\s/g, '_');
  const hasDriver = leg === 'return'
    ? !!(transfer.return_assigned_driver_details?.name || transfer.return_assigned_driver_details?.driver_name)
    : !!(transfer.assigned_driver_details?.name || transfer.assigned_driver_details?.driver_name);
  const hasVendor = leg === 'return'
    ? !!(transfer.return_vendor_details?.vendor_name || transfer.vendor_details?.vendor_name)
    : !!(transfer.vendor_details?.vendor_name || transfer.vendor_details?.vendor_id);

  if (status === 'cancelled') return { label: 'Cancelled', statusKey: 'cancelled' };
  if (status === 'completed') return { label: leg === 'return' ? 'Return completed' : 'Onward completed', statusKey: 'completed' };
  if (['in_progress', 'enroute', 'waiting'].includes(status)) return { label: leg === 'return' ? 'Return in progress' : 'In progress', statusKey: 'in_progress' };
  if (!hasVendor) return { label: 'Vendor assignment pending', statusKey: 'pending' };
  if (!hasDriver) return { label: 'Driver assignment pending', statusKey: 'pending' };
  if (status === 'assigned') return { label: 'Assigned', statusKey: 'assigned' };
  return { label: status.replace(/_/g, ' '), statusKey: status };
};
