/** @param {Record<string, unknown>} place */
export function getPlaceDedupKey(place) {
  const kakaoId = String(place?.kakaoId ?? place?.kakaoPlaceId ?? '').trim()
  if (kakaoId) {
    return `kakao:${kakaoId}`
  }
  const id = String(place?.id ?? '').trim()
  if (id.startsWith('kakao-')) {
    return `kakao:${id.slice(6)}`
  }
  if (id) {
    return `id:${id}`
  }
  const lat = Number(place?.lat)
  const lng = Number(place?.lng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `coord:${lat.toFixed(5)},${lng.toFixed(5)}`
  }
  return `name:${String(place?.enName ?? place?.koName ?? '')}`
}

/**
 * 동일 장소가 속한 컬렉션 목록(제목 기준 dedup).
 * @param {Record<string, unknown>} place
 * @param {Array<Record<string, unknown>>} allPlaces
 */
export function findCollectionsForPlace(place, allPlaces) {
  const key = getPlaceDedupKey(place)
  const seen = new Map()
  for (const p of allPlaces ?? []) {
    if (getPlaceDedupKey(p) !== key) {
      continue
    }
    const title = String(p._collectionTitle || p.category || '').trim()
    if (!title || seen.has(title)) {
      continue
    }
    seen.set(title, {
      title,
      type: p._collectionType,
      id: p._collectionId,
    })
  }
  return [...seen.values()]
}

/**
 * @param {string} placeId
 * @param {string} collectionTitle
 * @param {Array<Record<string, unknown>>} allPlaces
 */
export function findPlaceInCollection(placeId, collectionTitle, allPlaces) {
  return (
    (allPlaces ?? []).find(
      (p) =>
        p.id === placeId &&
        String(p._collectionTitle || p.category || '').trim() === collectionTitle,
    ) ?? null
  )
}

/**
 * Places 모드 장소 → 특정 큐레이션 내 컬렉션 장소 매칭.
 * @param {Record<string, unknown>} sourcePlace
 * @param {string} collectionTitle
 * @param {Array<Record<string, unknown>>} allPlaces
 */
export function findCurationPlaceForSource(sourcePlace, collectionTitle, allPlaces) {
  const title = String(collectionTitle ?? '').trim()
  if (!title) {
    return null
  }
  const key = getPlaceDedupKey(sourcePlace)
  return (
    (allPlaces ?? []).find(
      (p) =>
        getPlaceDedupKey(p) === key &&
        String(p._collectionTitle || p.category || '').trim() === title,
    ) ?? null
  )
}
