import { AREA_COORDS } from '../data/areaCoords'
import { isPlaceHiddenFromSearch } from './hiddenPlaces'

/** Places mode: closer zoom (~50 m) so Food/Cafes/Stay pins feel like nearby search. */
export const PLACES_AREA_MAP_LEVEL = 3

/**
 * @param {typeof AREA_COORDS[string]} area
 * @param {'places' | 'explore' | 'routes' | string} mode
 */
export function resolveAreaMapLevel(area, mode) {
  if (mode === 'places') {
    return PLACES_AREA_MAP_LEVEL
  }
  return area.level
}

/** @param {string} query */
function normalizeQuery(query) {
  return String(query ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/**
 * @param {string} query
 * @returns {{ key: string, area: typeof AREA_COORDS[string] } | null}
 */
export function matchAreaQuery(query) {
  const q = normalizeQuery(query)
  if (!q) {
    return null
  }

  /** @type {Array<{ key: string, area: typeof AREA_COORDS[string], score: number }>} */
  const candidates = []

  for (const [key, area] of Object.entries(AREA_COORDS)) {
    const keyNorm = key.toLowerCase()
    if (q === keyNorm) {
      return { key, area }
    }

    const aliasList = [keyNorm, ...(area.aliases ?? []).map((a) => String(a).toLowerCase())]
    for (const alias of aliasList) {
      if (q === alias) {
        return { key, area }
      }
      if (alias.startsWith(q) && q.length >= 3) {
        candidates.push({ key, area, score: 100 - alias.length })
      } else if (q.startsWith(alias) && alias.length >= 3) {
        candidates.push({ key, area, score: 90 - alias.length })
      } else if (q.length >= 4 && (alias.includes(q) || q.includes(alias))) {
        candidates.push({ key, area, score: 50 - Math.abs(alias.length - q.length) })
      }
    }
  }

  if (candidates.length === 0) {
    return null
  }

  candidates.sort((a, b) => b.score - a.score)
  const best = candidates[0]
  return { key: best.key, area: best.area }
}

/** @param {Record<string, unknown>} place */
function curatedSearchHaystack(place) {
  return [
    place.enName,
    place.place_name,
    place.koName,
    place.korean_name,
    place.address,
    place.koAddress,
  ]
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/** @param {Record<string, unknown>} place @param {string} q */
function curatedMatchScore(place, q) {
  const fields = [
    place.enName,
    place.place_name,
    place.koName,
    place.korean_name,
  ].map((v) => String(v ?? '').trim().toLowerCase())

  for (const field of fields) {
    if (!field) {
      continue
    }
    if (field === q) {
      return 300
    }
    if (field.startsWith(q)) {
      return 200
    }
    if (field.includes(q)) {
      return 150
    }
  }

  const hay = curatedSearchHaystack(place)
  return hay.includes(q) ? 100 : 0
}

/**
 * @param {string} query
 * @param {Record<string, unknown>[]} places
 * @param {Set<string>} hiddenKeys
 * @returns {Record<string, unknown>[]}
 */
export function searchCuratedPlaces(query, places, hiddenKeys) {
  const q = normalizeQuery(query)
  if (!q || q.length < 2) {
    return []
  }

  return (places ?? [])
    .filter((place) => !isPlaceHiddenFromSearch(place, hiddenKeys))
    .map((place) => ({ place, score: curatedMatchScore(place, q) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || String(a.place.enName).localeCompare(String(b.place.enName)))
    .map(({ place }) => place)
}

/**
 * @param {string} areaKey
 * @param {'places' | 'explore' | 'routes'} mode
 */
export function buildAreaSearchHint(areaKey, mode) {
  if (mode === 'places') {
    return `Showing ${areaKey} area. Choose Food, Cafes, Transit, or Services — or tap "Search this area" for nearby places.`
  }
  return `Moved to ${areaKey}. Spots and route pins stay visible — zoom in to explore.`
}
