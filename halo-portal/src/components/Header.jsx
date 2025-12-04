import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Bell, User, ChevronDown, Settings, LogOut, Zap, Moon, Sun } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const Header = ({ onMenuClick }) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, logout, can } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const userMenuRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  const handleLogout = async () => {
    setUserMenuOpen(false) // Close the menu first
    try {
      const result = await logout()
      if (result.success) {
        // Navigation will be handled by the logout function
      }
    } catch (error) {
      toast.error('Logout failed')
    }
  }

  const handleProfileClick = () => {
    navigate('/profile')
    setUserMenuOpen(false)
  }

  const handleSettingsClick = () => {
    navigate('/settings')
    setUserMenuOpen(false)
  }

  return (
    <header className="h-16 bg-card border-b border-border flex items-center px-6 justify-between fixed top-0 left-0 right-0 z-30">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-md border-none bg-transparent cursor-pointer hover:bg-accent transition-colors"
        >
          <Menu size={20} className="text-muted-foreground" />
        </button>
        
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600">
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground m-0">
              HALO
            </h1>
            <p className="text-xs text-muted-foreground m-0">
              AI Logistic Operator
            </p>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md border-none bg-transparent cursor-pointer hover:bg-accent transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun size={20} className="text-muted-foreground" />
          ) : (
            <Moon size={20} className="text-muted-foreground" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button className="p-2 rounded-md border-none bg-transparent cursor-pointer hover:bg-accent transition-colors relative">
            <Bell size={20} className="text-muted-foreground" />
            <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center">
              3
            </span>
          </button>
        </div>

        {/* User Menu or Login Button */}
        {user ? (
          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-2 rounded-md border-none bg-transparent cursor-pointer hover:bg-accent transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-foreground">
                  {user?.profile?.firstName} {user?.profile?.lastName}
                </div>
                <div className="text-xs text-muted-foreground">
                  {user?.email}
                </div>
                <div className="text-[10px] text-muted-foreground/70 uppercase">
                  {user?.role?.replace('_', ' ')}
                </div>
              </div>
              <ChevronDown size={16} className="text-muted-foreground" />
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div className="absolute top-full right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg min-w-[200px] z-50">
                <div className="p-2">
                  <button 
                    onClick={handleProfileClick}
                    className="w-full px-3 py-2 border-none bg-transparent cursor-pointer rounded text-sm text-popover-foreground text-left flex items-center gap-2 hover:bg-accent transition-colors"
                  >
                    <User size={16} />
                    Profile
                  </button>
                  {can('manage_settings') && (
                    <button 
                      onClick={handleSettingsClick}
                      className="w-full px-3 py-2 border-none bg-transparent cursor-pointer rounded text-sm text-popover-foreground text-left flex items-center gap-2 hover:bg-accent transition-colors"
                    >
                      <Settings size={16} />
                      Settings
                    </button>
                  )}
                  <hr className="my-2 border-none border-t border-border" />
                  <button 
                    onClick={handleLogout}
                    className="w-full px-3 py-2 border-none bg-transparent cursor-pointer rounded text-sm text-destructive text-left flex items-center gap-2 hover:bg-accent transition-colors"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            Login
          </button>
        )}
      </div>
    </header>
  )
}

export default Header