import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const Drawer = ({ 
  isOpen, 
  onClose, 
  title, 
  subtitle,
  children, 
  position = 'right', // 'right' | 'left' | 'top' | 'bottom'
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton = true,
  closeOnBackdropClick = true
}) => {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full'
  }

  const positionClasses = {
    right: {
      container: 'right-0 top-0 bottom-0',
      animation: {
        initial: { x: '100%' },
        animate: { x: 0 },
        exit: { x: '100%' }
      }
    },
    left: {
      container: 'left-0 top-0 bottom-0',
      animation: {
        initial: { x: '-100%' },
        animate: { x: 0 },
        exit: { x: '-100%' }
      }
    },
    top: {
      container: 'top-0 left-0 right-0',
      animation: {
        initial: { y: '-100%' },
        animate: { y: 0 },
        exit: { y: '-100%' }
      }
    },
    bottom: {
      container: 'bottom-0 left-0 right-0',
      animation: {
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' }
      }
    }
  }

  const pos = positionClasses[position]

  const drawerContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`fixed bg-black/50 z-[1000] inset-0`}
            onClick={closeOnBackdropClick ? onClose : undefined}
          />

          {/* Drawer */}
          <motion.div
            initial={pos.animation.initial}
            animate={pos.animation.animate}
            exit={pos.animation.exit}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed ${pos.container} ${sizeClasses[size]} w-full bg-card shadow-2xl z-[1001] flex flex-col ${
              position === 'right' ? 'border-l border-border' :
              position === 'left' ? 'border-r border-border' :
              position === 'top' ? 'border-b border-border' :
              'border-t border-border'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
                <div className="flex-1">
                  {title && (
                    <h2 className="text-2xl font-bold theme-text-heading m-0">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className="text-sm theme-text-muted mt-1 m-0">
                      {subtitle}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="ml-4 p-2 rounded-lg bg-transparent hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors flex items-center justify-center"
                    aria-label="Close drawer"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-0 min-h-0">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  // Render drawer in a portal to avoid parent container padding issues
  return typeof document !== 'undefined' 
    ? createPortal(drawerContent, document.body)
    : drawerContent
}

export default Drawer

