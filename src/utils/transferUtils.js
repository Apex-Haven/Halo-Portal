/**
 * Utility functions for transfer-related operations
 */

import { getTimezoneForIata } from './iataTimezones.js'

/** Fixed locations for all transfers */
export const DEFAULT_AIRPORT = 'Kuala Lumpur International Airport (KUL)'
export const DEFAULT_HOTEL = 'Grand Hyatt Kuala Lumpur'

/** IATA airline code → airline name (fallback when stored as TBD) */
const AIRLINE_BY_CODE = {
  EY: 'Etihad Airways',
  SQ: 'Singapore Airlines',
  MH: 'Malaysia Airlines',
  EK: 'Emirates',
  TK: 'Turkish Airlines',
  BR: 'EVA Air',
  BA: 'British Airways',
  CX: 'Cathay Pacific',
  NH: 'All Nippon Airways',
  UA: 'United Airlines',
  QR: 'Qatar Airways',
  AI: 'Air India',
  LH: 'Lufthansa',
  AF: 'Air France',
  KL: 'KLM',
  QF: 'Qantas',
  TG: 'Thai Airways',
  CZ: 'China Southern',
  CA: 'Air China',
  MU: 'China Eastern',
}

/**
 * Get airline display name - uses stored airline or lookup from flight number when TBD
 * @param {Object} flightDetails - flight_details or return_flight_details
 * @returns {string} Airline name for display
 */
export const getAirlineDisplay = (flightDetails) => {
  if (!flightDetails) return 'N/A'
  const stored = (flightDetails.airline || '').trim()
  if (stored && stored !== 'TBD' && stored !== 'N/A') return stored
  const fn = (flightDetails.flight_no || '').trim()
  if (!fn) return stored || 'N/A'
  const normalized = fn.replace(/\s/g, '').toUpperCase()
  const match = normalized.match(/^([A-Z0-9]{2})\d/)
  if (!match) return stored || 'N/A'
  return AIRLINE_BY_CODE[match[1]] || stored || 'N/A'
}

const PLACEHOLDER_FLIGHTS = ['XX000', 'TBD', 'N/A', '']

/**
 * Check if flight details represent a real flight (not placeholder)
 */
export const hasRealFlight = (flightDetails) => {
  if (!flightDetails) return false
  const fn = (flightDetails.flight_no || flightDetails.flight_number || '').trim().toUpperCase()
  if (!fn || PLACEHOLDER_FLIGHTS.includes(fn)) return false
  if (fn.length < 4) return false
  return true
}

/**
 * Get flight number for display - "No flight detail" when XX000/TBD/empty
 */
export const getFlightNoDisplay = (flightDetails) => {
  if (!flightDetails) return 'No flight detail'
  const fn = (flightDetails.flight_no || flightDetails.flight_number || '').trim()
  if (!fn || PLACEHOLDER_FLIGHTS.includes(fn.toUpperCase())) return 'No flight detail'
  return fn
}

/**
 * Get flight field for display - TBD when missing (for onward/return flight fields)
 */
export const getFlightFieldDisplay = (value) => {
  if (value == null || value === '' || String(value).trim() === '') return 'TBD'
  const s = String(value).trim()
  if (s === 'XX000' || s.toUpperCase() === 'TBD' || s === 'N/A' || s === '—') return 'TBD'
  return s
}

const getOrdinal = (n) => {
  if (n >= 11 && n <= 13) return 'th'
  const last = n % 10
  if (last === 1) return 'st'
  if (last === 2) return 'nd'
  if (last === 3) return 'rd'
  return 'th'
}

/**
 * Format an instant in the local wall time of an airport (IATA), matching how times appear on tickets / in sheets.
 * @param {string|Date|null|undefined} dateStr - ISO UTC instant from API
 * @param {string|null|undefined} iataCode - 3-letter IATA (e.g. BOM, SIN); unknown → Malaysia default
 * @returns {string}
 */
export const formatDateTimeAtAirport = (dateStr, iataCode) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  const tz = getTimezoneForIata(iataCode)
  const dayNum = parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: tz, day: 'numeric' }).format(d), 10)
  const month = new Intl.DateTimeFormat('en-GB', { timeZone: tz, month: 'long' }).format(d)
  const year = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric' }).format(d)
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d)
  return `${dayNum}${getOrdinal(dayNum)} ${month} ${year}, ${time}`
}

/**
 * Time only in airport local zone (e.g. "9:00 PM")
 */
export const formatTimeAtAirport = (dateStr, iataCode) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  const tz = getTimezoneForIata(iataCode)
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d)
}

/** Onward airport pickup: use inbound arrival airport (usually KUL) for zone */
export const formatTransferPickupLocal = (transfer) =>
  formatDateTimeAtAirport(
    transfer?.transfer_details?.estimated_pickup_time,
    transfer?.flight_details?.arrival_airport || 'KUL'
  )

/** Return leg hotel→airport pickup: departure airport of return flight (usually KUL) */
export const formatReturnPickupLocal = (transfer) =>
  formatDateTimeAtAirport(
    transfer?.return_transfer_details?.estimated_pickup_time,
    transfer?.return_flight_details?.departure_airport || 'KUL'
)

export const formatFlightDepartureLocal = (fd) => formatDateTimeAtAirport(fd?.departure_time, fd?.departure_airport)

export const formatFlightArrivalLocal = (fd) => formatDateTimeAtAirport(fd?.arrival_time, fd?.arrival_airport)

/**
 * IATA codes only: "SIN → KUL" (TBD when unknown)
 * @param {Object|null|undefined} fd - flight_details or return_flight_details
 */
export const getFlightRouteCodes = (fd) => {
  if (!fd) return '—'
  const dep = (fd.departure_airport || '').trim()
  const arr = (fd.arrival_airport || '').trim()
  const depU = dep.toUpperCase()
  const arrU = arr.toUpperCase()
  const depOk = dep && depU !== 'TBD' && depU !== 'N/A'
  const arrOk = arr && arrU !== 'TBD' && arrU !== 'N/A'
  if (!depOk && !arrOk) return '—'
  return `${depOk ? depU : 'TBD'} → ${arrOk ? arrU : 'TBD'}`
}

/**
 * Human route with optional names from FlightStats: "Singapore Changi (SIN) → Kuala Lumpur (KUL)"
 * Falls back to codes only.
 * @param {Object|null|undefined} fd
 */
export const getFlightRouteWithNames = (fd) => {
  if (!fd) return '—'
  const depCode = (fd.departure_airport || '').trim()
  const arrCode = (fd.arrival_airport || '').trim()
  const depName = (fd.departure_airport_name || '').trim()
  const arrName = (fd.arrival_airport_name || '').trim()
  const depU = depCode.toUpperCase()
  const arrU = arrCode.toUpperCase()
  const depOk = depCode && depU !== 'TBD' && depU !== 'N/A'
  const arrOk = arrCode && arrU !== 'TBD' && arrU !== 'N/A'
  if (!depOk && !arrOk) return '—'
  const left = depOk ? (depName ? `${depName} (${depU})` : depU) : 'TBD'
  const right = arrOk ? (arrName ? `${arrName} (${arrU})` : arrU) : 'TBD'
  return `${left} → ${right}`
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
 * People on one transfer: primary traveler + delegates (travelers in same car).
 * Uses explicit delegates[] only — no heuristics.
 *
 * @param {Object} transfer
 * @returns {number}
 */
export const getTransferTravelerHeadcount = (transfer) => {
  if (!transfer) return 0;
  const delegates = Array.isArray(transfer.delegates) ? transfer.delegates.length : 0;
  return 1 + delegates;
};

/**
 * Unique traveler user IDs across a list of transfers (primary + delegates, de-duplicated).
 * Use for Transfers page KPIs: adding someone to "same car" does not inflate this count if they were already counted on another transfer in the set; within one transfer each person counts once.
 *
 * @param {Array<Object>} transfers
 * @returns {number}
 */
export const getUniqueTravelerCountAcrossTransfers = (transfers) => {
  if (!Array.isArray(transfers) || transfers.length === 0) return 0;
  const ids = new Set();
  for (const t of transfers) {
    const primary = t.traveler_id?._id ?? t.traveler_id;
    if (primary) {
      ids.add(String(primary));
    } else {
      ids.add(`__primary_slot:${t._id}`);
    }
    for (const d of t.delegates || []) {
      const id = d.traveler_id?._id ?? d.traveler_id;
      if (id) ids.add(String(id));
    }
  }
  return ids.size;
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
  const fromProfile = transfer.traveler_id?.profile
    ? [transfer.traveler_id.profile.salutation, transfer.traveler_id.profile.firstName, transfer.traveler_id.profile.lastName].filter(Boolean).join(' ').trim()
    : null;
  const fromDetails = transfer.traveler_details?.salutation?.trim()
    ? `${transfer.traveler_details.salutation} ${transfer.traveler_details?.name || ''}`.trim()
    : transfer.traveler_details?.name || null;
  const travelerName = fromProfile || fromDetails || null;
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
  // Primary traveler: prefer traveler_id.profile (canonical source with salutation) when populated
  const fromProfile = transfer.traveler_id?.profile
    ? [transfer.traveler_id.profile.salutation, transfer.traveler_id.profile.firstName, transfer.traveler_id.profile.lastName].filter(Boolean).join(' ').trim()
    : null;
  const fromDetails = transfer.traveler_details?.salutation?.trim()
    ? `${transfer.traveler_details.salutation} ${transfer.traveler_details?.name || ''}`.trim()
    : transfer.traveler_details?.name || null;
  const travelerName =
    fromProfile ||
    fromDetails ||
    transfer.traveler_id?.email ||
    transfer.traveler_id?.username ||
    null;

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
 * Get display name for a delegate (traveler in same car)
 * Uses salutation when available from traveler_id.profile
 *
 * @param {Object} delegate - Delegate entry with traveler_id (populated) and optional travelerName
 * @returns {string} Display name for the delegate
 */
export const getDelegateDisplayName = (delegate) => {
  if (!delegate) return 'Traveler';
  if (delegate.travelerName) return delegate.travelerName;
  const p = delegate.traveler_id?.profile;
  if (p) {
    const name = [p.salutation, p.firstName, p.lastName].filter(Boolean).join(' ').trim();
    return name || delegate.traveler_id?.email || 'Traveler';
  }
  return delegate.traveler_id?.email || 'Traveler';
};

/**
 * Unique guest names attached to a transfer (primary + delegates).
 *
 * @param {Object} transfer
 * @returns {string[]}
 */
export const getGuestNamesFromTransfer = (transfer) => {
  if (!transfer) return [];
  const names = new Set();
  const { travelerName, clientName } = getClientAndTravelerNames(transfer);
  const primaryName = travelerName || (clientName && clientName !== 'N/A' ? clientName : null);
  if (primaryName && String(primaryName).trim()) names.add(String(primaryName).trim());
  const seenDelegateIds = new Set();
  (transfer.delegates || []).forEach((d) => {
    const tid = d?.traveler_id?._id || d?.traveler_id?.email || d?.traveler_id;
    const key = tid ? String(tid) : null;
    if (key && seenDelegateIds.has(key)) return;
    if (key) seenDelegateIds.add(key);
    const n = getDelegateDisplayName(d);
    if (n && String(n).trim()) names.add(String(n).trim());
  });
  return [...names];
};

const normalizeCompanyName = (companyName) => {
  if (!companyName) return null;
  const normalized = String(companyName).trim().replace(/\s+/g, ' ');
  return normalized || null;
};

const getCompanyNamesFromTransfer = (transfer) => {
  if (!transfer) return [];
  const companyNames = [];

  const primaryCandidates = [
    transfer.customer_details?.company_name,
    transfer.traveler_id?.profile?.company_name,
    transfer.traveler_details?.company_name
  ];
  primaryCandidates.forEach((name) => {
    const normalized = normalizeCompanyName(name);
    if (normalized) companyNames.push(normalized);
  });

  const seenDelegateIds = new Set();
  (transfer.delegates || []).forEach((delegate) => {
    const tid = delegate?.traveler_id?._id || delegate?.traveler_id?.email || delegate?.traveler_id;
    const key = tid ? String(tid) : null;
    if (key && seenDelegateIds.has(key)) return;
    if (key) seenDelegateIds.add(key);

    const delegateCompany = normalizeCompanyName(delegate?.traveler_id?.profile?.company_name);
    if (delegateCompany) companyNames.push(delegateCompany);
  });

  return [...new Set(companyNames)];
};

/**
 * Build deduplicated company guest summaries from transfers.
 * Company matching is case-insensitive, display keeps first seen casing.
 *
 * @param {Array<Object>} transfers
 * @returns {Array<{companyName: string, guestNames: string[], guestCount: number, transferCount: number}>}
 */
export const buildCompaniesFromTransfers = (transfers) => {
  if (!Array.isArray(transfers) || transfers.length === 0) return [];
  const map = new Map();
  for (const t of transfers) {
    const companyNames = getCompanyNamesFromTransfer(t);
    if (companyNames.length === 0) continue;
    const guestNames = getGuestNamesFromTransfer(t);
    const transferId = t._id ? String(t._id) : null;
    companyNames.forEach((companyName) => {
      const key = companyName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          companyName,
          guestNameSet: new Set(),
          transferIds: new Set()
        });
      }
      const entry = map.get(key);
      guestNames.forEach((n) => entry.guestNameSet.add(n));
      if (transferId) entry.transferIds.add(transferId);
    });
  }
  return [...map.values()]
    .map((entry) => ({
      companyName: entry.companyName,
      guestNames: [...entry.guestNameSet].sort((a, b) => a.localeCompare(b)),
      guestCount: entry.guestNameSet.size,
      transferCount: entry.transferIds.size
    }))
    .sort((a, b) => a.companyName.localeCompare(b.companyName));
};

/**
 * Expand one API transfer into one row per traveler for list UIs when delegates share the same car.
 * Same underlying transfer document; each row has a stable cardRowKey for React keys.
 *
 * @param {Object} transfer
 * @returns {Array<{ transfer: Object, cardRowKey: string, cardTravelerLabel: string, sameCarGroupSize: number, sameCarIndex: number }>}
 */
export const expandTransferToCardRows = (transfer) => {
  if (!transfer) return [];
  const delegates = transfer.delegates || [];
  const { travelerName, clientName } = getClientAndTravelerNames(transfer);
  const primaryLabel =
    travelerName || (clientName && clientName !== 'N/A' ? clientName : null) || '—';
  const n = 1 + delegates.length;
  if (delegates.length === 0) {
    return [
      {
        transfer,
        cardRowKey: String(transfer._id),
        cardTravelerLabel: primaryLabel,
        sameCarGroupSize: 1,
        sameCarIndex: 0
      }
    ];
  }
  const rows = [
    {
      transfer,
      cardRowKey: `${transfer._id}-primary`,
      cardTravelerLabel: primaryLabel,
      sameCarGroupSize: n,
      sameCarIndex: 0
    }
  ];
  delegates.forEach((d) => {
    const tid = d.traveler_id?._id || d.traveler_id;
    rows.push({
      transfer,
      cardRowKey: `${transfer._id}-d-${tid}`,
      cardTravelerLabel: getDelegateDisplayName(d),
      sameCarGroupSize: n,
      sameCarIndex: rows.length
    });
  });
  return rows;
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

  // Assigned – vendor and driver ready, but leg not yet in progress
  if (onwardStatus === 'assigned') {
    return { label: 'Driver assigned', statusKey: 'assigned', description: 'Awaiting pickup — transfer not started yet' };
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
  if (status === 'assigned') return { label: 'Driver assigned', statusKey: 'assigned' };
  return { label: status.replace(/_/g, ' '), statusKey: status };
};
