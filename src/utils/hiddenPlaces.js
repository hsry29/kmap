import { ADMIN_HIDDEN_SEARCH } from '../data/adminHiddenSearch'

import { pushConfig } from './remoteConfig'

import {

  buildHiddenImportKeys,

  findExistingHiddenMatch,

  normalizeHiddenCsvStatus,

} from './hiddenPinsCsv'



const ADMIN_STORAGE_KEY = 'kmap:admin-hidden-search:v1'



/** 원격(게시된) 숨김 entry 맵. remoteSync 가 채워준다. */

let remoteHiddenMap = new Map()



/** @param {{ keys?: string[], map?: Record<string, unknown> } | null} value */

export function setRemoteHidden(value) {

  const next = new Map()

  if (value?.map && typeof value.map === 'object') {

    for (const [key, raw] of Object.entries(value.map)) {

      const entry = normalizeHiddenEntry(raw)

      if (entry) {

        next.set(String(key), entry)

      }

    }

  } else if (value?.keys && Array.isArray(value.keys)) {

    for (const key of value.keys) {

      next.set(String(key), entryFromLegacyKey(String(key)))

    }

  }

  remoteHiddenMap = next

}



function publishHidden() {

  const map = loadAdminStorageMap()

  const obj = {}

  const activeKeys = []

  for (const [key, value] of map.entries()) {

    obj[key] = value

    if (isHiddenActive(value)) {

      activeKeys.push(key)

    }

  }

  setRemoteHidden({ map: obj, keys: activeKeys })

  pushConfig('hidden', { map: obj, keys: activeKeys })

}



const BUILTIN_NAME_PATTERNS = (ADMIN_HIDDEN_SEARCH.namePatterns ?? []).map(

  (source) => new RegExp(source, 'i'),

)



export function normalizeHiddenStatus(value) {

  return normalizeHiddenCsvStatus(value ?? 'active')

}



/** @param {Record<string, unknown> | undefined} entry */

export function isHiddenActive(entry) {

  return Boolean(entry && normalizeHiddenStatus(entry.status) === 'active')

}



function normalizeHiddenEntry(value) {

  if (!value || typeof value !== 'object') {

    return null

  }

  return {

    name: String(value.name ?? ''),

    koName: String(value.koName ?? ''),

    lat: Number(value.lat),

    lng: Number(value.lng),

    category: String(value.category ?? ''),

    reason: String(value.reason ?? ''),

    kakaoId: String(value.kakaoId ?? ''),

    status: normalizeHiddenStatus(value.status ?? 'active'),

  }

}



function entryFromLegacyKey(key) {

  if (key.startsWith('kakao:')) {

    return {

      name: '',

      koName: '',

      kakaoId: key.slice(6),

      lat: NaN,

      lng: NaN,

      category: '',

      reason: '',

      status: 'active',

    }

  }

  if (key.startsWith('name:')) {

    const raw = key.slice(5)

    const [en, ko] = raw.includes('|') ? raw.split('|') : [raw, '']

    return {

      name: en,

      koName: ko || '',

      lat: NaN,

      lng: NaN,

      category: '',

      reason: '',

      kakaoId: '',

      status: 'active',

    }

  }

  if (key.startsWith('geo:')) {

    const [lat, lng] = key.slice(4).split(',')

    return {

      name: '',

      koName: '',

      lat: Number(lat),

      lng: Number(lng),

      category: '',

      reason: '',

      kakaoId: '',

      status: 'active',

    }

  }

  return {

    name: key,

    koName: '',

    lat: NaN,

    lng: NaN,

    category: '',

    reason: '',

    kakaoId: '',

    status: 'active',

  }

}



function loadAdminStorageMap() {

  try {

    const raw = localStorage.getItem(ADMIN_STORAGE_KEY)

    if (!raw) {

      return new Map()

    }

    const parsed = JSON.parse(raw)

    const map = new Map()

    if (Array.isArray(parsed)) {

      for (const key of parsed) {

        map.set(String(key), entryFromLegacyKey(String(key)))

      }

      return map

    }

    if (parsed?.map && typeof parsed.map === 'object') {

      for (const [key, value] of Object.entries(parsed.map)) {

        const entry = normalizeHiddenEntry(value)

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



function saveAdminStorageMap(map) {

  try {

    const obj = {}

    for (const [key, value] of map.entries()) {

      obj[key] = value

    }

    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify({ map: obj }))

  } catch {

    /* ignore quota */

  }

}



function builtInHiddenKeys() {

  const keys = new Set(ADMIN_HIDDEN_SEARCH.keys ?? [])

  for (const name of ADMIN_HIDDEN_SEARCH.names ?? []) {

    const n = String(name).trim()

    if (n) {

      keys.add(`name:${n}`)

    }

  }

  return keys

}



function nameMatchesBuiltInRules(name) {

  const n = String(name ?? '').trim()

  if (!n) {

    return false

  }

  if (BUILTIN_NAME_PATTERNS.some((re) => re.test(n))) {

    return true

  }

  return (ADMIN_HIDDEN_SEARCH.names ?? []).some(

    (seed) => n === seed || n.includes(seed) || seed.includes(n),

  )

}



function mergedHiddenMap() {

  const merged = new Map()

  for (const [key, entry] of remoteHiddenMap) {

    merged.set(key, entry)

  }

  for (const [key, entry] of loadAdminStorageMap()) {

    merged.set(key, entry)

  }

  return merged

}



function activeHiddenKeySet() {

  const keys = new Set(builtInHiddenKeys())

  for (const [key, entry] of mergedHiddenMap()) {

    if (isHiddenActive(entry)) {

      keys.add(key)

    }

  }

  return keys

}



function rowToHiddenEntry(row) {

  return {

    name: String(row.place_name ?? '').trim(),

    koName: String(row.korean_name ?? '').trim(),

    lat: Number(row.lat),

    lng: Number(row.lng),

    category: String(row.category ?? '').trim(),

    reason: String(row.reason ?? '').trim(),

    kakaoId: String(row.kakao_place_id ?? '').trim(),

    status: normalizeHiddenStatus(row.status ?? 'active'),

  }

}



function placeToHiddenEntry(place) {

  return {

    name: String(place.enName || place.name || place.placeName || '').trim(),

    koName: String(place.koName || '').trim(),

    lat: Number(place.lat),

    lng: Number(place.lng),

    category: String(place.category || place.categoryName || '').trim(),

    reason: '',

    kakaoId: String(place.kakaoPlaceId ?? place.kakaoId ?? '').trim(),

    status: 'active',

  }

}



/** @param {Record<string, unknown>} place */

export function getPlaceHideKey(place) {

  const kakaoId = place.kakaoPlaceId ?? place.kakaoId

  if (kakaoId != null && String(kakaoId).trim() !== '') {

    return `kakao:${String(kakaoId).trim()}`

  }

  const name = String(place.name ?? place.placeName ?? place.enName ?? '').trim()

  if (name) {

    return `name:${name}`

  }

  const lat = Number(place.lat)

  const lng = Number(place.lng)

  if (Number.isFinite(lat) && Number.isFinite(lng)) {

    return `geo:${lat.toFixed(5)},${lng.toFixed(5)}`

  }

  return `id:${String(place.id ?? '')}`

}



/** @param {string} key */

export function describeHideKey(key) {

  if (key.startsWith('name:')) {

    return { type: 'name', label: key.slice(5), builtin: false }

  }

  if (key.startsWith('kakao:')) {

    return { type: 'kakao', label: `Kakao place #${key.slice(6)}`, builtin: false }

  }

  if (key.startsWith('geo:')) {

    return { type: 'geo', label: key.slice(4), builtin: false }

  }

  return { type: 'other', label: key, builtin: false }

}



/** Admin 패널 목록 — built-in + local/remote entries (active·inactive 모두). */

export function listHiddenEntries() {

  const builtin = builtInHiddenKeys()

  const entries = []

  const seen = new Set()



  for (const key of builtin) {

    if (seen.has(key)) {

      continue

    }

    seen.add(key)

    const desc = describeHideKey(key)

    entries.push({

      key,

      label: desc.label,

      reason: '',

      status: 'active',

      builtin: true,

    })

  }



  for (const [key, entry] of mergedHiddenMap()) {

    if (seen.has(key)) {

      continue

    }

    seen.add(key)

    const desc = describeHideKey(key)

    entries.push({

      key,

      label: entry.name || entry.koName || desc.label,

      koName: entry.koName || '',

      reason: entry.reason || '',

      status: entry.status || 'active',

      builtin: false,

    })

  }



  return entries.sort(

    (a, b) =>

      Number(b.status === 'active') - Number(a.status === 'active') ||

      Number(a.builtin) - Number(b.builtin) ||

      a.label.localeCompare(b.label),

  )

}



/** CSV export용 — local + remote merged map (built-in 제외). */

export function loadHiddenPinsExportMap() {

  return mergedHiddenMap()

}



/** @param {Record<string, unknown>} place @param {Set<string>} hiddenKeys */

export function isPlaceHiddenFromSearch(place, hiddenKeys) {

  if (nameMatchesBuiltInRules(place.name ?? place.placeName ?? place.enName)) {

    return true

  }

  const key = getPlaceHideKey(place)

  if (builtInHiddenKeys().has(key)) {

    return true

  }

  return hiddenKeys.has(key)

}



export function loadAdminHiddenSearchKeys() {

  return activeHiddenKeySet()

}



/** @param {Set<string>} _hiddenKeys @param {Record<string, unknown>} place */

export function addAdminHiddenPlace(_hiddenKeys, place) {

  const storage = loadAdminStorageMap()

  const key = getPlaceHideKey(place)

  const prev = storage.get(key)

  storage.set(key, {

    ...placeToHiddenEntry(place),

    reason: prev?.reason || '',

    status: 'active',

  })

  saveAdminStorageMap(storage)

  publishHidden()

  return loadAdminHiddenSearchKeys()

}



/** @param {Set<string>} hiddenKeys @param {string} key */

export function removeAdminHiddenKey(hiddenKeys, key) {

  if (builtInHiddenKeys().has(key)) {

    return hiddenKeys

  }

  const storage = loadAdminStorageMap()

  storage.delete(key)

  saveAdminStorageMap(storage)

  publishHidden()

  return loadAdminHiddenSearchKeys()

}



/** inactive → active 복원 */

export function restoreAdminHiddenKey(_hiddenKeys, key) {

  if (builtInHiddenKeys().has(key)) {

    return loadAdminHiddenSearchKeys()

  }

  const storage = loadAdminStorageMap()

  const prev = storage.get(key) ?? remoteHiddenMap.get(key) ?? entryFromLegacyKey(key)

  storage.set(key, { ...prev, status: 'active' })

  saveAdminStorageMap(storage)

  publishHidden()

  return loadAdminHiddenSearchKeys()

}



/** @param {Set<string>} hiddenKeys @param {Record<string, unknown>} place */

export function removeAdminHiddenPlace(hiddenKeys, place) {

  return removeAdminHiddenKey(hiddenKeys, getPlaceHideKey(place))

}



/** @param {unknown[]} places @param {Set<string>} hiddenKeys */

export function filterVisibleSearchPlaces(places, hiddenKeys) {

  return places.filter((place) => !isPlaceHiddenFromSearch(place, hiddenKeys))

}



/**

 * CSV 등에서 가져온 hidden entries 병합.

 * @param {Array<Record<string, unknown>>} importedRows

 * @param {{ overwrite?: boolean }} [options]

 */

export function mergeImportedHiddenPins(importedRows, options = {}) {

  const { overwrite = false } = options

  const hiddenMap = mergedHiddenMap()

  const storage = loadAdminStorageMap()



  for (const row of importedRows ?? []) {

    const match = findExistingHiddenMatch(row, hiddenMap)

    if (match && !overwrite) {

      continue

    }



    const payload = rowToHiddenEntry(row)

    const keys = buildHiddenImportKeys(row)

    const targetKeys =

      match && overwrite

        ? collectKeysForHiddenEntry(match.key, match.entry, hiddenMap, keys)

        : keys



    for (const key of targetKeys) {

      const prev = storage.get(key) ?? hiddenMap.get(key)

      storage.set(key, {

        ...payload,

        name: payload.name || prev?.name || key,

        koName: payload.koName || prev?.koName || '',

      })

    }



    if (match && overwrite && match.key && !targetKeys.includes(match.key)) {

      storage.set(match.key, {

        ...(storage.get(match.key) ?? match.entry ?? {}),

        ...payload,

      })

    }

  }



  saveAdminStorageMap(storage)

  publishHidden()

  return loadAdminHiddenSearchKeys()

}



function collectKeysForHiddenEntry(matchKey, entry, hiddenMap, importedKeys) {

  const keys = new Set(importedKeys)

  keys.add(matchKey)

  if (entry?.kakaoId) {

    keys.add(`kakao:${entry.kakaoId}`)

  }

  if (Number.isFinite(entry?.lat) && Number.isFinite(entry?.lng)) {

    keys.add(`geo:${entry.lat.toFixed(5)},${entry.lng.toFixed(5)}`)

  }

  for (const key of hiddenMap.keys()) {

    if (hiddenMap.get(key) === entry) {

      keys.add(key)

    }

  }

  return [...keys]

}



/** Admin 패널: localStorage 항목만 JSON (adminHiddenSearch.js 반영용) */

export function exportAdminHiddenConfig() {

  const map = loadAdminStorageMap()

  const names = []

  const keys = []

  for (const [key, entry] of map.entries()) {

    if (!isHiddenActive(entry)) {

      continue

    }

    if (key.startsWith('name:')) {

      names.push(key.slice(5))

    } else {

      keys.push(key)

    }

  }

  return JSON.stringify({ names, namePatterns: [], keys }, null, 2)

}


