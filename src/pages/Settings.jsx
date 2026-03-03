import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Bell, Shield, Database, ToggleLeft, Plane } from 'lucide-react'
import { useFeatures, FEATURE_KEYS, FEATURE_LABELS } from '../contexts/FeaturesContext'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import Dropdown from '../components/Dropdown'
import toast from 'react-hot-toast'

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general')
  const { isFeatureEnabled, setFeatureEnabled } = useFeatures()
  const { user } = useAuth()
  const { get, put, post } = useApi()

  const baseTabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'features', label: 'Features', icon: ToggleLeft },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'integrations', label: 'Integrations', icon: Database }
  ]
  const flightApiTab = { id: 'flight-api', label: 'Flight API', icon: Plane }
  const tabs = user?.role === 'SUPER_ADMIN' ? [...baseTabs, flightApiTab] : baseTabs

  // Flight API state (SUPER_ADMIN only)
  const [flightApiKey, setFlightApiKey] = useState('')
  const [flightApiPlan, setFlightApiPlan] = useState('free')
  const [flightApiConfigured, setFlightApiConfigured] = useState(false)
  const [flightApiSaving, setFlightApiSaving] = useState(false)
  const [flightApiTesting, setFlightApiTesting] = useState(false)

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' && activeTab === 'flight-api') {
      get('/settings').then((res) => {
        if (res?.data) {
          setFlightApiConfigured(res.data.api_key_configured)
          setFlightApiPlan(res.data.api_plan || 'free')
        }
      }).catch(() => {})
    }
  }, [user?.role, activeTab])

  const handleSaveFlightApi = async () => {
    setFlightApiSaving(true)
    try {
      const payload = { api_plan: flightApiPlan }
      if (flightApiKey.trim()) payload.aviationstack_api_key = flightApiKey.trim()
      await put('/settings', payload)
      setFlightApiConfigured(payload.aviationstack_api_key ? true : flightApiConfigured)
      setFlightApiKey('')
      toast.success('Settings saved')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save')
    } finally {
      setFlightApiSaving(false)
    }
  }

  const handleTestFlightApi = async () => {
    setFlightApiTesting(true)
    try {
      const res = await post('/settings/test-flight-api', {})
      if (res?.success) {
        toast.success(res.message || 'Connection successful')
      } else {
        toast.error(res?.message || 'Connection failed')
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Test failed')
    } finally {
      setFlightApiTesting(false)
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground m-0">
          Settings
        </h1>
        <p className="text-muted-foreground mt-2 mb-0">
          Manage your HALO application settings
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-[250px] bg-card rounded-xl shadow-sm border border-border p-6 h-fit">
          <nav className="flex flex-col gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg border-none cursor-pointer text-sm font-medium text-left w-full transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-transparent text-muted-foreground hover:bg-accent'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'features' && (
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Features
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enable or disable app features. Changes apply immediately.
              </p>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center py-3 px-4 rounded-lg border border-border bg-muted/30 dark:bg-muted/20">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {FEATURE_LABELS[FEATURE_KEYS.HOTELS_ADVISORY]}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Travel advisory and hotel recommendations (sidebar and route)
                    </div>
                  </div>
                  <label className="inline-flex items-center cursor-pointer shrink-0 gap-3">
                    <input
                      type="checkbox"
                      checked={isFeatureEnabled(FEATURE_KEYS.HOTELS_ADVISORY)}
                      onChange={(e) => setFeatureEnabled(FEATURE_KEYS.HOTELS_ADVISORY, e.target.checked)}
                      className="sr-only peer"
                    />
                    <span className="relative inline-block w-11 h-6 shrink-0 rounded-full border border-border bg-muted transition-colors dark:bg-muted/80 peer-checked:bg-primary peer-checked:border-primary peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-background after:shadow-sm after:transition-[transform] after:content-[''] peer-checked:after:translate-x-5 peer-checked:after:border-0 dark:after:bg-background" />
                    <span className="text-sm font-medium text-foreground">
                      {isFeatureEnabled(FEATURE_KEYS.HOTELS_ADVISORY) ? 'On' : 'Off'}
                    </span>
                  </label>
                </div>
                <div className="flex justify-between items-center py-3 px-4 rounded-lg border border-border bg-muted/30 dark:bg-muted/20">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {FEATURE_LABELS[FEATURE_KEYS.FLIGHTS]}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Flights list and flight status (sidebar and route)
                    </div>
                  </div>
                  <label className="inline-flex items-center cursor-pointer shrink-0 gap-3">
                    <input
                      type="checkbox"
                      checked={isFeatureEnabled(FEATURE_KEYS.FLIGHTS)}
                      onChange={(e) => setFeatureEnabled(FEATURE_KEYS.FLIGHTS, e.target.checked)}
                      className="sr-only peer"
                    />
                    <span className="relative inline-block w-11 h-6 shrink-0 rounded-full border border-border bg-muted transition-colors dark:bg-muted/80 peer-checked:bg-primary peer-checked:border-primary peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-background after:shadow-sm after:transition-[transform] after:content-[''] peer-checked:after:translate-x-5 peer-checked:after:border-0 dark:after:bg-background" />
                    <span className="text-sm font-medium text-foreground">
                      {isFeatureEnabled(FEATURE_KEYS.FLIGHTS) ? 'On' : 'Off'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">
                General Settings
              </h2>
              
              <div className="flex flex-col gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Application Name
                  </label>
                  <input
                    type="text"
                    defaultValue="HALO AI Logistic Operator"
                    className="w-full px-3 py-3 border border-input rounded-lg text-sm outline-none bg-background text-foreground focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Time Zone
                  </label>
                  <Dropdown
                    value="IST"
                    onChange={() => {}}
                    options={[
                      { value: 'IST', label: 'India Standard Time (IST)' },
                      { value: 'UTC', label: 'UTC' },
                      { value: 'EST', label: 'Eastern Standard Time (EST)' }
                    ]}
                    placeholder="Select timezone"
                    minWidth="100%"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Default Language
                  </label>
                  <Dropdown
                    value="en"
                    onChange={() => {}}
                    options={[
                      { value: 'en', label: 'English' },
                      { value: 'hi', label: 'Hindi' },
                      { value: 'ar', label: 'Arabic' }
                    ]}
                    placeholder="Select language"
                    minWidth="100%"
                  />
                </div>

                <button className="px-6 py-3 bg-primary text-primary-foreground border-none rounded-lg text-sm font-medium cursor-pointer w-fit hover:bg-primary/90 transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">
                Notification Settings
              </h2>
              
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      Email Notifications
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Receive notifications via email
                    </div>
                  </div>
                  <input type="checkbox" defaultChecked className="scale-125" />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                      SMS Notifications
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      Receive notifications via SMS
                    </div>
                  </div>
                  <input type="checkbox" defaultChecked style={{ transform: 'scale(1.2)' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                      WhatsApp Notifications
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      Receive notifications via WhatsApp
                    </div>
                  </div>
                  <input type="checkbox" defaultChecked style={{ transform: 'scale(1.2)' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                      Push Notifications
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      Receive browser push notifications
                    </div>
                  </div>
                  <input type="checkbox" style={{ transform: 'scale(1.2)' }} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">
                Security Settings
              </h2>
              
              <div className="flex flex-col gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    className="w-full px-3 py-3 border border-input rounded-lg text-sm outline-none bg-background text-foreground focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    className="w-full px-3 py-3 border border-input rounded-lg text-sm outline-none bg-background text-foreground focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    className="w-full px-3 py-3 border border-input rounded-lg text-sm outline-none bg-background text-foreground focus:ring-2 focus:ring-ring"
                  />
                </div>

                <button className="px-6 py-3 bg-primary text-primary-foreground border-none rounded-lg text-sm font-medium cursor-pointer w-fit hover:bg-primary/90 transition-colors">
                  Update Password
                </button>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">
                Integrations
              </h2>
              
              <div className="flex flex-col gap-6">
                <div className="border border-border rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      Twilio SMS/WhatsApp
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Configure SMS and WhatsApp notifications
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-primary text-primary-foreground border-none rounded-md text-xs font-medium cursor-pointer hover:bg-primary/90 transition-colors">
                    Configure
                  </button>
                </div>

                <div className="border border-border rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      Email Service
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Configure email notifications
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-primary text-primary-foreground border-none rounded-md text-xs font-medium cursor-pointer hover:bg-primary/90 transition-colors">
                    Configure
                  </button>
                </div>

                <div className="border border-border rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      MongoDB Database
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Configure database connection
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-primary text-primary-foreground border-none rounded-md text-xs font-medium cursor-pointer hover:bg-primary/90 transition-colors">
                    Configure
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'flight-api' && user?.role === 'SUPER_ADMIN' && (
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Flight API (Aviationstack)
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Store your Aviationstack API key here. Used for auto-fetching flight details during transfer creation and sync. Free tier works for MVP.
              </p>
              <div className="flex flex-col gap-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Aviationstack API Key
                  </label>
                  <input
                    type="password"
                    value={flightApiKey}
                    onChange={(e) => setFlightApiKey(e.target.value)}
                    placeholder={flightApiConfigured ? '•••••••• (leave blank to keep current)' : 'Enter your API key'}
                    className="w-full px-3 py-3 border border-input rounded-lg text-sm outline-none bg-background text-foreground focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    API Plan
                  </label>
                  <Dropdown
                    value={flightApiPlan}
                    onChange={(e) => setFlightApiPlan(e.target?.value || flightApiPlan)}
                    options={[
                      { value: 'free', label: 'Free' },
                      { value: 'paid', label: 'Paid' }
                    ]}
                    placeholder="Select plan"
                    minWidth="100%"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveFlightApi}
                    disabled={flightApiSaving}
                    className="px-6 py-3 bg-primary text-primary-foreground border-none rounded-lg text-sm font-medium cursor-pointer w-fit hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {flightApiSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleTestFlightApi}
                    disabled={flightApiTesting}
                    className="px-6 py-3 bg-muted text-foreground border border-border rounded-lg text-sm font-medium cursor-pointer w-fit hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    {flightApiTesting ? 'Testing...' : 'Test API Connection'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Settings