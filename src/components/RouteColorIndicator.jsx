import './RouteColorIndicator.css'

/** Symmetric map-marker — round head, short tail, centered on x=14. */
const PIN_PATH =
  'M14 27.5 C14 27.5 4.8 19 4.8 11.5 C4.8 5.5 8.8 2.5 14 2.5 C19.2 2.5 23.2 5.5 23.2 11.5 C23.2 19 14 27.5 14 27.5 Z'

/**
 * Route / Spots collection color — picker list and map pins share the same marker shape.
 * @param {{ color: string, size?: 'sm' | 'md' | 'map', className?: string, selected?: boolean }} props
 */
export function RouteColorIndicator({ color, size = 'sm', className = '', selected = false }) {
  return (
    <span
      className={`route-color-indicator route-color-indicator--${size}${selected ? ' selected' : ''}${className ? ` ${className}` : ''}`}
      style={{ '--route-color': color }}
      aria-hidden="true"
    >
      <svg className="route-color-indicator-svg" viewBox="0 0 28 32" focusable="false">
        <path className="route-color-indicator-path" d={PIN_PATH} />
      </svg>
    </span>
  )
}

export default RouteColorIndicator
