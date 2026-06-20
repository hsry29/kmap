/**
 * Hidden pins CSV Import / Export
 *
 * Storage: localStorage kmap:admin-hidden-search:v1 + Supabase app_config.hidden
 */

import { downloadCsvFile, parseCsvDetailed } from './curationCsv'

export { downloadCsvFile }

export const HIDDEN_CSV_HEADERS = [
  'place_name',
  'korean_name',
  'kakao_place_id',
  'lat',
  'lng',
  'category',
  'reason',
  'status',
]

function escapeCsvCell(value) {
  const s = String(value ?? '')
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function normalizeHeaderName(name) {
  return String(name ?? '').trim().toLowerCase()
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

function parseCoord(value) {
  const raw = String(value ?? '').trim().replace(/,/g, '.')
  if (!raw) {
    return NaN
  }
  const n = Number(raw)
  return Number.isFinite(n) ? n : NaN
}

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

export function normalizeHiddenCsvStatus(value) {
  return String(value ?? '').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active'
}

function rowIsEmpty(values, colIndex) {
  return HIDDEN_CSV_HEADERS.every((key) => getCell(values, colIndex, key) === '')
}

/** @param {Record<string, unknown>} row */
export function resolveHiddenStorageKey(row) {
  const kakaoId = normalizeKakaoIdCell(row.kakao_place_id ?? row.kakaoId)
  if (kakaoId) {
    return `kakao:${kakaoId}`
  }
  const lat = Number(row.lat)
  const lng = Number(row.lng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `geo:${lat.toFixed(5)},${lng.toFixed(5)}`
  }
  const en = String(row.place_name ?? row.name ?? '').trim()
  const ko = String(row.korean_name ?? row.koName ?? '').trim()
  if (en && ko) {
    return `name:${en}|${ko}`
  }
  if (en) {
    return `name:${en}`
  }
  return ''
}

function duplicateMatchKey(row) {
  const kakaoId = normalizeKakaoIdCell(row.kakao_place_id)
  if (kakaoId) {
    return `kakao:${kakaoId}`
  }
  const lat = Number(row.lat)
  const lng = Number(row.lng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `geo:${lat.toFixed(5)},${lng.toFixed(5)}`
  }
  const en = String(row.place_name ?? '').trim()
  const ko = String(row.korean_name ?? '').trim()
  if (en && ko) {
    return `name:${en}|${ko}`
  }
  return ''
}

function duplicateMatchType(row) {
  const kakaoId = normalizeKakaoIdCell(row.kakao_place_id)
  if (kakaoId) {
    return 'kakao_place_id'
  }
  const lat = Number(row.lat)
  const lng = Number(row.lng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return 'coordinates'
  }
  const en = String(row.place_name ?? '').trim()
  const ko = String(row.korean_name ?? '').trim()
  if (en && ko) {
    return 'name_pair'
  }
  return 'unknown'
}

/**
 * @param {Record<string, unknown>} row
 * @param {Map<string, unknown>} hiddenMap
 */
export function findExistingHiddenMatch(row, hiddenMap) {
  const kakaoId = normalizeKakaoIdCell(row.kakao_place_id)
  if (kakaoId) {
    const key = `kakao:${kakaoId}`
    const entry = hiddenMap.get(key)
    if (entry) {
      return { key, matchType: 'kakao_place_id', entry }
    }
  }

  const lat = Number(row.lat)
  const lng = Number(row.lng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const geoKey = `geo:${lat.toFixed(5)},${lng.toFixed(5)}`
    const direct = hiddenMap.get(geoKey)
    if (direct) {
      return { key: geoKey, matchType: 'coordinates', entry: direct }
    }
    for (const [key, entry] of hiddenMap.entries()) {
      if (
        Number.isFinite(entry.lat) &&
        Number.isFinite(entry.lng) &&
        Math.abs(entry.lat - lat) < 0.0005 &&
        Math.abs(entry.lng - lng) < 0.0005
      ) {
        return { key, matchType: 'coordinates', entry }
      }
    }
  }

  const en = String(row.place_name ?? '').trim()
  const ko = String(row.korean_name ?? '').trim()
  if (en && ko) {
    for (const [key, entry] of hiddenMap.entries()) {
      if (String(entry.name ?? '').trim() === en && String(entry.koName ?? '').trim() === ko) {
        return { key, matchType: 'name_pair', entry }
      }
    }
  }

  return null
}

function rowFromEntry(key, entry) {
  const kakaoFromKey = key.startsWith('kakao:') ? key.slice(6) : ''
  return {
    place_name: entry.name || '',
    korean_name: entry.koName || '',
    kakao_place_id: entry.kakaoId || kakaoFromKey || '',
    lat: entry.lat,
    lng: entry.lng,
    category: entry.category || '',
    reason: entry.reason || '',
    status: entry.status || 'active',
  }
}

/**
 * @param {Map<string, unknown>} hiddenMap
 */
export function hiddenPinsToCsv(hiddenMap) {
  const lines = [HIDDEN_CSV_HEADERS.join(',')]
  const seen = new Set()
  const rows = []

  for (const [key, entry] of hiddenMap.entries()) {
    if (!entry) {
      continue
    }
    const row = rowFromEntry(key, entry)
    const dedupeKey = duplicateMatchKey(row) || key
    if (seen.has(dedupeKey)) {
      continue
    }
    seen.add(dedupeKey)
    rows.push(row)
  }

  rows.sort((a, b) => String(a.place_name).localeCompare(String(b.place_name)))

  for (const row of rows) {
    lines.push(HIDDEN_CSV_HEADERS.map((header) => escapeCsvCell(row[header])).join(','))
  }

  return lines.join('\r\n')
}

export function hiddenPinsCsvTemplate() {
  return hiddenPinsToCsv(
    new Map([
      [
        'kakao:12345678',
        {
          name: 'Myeongdong Room Cafe',
          koName: '명동 룸카페',
          kakaoId: '12345678',
          lat: 37.5635,
          lng: 126.985,
          category: 'Cafe',
          reason: 'Not suitable for tourists',
          status: 'active',
        },
      ],
    ]),
  )
}

export function hiddenPinsExportFilename() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `kmap-hidden-pins-${y}${m}${day}.csv`
}

/** @param {Record<string, unknown>} row */
export function buildHiddenImportKeys(row) {
  const keys = new Set()
  const kakaoId = String(row.kakao_place_id ?? '').trim()
  if (kakaoId) {
    keys.add(`kakao:${kakaoId}`)
  }
  const lat = Number(row.lat)
  const lng = Number(row.lng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    keys.add(`geo:${lat.toFixed(5)},${lng.toFixed(5)}`)
  }
  const en = String(row.place_name ?? '').trim()
  const ko = String(row.korean_name ?? '').trim()
  if (en) {
    keys.add(`name:${en}`)
  }
  if (ko) {
    keys.add(`name:${ko}`)
  }
  if (en && ko) {
    keys.add(`name:${en}|${ko}`)
  }
  return [...keys]
}

/**
 * @param {string} text
 * @param {Map<string, unknown>} [hiddenMap]
 */
export function validateHiddenPinsCsvImport(text, hiddenMap = new Map()) {
  const errors = []
  const rowErrors = []
  const warnings = []
  const previewRows = []
  const duplicates = []
  const parsedRows = []
  const { rows, delimiter } = parseCsvDetailed(text)

  if (rows.length === 0) {
    return emptyValidation(['CSV file is empty.'])
  }

  const headerRow = rows[0]
  const colIndex = buildColumnIndex(headerRow)
  const missing = HIDDEN_CSV_HEADERS.filter((h) => colIndex[h] == null)
  if (missing.length > 0) {
    return emptyValidation([`Missing required column(s): ${missing.join(', ')}`])
  }

  const fileDupKeys = new Map()
  let newCount = 0
  let updateCount = 0

  for (let i = 1; i < rows.length; i += 1) {
    const values = rows[i]
    const rowNum = i + 1
    if (rowIsEmpty(values, colIndex)) {
      continue
    }

    const placeName = getCell(values, colIndex, 'place_name')
    const koreanName = getCell(values, colIndex, 'korean_name')
    const kakaoPlaceId = normalizeKakaoIdCell(getCell(values, colIndex, 'kakao_place_id'))
    const lat = parseCoord(getCell(values, colIndex, 'lat'))
    const lng = parseCoord(getCell(values, colIndex, 'lng'))
    const category = getCell(values, colIndex, 'category')
    const reason = getCell(values, colIndex, 'reason')
    const statusRaw = getCell(values, colIndex, 'status')
    const statusNorm = statusRaw ? normalizeHiddenCsvStatus(statusRaw) : 'active'
    const issues = []

    if (!placeName) {
      issues.push('place_name is required')
    }
    if (!Number.isFinite(lat)) {
      issues.push('lat must be a number')
    }
    if (!Number.isFinite(lng)) {
      issues.push('lng must be a number')
    }
    if (statusRaw && statusRaw.toLowerCase() !== 'active' && statusRaw.toLowerCase() !== 'inactive') {
      issues.push('status must be active or inactive')
    }
    if (!kakaoPlaceId) {
      warnings.push(`Row ${rowNum}: kakao_place_id is empty (recommended for deduplication).`)
    }

    const row = {
      place_name: placeName,
      korean_name: koreanName,
      kakao_place_id: kakaoPlaceId,
      lat,
      lng,
      category,
      reason,
      status: statusNorm,
      storageKey: '',
    }

    if (issues.length === 0) {
      row.storageKey = resolveHiddenStorageKey(row)
      if (!row.storageKey) {
        issues.push('Could not derive a storage key (need kakao_place_id or lat/lng or place_name)')
      }
    }

    const valid = issues.length === 0
    if (!valid) {
      rowErrors.push(`Row ${rowNum}: ${issues.join('; ')}`)
    } else {
      parsedRows.push(row)

      const dupKey = duplicateMatchKey(row)
      if (dupKey) {
        if (fileDupKeys.has(dupKey)) {
          rowErrors.push(
            `Row ${rowNum}: duplicate within CSV (${duplicateMatchType(row)} matches row ${fileDupKeys.get(dupKey)})`,
          )
        } else {
          fileDupKeys.set(dupKey, rowNum)
        }
      }

      const existing = findExistingHiddenMatch(row, hiddenMap)
      if (existing) {
        updateCount += 1
        duplicates.push({
          matchKey: dupKey || existing.key,
          matchType: existing.matchType,
          kakaoPlaceId: kakaoPlaceId || undefined,
          existingLabel: existing.entry?.name || existing.key,
          importedLabel: placeName,
          row,
        })
      } else {
        newCount += 1
      }
    }

    previewRows.push({
      rowNum,
      placeName,
      koreanName,
      kakaoPlaceId,
      status: statusNorm,
      valid,
    })
  }

  if (delimiter !== ',') {
    warnings.unshift(`Detected "${delimiter}" delimiter — comma-separated CSV is recommended.`)
  }

  const ok = errors.length === 0 && rowErrors.length === 0 && parsedRows.length > 0
  if (parsedRows.length === 0 && rowErrors.length === 0) {
    errors.push('No data rows found (header only).')
  }

  return {
    ok,
    rows: parsedRows,
    errors,
    rowErrors,
    warnings,
    previewRows,
    duplicates,
    stats: {
      rowCount: previewRows.length,
      newCount,
      updateCount,
      duplicateCount: duplicates.length,
    },
  }
}

function emptyValidation(errors) {
  return {
    ok: false,
    rows: [],
    errors,
    rowErrors: [],
    warnings: [],
    previewRows: [],
    duplicates: [],
    stats: { rowCount: 0, newCount: 0, updateCount: 0, duplicateCount: 0 },
  }
}
