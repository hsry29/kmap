import { ACTIVE_THEMES, THEME_PLACES } from '../data/places'
import { DEFAULT_PIN_ID, PIN_DESIGN_MAP } from '../data/pinDesigns'
import { ADMIN_CURATION_COLLECTIONS } from '../data/adminCurationCollections'
import { resolveDisplayNames } from './placeDisplay'
import { curationFromAdminForm, hasCurationContent, normalizeCuration } from './adminCuration'
import { resolvePlaceImageUrl } from './placeImage'
import {
  COLLECTION_TYPE,
  DEFAULT_COLLECTION_TYPE,
  isRouteCollection,
  normalizeCollectionType,
} from './collectionTypes'
import { pushConfig } from './remoteConfig'
import { isSyncEnabled, useRemoteContentSource } from './contentSource'

const STORAGE_KEY = 'kmap:admin-collections:v2'

export const COLLECTION_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
}

function normalizeStatus(value, fallback = COLLECTION_STATUS.PUBLISHED) {
  const s = String(value ?? '').trim().toLowerCase()
  if (s === COLLECTION_STATUS.PUBLISHED) {
    return COLLECTION_STATUS.PUBLISHED
  }
  if (s === COLLECTION_STATUS.DRAFT) {
    return COLLECTION_STATUS.DRAFT
  }
  return fallback
}

/** 일반 사용자·지도에 노출할 published 컬렉션만. */
export function getPublishedCollections(list) {
  return (list ?? []).filter((c) => c.status === COLLECTION_STATUS.PUBLISHED)
}

/** 원격(게시된) 컬렉션 목록. remoteSync 가 채워준다(없으면 null). */
let remoteCollections = null

/** @param {{ collections?: unknown[] } | null} value */
export function setRemoteCollections(value) {
  const list = value && Array.isArray(value.collections) ? value.collections : null
  remoteCollections = list ? normalizeList(list) : null
}

export function hasRemoteCollections() {
  return Boolean(remoteCollections?.length)
}

function loadLocalStorageList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return normalizeList(JSON.parse(raw))
    }
  } catch {
    /* fall through */
  }
  return null
}

/** 기본 테마 → 기본 핀 디자인 매핑(빌트인 시드용). */
const THEME_PIN = {
  'K-POP': 'kpop',
  History: 'history',
  Hiking: 'hiking',
  DemonHunters: 'demon',
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function normalizePin(value) {
  const id = String(value ?? '').trim()
  return PIN_DESIGN_MAP[id] ? id : DEFAULT_PIN_ID
}

function normalizePlace(value) {
  const src = value && typeof value === 'object' ? value : {}
  const imageUrl = resolvePlaceImageUrl(src)
  return {
    // 데이터 파일 장소의 부가 필드(description/pronunciation/image 등)도 보존.
    ...src,
    id: String(src.id || uid('colplace')),
    enName: String(src.enName ?? '').trim(),
    koName: String(src.koName ?? '').trim(),
    lat: Number(src.lat),
    lng: Number(src.lng),
    koAddress: String(src.koAddress ?? '').trim(),
    phone: String(src.phone ?? '').trim(),
    placeUrl: String(src.placeUrl ?? '').trim(),
    kakaoId: String(src.kakaoId ?? '').trim(),
    imageUrl,
    isPremium: Boolean(src.isPremium),
    partnerPerk: String(src.partnerPerk ?? '').trim(),
    curation: src.curation ? normalizeCuration(src.curation) : null,
  }
}

function normalizeCollection(value) {
  const src = value && typeof value === 'object' ? value : {}
  const places = Array.isArray(src.places) ? src.places : []
  const id = String(src.id || uid('col'))
  const defaultStatus = id.startsWith('theme-') ? COLLECTION_STATUS.PUBLISHED : COLLECTION_STATUS.DRAFT
  return {
    id,
    title: String(src.title ?? '').trim() || 'Untitled',
    type: normalizeCollectionType(src.type),
    pin: normalizePin(src.pin),
    status: normalizeStatus(src.status, defaultStatus),
    places: places
      .map(normalizePlace)
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)),
  }
}

function normalizeList(value) {
  const list = Array.isArray(value)
    ? value
    : Array.isArray(value?.collections)
      ? value.collections
      : []
  return list.map(normalizeCollection)
}

/** 기본 테마(K-POP/History/...)를 관리 가능한 컬렉션으로 변환한 시드. */
function themeCollections() {
  return ACTIVE_THEMES.map((theme) => ({
    id: `theme-${theme}`,
    title: theme,
    type: COLLECTION_TYPE.ROUTE,
    pin: THEME_PIN[theme] ?? DEFAULT_PIN_ID,
    status: COLLECTION_STATUS.PUBLISHED,
    places: THEME_PLACES[theme] ?? [],
  }))
}

/**
 * localStorage 작업본이 없을 때 사용하는 기본 목록.
 * - 데이터 파일(adminCurationCollections.js)에 컬렉션이 채워져 있으면 그것을 그대로 사용
 *   (관리자가 "Copy collections (JSON)" 로 내보내 배포한 최종본이 진실의 원천).
 * - 비어 있으면 코드의 기본 테마(K-POP/History/...)를 컬렉션으로 시드.
 */
function builtinList() {
  const configured = ADMIN_CURATION_COLLECTIONS.collections ?? []
  if (configured.length > 0) {
    return normalizeList(configured)
  }
  return normalizeList(themeCollections())
}

function persist(list) {
  const normalized = normalizeList(list)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    /* ignore quota */
  }
  pushConfig('collections', { collections: normalized })
  return loadCollections()
}

/**
 * 현재 큐레이션 컬렉션 목록.
 * Production (Supabase): remote → empty (no bundled seed).
 * Admin draft mode: localStorage → remote → empty.
 * Local dev (no Supabase): localStorage → remote → bundled seed.
 */
export function loadCollections() {
  if (useRemoteContentSource()) {
    if (remoteCollections?.length) {
      return remoteCollections.map((c) => ({ ...c }))
    }
    return []
  }

  const local = loadLocalStorageList()
  if (local?.length) {
    return local
  }
  if (remoteCollections?.length) {
    return remoteCollections.map((c) => ({ ...c }))
  }
  if (isSyncEnabled) {
    return []
  }
  return builtinList()
}

/** 제목 중복 방지(필요 시 숫자 접미사). */
function uniqueTitle(list, title, ignoreId) {
  const base = String(title ?? '').trim() || 'Untitled'
  const taken = new Set(
    list.filter((c) => c.id !== ignoreId).map((c) => c.title.toLowerCase()),
  )
  if (!taken.has(base.toLowerCase())) {
    return base
  }
  let i = 2
  while (taken.has(`${base} ${i}`.toLowerCase())) {
    i += 1
  }
  return `${base} ${i}`
}

export function createCollection(title, pin = DEFAULT_PIN_ID, type = DEFAULT_COLLECTION_TYPE) {
  const list = loadCollections()
  list.push({
    id: uid('col'),
    title: uniqueTitle(list, title),
    type: normalizeCollectionType(type),
    pin: normalizePin(pin),
    status: COLLECTION_STATUS.DRAFT,
    places: [],
  })
  return persist(list)
}

export function renameCollection(id, title) {
  const list = loadCollections().map((c) =>
    c.id === id ? { ...c, title: uniqueTitle(loadCollections(), title, id) } : c,
  )
  return persist(list)
}

/** 컬렉션 핀 디자인 변경. */
export function setCollectionPin(id, pin) {
  const list = loadCollections().map((c) => (c.id === id ? { ...c, pin: normalizePin(pin) } : c))
  return persist(list)
}

/** 컬렉션 타입 변경 (route ↔ spots). */
export function setCollectionType(id, type) {
  const list = loadCollections().map((c) =>
    c.id === id ? { ...c, type: normalizeCollectionType(type) } : c,
  )
  return persist(list)
}

export function deleteCollection(id) {
  return persist(loadCollections().filter((c) => c.id !== id))
}

/** 모든 컬렉션과 그 안의 장소를 한 번에 제거. */
export function clearAllCollections() {
  return persist([])
}

/** Kakao keywordSearch 결과 1건을 컬렉션 장소 객체로 정규화. */
export function normalizeKakaoResult(result) {
  const src = result || {}
  const rawName = String(src.place_name ?? '').trim()
  const { nameKo, nameEn } = resolveDisplayNames({ name: rawName }, 'search')
  return normalizePlace({
    id: uid('colplace'),
    enName: nameEn || '',
    koName: nameKo || rawName,
    lat: Number(src.y),
    lng: Number(src.x),
    koAddress: String(src.road_address_name || src.address_name || '').trim(),
    phone: String(src.phone ?? '').trim(),
    placeUrl: String(src.place_url ?? '').trim(),
    kakaoId: src.id ? String(src.id) : '',
  })
}

export function addPlaceToCollection(id, kakaoResult) {
  const place = normalizeKakaoResult(kakaoResult)
  const list = loadCollections().map((c) => {
    if (c.id !== id) {
      return c
    }
    const dup = c.places.some(
      (p) =>
        (place.kakaoId && p.kakaoId === place.kakaoId) ||
        (Math.abs(p.lat - place.lat) < 1e-6 && Math.abs(p.lng - place.lng) < 1e-6),
    )
    if (dup) {
      return c
    }
    return applyPlaceOrder({ ...c, places: [...c.places, place] })
  })
  return persist(list)
}

export function removePlaceFromCollection(collectionId, placeId) {
  const list = loadCollections().map((c) => {
    if (c.id !== collectionId) {
      return c
    }
    return applyPlaceOrder({
      ...c,
      places: c.places.filter((p) => p.id !== placeId),
    })
  })
  return persist(list)
}

/** 컬렉션에 등록된 모든 장소를 한 번에 제거(컬렉션 자체는 유지). */
export function clearCollectionPlaces(collectionId) {
  const list = loadCollections().map((c) =>
    c.id === collectionId ? { ...c, places: [] } : c,
  )
  return persist(list)
}

function placeNextStopLabel(place) {
  return String(place?.enName || place?.koName || '').trim()
}

/** 장소 순서에 맞춰 curation.nextStop 자동 갱신. */
export function syncCollectionNextStops(places) {
  const list = Array.isArray(places) ? places : []
  return list.map((place, idx) => {
    const nextLabel =
      idx < list.length - 1 ? placeNextStopLabel(list[idx + 1]) || 'Next stop' : 'End'
    if (!place?.curation) {
      return place
    }
    return {
      ...place,
      curation: {
        ...place.curation,
        nextStop: nextLabel,
      },
    }
  })
}

function reorderCollectionPlaces(places, placeId, toIndex) {
  const list = [...places]
  const fromIndex = list.findIndex((p) => p.id === placeId)
  if (fromIndex < 0) {
    return list
  }
  const target = Math.max(0, Math.min(toIndex, list.length - 1))
  if (fromIndex === target) {
    return list
  }
  const [item] = list.splice(fromIndex, 1)
  list.splice(target, 0, item)
  return list
}

function applyPlaceOrder(collection) {
  if (!isRouteCollection(collection)) {
    return collection
  }
  return {
    ...collection,
    places: syncCollectionNextStops(collection.places),
  }
}

/** 장소 순서 이동. dir: -1(위) / 1(아래). */
export function movePlaceInCollection(collectionId, placeId, dir) {
  const list = loadCollections().map((c) => {
    if (c.id !== collectionId) {
      return c
    }
    const idx = c.places.findIndex((p) => p.id === placeId)
    const next = idx + dir
    if (idx < 0 || next < 0 || next >= c.places.length) {
      return c
    }
    const places = c.places.slice()
    ;[places[idx], places[next]] = [places[next], places[idx]]
    return applyPlaceOrder({ ...c, places })
  })
  return persist(list)
}

/** 드래그 앤 드롭 등 — 장소를 특정 인덱스로 이동. */
export function reorderPlaceInCollection(collectionId, placeId, toIndex) {
  const list = loadCollections().map((c) => {
    if (c.id !== collectionId) {
      return c
    }
    const places = reorderCollectionPlaces(c.places, placeId, toIndex)
    return applyPlaceOrder({ ...c, places })
  })
  return persist(list)
}

/** 컬렉션 장소의 큐레이터 가이드 갱신(자체 보관). */
export function setCollectionPlaceCuration(collectionId, placeId, fields) {
  return updateCollectionPlace(collectionId, placeId, { curation: fields })
}

/** 컬렉션 장소 메타데이터 갱신 (imageUrl, curation 등). */
export function updateCollectionPlace(collectionId, placeId, patch = {}) {
  const list = loadCollections().map((c) => {
    if (c.id !== collectionId) {
      return c
    }
    return {
      ...c,
      places: c.places.map((p) => {
        if (p.id !== placeId) {
          return p
        }
        let next = { ...p }
        if (patch.imageUrl !== undefined) {
          next.imageUrl = String(patch.imageUrl ?? '').trim()
        }
        if (patch.curation !== undefined) {
          const curation = curationFromAdminForm(patch.curation, p.curation)
          next.curation = hasCurationContent(curation) ? curation : null
        }
        return normalizePlace(next)
      }),
    }
  })
  return persist(list)
}

export function clearCollectionPlaceCuration(collectionId, placeId) {
  const list = loadCollections().map((c) =>
    c.id === collectionId
      ? {
          ...c,
          places: c.places.map((p) => (p.id === placeId ? { ...p, curation: null } : p)),
        }
      : c,
  )
  return persist(list)
}

/** 컬렉션 Draft / Published 전환. */
export function setCollectionStatus(id, status) {
  const next = normalizeStatus(status, COLLECTION_STATUS.DRAFT)
  const list = loadCollections().map((c) => (c.id === id ? { ...c, status: next } : c))
  return persist(list)
}

/** CSV 등에서 가져온 컬렉션을 기존 목록과 병합(id → title 순 매칭). */
export function mergeImportedCollections(imported, options = {}) {
  const { overwritePlaces = false } = options
  const current = loadCollections()
  const byId = new Map(current.map((c) => [c.id, c]))
  const byTitle = new Map(current.map((c) => [c.title.toLowerCase(), c]))
  const merged = [...current]

  for (const raw of normalizeList(imported)) {
    const existing =
      (raw.id && byId.get(raw.id)) || byTitle.get(raw.title.toLowerCase()) || null

    if (existing) {
      const idx = merged.findIndex((c) => c.id === existing.id)
      const placeById = new Map(existing.places.map((p) => [p.id, p]))
      const placeByKakao = new Map()
      const placeByGeo = new Map()
      for (const p of existing.places) {
        const kakaoId = String(p.kakaoId ?? '').trim()
        if (kakaoId) {
          placeByKakao.set(kakaoId, p)
        }
        if (p.id?.startsWith('kakao-')) {
          placeByKakao.set(p.id.slice(6), p)
        }
        placeByGeo.set(`${p.lat.toFixed(5)},${p.lng.toFixed(5)}`, p)
      }
      const nextPlaces = [...existing.places]

      for (const place of raw.places) {
        const kakaoId = String(place.kakaoId ?? '').trim()
        const geoKey = `${place.lat.toFixed(5)},${place.lng.toFixed(5)}`
        const match =
          (kakaoId && placeByKakao.get(kakaoId)) ||
          (place.id && placeById.get(place.id)) ||
          placeByGeo.get(geoKey) ||
          null

        if (match) {
          const pIdx = nextPlaces.findIndex((p) => p.id === match.id)
          const importedImageUrl = resolvePlaceImageUrl(place)

          if (!overwritePlaces) {
            // Always apply image_url from CSV even when skipping full place overwrite.
            if (importedImageUrl && pIdx >= 0) {
              nextPlaces[pIdx] = normalizePlace({
                ...nextPlaces[pIdx],
                imageUrl: importedImageUrl,
              })
            }
            continue
          }

          nextPlaces[pIdx] = normalizePlace({
            ...match,
            ...place,
            id: match.id,
            kakaoId: kakaoId || match.kakaoId,
          })
        } else {
          nextPlaces.push(place)
        }
      }

      merged[idx] = {
        ...existing,
        title: raw.title || existing.title,
        type: raw.type ?? existing.type,
        pin: raw.pin || existing.pin,
        status: raw.status ?? existing.status,
        places: nextPlaces,
      }
    } else {
      merged.push(raw)
      byId.set(raw.id, raw)
      byTitle.set(raw.title.toLowerCase(), raw)
    }
  }

  return persist(merged)
}

/** adminCurationCollections.js 에 붙여넣을 JSON 내보내기. */
export function exportCollectionsConfig() {
  return JSON.stringify({ collections: loadCollections() }, null, 2)
}
