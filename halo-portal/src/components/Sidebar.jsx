import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import {
  LayoutDashboard,
  Truck,
  Navigation,
  Users,
  Plane,
  Settings,
  BarChart3,
  Search,
  Shield,
  Car,
  UserCheck,
  MapPin
} from 'lucide-react'

// Define all navigation items in a flat list
const navigationItems = [
  { 
    name: 'Dashboard', 
    href: '/', 
    icon: LayoutDashboard,
    roles: ['SUPER_ADMIN', 'ADMIN']
  },
  { 
    name: 'Transfers', 
    href: '/transfers', 
    icon: Truck,
    roles: ['SUPER_ADMIN', 'ADMIN', 'VENDOR', 'CLIENT', 'DRIVER', 'TRAVELER']
  },
  {
    name: 'Flight Tracking',
    href: '/flight-tracking',
    icon: Search,
    roles: ['SUPER_ADMIN', 'ADMIN', 'VENDOR', 'CLIENT', 'DRIVER', 'TRAVELER']
  },
  {
    name: 'Track Transfer',
    href: '/tracking',
    icon: Navigation,
    roles: ['SUPER_ADMIN', 'ADMIN', 'VENDOR', 'CLIENT', 'DRIVER', 'TRAVELER']
  },
  { 
    name: 'Flights', 
    href: '/flights', 
    icon: Plane,
    roles: ['SUPER_ADMIN', 'ADMIN', 'CLIENT', 'TRAVELER']
  },
  { 
    name: 'Travel Advisory', 
    href: '/travel-advisory', 
    icon: MapPin,
    roles: ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER']
  },
  { 
    name: 'Vendors', 
    href: '/vendors', 
    icon: Users,
    roles: ['SUPER_ADMIN', 'ADMIN']
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
  const { user, isRole } = useAuth()
  const { theme } = useTheme()

  // Filter navigation items based on user role
  // ADMIN and SUPER_ADMIN can see everything
  // For public pages (no user), show only public items like Track Transfer
  const allowedItems = navigationItems.filter(item => {
    if (!user) {
      // Public access - only show Track Transfer
      return item.href === '/tracking'
    }
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') {
      return true // Show all items for admins
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
                `flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} ${isCollapsed ? 'p-3' : 'px-4 py-3'} text-sm font-semibold rounded-lg no-underline transition-all duration-300 relative min-h-12 w-full mt-1 ${
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground'
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
            <p className="m-0">HALO v1.0.0</p>
            <p className="mt-1 m-0">© 2025 Apex</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sidebar