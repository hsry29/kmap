import { createPortal } from 'react-dom'
import { getPinEmoji } from '../data/pinDesigns'
import { RouteColorIndicator } from './RouteColorIndicator'
import './RouteClusterPicker.css'

const COPY = {
  route: {
    title: 'Shared stop',
    subtitle: (count) =>
      `This place appears in ${count} route${count === 1 ? '' : 's'}`,
    viewLabel: 'View',
  },
  spot: {
    title: 'Shared location',
    subtitle: (count) =>
      `This place appears in ${count} spot collection${count === 1 ? '' : 's'}`,
    viewLabel: 'View Collection',
  },
}

/**
 * Shared overlap picker — compact floating card (desktop) or bottom sheet (mobile).
 * @param {{ title: string, place: Record<string, unknown>, pin?: string, color?: string, tourOrder?: number | null, collectionId?: string }[]} routes
 * @param {'route' | 'spot'} variant
 */
export function RouteClusterPicker({
  routes,
  variant = 'route',
  isMobile = false,
  onSelect,
  onClose,
}) {
  if (!routes?.length) {
    return null
  }

  const copy = COPY[variant] ?? COPY.route
  const count = routes.length
  const sorted = [...routes].sort((a, b) => {
    if (variant === 'route') {
      const ao = Number(a.tourOrder)
      const bo = Number(b.tourOrder)
      const aOk = Number.isFinite(ao)
      const bOk = Number.isFinite(bo)
      if (aOk && bOk && ao !== bo) {
        return ao - bo
      }
      if (aOk !== bOk) {
        return aOk ? -1 : 1
      }
    }
    return String(a.title).localeCompare(String(b.title))
  })

  const content = (
    <section
      className={`route-cluster-picker${isMobile ? ' route-cluster-picker--sheet' : ' route-cluster-picker--floating'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="route-cluster-picker-title"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="route-cluster-picker-header">
        <h2 id="route-cluster-picker-title" className="route-cluster-picker-title">
          {copy.title}
        </h2>
        <p className="route-cluster-picker-subtitle">{copy.subtitle(count)}</p>
      </header>
      <ul className="route-cluster-picker-list">
        {sorted.map((route) => {
          const step = Number(route.tourOrder)
          const stepLabel = Number.isFinite(step) ? String(step) : '–'
          return (
            <li key={route.collectionId ?? route.title}>
              <button
                type="button"
                className={`route-cluster-picker-row${variant === 'spot' ? ' route-cluster-picker-row--spot' : ''}`}
                onClick={() => onSelect?.(route)}
              >
                {variant === 'spot' ? (
                  <span className="route-cluster-picker-emoji" aria-hidden="true">
                    {getPinEmoji(route.pin)}
                  </span>
                ) : (
                  <span className="route-cluster-picker-step">{stepLabel}</span>
                )}
                {variant === 'route' ? <RouteColorIndicator color={route.color} size="sm" /> : null}
                <span className="route-cluster-picker-name">{route.title}</span>
                <span className="route-cluster-picker-view">{copy.viewLabel}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <button type="button" className="route-cluster-picker-close" onClick={onClose}>
        Close
      </button>
    </section>
  )

  if (isMobile) {
    return createPortal(
      <div className="route-cluster-picker-backdrop" role="presentation" onClick={onClose}>
        {content}
      </div>,
      document.body,
    )
  }

  return content
}

export default RouteClusterPicker
