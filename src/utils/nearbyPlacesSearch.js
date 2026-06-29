import { getNearbyTabDensityBoost } from '../data/nearbyLiveTypes'
import { normalizeLiveKakaoPlace } from './placeDisplay'

/** Kakao category/keyword search: page size (API max 15). */
const PAGE_SIZE = 15

const DEBUG_PREFIX = '[KMap Places nearby]'

/** @deprecated use getNearbySearchConfig */
export const NEARBY_DISPLAY_MAX = 75

/**
 * Kakao map level ≈ scale bar (Seoul lat): 3→50m, 4→100m, 5→250m, 6→500m, 7→1km
 * @param {number} mapLevel
 * @param {string} [tabId]
 */
export function getNearbySearchConfig(mapLevel, tabId) {
  const level = Number(mapLevel)
  let config
  if (!Number.isFinite(level) || level <= 3) {
    config = {
      maxPages: 5,
      displayMax: 75,
      wideView: false,
      boundsPadding: 0,
      radiusPadding: 1,
      spreadGrid: 0,
    }
  } else if (level === 4) {
    config = {
      maxPages: 10,
      displayMax: 120,
      wideView: true,
      boundsPadding: 0.1,
      radiusPadding: 1.25,
      spreadGrid: 0,
    }
  } else if (level === 5) {
    config = {
      maxPages: 15,
      displayMax: 160,
      wideView: true,
      boundsPadding: 0.15,
      radiusPadding: 1.4,
      spreadGrid: 0,
    }
  } else {
    config = {
      maxPages: 20,
      displayMax: 200,
      wideView: true,
      boundsPadding: 0.2,
      radiusPadding: 1.55,
      spreadGrid: 0,
    }
  }

  return applyTabDensityBoost(config, tabId)
}

/** Kakao Places API: max 45 pages × 15 rows. */
const MAX_API_PAGES = 45
const DISPLAY_CAP_DEFAULT = 300
const DISPLAY_CAP_RESTAURANTS = 675

/** @param {ReturnType<typeof getNearbySearchConfig>} config @param {string} [tabId] */
function applyTabDensityBoost(config, tabId) {
  const boost = getNearbyTabDensityBoost(tabId)
  if (!boost) {
    return config
  }
  const displayCap = tabId === 'FD6' ? DISPLAY_CAP_RESTAURANTS : DISPLAY_CAP_DEFAULT
  return {
    ...config,
    maxPages: Math.min(MAX_API_PAGES, Math.ceil(config.maxPages * boost.pageMultiplier)),
    displayMax: Math.min(displayCap, Math.ceil(config.displayMax * boost.displayMultiplier)),
    spreadGrid: boost.spreadGrid,
  }
}

function distanceInKm(a, b) {
  const toRad = (value) => (value * Math.PI) / 180
  const earthRadius = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const haversine =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * earthRadius * Math.asin(Math.sqrt(haversine))
}

function getBoundsSearchRadiusMeters(kakaoMap, paddingFactor = 1) {
  const bounds = kakaoMap?.getBounds?.()
  const center = kakaoMap?.getCenter?.()
  if (!bounds || !center) {
    return 500
  }
  const c = { lat: center.getLat(), lng: center.getLng() }
  const ne = bounds.getNorthEast()
  const sw = bounds.getSouthWest()
  const corners = [
    { lat: ne.getLat(), lng: ne.getLng() },
    { lat: ne.getLat(), lng: sw.getLng() },
    { lat: sw.getLat(), lng: ne.getLng() },
    { lat: sw.getLat(), lng: sw.getLng() },
  ]
  let maxKm = 0
  for (const corner of corners) {
    maxKm = Math.max(maxKm, distanceInKm(c, corner))
  }
  return Math.min(20000, Math.max(250, Math.round(maxKm * 1000 * paddingFactor)))
}

function isRowInBounds(row, bounds, kakao, padding = 0) {
  const lat = Number(row.y)
  const lng = Number(row.x)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false
  }
  if (!bounds) {
    return true
  }
  if (padding <= 0 && bounds.contain) {
    return bounds.contain(new kakao.maps.LatLng(lat, lng))
  }
  const sw = bounds.getSouthWest()
  const ne = bounds.getNorthEast()
  const latSpan = ne.getLat() - sw.getLat()
  const lngSpan = ne.getLng() - sw.getLng()
  return (
    lat >= sw.getLat() - latSpan * padding &&
    lat <= ne.getLat() + latSpan * padding &&
    lng >= sw.getLng() - lngSpan * padding &&
    lng <= ne.getLng() + lngSpan * padding
  )
}

function dedupeRows(rows) {
  const seen = new Set()
  const out = []
  for (const row of rows) {
    const id = String(row.id ?? '')
    if (!id || seen.has(id)) {
      continue
    }
    seen.add(id)
    out.push(row)
  }
  return out
}

function sortRowsByMapCenter(rows, kakaoMap) {
  const center = kakaoMap?.getCenter?.()
  if (!center) {
    return rows
  }
  const c = { lat: center.getLat(), lng: center.getLng() }
  return [...rows].sort((a, b) => {
    const da = distanceInKm(c, { lat: Number(a.y), lng: Number(a.x) })
    const db = distanceInKm(c, { lat: Number(b.y), lng: Number(b.x) })
    return da - db
  })
}

function spreadRowsAcrossViewport(rows, kakaoMap, maxCount, gridSize) {
  if (gridSize <= 1 || rows.length <= maxCount) {
    return rows.slice(0, maxCount)
  }
  const bounds = kakaoMap?.getBounds?.()
  if (!bounds) {
    return rows.slice(0, maxCount)
  }
  const sw = bounds.getSouthWest()
  const ne = bounds.getNorthEast()
  const latSpan = ne.getLat() - sw.getLat()
  const lngSpan = ne.getLng() - sw.getLng()
  if (latSpan <= 0 || lngSpan <= 0) {
    return rows.slice(0, maxCount)
  }

  const cells = new Map()
  for (const row of rows) {
    const lat = Number(row.y)
    const lng = Number(row.x)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue
    }
    const col = Math.min(
      gridSize - 1,
      Math.max(0, Math.floor(((lng - sw.getLng()) / lngSpan) * gridSize)),
    )
    const rowIdx = Math.min(
      gridSize - 1,
      Math.max(0, Math.floor(((lat - sw.getLat()) / latSpan) * gridSize)),
    )
    const key = `${rowIdx}:${col}`
    if (!cells.has(key)) {
      cells.set(key, row)
    }
  }

  const spread = [...cells.values()]
  if (spread.length >= maxCount) {
    return spread.slice(0, maxCount)
  }

  const picked = new Set(spread.map((row) => String(row.id)))
  for (const row of rows) {
    if (spread.length >= maxCount) {
      break
    }
    const id = String(row.id)
    if (!picked.has(id)) {
      spread.push(row)
      picked.add(id)
    }
  }
  return spread
}

/**
 * @returns {{ rows: Array<Record<string, unknown>>, stats: Record<string, unknown> }}
 */
function finalizeRows(rows, kakaoMap, kakao, config, fetchStats) {
  const bounds = kakaoMap?.getBounds?.()
  const apiAccumulated = rows.length
  let list = dedupeRows(rows)
  const afterDedupe = list.length
  if (bounds) {
    list = list.filter((row) => isRowInBounds(row, bounds, kakao, config.boundsPadding))
  }
  const afterBounds = list.length
  list = sortRowsByMapCenter(list, kakaoMap)
  let displayed
  if (config.spreadGrid > 1) {
    displayed = spreadRowsAcrossViewport(list, kakaoMap, config.displayMax, config.spreadGrid)
  } else {
    displayed = list.slice(0, config.displayMax)
  }
  return {
    rows: displayed,
    stats: {
      ...fetchStats,
      apiAccumulated,
      afterDedupe,
      afterBounds,
      afterFinalize: displayed.length,
      displayMax: config.displayMax,
      maxPages: config.maxPages,
      spreadGrid: config.spreadGrid,
      wideView: config.wideView,
    },
  }
}

function buildSearchOptions(kakaoMap, kakao, config) {
  const sort = kakao?.maps?.services?.SortBy?.DISTANCE ?? 'distance'
  if (!config.wideView) {
    return {
      useMapBounds: true,
      useMapCenter: true,
      sort,
    }
  }
  const center = kakaoMap?.getCenter?.()
  if (!center) {
    return {
      useMapBounds: true,
      useMapCenter: true,
      sort,
    }
  }
  return {
    location: new kakao.maps.LatLng(center.getLat(), center.getLng()),
    radius: getBoundsSearchRadiusMeters(kakaoMap, config.radiusPadding),
    sort,
  }
}

function searchWithPagination(
  kakaoMap,
  ps,
  search,
  config,
  { tabId, tabLabel, filterRow, isStale, onComplete },
) {
  const kakao = window.kakao
  const accumulated = []
  let pagesFetched = 0
  let rawBatchTotal = 0
  let filteredBatchTotal = 0
  const options = buildSearchOptions(kakaoMap, kakao, config)
  const mapLevel = kakaoMap?.getLevel?.() ?? null

  const handlePage = (data, status, pagination) => {
    if (isStale()) {
      return
    }

    const ok = status === kakao?.maps?.services?.Status.OK
    if (ok && Array.isArray(data)) {
      rawBatchTotal += data.length
      const batch = filterRow ? data.filter(filterRow) : data
      filteredBatchTotal += batch.length
      accumulated.push(...batch)
      pagesFetched += 1
      if (pagination?.hasNextPage && pagesFetched < config.maxPages) {
        pagination.nextPage()
        return
      }
    }

    const { rows, stats } = finalizeRows(accumulated, kakaoMap, kakao, config, {
      tabId,
      tabLabel,
      mapLevel,
      pagesFetched,
      rawBatchTotal,
      filteredBatchTotal,
      pageSize: PAGE_SIZE,
      maxApiRows: config.maxPages * PAGE_SIZE,
      searchMode: config.wideView ? 'radius' : 'mapBounds',
      searchRadiusM: config.wideView
        ? getBoundsSearchRadiusMeters(kakaoMap, config.radiusPadding)
        : null,
    })

    console.debug(DEBUG_PREFIX, {
      category: tabLabel ?? tabId ?? 'unknown',
      tabId,
      mapLevel,
      searchMode: stats.searchMode,
      searchRadiusM: stats.searchRadiusM,
      pagesFetched: stats.pagesFetched,
      maxPages: stats.maxPages,
      pageSize: PAGE_SIZE,
      apiRawRows: stats.rawBatchTotal,
      apiAfterClientFilter: stats.filteredBatchTotal,
      apiAccumulated: stats.apiAccumulated,
      afterDedupe: stats.afterDedupe,
      afterBounds: stats.afterBounds,
      displayedMarkers: stats.afterFinalize,
      displayMax: stats.displayMax,
      spreadGrid: stats.spreadGrid,
      sort: 'distance (Kakao SortBy.DISTANCE + client re-sort by map center)',
    })

    onComplete(rows, stats)
  }

  search(handlePage, {
    ...options,
    size: PAGE_SIZE,
  })
}

/**
 * @param {kakao.maps.Map} kakaoMap
 * @param {kakao.maps.services.Places} ps
 * @param {string} code
 * @param {{ mapLevel?: number, filterRow?: (row: Record<string, unknown>) => boolean, isStale?: () => boolean, onComplete: (rows: Array<Record<string, unknown>>) => void }} ctx
 */
export function fetchNearbyCategoryPlaces(kakaoMap, ps, code, ctx) {
  const tabId = ctx.tabId ?? ''
  const config = getNearbySearchConfig(
    ctx.mapLevel ?? kakaoMap?.getLevel?.() ?? 3,
    tabId,
  )
  const isStale = ctx.isStale ?? (() => false)
  searchWithPagination(
    kakaoMap,
    ps,
    (cb, opts) => ps.categorySearch(code, cb, opts),
    config,
    {
      tabId,
      tabLabel: ctx.tabLabel,
      filterRow: ctx.filterRow,
      isStale,
      onComplete: ctx.onComplete,
    },
  )
}

/**
 * @param {kakao.maps.Map} kakaoMap
 * @param {kakao.maps.services.Places} ps
 * @param {string} keyword
 * @param {{ mapLevel?: number, filterRow?: (row: Record<string, unknown>) => boolean, isStale?: () => boolean, onComplete: (rows: Array<Record<string, unknown>>) => void }} ctx
 */
export function fetchNearbyKeywordPlaces(kakaoMap, ps, keyword, ctx) {
  const tabId = ctx.tabId ?? ''
  const config = getNearbySearchConfig(
    ctx.mapLevel ?? kakaoMap?.getLevel?.() ?? 3,
    tabId,
  )
  const isStale = ctx.isStale ?? (() => false)
  searchWithPagination(
    kakaoMap,
    ps,
    (cb, opts) => ps.keywordSearch(keyword, cb, opts),
    config,
    {
      tabId,
      tabLabel: ctx.tabLabel ?? ctx.keyword,
      filterRow: ctx.filterRow,
      isStale,
      onComplete: ctx.onComplete,
    },
  )
}

/** @param {Record<string, unknown>} row @param {number} index */
export function mapKakaoNearbyRow(row, index) {
  return normalizeLiveKakaoPlace({
    id: `nearby-${row.id}-${index}`,
    kakaoPlaceId: String(row.id),
    kakaoId: String(row.id),
    lat: Number(row.y),
    lng: Number(row.x),
    name: row.place_name,
    address: row.road_address_name || row.address_name || '',
    roadAddress: row.road_address_name || '',
    jibunAddress: row.address_name || '',
    phone: row.phone || '',
    placeUrl: row.place_url || '',
    categoryName: row.category_name || '',
  })
}
