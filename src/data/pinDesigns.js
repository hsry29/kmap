/**
 * 큐레이션 컬렉션이 고를 수 있는 핀(마커) 디자인 목록.
 * marker === null 이면 카카오 기본 마커를 사용.
 * 새 SVG를 public/ 에 추가하고 여기 항목만 늘리면 선택지가 늘어납니다.
 */
const PIN_SIZE = { width: 40, height: 48 }
const PIN_ANCHOR = { x: 20, y: 48 }

function svgMarker(src) {
  return { src, size: PIN_SIZE, options: { offset: PIN_ANCHOR } }
}

export const PIN_DESIGNS = [
  { id: 'default', label: 'Default', color: '#2563eb', marker: null },
  { id: 'kpop', label: 'Blue · K-POP', color: '#1e3a8a', marker: svgMarker('/marker-kpop.svg') },
  { id: 'history', label: 'Brown · History', color: '#92400e', marker: svgMarker('/marker-history.svg') },
  { id: 'hiking', label: 'Green · Hiking', color: '#047857', marker: svgMarker('/marker-hiking.svg') },
  { id: 'demon', label: 'Red · Demon', color: '#dc2626', marker: svgMarker('/marker-demon.svg') },
  { id: 'food', label: 'Orange · Food', color: '#ea580c', marker: svgMarker('/marker-food.svg') },
]

export const PIN_DESIGN_MAP = Object.fromEntries(PIN_DESIGNS.map((d) => [d.id, d]))

export const DEFAULT_PIN_ID = 'default'

/** 핀 id → MapMarker image 설정(없으면 null = 기본 마커). */
export function getPinMarker(pinId) {
  return PIN_DESIGN_MAP[pinId]?.marker ?? null
}

/** 핀 id → 미리보기용 색상. */
export function getPinColor(pinId) {
  return PIN_DESIGN_MAP[pinId]?.color ?? PIN_DESIGN_MAP[DEFAULT_PIN_ID].color
}

/** Route list emoji keyed by pin design id. */
export const PIN_EMOJI = {
  default: '⭐',
  kpop: '🎵',
  history: '🏛',
  hiking: '🚶',
  demon: '👹',
  food: '🍽',
}

/** @param {string | null | undefined} pinId */
export function getPinEmoji(pinId) {
  const id = String(pinId ?? DEFAULT_PIN_ID).trim() || DEFAULT_PIN_ID
  return PIN_EMOJI[id] ?? PIN_EMOJI.default
}
