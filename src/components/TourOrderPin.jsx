import { getPinColor } from '../data/pinDesigns'
import './TourOrderPin.css'

/**
 * 큐레이션(테마) 모드 전용 — 방문 순서 번호 핀.
 */
export function TourOrderPin({ order, pinId, label, onClick, selected = false }) {
  const color = getPinColor(pinId)
  const displayOrder = String(order)
  const aria = label
    ? `Stop ${order}: ${label}`
    : `Stop ${order}`

  return (
    <button
      type="button"
      className={`tour-order-pin${selected ? ' selected' : ''}`}
      style={{ '--tour-pin-color': color }}
      onClick={onClick}
      title={aria}
      aria-label={aria}
    >
      <span className="tour-order-pin-shape" aria-hidden>
        <span className={`tour-order-pin-num${displayOrder.length > 1 ? ' wide' : ''}`}>
          {displayOrder}
        </span>
      </span>
    </button>
  )
}

export default TourOrderPin
