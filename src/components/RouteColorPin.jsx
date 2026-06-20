import { RouteColorIndicator } from './RouteColorIndicator'
import './RouteColorPin.css'

/**
 * All Tours 모드 — Route 컬렉션 소속 장소용 색상 핀(번호 없음).
 */
export function RouteColorPin({ color, label, onClick, selected = false }) {
  const aria = label ? `${label} (route)` : 'Route stop'

  return (
    <button
      type="button"
      className={`route-color-pin${selected ? ' selected' : ''}`}
      onClick={onClick}
      title={aria}
      aria-label={aria}
    >
      <RouteColorIndicator color={color} size="map" selected={selected} />
    </button>
  )
}

export default RouteColorPin
