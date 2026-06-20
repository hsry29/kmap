/** @typedef {'route' | 'spots'} CollectionType */

export const COLLECTION_TYPE = {
  ROUTE: 'route',
  SPOTS: 'spots',
}

export const DEFAULT_COLLECTION_TYPE = COLLECTION_TYPE.ROUTE

/** @returns {CollectionType} */
export function normalizeCollectionType(value) {
  const s = String(value ?? '').trim().toLowerCase()
  if (s === COLLECTION_TYPE.SPOTS || s === 'spot') {
    return COLLECTION_TYPE.SPOTS
  }
  return COLLECTION_TYPE.ROUTE
}

/** @param {{ type?: unknown } | null | undefined} collection */
export function isRouteCollection(collection) {
  return normalizeCollectionType(collection?.type) === COLLECTION_TYPE.ROUTE
}

/** @param {{ type?: unknown } | null | undefined} collection */
export function isSpotsCollection(collection) {
  return normalizeCollectionType(collection?.type) === COLLECTION_TYPE.SPOTS
}

/** 사용자·관리자 UI 뱃지 */
export function getCollectionTypeMeta(type) {
  const normalized = normalizeCollectionType(type)
  if (normalized === COLLECTION_TYPE.SPOTS) {
    return { type: normalized, label: 'SPOTS', icon: '⭐', shortLabel: 'Spots' }
  }
  return { type: normalized, label: 'ROUTE', icon: '🛣', shortLabel: 'Route' }
}
