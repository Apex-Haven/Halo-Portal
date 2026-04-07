import { useId } from 'react'
import { Sparkles } from 'lucide-react'

/** Same blue → indigo → violet diagonal as `public/halo-logo.svg` (objectBoundingBox matches any icon size). */
const GRAD = {
  x1: '18.75%',
  y1: '12.5%',
  x2: '81.25%',
  y2: '87.5%',
}

/**
 * HALO AI mark: classic Sparkles icon with the main HALO logo gradient (not the flat purple AI orb).
 */
export function HaloAiIcon({ size = 20, className = '' }) {
  const gradId = `halo-ai-grad-${useId().replace(/:/g, '')}`
  return (
    <span className={`inline-flex shrink-0 ${className}`}>
      <svg width={0} height={0} className="absolute overflow-hidden" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1={GRAD.x1} y1={GRAD.y1} x2={GRAD.x2} y2={GRAD.y2}>
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="50%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
      <Sparkles size={size} stroke={`url(#${gradId})`} className="shrink-0" fill="none" />
    </span>
  )
}
