/**
 * Partner stores CSV Import / Export
 *
 * Storage: localStorage kmap:admin-partners:v1 + Supabase app_config.partners
 */

import {
  downloadCsvFile,
  normalizeCsvStatus,
  parseCsvDetailed,
} from './curationCsv'

export { downloadCsvFile }

/** CSV 헤더(엑셀 1행). Import / Export 공통. */
export const PARTNER_CSV_HEADERS = [
  'partner_name',
  'korean_name',
  'kakao_place_id',
  'lat',
  'lng',
  'category',
  'address',
  'partner_perk',
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

function rowIsEmpty(values, colIndex) {
  return PARTNER_CSV_HEADERS.every((key) => getCell(values, colIndex, key) === '')
}

/** @param {Record<string, unknown>} row */
export function resolvePartnerStorageKey(row) {
  const kakaoId = normalizeKakaoIdCell(row.kakao_place_id ?? row.kakaoId)
  if (kakaoId) {
    return `kakao:${kakaoId}`
  }
  const lat = Number(row.lat)
  const lng = Number(row.lng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `geo:${lat.toFixed(5)},${lng.toFixed(5)}`
  }
  const en = String(row.partner_name ?? row.name ?? '').trim()
  const ko = String(row.korean_name ?? row.koName ?? '').trim()
  if (en && ko) {
    return `name:${en}|${ko}`
  }
  if (en) {
    return `name:${en}`
  }
  return ''
}

/** @param {Record<string, unknown>} row */
export function buildPartnerAliasKeys(row) {
  const keys = new Set()
  const primary = resolvePartnerStorageKey(row)
  if (primary) {
    keys.add(primary)
  }
  const kakaoId = normalizeKakaoIdCell(row.kakao_place_id ?? row.kakaoId)
  if (kakaoId) {
    keys.add(`kakao:${kakaoId}`)
  }
  const lat = Number(row.lat)
  const lng = Number(row.lng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    keys.add(`geo:${lat.toFixed(5)},${lng.toFixed(5)}`)
  }
  const en = String(row.partner_name ?? row.name ?? '').trim()
  const ko = String(row.korean_name ?? row.koName ?? '').trim()
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
  const en = String(row.partner_name ?? '').trim()
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
  const en = String(row.partner_name ?? '').trim()
  const ko = String(row.korean_name ?? '').trim()
  if (en && ko) {
    return 'name_pair'
  }
  return 'unknown'
}

/**
 * @param {Record<string, unknown>} row
 * @param {Map<string, unknown>} partnerMap
 */
export function findExistingPartnerMatch(row, partnerMap) {
  const kakaoId = normalizeKakaoIdCell(row.kakao_place_id)
  if (kakaoId) {
    const key = `kakao:${kakaoId}`
    const entry = partnerMap.get(key)
    if (entry && entry.enabled !== false) {
      return { key, matchType: 'kakao_place_id', entry }
    }
  }

  const lat = Number(row.lat)
  const lng = Number(row.lng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const geoKey = `geo:${lat.toFixed(5)},${lng.toFixed(5)}`
    const direct = partnerMap.get(geoKey)
    if (direct && direct.enabled !== false) {
      return { key: geoKey, matchType: 'coordinates', entry: direct }
    }
    for (const [key, entry] of partnerMap.entries()) {
      if (entry.enabled === false) {
        continue
      }
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

  const en = String(row.partner_name ?? '').trim()
  const ko = String(row.korean_name ?? '').trim()
  if (en && ko) {
    for (const [key, entry] of partnerMap.entries()) {
      if (entry.enabled === false) {
        continue
      }
      const entryEn = String(entry.name ?? '').trim()
      const entryKo = String(entry.koName ?? '').trim()
      if (entryEn === en && entryKo === ko) {
        return { key, matchType: 'name_pair', entry }
      }
    }
  }

  return null
}

function rowFromEntry(key, entry) {
  const kakaoFromKey = key.startsWith('kakao:') ? key.slice(6) : ''
  return {
    partner_name: entry.name || '',
    korean_name: entry.koName || '',
    kakao_place_id: entry.kakaoId || kakaoFromKey || '',
    lat: entry.lat,
    lng: entry.lng,
    category: entry.category || '',
    address: entry.koAddress || '',
    partner_perk: entry.perk || '',
    status: entry.status || 'published',
  }
}

/**
 * @param {Map<string, unknown>} partnerMap
 */
export function partnersToCsv(partnerMap) {
  const lines = [PARTNER_CSV_HEADERS.join(',')]
  const seen = new Set()
  const rows = []

  for (const [key, entry] of partnerMap.entries()) {
    if (!entry || entry.enabled === false) {
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

  rows.sort((a, b) => String(a.partner_name).localeCompare(String(b.partner_name)))

  for (const row of rows) {
    lines.push(
      PARTNER_CSV_HEADERS.map((header) => escapeCsvCell(row[header]))
        .join(','),
    )
  }

  return lines.join('\r\n')
}

export function partnersCsvTemplate() {
  return partnersToCsv(
    new Map([
      [
        'kakao:12345678',
        {
          name: 'Myeongdong K-BBQ House',
          koName: '명동 케이비비큐 하우스',
          kakaoId: '12345678',
          lat: 37.5635,
          lng: 126.985,
          category: 'Korean BBQ',
          koAddress: '서울 중구 명동길 00',
          perk: 'Show this screen to get 10% off.',
          status: 'draft',
          enabled: true,
        },
      ],
    ]),
  )
}

export function partnerExportFilename() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `kmap-partners-${y}${m}${day}.csv`
}

/**
 * @param {string} text
 * @param {Map<string, unknown>} [partnerMap]
 */
export function validatePartnersCsvImport(text, partnerMap = new Map()) {
  const errors = []
  const rowErrors = []
  const warnings = []
  const previewRows = []
  const duplicates = []
  const parsedRows = []
  const { rows, delimiter } = parseCsvDetailed(text)

  if (rows.length === 0) {
    return {
      ok: false,
      rows: [],
      errors: ['CSV file is empty.'],
      rowErrors: [],
      warnings: [],
      previewRows: [],
      duplicates: [],
      stats: { rowCount: 0, newCount: 0, updateCount: 0, duplicateCount: 0 },
    }
  }

  const headerRow = rows[0]
  const colIndex = buildColumnIndex(headerRow)
  const missing = PARTNER_CSV_HEADERS.filter((h) => colIndex[h] == null)
  if (missing.length > 0) {
    return {
      ok: false,
      rows: [],
      errors: [`Missing required column(s): ${missing.join(', ')}`],
      rowErrors: [],
      warnings: [],
      previewRows: [],
      duplicates: [],
      stats: { rowCount: 0, newCount: 0, updateCount: 0, duplicateCount: 0 },
    }
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

    const partnerName = getCell(values, colIndex, 'partner_name')
    const koreanName = getCell(values, colIndex, 'korean_name')
    const kakaoPlaceId = normalizeKakaoIdCell(getCell(values, colIndex, 'kakao_place_id'))
    const lat = parseCoord(getCell(values, colIndex, 'lat'))
    const lng = parseCoord(getCell(values, colIndex, 'lng'))
    const category = getCell(values, colIndex, 'category')
    const address = getCell(values, colIndex, 'address')
    const partnerPerk = getCell(values, colIndex, 'partner_perk')
    const statusRaw = getCell(values, colIndex, 'status')
    const statusNorm = statusRaw ? normalizeCsvStatus(statusRaw) : 'draft'
    const issues = []

    if (!partnerName) {
      issues.push('partner_name is required')
    }
    if (!Number.isFinite(lat)) {
      issues.push('lat must be a number')
    }
    if (!Number.isFinite(lng)) {
      issues.push('lng must be a number')
    }
    if (statusRaw && statusRaw.toLowerCase() !== 'draft' && statusRaw.toLowerCase() !== 'published') {
      issues.push('status must be draft or published')
    }
    if (!kakaoPlaceId) {
      warnings.push(`Row ${rowNum}: kakao_place_id is empty (recommended for deduplication).`)
    }

    const row = {
      partner_name: partnerName,
      korean_name: koreanName,
      kakao_place_id: kakaoPlaceId,
      lat,
      lng,
      category,
      address,
      partner_perk: partnerPerk,
      status: statusNorm,
      storageKey: '',
    }

    if (issues.length === 0) {
      row.storageKey = resolvePartnerStorageKey(row)
      if (!row.storageKey) {
        issues.push('Could not derive a storage key (need kakao_place_id or lat/lng or partner_name)')
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

      const existing = findExistingPartnerMatch(row, partnerMap)
      if (existing) {
        updateCount += 1
        duplicates.push({
          matchKey: dupKey || existing.key,
          matchType: existing.matchType,
          kakaoPlaceId: kakaoPlaceId || undefined,
          existingLabel: existing.entry?.name || existing.key,
          importedLabel: partnerName,
          row,
        })
      } else {
        newCount += 1
      }
    }

    previewRows.push({
      rowNum,
      partnerName,
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
