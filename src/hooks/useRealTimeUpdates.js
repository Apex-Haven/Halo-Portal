import { useEffect, useCallback } from 'react'
import { useWebSocket } from './useWebSocket'

const useRealTimeUpdates = (onUpdate) => {
  const { isConnected, lastMessage, sendMessage } = useWebSocket(
    process.env.NODE_ENV === 'development' 
      ? 'ws://localhost:7007/ws' 
      : `wss://${window.location.host}/ws`
  )

  const subscribeToTransfer = useCallback((transferId) => {
    if (isConnected) {
      sendMessage({
        type: 'subscribe',
        channel: 'transfer',
        id: transferId
      })
    }
  }, [isConnected, sendMessage])

  const unsubscribeFromTransfer = useCallback((transferId) => {
    if (isConnected) {
      sendMessage({
        type: 'unsubscribe',
        channel: 'transfer',
        id: transferId
      })
    }
  }, [isConnected, sendMessage])

  const subscribeToFlight = useCallback((flightNumber) => {
    if (isConnected) {
      sendMessage({
        type: 'subscribe',
        channel: 'flight',
        id: flightNumber
      })
    }
  }, [isConnected, sendMessage])

  const unsubscribeFromFlight = useCallback((flightNumber) => {
    if (isConnected) {
      sendMessage({
        type: 'unsubscribe',
        channel: 'flight',
        id: flightNumber
      })
    }
  }, [isConnected, sendMessage])

  const subscribeToVendor = useCallback((vendorId) => {
    if (isConnected) {
      sendMessage({
        type: 'subscribe',
        channel: 'vendor',
        id: vendorId
      })
    }
  }, [isConnected, sendMessage])

  const unsubscribeFromVendor = useCallback((vendorId) => {
    if (isConnected) {
      sendMessage({
        type: 'unsubscribe',
        channel: 'vendor',
        id: vendorId
      })
    }
  }, [isConnected, sendMessage])

  // Handle incoming messages
  useEffect(() => {
    if (lastMessage && onUpdate) {
      onUpdate(lastMessage)
    }
  }, [lastMessage, onUpdate])

  return {
    isConnected,
    subscribeToTransfer,
    unsubscribeFromTransfer,
    subscribeToFlight,
    unsubscribeFromFlight,
    subscribeToVendor,
    unsubscribeFromVendor
  }
}

export default useRealTimeUpdates
