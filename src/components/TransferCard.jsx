import { motion } from 'framer-motion'
import { format } from 'date-fns'
import {
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Plane,
  Truck,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader
} from 'lucide-react'
import { getTransferDisplayName } from '../utils/transferUtils'

const statusConfig = {
  pending: {
    label: 'Pending',
    color: 'bg-gray-100 text-gray-800',
    icon: Clock,
    dot: 'gray'
  },
  assigned: {
    label: 'Assigned',
    color: 'bg-primary-100 text-primary-800',
    icon: Truck,
    dot: 'info'
  },
  enroute: {
    label: 'En Route',
    color: 'bg-warning-100 text-warning-800',
    icon: Truck,
    dot: 'warning'
  },
  waiting: {
    label: 'Waiting',
    color: 'bg-warning-100 text-warning-800',
    icon: Clock,
    dot: 'warning'
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-primary-100 text-primary-800',
    icon: Loader,
    dot: 'info'
  },
  completed: {
    label: 'Completed',
    color: 'bg-success-100 text-success-800',
    icon: CheckCircle,
    dot: 'success'
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-danger-100 text-danger-800',
    icon: XCircle,
    dot: 'danger'
  }
}

const flightStatusConfig = {
  on_time: {
    label: 'On Time',
    color: 'bg-success-100 text-success-800',
    icon: CheckCircle
  },
  delayed: {
    label: 'Delayed',
    color: 'bg-warning-100 text-warning-800',
    icon: AlertCircle
  },
  landed: {
    label: 'Landed',
    color: 'bg-success-100 text-success-800',
    icon: CheckCircle
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-danger-100 text-danger-800',
    icon: XCircle
  },
  boarding: {
    label: 'Boarding',
    color: 'bg-primary-100 text-primary-800',
    icon: Plane
  },
  departed: {
    label: 'Departed',
    color: 'bg-primary-100 text-primary-800',
    icon: Plane
  }
}

const TransferCard = ({ transfer, onClick }) => {
  const status = statusConfig[transfer.transfer_details?.transfer_status] || statusConfig.pending
  const flightStatus = flightStatusConfig[transfer.flight_details?.status] || flightStatusConfig.on_time
  const StatusIcon = status.icon
  const FlightStatusIcon = flightStatus.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -2 }}
      className="card cursor-pointer hover:shadow-md transition-all duration-200"
      onClick={() => onClick?.(transfer)}
    >
      <div className="card-content">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {getTransferDisplayName(transfer)}
            </h3>
            <p className="text-sm text-gray-600">
              {transfer._id}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`badge ${status.color}`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </span>
          </div>
        </div>

        {/* Flight Info */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Plane className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-900">
                {transfer.flight_details?.flight_no}
              </span>
              <span className="text-sm text-gray-600">
                {transfer.flight_details?.airline}
              </span>
            </div>
            <span className={`badge ${flightStatus.color}`}>
              <FlightStatusIcon className="w-3 h-3 mr-1" />
              {flightStatus.label}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>
                {transfer.flight_details?.departure_airport} → {transfer.flight_details?.arrival_airport}
              </span>
              {transfer.flight_details?.delay_minutes > 0 && (
                <span className="text-warning-600 font-medium">
                  +{transfer.flight_details.delay_minutes} min delay
                </span>
              )}
            </div>
            <div className="mt-1">
              Arrival: {format(new Date(transfer.flight_details?.actual_arrival || transfer.flight_details?.scheduled_arrival), 'MMM d, h:mm a')}
            </div>
          </div>
        </div>

        {/* Transfer Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-start space-x-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
            <div className="text-sm">
              <p className="text-gray-900 font-medium">Pickup</p>
              <p className="text-gray-600">{transfer.transfer_details?.pickup_location}</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
            <div className="text-sm">
              <p className="text-gray-900 font-medium">Drop-off</p>
              <p className="text-gray-600">{transfer.transfer_details?.drop_location}</p>
            </div>
          </div>
        </div>

        {/* Driver Info */}
        {transfer.assigned_driver_details && (
          <div className="mb-4 p-3 bg-primary-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Truck className="w-4 h-4 text-primary-600" />
              <span className="font-medium text-primary-900">Driver Assigned</span>
            </div>
            <div className="text-sm text-primary-800">
              <p className="font-medium">{transfer.assigned_driver_details.name}</p>
              <p>{transfer.assigned_driver_details.vehicle_type} - {transfer.assigned_driver_details.vehicle_number}</p>
              <div className="flex items-center space-x-4 mt-1">
                <span className="flex items-center">
                  <Phone className="w-3 h-3 mr-1" />
                  {transfer.assigned_driver_details.contact_number}
                </span>
                <span className={`badge ${
                  transfer.assigned_driver_details.status === 'waiting' ? 'bg-success-100 text-success-800' :
                  transfer.assigned_driver_details.status === 'enroute' ? 'bg-warning-100 text-warning-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {transfer.assigned_driver_details.status}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Customer Contact */}
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <Phone className="w-3 h-3" />
            <span>{transfer.customer_details?.contact_number}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Mail className="w-3 h-3" />
            <span>{transfer.customer_details?.email}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            <p>Passengers: {transfer.customer_details?.no_of_passengers}</p>
            <p>Luggage: {transfer.customer_details?.luggage_count}</p>
          </div>
          <div className="text-xs text-gray-500">
            Created: {format(new Date(transfer.created_at), 'MMM d, h:mm a')}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default TransferCard
