import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleToggleCollapse = () => {
    if (isMobile) {
      // On mobile, toggle sidebar open/closed
      setSidebarOpen(!sidebarOpen)
    } else {
      // On desktop, toggle collapsed state
      setSidebarCollapsed(!sidebarCollapsed)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Fixed Header */}
      <Header onMenuClick={handleToggleCollapse} />
      
      {/* Main Container Below Header */}
      <div className="flex flex-1 mt-16 overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed top-16 left-0 right-0 bottom-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        {sidebarOpen && (
          <div
            className={`${isMobile ? 'fixed' : 'relative'} ${isMobile ? 'top-16' : ''} left-0 bottom-0 flex-shrink-0 ${isMobile ? 'z-50' : 'z-10'} overflow-hidden transition-all duration-300 ease-in-out ${
              sidebarCollapsed && !isMobile ? 'w-20' : 'w-64'
            } ${isMobile ? 'shadow-lg' : ''} bg-card border-r border-border`}
          >
            <Sidebar 
              onClose={() => setSidebarOpen(false)} 
              isMobile={isMobile}
              isCollapsed={sidebarCollapsed && !isMobile}
              onToggleCollapse={handleToggleCollapse}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out">
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

export default Layout