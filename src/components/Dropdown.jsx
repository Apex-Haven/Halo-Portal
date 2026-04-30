import { useState, useEffect, useRef, useMemo, useCallback, useId } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, X } from 'lucide-react'

const Dropdown = ({
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  label,
  style = {},
  minWidth = '150px',
  searchable = false,
  searchPlaceholder = 'Search...',
  clearable = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const dropdownRef = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const searchInputRef = useRef(null)
  const optionRefs = useRef([])
  const listboxId = useId()

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

  // Reset search & highlight when menu closes; focus search when opening (searchable)
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setHighlightIndex(-1)
      return
    }
    setHighlightIndex(-1)
    if (searchable && searchInputRef.current) {
      const id = requestAnimationFrame(() => searchInputRef.current?.focus())
      return () => cancelAnimationFrame(id)
    }
  }, [isOpen, searchable])

  // Reset keyboard highlight when filter text changes
  useEffect(() => {
    setHighlightIndex(-1)
  }, [searchQuery])

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
      // Close on scroll only when scroll is outside the dropdown menu (so menu scroll works)
      const handleScroll = (e) => {
        if (menuRef.current && menuRef.current.contains(e.target)) return
        setIsOpen(false)
      }
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

  const filteredOptions = useMemo(() => {
    if (!searchable) return options
    const q = searchQuery.trim().toLowerCase()
    if (!q) return options
    return options.filter((opt) => {
      const lbl = String(opt.label ?? '').toLowerCase()
      const val = String(opt.value ?? '').toLowerCase()
      return lbl.includes(q) || val.includes(q)
    })
  }, [options, searchQuery, searchable])

  const handleSelect = useCallback((optionValue) => {
    onChange({ target: { name: name, value: optionValue } })
    setIsOpen(false)
  }, [name, onChange])

  // Scroll highlighted option into view
  useEffect(() => {
    if (!searchable || highlightIndex < 0) return
    const el = optionRefs.current[highlightIndex]
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [highlightIndex, searchable, filteredOptions.length])

  const handleSearchKeyDown = (e) => {
    e.stopPropagation()
    if (!searchable) return

    const len = filteredOptions.length
    if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
      return
    }

    if (len === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((prev) => {
        if (prev === -1) return 0
        if (prev < len - 1) return prev + 1
        return prev
      })
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((prev) => {
        if (prev === -1) return -1
        if (prev === 0) {
          queueMicrotask(() => searchInputRef.current?.focus())
          return -1
        }
        return prev - 1
      })
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightIndex >= 0 && filteredOptions[highlightIndex]) {
        handleSelect(filteredOptions[highlightIndex].value)
      } else if (len === 1) {
        handleSelect(filteredOptions[0].value)
      }
      return
    }
  }

  const listMaxHeight = searchable ? 'min(280px, 45vh)' : '200px'

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
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            {clearable && normalizedValue !== '' && (
              <button
                type="button"
                aria-label="Clear selection"
                className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange({ target: { name, value: '' } })
                  setIsOpen(false)
                }}
              >
                <X size={14} />
              </button>
            )}
            <ChevronDown
              size={16}
              className={`text-muted-foreground transition-transform ${
                isOpen ? 'rotate-180' : 'rotate-0'
              }`}
            />
          </div>
        </div>

        {isOpen && typeof document !== 'undefined' && createPortal(
          <div
            ref={menuRef}
            className="fixed bg-card border border-border rounded-lg shadow-lg z-[1002] flex flex-col overflow-hidden"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              width: `${menuPosition.width}px`,
              minWidth: menuPosition.width
            }}
          >
            {searchable && (
              <div
                className="p-2 border-b border-border bg-card shrink-0"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={searchPlaceholder}
                    className="w-full pl-8 pr-2 py-1.5 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-autocomplete="list"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-controls={listboxId}
                  />
                </div>
              </div>
            )}
            <div
              id={listboxId}
              role="listbox"
              className="overflow-y-auto overscroll-contain"
              style={{ maxHeight: listMaxHeight }}
            >
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                  {searchable && searchQuery.trim() ? 'No matches' : 'No options'}
                </div>
              ) : (
                filteredOptions.map((option, index) => {
                  const isSelectedValue = normalizeValue(value) === normalizeValue(option.value)
                  const isHighlighted = searchable && index === highlightIndex
                  return (
                    <div
                      key={`opt-${index}-${normalizeValue(option.value)}`}
                      ref={(el) => { optionRefs.current[index] = el }}
                      role="option"
                      aria-selected={isSelectedValue}
                      onMouseEnter={() => searchable && setHighlightIndex(index)}
                      onClick={() => handleSelect(option.value)}
                      className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                        isHighlighted
                          ? 'bg-accent text-accent-foreground'
                          : isSelectedValue
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      {option.label}
                    </div>
                  )
                })
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  )
}

export default Dropdown
