import { ADMIN_PARTNERS } from '../data/adminPartners'
import { getPlaceHideKey } from './hiddenPlaces'
import { resolveDriverKoAddress } from './placeDisplay'
import { pushConfig } from './remoteConfig'
import { buildPartnerAliasKeys, findExistingPartnerMatch } from './partnersCsv'

const STORAGE_KEY = 'kmap:admin-partners:v1'

/** 원격(게시된) 파트너 맵. key→entry. remoteSync 가 채워준다. */
let remoteMap = new Map()

/** @param {{ map?: Record<string, unknown> } | null} value */
export function setRemotePartners(value) {
  const next = new Map()
  const map = value && typeof value === 'object' ? value.map : null
  if (map && typeof map === 'object') {
    for (const [key, raw] of Object.entries(map)) {
      const entry = normalizeEntry(raw)
      if (entry) {
        next.set(String(key), entry)
      }
    }
  }
  remoteMap = next
}

function publishPartners() {
  const map = loadStorageMap()
  const obj = {}
  for (const [key, value] of map.entries()) {
    obj[key] = value
  }
  // Supabase push 전에 메모리 remote 캐시를 local 과 맞춰, 삭제 직후 remote 가 다시 켜지는 현상 방지.
  setRemotePartners({ map: obj })
  pushConfig('partners', { map: obj })
}

/** 파트너 식별자 — 큐레이션/데이터 장소는 id 우선, 그 외는 hide 키 체계. */
export function getPlacePartnerKey(place) {
  const id = place?.id != null ? String(place.id).trim() : ''
  if (
    id &&
    !id.startsWith('partner-') &&
    !id.startsWith('colplace-') &&
    !id.startsWith('nearby-') &&
    !id.startsWith('search-')
  ) {
    return `id:${id}`
  }
  return getPlaceHideKey(place)
}

/** 동일 장소에 쓰일 수 있는 모든 파트너 키(해제·조회 시 별칭 매칭). */
export function getPlacePartnerKeys(place) {
  const keys = new Set()
  keys.add(getPlacePartnerKey(place))
  keys.add(getPlaceHideKey(place))
  const id = place?.id != null ? String(place.id).trim() : ''
  if (id) {
    keys.add(`id:${id}`)
    if (id.startsWith('partner-')) {
      keys.add(id.slice('partner-'.length))
    }
  }
  const kakaoId = place.kakaoPlaceId ?? place.kakaoId
  if (kakaoId != null && String(kakaoId).trim() !== '') {
    keys.add(`kakao:${String(kakaoId).trim()}`)
  }
  // 검색/주변: Kakao name(한글) + 표시용 enName 모두 별칭으로 등록.
  for (const raw of [place.name, place.placeName, place.koName, place.enName]) {
    const name = String(raw ?? '').trim()
    if (name) {
      keys.add(`name:${name}`)
    }
  }
  const lat = Number(place.lat)
  const lng = Number(place.lng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    keys.add(`geo:${lat.toFixed(5)},${lng.toFixed(5)}`)
  }
  return [...keys]
}

/** @param {Record<string, unknown>} place */
function partnerDisplayName(place) {
  return String(
    place.enName || place.koName || place.name || place.placeName || '',
  ).trim()
}

export function normalizePartnerStatus(value) {
  return String(value ?? '').trim().toLowerCase() === 'draft' ? 'draft' : 'published'
}

function normalizeEntry(value) {
  if (!value || typeof value !== 'object') {
    return null
  }
  return {
    name: String(value.name ?? ''),
    koName: String(value.koName ?? ''),
    koAddress: String(value.koAddress ?? ''),
    category: String(value.category ?? ''),
    lat: Number(value.lat),
    lng: Number(value.lng),
    perk: String(value.perk ?? ''),
    kakaoId: String(value.kakaoId ?? ''),
    status: normalizePartnerStatus(value.status ?? 'published'),
    enabled: value.enabled !== false,
  }
}

/** @param {Record<string, unknown> | undefined} entry */
export function isPartnerPublished(entry) {
  return Boolean(entry && entry.enabled !== false && normalizePartnerStatus(entry.status) === 'published')
}

function rowToPartnerEntry(row) {
  const kakaoId = String(row.kakao_place_id ?? '').trim()
  return {
    name: String(row.partner_name ?? '').trim(),
    koName: String(row.korean_name ?? '').trim(),
    koAddress: String(row.address ?? '').trim(),
    category: String(row.category ?? '').trim(),
    lat: Number(row.lat),
    lng: Number(row.lng),
    perk: String(row.partner_perk ?? '').trim(),
    kakaoId,
    status: normalizePartnerStatus(row.status ?? 'draft'),
    enabled: true,
  }
}

function loadStorageMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    const map = new Map()
    if (parsed && typeof parsed === 'object') {
      for (const [key, value] of Object.entries(parsed)) {
        const entry = normalizeEntry(value)
        if (entry) {
          map.set(String(key), entry)
        }
      }
    }
    return map
  } catch {
    return new Map()
  }
}

function saveStorageMap(map) {
  try {
    const obj = {}
    for (const [key, value] of map.entries()) {
      obj[key] = value
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
  } catch {
    /* ignore quota */
  }
}

function builtInPartnerMap() {
  const map = new Map()
  for (const entry of ADMIN_PARTNERS.entries ?? []) {
    if (!entry?.key) {
      continue
    }
    map.set(String(entry.key), {
      name: String(entry.name ?? ''),
      lat: Number(entry.lat),
      lng: Number(entry.lng),
      perk: String(entry.perk ?? ''),
      enabled: true,
      builtin: true,
    })
  }
  return map
}

/**
 * 빌트인(JS 파일) + 관리자 localStorage 를 병합한 파트너 맵.
 * FUTURE: 원격 API/JSON fetch 결과를 여기서 merge 하면 전 사용자 실시간 반영 가능.
 */
export function loadAdminPartners() {
  const merged = new Map()
  for (const [key, value] of builtInPartnerMap()) {
    merged.set(key, value)
  }
  for (const [key, value] of remoteMap) {
    merged.set(key, { ...value, builtin: false })
  }
  for (const [key, value] of loadStorageMap()) {
    merged.set(key, { ...value, builtin: false })
  }
  return merged
}

const GEO_MATCH_EPS = 0.0005

function placeNameVariants(place) {
  const names = new Set()
  for (const raw of [place.name, place.placeName, place.koName, place.enName]) {
    const n = String(raw ?? '').trim()
    if (n) {
      names.add(n)
    }
  }
  return names
}

function namesMatch(a, b) {
  if (!a || !b) {
    return false
  }
  if (a === b) {
    return true
  }
  return a.includes(b) || b.includes(a)
}

/**
 * 장소 ↔ storage 키 직접 매칭(조회·표시용). partnerMap 전체 스캔 없음.
 */
export function getPartnerLookupKeys(place) {
  const keys = new Set(getPlacePartnerKeys(place))
  const id = String(place?.id ?? '').trim()
  if (id.startsWith('partner-')) {
    keys.add(id.slice('partner-'.length))
  }
  if (place?._partnerStorageKey) {
    keys.add(String(place._partnerStorageKey))
  }
  return [...keys]
}

/**
 * 파트너 해제 시에만 사용 — 동일 장소의 누락된 별칭 키(kakao/name/geo)를 partnerMap 에서 찾는다.
 */
function collectPartnerKeysForUnset(place, partnerMap) {
  const keys = new Set(getPartnerLookupKeys(place))
  const lat = Number(place?.lat)
  const lng = Number(place?.lng)
  const kakaoId = String(place?.kakaoPlaceId ?? place?.kakaoId ?? '').trim()
  const names = placeNameVariants(place)

  for (const [key, entry] of partnerMap.entries()) {
    if (keys.has(key) || entry.enabled === false) {
      continue
    }
    if (kakaoId && key === `kakao:${kakaoId}`) {
      keys.add(key)
      continue
    }
    if (key.startsWith('name:')) {
      const storedName = key.slice(5)
      if ([...names].some((n) => namesMatch(n, storedName))) {
        keys.add(key)
      }
      continue
    }
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Number.isFinite(entry.lat) &&
      Number.isFinite(entry.lng) &&
      Math.abs(entry.lat - lat) < GEO_MATCH_EPS &&
      Math.abs(entry.lng - lng) < GEO_MATCH_EPS
    ) {
      keys.add(key)
    }
  }
  return [...keys]
}

/** 파트너 해제·카드 닫기용 별칭 키 수집 */
export function collectPartnerKeysForPlace(place, partnerMap) {
  return collectPartnerKeysForUnset(place, partnerMap)
}

/**
 * 장소가 파트너(제휴)인지 판정.
 * 우선순위: 관리자 토글(On/Off) > 데이터 파일 isPremium 플래그.
 * @param {Record<string, unknown>} place
 * @param {Map<string, any>} partnerMap
 */
export function isPlacePartner(place, partnerMap, options = {}) {
  const { includeDraft = false } = options
  const keys = getPartnerLookupKeys(place)
  for (const key of keys) {
    const entry = partnerMap.get(key)
    if (entry && entry.enabled !== false) {
      if (includeDraft || isPartnerPublished(entry)) {
        return true
      }
    }
  }
  for (const key of keys) {
    const entry = partnerMap.get(key)
    if (entry && entry.enabled === false) {
      return false
    }
  }
  return Boolean(place.isPremium)
}

/**
 * 파트너 혜택 문구 해석.
 * 우선순위: 관리자 입력 perk > 데이터 파일 partnerPerk.
 */
export function getPlacePerk(place, partnerMap) {
  const keys = getPartnerLookupKeys(place)
  for (const key of keys) {
    const entry = partnerMap.get(key)
    if (entry && entry.enabled !== false && entry.perk) {
      return entry.perk
    }
  }
  if (place.partnerPerk) {
    return String(place.partnerPerk)
  }
  return ''
}

/** 파트너로 지정(또는 혜택 문구 수정). @returns 갱신된 partnerMap */
export function setPlacePartner(place, { perk } = {}) {
  const map = loadStorageMap()
  const keys = getPlacePartnerKeys(place)
  const payload = {
    name: partnerDisplayName(place),
    koName: String(place.koName ?? place.name ?? '').trim(),
    koAddress: resolveDriverKoAddress(place),
    category: String(place.category ?? '').trim(),
    lat: Number(place.lat),
    lng: Number(place.lng),
    perk: String(perk ?? ''),
    kakaoId: String(place.kakaoPlaceId ?? place.kakaoId ?? '').trim(),
    status: 'published',
    enabled: true,
  }
  for (const key of keys) {
    const prev = map.get(key)
    map.set(key, {
      ...payload,
      name: prev?.name || payload.name,
    })
  }
  saveStorageMap(map)
  publishPartners()
  return loadAdminPartners()
}

/**
 * 파트너 해제 — 모든 별칭 키에 enabled:false 저장(Supabase·remote 재활성화 방지).
 */
export function unsetPlacePartner(place) {
  const partnerMap = loadAdminPartners()
  const map = loadStorageMap()
  const keys = collectPartnerKeysForUnset(place, partnerMap)
  const base = {
    name: partnerDisplayName(place),
    koAddress: resolveDriverKoAddress(place),
    lat: Number(place.lat),
    lng: Number(place.lng),
    perk: '',
    enabled: false,
  }

  for (const key of keys) {
    const prev = map.get(key) ?? partnerMap.get(key)
    map.set(key, {
      ...base,
      name: prev?.name || base.name,
      lat: Number.isFinite(Number(prev?.lat)) ? Number(prev.lat) : base.lat,
      lng: Number.isFinite(Number(prev?.lng)) ? Number(prev.lng) : base.lng,
    })
  }

  saveStorageMap(map)
  publishPartners()
  return loadAdminPartners()
}

/** 패널에서 키로 직접 제거. @returns 갱신된 partnerMap */
export function removeAdminPartnerKey(key) {
  const partnerMap = loadAdminPartners()
  const prev = partnerMap.get(String(key))
  if (prev) {
    return unsetPlacePartner({
      id: `partner-${key}`,
      _partnerStorageKey: String(key),
      name: prev.name,
      lat: prev.lat,
      lng: prev.lng,
      kakaoPlaceId: String(key).startsWith('kakao:') ? String(key).slice(6) : undefined,
    })
  }
  const map = loadStorageMap()
  map.set(String(key), {
    name: String(key),
    lat: 0,
    lng: 0,
    perk: '',
    enabled: false,
  })
  saveStorageMap(map)
  publishPartners()
  return loadAdminPartners()
}

/** 관리자 패널 목록용 — 활성/비활성 파트너 항목 나열 */
export function listPartnerEntries(partnerMap) {
  const entries = []
  for (const [key, value] of partnerMap.entries()) {
    entries.push({
      key,
      label: value.name || key,
      koName: value.koName || '',
      perk: value.perk || '',
      status: normalizePartnerStatus(value.status),
      enabled: value.enabled !== false,
      builtin: Boolean(value.builtin),
    })
  }
  return entries.sort(
    (a, b) => Number(b.enabled) - Number(a.enabled) || a.label.localeCompare(b.label),
  )
}

/**
 * CSV 등에서 가져온 파트너를 localStorage 에 병합.
 * @param {Array<Record<string, unknown>>} importedRows
 * @param {{ overwrite?: boolean }} [options]
 */
export function mergeImportedPartners(importedRows, options = {}) {
  const { overwrite = false } = options
  const partnerMap = loadAdminPartners()
  const map = loadStorageMap()

  for (const row of importedRows ?? []) {
    const match = findExistingPartnerMatch(row, partnerMap)
    if (match && !overwrite) {
      continue
    }

    const payload = rowToPartnerEntry(row)
    const keys = buildPartnerAliasKeys(row)
    const targetKeys =
      match && overwrite ? collectKeysForPartnerEntry(match.key, match.entry, partnerMap, keys) : keys

    for (const key of targetKeys) {
      const prev = map.get(key) ?? partnerMap.get(key)
      map.set(key, {
        ...payload,
        name: payload.name || prev?.name || key,
        koName: payload.koName || prev?.koName || '',
      })
    }

    if (match && overwrite && match.key && !targetKeys.includes(match.key)) {
      map.set(match.key, {
        ...(map.get(match.key) ?? match.entry ?? {}),
        ...payload,
        enabled: true,
      })
    }
  }

  saveStorageMap(map)
  publishPartners()
  return loadAdminPartners()
}

function collectKeysForPartnerEntry(matchKey, entry, partnerMap, importedKeys) {
  const keys = new Set(importedKeys)
  keys.add(matchKey)
  if (entry?.kakaoId) {
    keys.add(`kakao:${entry.kakaoId}`)
  }
  if (Number.isFinite(entry?.lat) && Number.isFinite(entry?.lng)) {
    keys.add(`geo:${entry.lat.toFixed(5)},${entry.lng.toFixed(5)}`)
  }
  for (const key of partnerMap.keys()) {
    const value = partnerMap.get(key)
    if (value !== entry) {
      continue
    }
    keys.add(key)
  }
  return [...keys]
}

/** 관리자 localStorage 항목만 JSON 으로 내보내기(adminPartners.js 반영용) */
export function exportAdminPartnersConfig() {
  const storage = loadStorageMap()
  const entries = []
  for (const [key, value] of storage.entries()) {
    if (value.enabled === false) {
      continue
    }
    entries.push({
      key,
      name: value.name,
      lat: value.lat,
      lng: value.lng,
      perk: value.perk,
    })
  }
  return JSON.stringify({ entries }, null, 2)
}
