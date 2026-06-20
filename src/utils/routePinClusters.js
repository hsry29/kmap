import { getPlaceDedupKey } from './placeCollections.js'

/** Same-location threshold for overlapping route pins (~40 m). */
export const ROUTE_PIN_CLUSTER_RADIUS_METERS = 40

const EARTH_RADIUS_M = 6371000

function toRad(deg) {
  return (deg * Math.PI) / 180
}

/** @returns {number} */
export function haversineMeters(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a))
}

/** @param {Record<string, unknown>} a @param {Record<string, unknown>} b */
export function placesShareLocation(a, b, radiusMeters = ROUTE_PIN_CLUSTER_RADIUS_METERS) {
  if (getPlaceDedupKey(a) === getPlaceDedupKey(b)) {
    return true
  }
  const lat1 = Number(a?.lat)
  const lng1 = Number(a?.lng)
  const lat2 = Number(b?.lat)
  const lng2 = Number(b?.lng)
  if (!Number.isFinite(lat1) || !Number.isFinite(lng1) || !Number.isFinite(lat2) || !Number.isFinite(lng2)) {
    return false
  }
  return haversineMeters(lat1, lng1, lat2, lng2) <= radiusMeters
}

/**
 * Group route pins that share the same place or sit within cluster radius.
 * @param {Array<Record<string, unknown>>} places
 */
export function groupPlacesByLocation(places, radiusMeters = ROUTE_PIN_CLUSTER_RADIUS_METERS) {
  const list = (places ?? []).filter(
    (p) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng)),
  )
  const used = new Set()
  const clusters = []

  for (let i = 0; i < list.length; i += 1) {
    if (used.has(i)) {
      continue
    }
    const cluster = [list[i]]
    used.add(i)

    for (let j = i + 1; j < list.length; j += 1) {
      if (used.has(j)) {
        continue
      }
      const matchesCluster = cluster.some((member) => placesShareLocation(member, list[j], radiusMeters))
      if (matchesCluster) {
        cluster.push(list[j])
        used.add(j)
      }
    }

    const lat =
      cluster.reduce((sum, place) => sum + Number(place.lat), 0) / cluster.length
    const lng =
      cluster.reduce((sum, place) => sum + Number(place.lng), 0) / cluster.length

    clusters.push({
      key: cluster
        .map((place) => getPlaceDedupKey(place))
        .sort()
        .join('|'),
      places: cluster,
      lat,
      lng,
    })
  }

  return clusters
}

/**
 * Lookup map: `${collectionId}-${placeId}` → cluster info for overlap pickers.
 * @param {Array<Record<string, unknown>>} places
 */
export function buildClusterLookupByPlaceKey(places) {
  const map = new Map()
  for (const cluster of groupPlacesByLocation(places)) {
    const collectionOptions = buildClusterRouteOptions(cluster.places)
    for (const place of cluster.places) {
      map.set(`${place._collectionId}-${place.id}`, {
        lat: Number(place.lat),
        lng: Number(place.lng),
        collectionOptions,
      })
    }
  }
  return map
}

/**
 * Unique collection options for a co-located cluster (one entry per collection).
 * @param {Array<Record<string, unknown>>} places
 */
export function buildClusterRouteOptions(places) {
  const seen = new Map()
  for (const place of places ?? []) {
    const title = String(place._collectionTitle || place.category || '').trim()
    if (!title || seen.has(title)) {
      continue
    }
    seen.set(title, {
      title,
      place,
      pin: place._pin,
      color: place._collectionColor,
      collectionId: place._collectionId,
      tourOrder: place._tourOrder ?? null,
    })
  }
  return [...seen.values()].sort((a, b) => {
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
    return String(a.title).localeCompare(String(b.title))
  })
}
