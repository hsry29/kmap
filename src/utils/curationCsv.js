/**
 * 큐레이션 컬렉션 CSV Import / Export
 *
 * Supabase app_config.collections 와 동일한 구조:
 *   { id, title, type: 'route'|'spots', pin, status, places: [...] }
 *
 * CSV: 장소 1행 = 1 row (같은 collection_name 은 하나의 컬렉션으로 묶임)
 */

import { CURATION_FIELDS, curationFromAdminForm, normalizeCuration } from './adminCuration'
import { DEFAULT_CURATION_LANG, resolveLocalizedField } from './curationI18n'
import { DEFAULT_PIN_ID } from '../data/pinDesigns'
import { normalizeCollectionType } from './collectionTypes'
import { resolvePlaceImageUrl } from './placeImage'

/** CSV 헤더(엑셀 1행). Import / Export 공통. */
export const CSV_HEADERS = [
  'collection_name',
  'type',
  'place_name',
  'korean_name',
  'kakao_place_id',
  'lat',
  'lng',
  'image_url',
  'why_visit',
  'best_time',
  'time_needed',
  'tips',
  'next_spot',
  'status',
]

/** 이전 CSV 형식 헤더 → 신규 헤더 (하위 호환). */
const LEGACY_HEADER_ALIASES = {
  collection_title: 'collection_name',
  collection_status: 'status',
  collection_type: 'type',
  en_name: 'place_name',
  ko_name: 'korean_name',
}

/** 레거시 CSV 호환 — 없어도 import 가능. */
const OPTIONAL_CSV_HEADERS = new Set(['type', 'image_url'])

const CURATION_CSV_KEYS = {
  why_visit: 'whyVisit',
  best_time: 'bestTime',
  time_needed: 'timeNeeded',
  tips: 'tips',
  next_spot: 'nextStop',
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function escapeCsvCell(value) {
  const s = String(value ?? '')
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function normalizeCsvStatus(value) {
  return String(value ?? '').trim().toLowerCase() === 'published' ? 'published' : 'draft'
}

function normalizeHeaderName(name) {
  const lower = String(name ?? '').trim().toLowerCase()
  return LEGACY_HEADER_ALIASES[lower] ?? lower
}

function resolveKakaoIdFromPlace(place) {
  const direct = String(place?.kakaoId ?? '').trim()
  if (direct) {
    return direct
  }
  const id = String(place?.id ?? '').trim()
  if (id.startsWith('kakao-')) {
    return id.slice(6)
  }
  return ''
}

function detectCsvDelimiter(firstLine) {
  const line = String(firstLine ?? '')
  const commaCount = (line.match(/,/g) || []).length
  const semiCount = (line.match(/;/g) || []).length
  const tabCount = (line.match(/\t/g) || []).length
  if (semiCount > commaCount && semiCount >= 8) {
    return ';'
  }
  if (tabCount > commaCount && tabCount >= 8) {
    return '\t'
  }
  return ','
}

function parseCoord(value) {
  const raw = String(value ?? '').trim().replace(/,/g, '.')
  if (!raw) {
    return NaN
  }
  const n = Number(raw)
  return Number.isFinite(n) ? n : NaN
}

/** 스프레드시트가 큰 ID를 지수 표기(6.8E+08)로 저장한 경우 복구. */
function normalizeKakaoIdCell(value) {
  const s = String(value ?? '').trim()
  if (!s) {
    return ''
  }
  if (/e[+-]?\d+/i.test(s)) {
    const n = Number(s)
    if (Number.isFinite(n)) {
      return String(Math.round(n))
    }
  }
  if (/^\d+\.0+$/.test(s)) {
    return s.split('.')[0]
  }
  return s
}

/** RFC4180-style CSV parser (quoted fields, UTF-8 BOM). 구분자 자동 감지(, ; 탭). */
export function parseCsvDetailed(text) {
  const raw = String(text ?? '').replace(/^\uFEFF/, '')
  const firstLine = raw.split(/\r?\n/, 1)[0] ?? ''
  const delimiter = detectCsvDelimiter(firstLine)
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i]
    const next = raw[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"'
        i += 1
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      row.push(cell)
      cell = ''
    } else if (ch === '\r' && next === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      i += 1
    } else if (ch === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  const filtered = rows.filter((r) => r.some((c) => String(c).trim() !== ''))
  return { rows: filtered, delimiter }
}

export function parseCsv(text) {
  return parseCsvDetailed(text).rows
}

function buildColumnIndex(headerRow) {
  const normalized = headerRow.map(normalizeHeaderName)
  const colIndex = {}
  for (let i = 0; i < normalized.length; i += 1) {
    colIndex[normalized[i]] = i
  }
  return colIndex
}

function getCell(values, colIndex, key) {
  const idx = colIndex[key]
  if (idx == null) {
    return ''
  }
  return String(values[idx] ?? '').trim()
}

function rowIsEmpty(values, colIndex) {
  return CSV_HEADERS.filter((key) => !OPTIONAL_CSV_HEADERS.has(key)).every(
    (key) => getCell(values, colIndex, key) === '',
  )
}

/**
 * 컬렉션 배열 → CSV 문자열.
 * @param {Array<Record<string, unknown>>} collections
 */
export function collectionsToCsv(collections) {
  const lines = [CSV_HEADERS.join(',')]
  for (const col of collections ?? []) {
    const places = Array.isArray(col.places) ? col.places : []
    if (places.length === 0) {
      lines.push(
        [col.title, col.type ?? 'route', '', '', '', '', '', '', '', '', '', '', '', col.status ?? 'draft']
          .map(escapeCsvCell)
          .join(','),
      )
      continue
    }
    places.forEach((place) => {
      const c = normalizeCuration(place.curation)
      lines.push(
        [
          col.title,
          col.type ?? 'route',
          place.enName,
          place.koName,
          resolveKakaoIdFromPlace(place),
          place.lat,
          place.lng,
          resolvePlaceImageUrl(place),
          resolveLocalizedField(c.whyVisit, DEFAULT_CURATION_LANG),
          resolveLocalizedField(c.bestTime, DEFAULT_CURATION_LANG),
          resolveLocalizedField(c.timeNeeded, DEFAULT_CURATION_LANG),
          resolveLocalizedField(c.tips, DEFAULT_CURATION_LANG),
          c.nextStop,
          col.status ?? 'draft',
        ]
          .map(escapeCsvCell)
          .join(','),
      )
    })
  }
  return lines.join('\r\n')
}

/** 빈 템플릿 CSV(헤더 + 예시 1행). */
export function curationCsvTemplate() {
  return collectionsToCsv([
    {
      id: '',
      title: 'Seoul Night View Tour',
      type: 'route',
      pin: 'default',
      status: 'draft',
      places: [
        {
          id: '',
          enName: 'N Seoul Tower',
          koName: 'N서울타워',
          lat: 37.551305,
          lng: 126.988231,
          kakaoId: '12345678',
          imageUrl: '',
          curation: {
            whyVisit: { en: 'Best landmark for first-time Seoul night views.' },
            bestTime: { en: 'Arrive 30 min before sunset' },
            timeNeeded: { en: 'About 1.5–2 hours' },
            tips: { en: 'Weekend evenings are very crowded.' },
            nextStop: 'Myeongdong street food (15 min walk)',
          },
        },
      ],
    },
  ])
}

/**
 * CSV 파싱 + 검증 + 미리보기.
 * @param {string} text
 * @param {Array<Record<string, unknown>>} [existingCollections]
 */
export function validateCsvImport(text, existingCollections = []) {
  const fatalErrors = []
  const rowErrors = []
  const warnings = []
  const previewRows = []
  const { rows, delimiter } = parseCsvDetailed(text)

  if (rows.length === 0) {
    return {
      ok: false,
      collections: [],
      errors: ['CSV file is empty.'],
      rowErrors: [],
      warnings: [],
      previewRows: [],
      duplicates: [],
      stats: {
        rowCount: 0,
        collectionCount: 0,
        placeCount: 0,
        duplicateCount: 0,
        newCollections: 0,
        updatedCollections: 0,
      },
    }
  }

  const headerRow = rows[0]
  const colIndex = buildColumnIndex(headerRow)
  const missing = CSV_HEADERS.filter((h) => !OPTIONAL_CSV_HEADERS.has(h) && colIndex[h] == null)
  if (missing.length > 0) {
    return {
      ok: false,
      collections: [],
      errors: [
        `Missing columns: ${missing.join(', ')}.`,
        `Expected: ${CSV_HEADERS.join(', ')}`,
        delimiter === ';' || delimiter === '\t'
          ? `Detected "${delimiter === ';' ? 'semicolon' : 'tab'}" delimiter — re-save CSV with comma (,) separator in LibreOffice/Excel.`
          : 'If guide text contains commas, wrap those cells in double quotes. Set kakao_place_id column to Text format before saving.',
      ],
      rowErrors: [],
      warnings: [],
      previewRows: [],
      duplicates: [],
      stats: {
        rowCount: rows.length - 1,
        collectionCount: 0,
        placeCount: 0,
        duplicateCount: 0,
        newCollections: 0,
        updatedCollections: 0,
      },
    }
  }

  const collectionMap = new Map()
  const collectionStatusByTitle = new Map()
  const collectionTypeByTitle = new Map()
  const seenKakaoInCollection = new Map()

  const expectedColCount = headerRow.length

  for (let r = 1; r < rows.length; r += 1) {
    const values = rows[r]
    const rowNum = r + 1

    if (rowIsEmpty(values, colIndex)) {
      continue
    }

    if (values.length !== expectedColCount) {
      rowErrors.push(
        `Row ${rowNum}: found ${values.length} columns but header has ${expectedColCount}. Wrap cells that contain commas in double quotes before saving.`,
      )
      previewRows.push({
        rowNum,
        collectionName: getCell(values, colIndex, 'collection_name'),
        placeName: getCell(values, colIndex, 'place_name'),
        koreanName: getCell(values, colIndex, 'korean_name'),
        kakaoPlaceId: getCell(values, colIndex, 'kakao_place_id'),
        lat: getCell(values, colIndex, 'lat'),
        lng: getCell(values, colIndex, 'lng'),
        status: normalizeCsvStatus(getCell(values, colIndex, 'status') || 'draft'),
        valid: false,
        issues: ['column count mismatch'],
      })
      continue
    }

    const collectionName = getCell(values, colIndex, 'collection_name')
    const placeName = getCell(values, colIndex, 'place_name')
    const koreanName = getCell(values, colIndex, 'korean_name')
    const kakaoPlaceId = normalizeKakaoIdCell(getCell(values, colIndex, 'kakao_place_id'))
    const latRaw = getCell(values, colIndex, 'lat')
    const lngRaw = getCell(values, colIndex, 'lng')
    const status = normalizeCsvStatus(getCell(values, colIndex, 'status') || 'draft')
    const rowIssues = []

    if (!collectionName) {
      rowErrors.push(`Row ${rowNum}: collection_name is required — skipped.`)
      previewRows.push({
        rowNum,
        collectionName: '',
        placeName,
        koreanName,
        kakaoPlaceId,
        lat: latRaw,
        lng: lngRaw,
        status,
        valid: false,
        issues: ['collection_name is required'],
      })
      continue
    }

    const lat = parseCoord(latRaw)
    const lng = parseCoord(lngRaw)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      rowErrors.push(`Row ${rowNum}: lat/lng must be valid numbers for "${collectionName}" — skipped.`)
      rowIssues.push('lat/lng invalid')
      previewRows.push({
        rowNum,
        collectionName,
        placeName,
        koreanName,
        kakaoPlaceId,
        lat: latRaw,
        lng: lngRaw,
        status,
        valid: false,
        issues: rowIssues,
      })
      continue
    }

    if (!placeName && !koreanName) {
      warnings.push(`Row ${rowNum}: place_name and korean_name are both empty — using coordinates as label.`)
      rowIssues.push('no place name')
    }

    const titleKey = collectionName.toLowerCase()
    const prevStatus = collectionStatusByTitle.get(titleKey)
    if (prevStatus != null && prevStatus !== status) {
      warnings.push(
        `Row ${rowNum}: "${collectionName}" has status "${status}" but earlier rows used "${prevStatus}". Last row wins.`,
      )
    }
    collectionStatusByTitle.set(titleKey, status)

    const collectionType = normalizeCollectionType(getCell(values, colIndex, 'type') || 'route')
    const prevType = collectionTypeByTitle.get(titleKey)
    if (prevType != null && prevType !== collectionType) {
      warnings.push(
        `Row ${rowNum}: "${collectionName}" has type "${collectionType}" but earlier rows used "${prevType}". Last row wins.`,
      )
    }
    collectionTypeByTitle.set(titleKey, collectionType)

    if (kakaoPlaceId) {
      const kakaoKey = `${titleKey}::${kakaoPlaceId}`
      if (seenKakaoInCollection.has(kakaoKey)) {
        warnings.push(
          `Row ${rowNum}: duplicate kakao_place_id "${kakaoPlaceId}" in "${collectionName}" — last row wins.`,
        )
        rowIssues.push('duplicate kakao_place_id in CSV')
      }
      seenKakaoInCollection.set(kakaoKey, rowNum)
    }

    const curationFields = {}
    let hasCuration = false
    for (const [csvKey, objKey] of Object.entries(CURATION_CSV_KEYS)) {
      const val = getCell(values, colIndex, csvKey)
      if (val) {
        curationFields[objKey] = val
        hasCuration = true
      }
    }

    const mapKey = titleKey
    if (!collectionMap.has(mapKey)) {
      collectionMap.set(mapKey, {
        id: uid('col'),
        title: collectionName,
        type: collectionType,
        pin: DEFAULT_PIN_ID,
        status,
        places: [],
      })
    }

    const col = collectionMap.get(mapKey)
    col.title = collectionName
    col.status = status
    col.type = collectionType

    const place = {
      id: kakaoPlaceId ? `kakao-${kakaoPlaceId}` : uid('colplace'),
      enName: placeName,
      koName: koreanName,
      lat,
      lng,
      imageUrl: resolvePlaceImageUrl({ image_url: getCell(values, colIndex, 'image_url') }),
      koAddress: '',
      phone: '',
      placeUrl: '',
      kakaoId: kakaoPlaceId,
      isPremium: false,
      partnerPerk: '',
      curation: hasCuration ? curationFromAdminForm(curationFields) : null,
      _importOrder: col.places.length + 1,
    }

    col.places.push(place)

    previewRows.push({
      rowNum,
      collectionName,
      placeName: placeName || koreanName || `${lat}, ${lng}`,
      koreanName,
      kakaoPlaceId,
      imageUrl: place.imageUrl,
      lng: lngRaw,
      status,
      valid: true,
      issues: rowIssues,
    })
  }

  const collections = [...collectionMap.values()].map((col) => ({
    ...col,
    places: col.places
      .sort((a, b) => (a._importOrder ?? 0) - (b._importOrder ?? 0))
      .map(({ _importOrder, ...p }) => p),
  }))

  if (collections.length === 0) {
    fatalErrors.push('No valid data rows found. Check collection_name and lat/lng columns.')
  }

  const duplicates = findImportDuplicates(collections, existingCollections)
  const existingTitles = new Set(
    (existingCollections ?? []).map((c) => String(c.title ?? '').trim().toLowerCase()),
  )
  let newCollections = 0
  let updatedCollections = 0
  for (const col of collections) {
    if (existingTitles.has(col.title.toLowerCase())) {
      updatedCollections += 1
    } else {
      newCollections += 1
    }
  }

  const placeCount = collections.reduce((sum, col) => sum + col.places.length, 0)

  return {
    ok: fatalErrors.length === 0 && collections.length > 0,
    collections,
    errors: fatalErrors,
    rowErrors,
    warnings,
    previewRows,
    duplicates,
    stats: {
      rowCount: rows.length - 1,
      collectionCount: collections.length,
      placeCount,
      duplicateCount: duplicates.length,
      newCollections,
      updatedCollections,
    },
  }
}

/**
 * CSV 문자열 → 컬렉션 배열(정규화 전 raw merge 입력용).
 * @returns {{ collections: object[], errors: string[], rowCount: number }}
 */
export function csvToCollections(text) {
  const result = validateCsvImport(text, [])
  return {
    collections: result.collections,
    errors: [...result.errors, ...result.rowErrors],
    rowCount: result.stats.rowCount,
  }
}

function placeMatchKeys(place) {
  const keys = []
  const kakaoId = resolveKakaoIdFromPlace(place)
  if (kakaoId) {
    keys.push(`kakao:${kakaoId}`)
  }
  if (place.id) {
    keys.push(`id:${place.id}`)
  }
  if (Number.isFinite(place.lat) && Number.isFinite(place.lng)) {
    keys.push(`geo:${place.lat.toFixed(5)},${place.lng.toFixed(5)}`)
  }
  return keys
}

/**
 * Import 대상과 기존 컬렉션 간 중복 장소 탐지.
 * @returns {Array<{ collectionTitle: string, matchKey: string, matchType: string, existingLabel: string, importedLabel: string, kakaoPlaceId: string }>}
 */
export function findImportDuplicates(importedCollections, existingCollections) {
  const duplicates = []
  const existingByTitle = new Map(
    (existingCollections ?? []).map((c) => [String(c.title ?? '').trim().toLowerCase(), c]),
  )

  for (const importedCol of importedCollections ?? []) {
    const existingCol = existingByTitle.get(importedCol.title.toLowerCase())
    if (!existingCol) {
      continue
    }

    const existingIndex = new Map()
    for (const place of existingCol.places ?? []) {
      for (const key of placeMatchKeys(place)) {
        if (!existingIndex.has(key)) {
          existingIndex.set(key, place)
        }
      }
    }

    for (const importedPlace of importedCol.places ?? []) {
      let matched = null
      let matchType = ''
      let matchKey = ''

      const kakaoId = resolveKakaoIdFromPlace(importedPlace)
      if (kakaoId) {
        const key = `kakao:${kakaoId}`
        if (existingIndex.has(key)) {
          matched = existingIndex.get(key)
          matchType = 'kakao_place_id'
          matchKey = key
        }
      }

      if (!matched && importedPlace.id) {
        const key = `id:${importedPlace.id}`
        if (existingIndex.has(key)) {
          matched = existingIndex.get(key)
          matchType = 'place_id'
          matchKey = key
        }
      }

      if (!matched && Number.isFinite(importedPlace.lat) && Number.isFinite(importedPlace.lng)) {
        const key = `geo:${importedPlace.lat.toFixed(5)},${importedPlace.lng.toFixed(5)}`
        if (existingIndex.has(key)) {
          matched = existingIndex.get(key)
          matchType = 'coordinates'
          matchKey = key
        }
      }

      if (matched) {
        duplicates.push({
          collectionTitle: importedCol.title,
          matchKey,
          matchType,
          kakaoPlaceId: kakaoId || resolveKakaoIdFromPlace(matched),
          existingLabel: matched.enName || matched.koName || matched.id,
          importedLabel: importedPlace.enName || importedPlace.koName || importedPlace.id,
        })
      }
    }
  }

  return duplicates
}

export function downloadCsvFile(text, filename = 'kmap-curation.csv') {
  const blob = new Blob(['\uFEFF', text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** CURATION_FIELDS 라벨 → CSV 컬럼명 (문서용). */
export const CSV_FIELD_GUIDE = CURATION_FIELDS.map((f) => ({
  label: f.label,
  csvColumn:
    f.key === 'whyVisit'
      ? 'why_visit'
      : f.key === 'bestTime'
        ? 'best_time'
        : f.key === 'timeNeeded'
          ? 'time_needed'
          : f.key === 'nextStop'
            ? 'next_spot'
            : f.key,
}))
