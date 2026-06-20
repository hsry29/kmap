import { isRouteCollection, isSpotsCollection } from './collectionTypes'

/** 컬렉션별 자동 할당 색상 (충분히 구분되는 팔레트). */
export const ROUTE_COLLECTION_COLORS = [
  '#2563eb', // blue
  '#059669', // green
  '#ea580c', // orange
  '#7c3aed', // purple
  '#db2777', // pink
  '#0891b2', // cyan
  '#ca8a04', // amber
  '#dc2626', // red
  '#4f46e5', // indigo
  '#0d9488', // teal
  '#c026d3', // fuchsia
  '#65a30d', // lime
]

/**
 * Route 컬렉션 id → 색상 Map. 제목 가나다/알파벳 순으로 팔레트 순환 할당(안정적).
 * @param {Array<{ id?: string, title?: string, type?: unknown, places?: unknown[] }>} collections
 */
export function buildRouteColorMap(collections) {
  const routes = (collections ?? [])
    .filter((col) => isRouteCollection(col) && Array.isArray(col.places) && col.places.length > 0)
    .sort((a, b) => String(a.title ?? '').localeCompare(String(b.title ?? '')))

  const map = new Map()
  routes.forEach((col, index) => {
    if (col.id) {
      map.set(col.id, ROUTE_COLLECTION_COLORS[index % ROUTE_COLLECTION_COLORS.length])
    }
  })
  return map
}

/**
 * @param {Map<string, string>} colorMap
 * @param {string | undefined} collectionId
 */
export function getRouteColorFromMap(colorMap, collectionId) {
  if (!collectionId || !colorMap) {
    return ROUTE_COLLECTION_COLORS[0]
  }
  return colorMap.get(collectionId) ?? ROUTE_COLLECTION_COLORS[0]
}

/**
 * Spots 컬렉션 id → 색상 Map. 제목 가나다/알파벳 순으로 팔레트 순환 할당(안정적).
 * @param {Array<{ id?: string, title?: string, type?: unknown, places?: unknown[] }>} collections
 */
export function buildSpotsColorMap(collections) {
  const spots = (collections ?? [])
    .filter((col) => isSpotsCollection(col) && Array.isArray(col.places) && col.places.length > 0)
    .sort((a, b) => String(a.title ?? '').localeCompare(String(b.title ?? '')))

  const map = new Map()
  spots.forEach((col, index) => {
    if (col.id) {
      map.set(col.id, ROUTE_COLLECTION_COLORS[index % ROUTE_COLLECTION_COLORS.length])
    }
  })
  return map
}

/**
 * @param {Map<string, string>} colorMap
 * @param {string | undefined} collectionId
 */
export function getSpotsColorFromMap(colorMap, collectionId) {
  return getRouteColorFromMap(colorMap, collectionId)
}
