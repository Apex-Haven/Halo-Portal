import { createContext, useContext, useCallback, useState, useEffect } from 'react'

const STORAGE_KEY = 'halo_feature_flags'

export const FEATURE_KEYS = {
  HOTELS_ADVISORY: 'hotelsAdvisory',
  FLIGHTS: 'flights'
}

const DEFAULT_FEATURES = {
  [FEATURE_KEYS.HOTELS_ADVISORY]: false,
  [FEATURE_KEYS.FLIGHTS]: true  // Enabled by default for client and admin roles
}

export const FEATURE_LABELS = {
  [FEATURE_KEYS.HOTELS_ADVISORY]: 'Hotels & Advisory',
  [FEATURE_KEYS.FLIGHTS]: 'Flights'
}

const FeaturesContext = createContext()

export const useFeatures = () => {
  const context = useContext(FeaturesContext)
  if (!context) {
    throw new Error('useFeatures must be used within a FeaturesProvider')
  }
  return context
}

const loadFeatures = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_FEATURES, ...parsed }
    }
  } catch (e) {
    console.warn('Failed to load feature flags:', e)
  }
  return { ...DEFAULT_FEATURES }
}

const saveFeatures = (features) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(features))
  } catch (e) {
    console.warn('Failed to save feature flags:', e)
  }
}

export const FeaturesProvider = ({ children }) => {
  const [features, setFeatures] = useState(loadFeatures)

  useEffect(() => {
    saveFeatures(features)
  }, [features])

  const isFeatureEnabled = useCallback((key) => {
    return !!features[key]
  }, [features])

  const setFeatureEnabled = useCallback((key, enabled) => {
    setFeatures((prev) => ({ ...prev, [key]: !!enabled }))
  }, [])

  const value = {
    features,
    isFeatureEnabled,
    setFeatureEnabled,
    FEATURE_KEYS,
    FEATURE_LABELS
  }

  return (
    <FeaturesContext.Provider value={value}>
      {children}
    </FeaturesContext.Provider>
  )
}
