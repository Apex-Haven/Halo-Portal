import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

const Dropdown = ({ 
  name,
  value, 
  onChange, 
  options = [], 
  placeholder = 'Select...', 
  label,
  style = {},
  minWidth = '150px'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 })
  const dropdownRef = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  // Calculate menu position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 4, // Fixed positioning uses viewport coordinates
        left: rect.left,
        width: rect.width
      })
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target
      const isClickInsideDropdown = dropdownRef.current?.contains(target)
      const isClickInsideMenu = menuRef.current?.contains(target)
      
      if (!isClickInsideDropdown && !isClickInsideMenu) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // Also close on scroll to prevent misalignment
      const handleScroll = () => setIsOpen(false)
      window.addEventListener('scroll', handleScroll, true)
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        window.removeEventListener('scroll', handleScroll, true)
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Normalize values for comparison (handle ObjectId vs string)
  const normalizeValue = (val) => {
    if (val === null || val === undefined || val === '') return ''
    const str = String(val).trim()
    return str
  }

  const normalizedValue = normalizeValue(value)
  const selectedOption = options.find(opt => {
    const optValue = normalizeValue(opt.value)
    return optValue === normalizedValue
  })

  const handleSelect = (optionValue) => {
    onChange({ target: { name: name, value: optionValue } })
    setIsOpen(false)
  }

  return (
    <div style={{ position: 'relative', minWidth, ...style }} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <div
          ref={triggerRef}
          onClick={() => setIsOpen(!isOpen)}
          className={`px-3 py-2 border border-input rounded-lg text-sm outline-none cursor-pointer bg-background text-foreground flex items-center justify-between transition-all ${
            isOpen ? 'border-ring ring-2 ring-ring/20' : 'hover:border-primary/60 focus:border-ring'
          }`}
          style={{ minWidth }}
        >
          <span className={`truncate ${selectedOption && normalizedValue !== '' ? 'text-foreground' : 'text-muted-foreground'}`}>
            {(selectedOption && normalizedValue !== '') ? selectedOption.label : placeholder}
          </span>
          <ChevronDown 
            size={16} 
            className={`text-muted-foreground transition-transform flex-shrink-0 ml-2 ${
              isOpen ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </div>

        {isOpen && typeof document !== 'undefined' && createPortal(
          <div 
            ref={menuRef}
            className="fixed bg-card border border-border rounded-lg shadow-lg z-[1002] max-h-[200px] overflow-y-auto"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              width: `${menuPosition.width}px`,
              minWidth: menuPosition.width
            }}
          >
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                  normalizeValue(value) === normalizeValue(option.value)
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {option.label}
              </div>
            ))}
          </div>,
          document.body
        )}
      </div>
    </div>
  )
}

export default Dropdown

