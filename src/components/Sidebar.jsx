import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useFeatures, FEATURE_KEYS } from '../contexts/FeaturesContext'
import {
  LayoutDashboard,
  Truck,
  Navigation,
  Plane,
  Settings,
  BarChart3,
  Shield,
  Car,
  UserCheck,
  Briefcase,
  MapPin,
  Activity
} from 'lucide-react'

// Define all navigation items in a flat list
const navigationItems = [
  { 
    name: 'Dashboard', 
    href: '/', 
    icon: LayoutDashboard,
    roles: ['SUPER_ADMIN', 'ADMIN', 'CLIENT']
  },
  { 
    name: 'Operations', 
    href: '/operations', 
    icon: Activity,
    roles: ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER']
  },
  { 
    name: 'Transfers', 
    href: '/transfers', 
    icon: Truck,
    roles: ['SUPER_ADMIN', 'ADMIN', 'VENDOR', 'CLIENT', 'DRIVER', 'TRAVELER']
  },
  {
    name: 'Track Transfer',
    href: '/tracking',
    icon: Navigation,
    roles: ['SUPER_ADMIN', 'ADMIN', 'CLIENT', 'DRIVER', 'TRAVELER']
  },
  { 
    name: 'Flights', 
    href: '/flights', 
    icon: Plane,
    roles: ['SUPER_ADMIN', 'ADMIN', 'CLIENT', 'TRAVELER'],
    featureKey: FEATURE_KEYS.FLIGHTS
  },
  { 
    name: 'Hotels & Advisory', 
    href: '/travel-advisory', 
    icon: MapPin,
    roles: ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER'],
    featureKey: FEATURE_KEYS.HOTELS_ADVISORY
  },
  { 
    name: 'User Management', 
    href: '/user-management', 
    icon: Shield,
    roles: ['SUPER_ADMIN', 'ADMIN']
  },
  { 
    name: 'Travelers', 
    href: '/travelers', 
    icon: UserCheck,
    roles: ['CLIENT']
  },
  {
    name: 'Companies',
    href: '/companies',
    icon: Briefcase,
    roles: ['SUPER_ADMIN', 'ADMIN', 'CLIENT']
  },
  { 
    name: 'Drivers', 
    href: '/drivers', 
    icon: Car,
    roles: ['VENDOR']
  },
  { 
    name: 'Reports', 
    href: '/reports', 
    icon: BarChart3,
    roles: ['SUPER_ADMIN', 'ADMIN']
  },
  { 
    name: 'Settings', 
    href: '/settings', 
    icon: Settings,
    roles: ['SUPER_ADMIN', 'ADMIN']
  }
]

const Sidebar = ({ onClose, isMobile, isCollapsed, onToggleCollapse }) => {
  const { user } = useAuth()
  const { isFeatureEnabled } = useFeatures()

  // Filter navigation items based on user role and feature flags
  const allowedItems = navigationItems.filter(item => {
    if (!user) {
      return item.href === '/tracking'
    }
    // Flights: always visible for CLIENT and ADMIN roles (enabled by default)
    const isFlightsForClientOrAdmin = item.featureKey === FEATURE_KEYS.FLIGHTS &&
      ['SUPER_ADMIN', 'ADMIN', 'CLIENT'].includes(user?.role)
    if (item.featureKey && !isFlightsForClientOrAdmin && !isFeatureEnabled(item.featureKey)) {
      return false
    }
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') {
      return true
    }
    return item.roles.includes(user?.role)
  })

  return (
    <div className="flex flex-col h-full bg-card border-r border-border overflow-hidden">

      {/* Navigation */}
      <nav className={`flex-1 ${isCollapsed ? 'px-1' : 'px-2'} overflow-y-auto overflow-x-hidden flex flex-col gap-1 transition-all duration-300 ease-in-out`}>
        {allowedItems.map((item) => {
          const ItemIcon = item.icon
          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={isMobile ? onClose : undefined}
              title={isCollapsed ? item.name : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} ${isCollapsed ? 'p-3' : 'px-4 py-3'} text-sm font-semibold rounded-lg no-underline transition-all duration-300 relative min-h-12 w-full mt-1 border-2 ${
                  isActive
                    ? 'border-primary text-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                    : 'border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-border'
                }`
              }
            >
              <ItemIcon 
                size={22} 
                className={`${isCollapsed ? 'mr-0' : 'mr-3'} transition-all duration-300`}
              />
              <span className={`${isCollapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-[200px]'} overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'pointer-events-none' : 'pointer-events-auto'}`}>
                {item.name}
              </span>
            </NavLink>
          )
        })}
        
        {/* Bottom Spacer */}
        {isCollapsed && <div className="flex-1 min-h-5" />}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="text-[11px] text-muted-foreground text-center font-medium">
            <p className="m-0">HALO v2.0.0</p>
            <p className="mt-1 m-0">© 2026 Apex</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sidebar