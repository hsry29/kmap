import { ADMIN_CURATION } from '../data/adminCuration'
import { getPlaceHideKey } from './hiddenPlaces'
import { pushConfig } from './remoteConfig'
import { useRemoteContentSource } from './contentSource'
import {
  DEFAULT_CURATION_LANG,
  LOCALIZED_CURATION_FIELD_KEYS,
  hasLocalizedContent,
  mergeLocalizedFields,
  normalizeLocalizedField,
  resolveLocalizedField,
  setLocalizedField,
} from './curationI18n'
import { isRouteCollection } from './collectionTypes'

const STORAGE_KEY = 'kmap:admin-curation:v1'

/** 원격(게시된) 큐레이션 가이드 맵. remoteSync 가 채워준다. */
let remoteCurationMap = new Map()

/** @param {{ entries?: Record<string, unknown> } | null} value */
export function setRemoteCuration(value) {
  const next = new Map()
  const entries = value && typeof value === 'object' ? value.entries : null
  if (entries && typeof entries === 'object') {
    for (const [key, raw] of Object.entries(entries)) {
      next.set(String(key), normalizeCuration(raw))
    }
  }
  remoteCurationMap = next
}

/**
 * 큐레이션 가이드 필드 정의(노출 순서대로).
 * 외국인 여행자용 — label 은 영어, hint/example 로 관리자 입력 가이드 제공.
 */
export const CURATION_FIELDS = [
  {
    key: 'whyVisit',
    label: 'Why Visit?',
    hint: 'One sentence hook — why should a tourist come here?',
    placeholder: 'The easiest landmark for first-timers to see the full Seoul skyline.',
    example: 'Iconic night view · great for first-time visitors',
    multiline: true,
  },
  {
    key: 'bestTime',
    label: 'Best Time',
    hint: 'When to go — time of day, season, or event.',
    placeholder: 'Arrive 30 min before sunset',
    example: 'Weekday late afternoon · avoid weekend evenings',
  },
  {
    key: 'timeNeeded',
    label: 'Time Needed',
    hint: 'Rough visit duration including travel/wait.',
    placeholder: 'About 1.5–2 hours',
    example: '45 min quick look · 2 hours with cable car',
  },
  {
    key: 'tips',
    label: 'Tips',
    hint: 'Practical advice — crowds, tickets, what to bring.',
    placeholder: 'Weekend evenings get very crowded. Outdoor deck is better for photos.',
    example: 'Bring cash for street food nearby · English menus limited',
    multiline: true,
  },
  {
    key: 'nextStop',
    label: 'Next Spot',
    hint: 'Suggest the next place in this tour (name + rough direction).',
    placeholder: 'Walk down to Myeongdong (15 min) for street food',
    example: 'Next: Gyeongbokgung Palace · 20 min by subway',
  },
]

/** 컬렉션 생성 시 빠른 시작용 템플릿. */
export const COLLECTION_TEMPLATES = [
  { title: 'Seoul Night View Tour', pin: 'default' },
  { title: 'K-POP Pilgrimage', pin: 'kpop' },
  { title: 'Palace & History Walk', pin: 'history' },
  { title: 'Seoul Hiking Trails', pin: 'hiking' },
  { title: 'Street Food Crawl', pin: 'food' },
]

const FIELD_KEYS = CURATION_FIELDS.map((f) => f.key)

function fieldKeysForCollectionType(collectionType) {
  return isRouteCollection({ type: collectionType })
    ? FIELD_KEYS
    : FIELD_KEYS.filter((key) => key !== 'nextStop')
}

function normalizeNextStop(value) {
  if (value != null && typeof value === 'object' && !Array.isArray(value)) {
    return resolveLocalizedField(value, DEFAULT_CURATION_LANG)
  }
  return String(value ?? '').trim()
}

/**
 * 저장용 큐레이션 정규화.
 * whyVisit/bestTime/timeNeeded/tips → `{ en, ko?, ... }`, nextStop → plain string.
 */
export function normalizeCuration(value) {
  const src = value && typeof value === 'object' ? value : {}
  const out = {}
  for (const key of LOCALIZED_CURATION_FIELD_KEYS) {
    out[key] = normalizeLocalizedField(src[key])
  }
  out.nextStop = normalizeNextStop(src.nextStop)
  return out
}

/** 관리자 폼(영어 flat string) → 저장 형식. 기존 다른 언어는 유지. */
export function curationFromAdminForm(flat, existing = null, locale = DEFAULT_CURATION_LANG) {
  const base = normalizeCuration(existing)
  const src = flat && typeof flat === 'object' ? flat : {}
  const out = { ...base }
  for (const key of LOCALIZED_CURATION_FIELD_KEYS) {
    out[key] = setLocalizedField(base[key], locale, src[key])
  }
  out.nextStop = String(src.nextStop ?? base.nextStop ?? '').trim()
  return out
}

/** 저장 형식 → 관리자 폼(영어 flat string). */
export function curationToAdminForm(curation, locale = DEFAULT_CURATION_LANG) {
  const normalized = normalizeCuration(curation)
  const flat = {}
  for (const key of LOCALIZED_CURATION_FIELD_KEYS) {
    flat[key] = resolveLocalizedField(normalized[key], locale)
  }
  flat.nextStop = normalized.nextStop
  return flat
}

/** 5개 필드 중 하나라도 내용이 있으면 true. */
export function hasCurationContent(curation) {
  if (!curation || typeof curation !== 'object') {
    return false
  }
  const normalized = normalizeCuration(curation)
  return (
    LOCALIZED_CURATION_FIELD_KEYS.some((key) => hasLocalizedContent(normalized[key])) ||
    normalized.nextStop.length > 0
  )
}

/** 채워진 필드 개수. 관리자 기준은 영어(en). spots 는 nextStop 제외. */
export function countFilledCurationFields(
  curation,
  locale = DEFAULT_CURATION_LANG,
  collectionType = 'route',
) {
  if (!curation || typeof curation !== 'object') {
    return 0
  }
  const normalized = normalizeCuration(curation)
  const keys = fieldKeysForCollectionType(collectionType)
  let count = LOCALIZED_CURATION_FIELD_KEYS.filter(
    (key) => resolveLocalizedField(normalized[key], locale).length > 0,
  ).length
  if (keys.includes('nextStop') && normalized.nextStop.length > 0) {
    count += 1
  }
  return count
}

/** 가이드 필드가 모두 채워졌으면 true. */
export function isCurationComplete(curation, locale = DEFAULT_CURATION_LANG, collectionType = 'route') {
  const keys = fieldKeysForCollectionType(collectionType)
  return countFilledCurationFields(curation, locale, collectionType) === keys.length
}

function loadStorageMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    const map = new Map()
    if (parsed && typeof parsed === 'object') {
      for (const [key, value] of Object.entries(parsed)) {
        map.set(String(key), normalizeCuration(value))
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

function builtInCurationMap() {
  const map = new Map()
  const entries = ADMIN_CURATION.entries ?? {}
  for (const [key, value] of Object.entries(entries)) {
    map.set(String(key), { ...normalizeCuration(value), builtin: true })
  }
  return map
}

/**
 * 큐레이션 오버라이드 맵 (standalone app_config.curation key).
 * Primary curation lives on place.curation inside app_config.collections.
 */
export function loadAdminCuration() {
  const merged = new Map()

  if (!useRemoteContentSource()) {
    for (const [key, value] of builtInCurationMap()) {
      merged.set(key, value)
    }
  }

  for (const [key, value] of remoteCurationMap) {
    merged.set(key, { ...value, builtin: false })
  }

  if (!useRemoteContentSource()) {
    for (const [key, value] of loadStorageMap()) {
      merged.set(key, { ...value, builtin: false })
    }
  }

  return merged
}

function publishCuration() {
  const map = loadStorageMap()
  const entries = {}
  for (const [key, value] of map.entries()) {
    if (hasCurationContent(value)) {
      entries[key] = value
    }
  }
  pushConfig('curation', { entries })
}

/**
 * 최종 큐레이션 가이드 해석(표시용 flat string).
 * 우선순위(필드 단위): 관리자 오버라이드 > 데이터 파일 place.curation.
 * @returns {{whyVisit:string,bestTime:string,timeNeeded:string,tips:string,nextStop:string}}
 */
export function resolveCuration(place, curationMap, locale = DEFAULT_CURATION_LANG) {
  const dataCuration = normalizeCuration(place?.curation)
  const override = curationMap?.get(getPlaceCurationKey(place))
  const overrideCuration = override ? normalizeCuration(override) : null
  const out = {}

  for (const key of LOCALIZED_CURATION_FIELD_KEYS) {
    const merged = mergeLocalizedFields(dataCuration[key], overrideCuration?.[key])
    out[key] = resolveLocalizedField(merged, locale)
  }

  const overrideNextStop = overrideCuration?.nextStop ?? ''
  out.nextStop = overrideNextStop || dataCuration.nextStop || ''

  return out
}

/** 큐레이션 식별자 — 큐레이션 장소는 안정적인 id 를 우선 사용. */
export function getPlaceCurationKey(place) {
  if (place && (place.id || place.id === 0)) {
    return `id:${place.id}`
  }
  return getPlaceHideKey(place)
}

/** 큐레이션 가이드 저장(수정). @returns 갱신된 curationMap */
export function setPlaceCuration(place, fields) {
  const key = getPlaceCurationKey(place)
  const map = loadStorageMap()
  const existing = map.get(key)
  map.set(key, curationFromAdminForm(fields, existing))
  saveStorageMap(map)
  publishCuration()
  return loadAdminCuration()
}

/** 관리자 오버라이드 제거(데이터 파일 기본값으로 복귀). @returns 갱신된 curationMap */
export function clearPlaceCuration(place) {
  const map = loadStorageMap()
  map.delete(getPlaceCurationKey(place))
  saveStorageMap(map)
  publishCuration()
  return loadAdminCuration()
}

/** 패널에서 키로 직접 제거. @returns 갱신된 curationMap */
export function removeAdminCurationKey(key) {
  const map = loadStorageMap()
  map.delete(String(key))
  saveStorageMap(map)
  publishCuration()
  return loadAdminCuration()
}

/** 관리자 패널 목록용 — 내용이 있는 큐레이션 항목 나열. */
export function listCurationEntries(curationMap) {
  const entries = []
  for (const [key, value] of curationMap.entries()) {
    if (!hasCurationContent(value)) {
      continue
    }
    const normalized = normalizeCuration(value)
    entries.push({
      key,
      whyVisit: resolveLocalizedField(normalized.whyVisit, DEFAULT_CURATION_LANG),
      builtin: Boolean(value.builtin),
    })
  }
  return entries.sort((a, b) => a.key.localeCompare(b.key))
}

/** 관리자 localStorage 항목만 JSON 으로 내보내기(adminCuration.js 반영용). */
export function exportAdminCurationConfig() {
  const storage = loadStorageMap()
  const entries = {}
  for (const [key, value] of storage.entries()) {
    if (hasCurationContent(value)) {
      entries[key] = normalizeCuration(value)
    }
  }
  return JSON.stringify({ entries }, null, 2)
}
