/**
 * Patch best_time column in kmap-curation.csv → visit-time categories.
 * Usage: node scripts/patch-best-time-csv.mjs [csv-path]
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mapBestTimeToCategory } from './bestTimeCategories.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const defaultPath = path.resolve(ROOT, '..', 'kmap-curation.csv')
const csvPath = path.resolve(process.argv[2] || defaultPath)

function escapeCsvCell(value) {
  const s = String(value ?? '')
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function parseCsvDetailed(text) {
  const raw = String(text ?? '').replace(/^\uFEFF/, '')
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
    } else if (ch === ',') {
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

  return rows.filter((r) => r.some((c) => String(c).trim() !== ''))
}

if (!fs.existsSync(csvPath)) {
  console.error(`File not found: ${csvPath}`)
  process.exit(1)
}

const raw = fs.readFileSync(csvPath, 'utf8')
const hadBom = raw.startsWith('\uFEFF')
const rows = parseCsvDetailed(raw)

if (rows.length < 2) {
  console.error('CSV has no data rows')
  process.exit(1)
}

const header = rows[0].map((h) => String(h).trim().toLowerCase())
const bestTimeIdx = header.indexOf('best_time')
if (bestTimeIdx < 0) {
  console.error('Missing best_time column')
  process.exit(1)
}

/** @type {Record<string, number>} */
const before = {}
/** @type {Record<string, number>} */
const after = {}
let changed = 0

for (let r = 1; r < rows.length; r += 1) {
  const prev = String(rows[r][bestTimeIdx] ?? '').trim()
  const next = mapBestTimeToCategory(prev)
  before[prev || '(empty)'] = (before[prev || '(empty)'] ?? 0) + 1
  after[next || '(empty)'] = (after[next || '(empty)'] ?? 0) + 1
  if (prev !== next) {
    changed += 1
    rows[r][bestTimeIdx] = next
  }
}

const out =
  (hadBom ? '\uFEFF' : '') +
  rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')

fs.writeFileSync(csvPath, out, 'utf8')

console.log(`Patched: ${csvPath}`)
console.log(`Rows: ${rows.length - 1}, changed best_time: ${changed}`)
console.log('\nCategory counts:')
for (const [k, n] of Object.entries(after).sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`  ${k}: ${n}`)
}

const unmapped = Object.keys(before).filter(
  (k) => k !== '(empty)' && k !== 'Early April' && before[k] > 0 && mapBestTimeToCategory(k) === k,
)
if (unmapped.length) {
  console.log(`\nUnmapped (kept as-is): ${unmapped.join(', ')}`)
}
