/**
 * Image assets CSV Import / Export
 *
 * Storage: Supabase public.image_assets (upsert by place_key)
 */

import { downloadCsvFile, parseCsvDetailed } from './curationCsv'
import { deriveImageAssetPlaceKey } from './imageAssetPlaceKey'

export { downloadCsvFile }

export const IMAGE_ASSET_CSV_HEADERS = [
  'place_name',
  'file_name',
  'image_source',
  'image_author',
  'image_license',
  'image_source_url',
  'notes',
  'is_active',
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
  /** @type {Record<string, number>} */
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

function parseIsActive(value) {
  const raw = String(value ?? '').trim().toLowerCase()
  if (!raw || raw === 'true' || raw === '1' || raw === 'yes') {
    return true
  }
  if (raw === 'false' || raw === '0' || raw === 'no') {
    return false
  }
  return true
}

function rowIsEmpty(values, colIndex) {
  return IMAGE_ASSET_CSV_HEADERS.every((key) => getCell(values, colIndex, key) === '')
}

/** @param {import('./imageAssets').ImageAssetRow} row */
export function imageAssetToCsvRow(row) {
  return {
    place_name: row.place_name ?? '',
    file_name: row.file_name ?? '',
    image_source: row.image_source ?? '',
    image_author: row.image_author ?? '',
    image_license: row.image_license ?? '',
    image_source_url: row.image_source_url ?? '',
    notes: row.notes ?? '',
    is_active: row.is_active === false ? 'false' : 'true',
  }
}

/** @param {import('./imageAssets').ImageAssetRow[]} rows */
export function imageAssetsToCsv(rows) {
  const lines = [IMAGE_ASSET_CSV_HEADERS.join(',')]
  const sorted = [...(rows ?? [])].sort((a, b) =>
    String(a.place_name).localeCompare(String(b.place_name)),
  )
  for (const row of sorted) {
    const csvRow = imageAssetToCsvRow(row)
    lines.push(IMAGE_ASSET_CSV_HEADERS.map((header) => escapeCsvCell(csvRow[header])).join(','))
  }
  return lines.join('\r\n')
}

export function imageAssetsCsvTemplate() {
  return imageAssetsToCsv([
    {
      place_name: 'Gyeongbokgung Palace',
      file_name: 'Gyeongbokgung_Palace.jpg',
      image_source: 'Wikimedia Commons',
      image_author: 'Example Author',
      image_license: 'CC BY-SA 4.0',
      image_source_url: 'https://commons.wikimedia.org/',
      notes: '',
      is_active: true,
    },
  ])
}

export function imageAssetsExportFilename() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `kmap-image_assets-${y}${m}${day}.csv`
}

/**
 * @param {import('./imageAssets').ImageAssetRow[]} [existingRows]
 * @param {string} placeKey
 */
function findExistingByPlaceKey(existingRows, placeKey) {
  return (existingRows ?? []).find((row) => row.place_key === placeKey) ?? null
}

/**
 * @param {string} text
 * @param {import('./imageAssets').ImageAssetRow[]} [existingRows]
 */
export function validateImageAssetsCsvImport(text, existingRows = []) {
  const errors = []
  const rowErrors = []
  const warnings = []
  const previewRows = []
  const duplicates = []
  const { rows, delimiter } = parseCsvDetailed(text)

  if (rows.length === 0) {
    return emptyValidation(['CSV file is empty.'])
  }

  const headerRow = rows[0]
  const colIndex = buildColumnIndex(headerRow)
  const missing = IMAGE_ASSET_CSV_HEADERS.filter((h) => colIndex[h] == null)
  if (missing.length > 0) {
    return emptyValidation([`Missing required column(s): ${missing.join(', ')}`])
  }

  /** Last row wins for duplicate place_key within the same CSV. */
  /** @type {Map<string, { row: Record<string, unknown>, rowNum: number }>} */
  const parsedByPlaceKey = new Map()

  for (let i = 1; i < rows.length; i += 1) {
    const values = rows[i]
    const rowNum = i + 1
    if (rowIsEmpty(values, colIndex)) {
      continue
    }

    const placeName = getCell(values, colIndex, 'place_name')
    const fileName = getCell(values, colIndex, 'file_name')
    const imageSource = getCell(values, colIndex, 'image_source')
    const imageAuthor = getCell(values, colIndex, 'image_author')
    const imageLicense = getCell(values, colIndex, 'image_license')
    const imageSourceUrl = getCell(values, colIndex, 'image_source_url')
    const notes = getCell(values, colIndex, 'notes')
    const isActiveRaw = getCell(values, colIndex, 'is_active')
    const issues = []

    if (!placeName) {
      issues.push('place_name is required')
    }

    const placeKey = deriveImageAssetPlaceKey(placeName)
    if (placeName && !placeKey) {
      issues.push('place_name could not produce a valid place_key')
    }

    const row = {
      place_name: placeName,
      place_key: placeKey,
      file_name: fileName,
      image_source: imageSource,
      image_author: imageAuthor,
      image_license: imageLicense,
      image_source_url: imageSourceUrl,
      notes,
      is_active: parseIsActive(isActiveRaw),
    }

    const valid = issues.length === 0
    if (!valid) {
      rowErrors.push(`Row ${rowNum}: ${issues.join('; ')}`)
    } else {
      if (parsedByPlaceKey.has(placeKey)) {
        const prev = parsedByPlaceKey.get(placeKey)
        warnings.push(
          `Row ${rowNum}: duplicate place_key "${placeKey}" in CSV — row ${prev?.rowNum} will be replaced.`,
        )
      }
      parsedByPlaceKey.set(placeKey, { row, rowNum })
    }

    previewRows.push({
      rowNum,
      placeName,
      fileName,
      placeKey,
      valid,
    })
  }

  const parsedRows = [...parsedByPlaceKey.values()].map((entry) => entry.row)
  let newCount = 0
  let updateCount = 0

  for (const row of parsedRows) {
    const existing = findExistingByPlaceKey(existingRows, row.place_key)
    if (existing) {
      updateCount += 1
      duplicates.push({
        placeKey: row.place_key,
        existingLabel: existing.place_name || existing.place_key,
        importedLabel: row.place_name,
        row,
      })
    } else {
      newCount += 1
    }
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
