import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Bell, User, ChevronDown, Settings, LogOut, Zap, Moon, Sun, Truck, UserPlus, FileText, MessageCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useChat } from '../contexts/ChatContext'
import { useTheme } from '../contexts/ThemeContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { inAppNotificationApi } from '../services/notificationService'

const Header = ({ onMenuClick }) => {
  const { setOpen: openChat } = useChat()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifLoading, setNotifLoading] = useState(false)
  const { user, logout, can } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const userMenuRef = useRef(null)
  const notifRef = useRef(null)

  // Fetch unread count when user is present
  useEffect(() => {
    if (!user) {
      setUnreadCount(0)
      return
    }
    inAppNotificationApi.getUnreadCount().then(setUnreadCount).catch(() => setUnreadCount(0))
  }, [user])

  // When notification dropdown opens, fetch list
  useEffect(() => {
    if (!notifOpen || !user) return
    setNotifLoading(true)
    inAppNotificationApi.getList({ limit: 20 })
      .then((data) => {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount ?? 0)
      })
      .catch(() => setNotifications([]))
      .finally(() => setNotifLoading(false))
  }, [notifOpen, user])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false)
      }
    }

    if (userMenuOpen || notifOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen, notifOpen])

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

  const handleNotificationClick = (n) => {
    const transferId = n.transfer_id
    const action = n.metadata?.action || 'view'
    inAppNotificationApi.markRead(n._id).then(() => {
      setUnreadCount((c) => Math.max(0, c - 1))
      setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)))
    }).catch(() => {})
    setNotifOpen(false)
    navigate(`/transfers?transferId=${encodeURIComponent(transferId)}&notificationAction=${encodeURIComponent(action)}`)
  }

  const handleMarkAllRead = () => {
    inAppNotificationApi.markAllRead().then(() => {
      setUnreadCount(0)
      setNotifications((prev) => prev.map((x) => ({ ...x, read: true })))
    }).catch(() => {})
  }

  const formatNotifTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }

  const getNotifIcon = (type) => {
    switch (type) {
      case 'transfer_created': return <FileText size={16} className="text-primary" />
      case 'vendor_assigned': return <Truck size={16} className="text-primary" />
      case 'driver_assigned': return <UserPlus size={16} className="text-primary" />
      default: return <Bell size={16} className="text-muted-foreground" />
    }
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
        {/* HALO AI Chat - in navbar to avoid blocking pagination */}
        {user && (
          <button
            onClick={() => openChat(true)}
            className="p-2 rounded-md border-none bg-transparent cursor-pointer hover:bg-accent transition-colors"
            title="HALO AI Chat"
            aria-label="Open HALO AI"
          >
            <MessageCircle size={20} className="text-muted-foreground" />
          </button>
        )}

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

        {/* Notifications - only when logged in */}
        {user && (
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 rounded-md border-none bg-transparent cursor-pointer hover:bg-accent transition-colors relative"
              aria-label="Notifications"
            >
              <Bell size={20} className="text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute top-full right-0 mt-2 w-[320px] max-h-[400px] overflow-hidden bg-popover border border-border rounded-lg shadow-lg z-50 flex flex-col">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <span className="text-sm font-semibold text-foreground">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-xs text-primary hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto max-h-[320px]">
                  {notifLoading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                  ) : notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n._id}
                        type="button"
                        onClick={() => handleNotificationClick(n)}
                        className={`w-full text-left px-3 py-2.5 flex gap-2 border-none cursor-pointer transition-colors hover:bg-accent ${!n.read ? 'bg-primary/5' : ''}`}
                      >
                        <div className="flex-shrink-0 mt-0.5">{getNotifIcon(n.type)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-foreground truncate">{n.title}</div>
                          {n.message && (
                            <div className="text-xs text-muted-foreground truncate mt-0.5">{n.message}</div>
                          )}
                          <div className="text-[10px] text-muted-foreground/80 mt-1">{formatNotifTime(n.created_at)}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

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