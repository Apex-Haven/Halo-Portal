/**
 * HALO Transfer Flow - Project-wide constants and helpers
 *
 * Flow: Transfer Requested → Driver Assigned (awaiting pickup) → In Progress (en route / pickup) →
 *       Arrival Completed → [Return: Departure Driver → Departure Completed] → Transfer Completed
 *
 * Status mapping: pending | assigned | in_progress | completed
 * (enroute is merged into in_progress for display)
 */

export const TRANSFER_STATUS = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
}

// Pipeline stages for Operations Dashboard (4 stages)
export const PIPELINE_STAGES = [
  { id: 'pending', label: 'Pending', description: 'Waiting for vendor or driver assignment' },
  { id: 'assigned', label: 'Driver assigned', description: 'Awaiting pickup — transfer not started yet' },
  { id: 'in_progress', label: 'In Progress', description: 'Transfer started — driver en route or with traveler' },
  { id: 'completed', label: 'Completed', description: 'Transfer completed' }
]

// Status options for filters, dropdowns, quick actions
export const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'assigned', label: 'Driver assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
]

// Map legacy 'enroute' to 'in_progress' for display
export const normalizeStatus = (status) => {
  if (!status) return 'pending'
  if (status === 'enroute' || status === 'waiting') return 'in_progress'
  return status
}

// Get pipeline count for a stage (merges enroute into in_progress)
export const getPipelineCount = (stageMetrics, stageId) => {
  if (!stageMetrics) return 0
  if (stageId === 'in_progress') {
    return (stageMetrics.in_progress || 0) + (stageMetrics.enroute || 0)
  }
  return stageMetrics[stageId] || 0
}

// Check if leg matches stage filter
export const legMatchesStage = (transferDetails, stageId) => {
  const status = transferDetails?.transfer_status || transferDetails?.status || 'pending'
  const normalized = normalizeStatus(status)
  if (stageId === 'in_progress') {
    return normalized === 'in_progress' || status === 'enroute'
  }
  return normalized === stageId
}
