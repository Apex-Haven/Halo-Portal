import { useState } from 'react'
import { Settings as SettingsIcon, User, Bell, Shield, Database, Mail, Phone } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import Dropdown from '../components/Dropdown'

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general')

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'integrations', label: 'Integrations', icon: Database }
  ]

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
        </div>
      </div>
    </div>
  )
}

export default Settings