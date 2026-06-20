/**
 * Enrich curation CSV rows missing korean_name / kakao_place_id / lat / lng
 * via Kakao Local keyword search (place_name + optional Seoul bias).
 *
 * Usage:
 *   node scripts/enrich-curation-csv.mjs [input.csv] [output.csv]
 *   node scripts/enrich-curation-csv.mjs scripts/seoul-first-trip.csv
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

function loadEnv() {
  const envPath = path.join(ROOT, '.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!m || process.env[m[1]]) continue
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}
loadEnv()

const REST_KEY = process.env.KAKAO_REST_API_KEY
if (!REST_KEY) {
  console.error('KAKAO_REST_API_KEY required in .env')
  process.exit(1)
}

const SEOUL = { lat: 37.5665, lng: 126.978 }
const SLEEP_MS = 150

const SEARCH_HINTS = {
  'Gyeongbokgung Palace': '경복궁',
  'Bukchon Hanok Village': '북촌한옥마을',
  Insadong: '인사동',
  Myeongdong: '명동',
  'N Seoul Tower': 'N서울타워',
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function parseCsv(text) {
  const raw = String(text).replace(/^\uFEFF/, '')
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
      } else if (ch === '"') inQuotes = false
      else cell += ch
      continue
    }
    if (ch === '"') inQuotes = true
    else if (ch === ',') {
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
    } else cell += ch
  }
  if (cell.length || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => String(c).trim()))
}

function escapeCsvCell(value) {
  const s = String(value ?? '')
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

async function searchKeyword(query) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
  url.searchParams.set('query', query)
  url.searchParams.set('x', String(SEOUL.lng))
  url.searchParams.set('y', String(SEOUL.lat))
  url.searchParams.set('radius', '20000')
  url.searchParams.set('size', '5')
  url.searchParams.set('sort', 'accuracy')
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${REST_KEY}` } })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.documents || []
}

function pickBest(placeName, docs) {
  if (!docs.length) return null
  const hint = SEARCH_HINTS[placeName]
  if (hint) {
    const byHint = docs.find((d) => d.place_name.includes(hint) || hint.includes(d.place_name))
    if (byHint) return byHint
  }
  return docs[0]
}

function needsEnrichment(row, col) {
  const lat = Number(row[col.lat])
  const lng = Number(row[col.lng])
  const missingCoords = !Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)
  const missingKo = !String(row[col.korean_name] ?? '').trim()
  const missingKakao = !String(row[col.kakao_place_id] ?? '').trim()
  return missingCoords || missingKo || missingKakao
}

async function enrichRow(row, headers) {
  const col = Object.fromEntries(headers.map((h, i) => [h, i]))
  const placeName = String(row[col.place_name] ?? '').trim()
  if (!placeName || !needsEnrichment(row, col)) {
    return { row, enriched: false }
  }

  const queries = [SEARCH_HINTS[placeName], `${placeName} 서울`, placeName].filter(Boolean)
  let doc = null
  for (const q of [...new Set(queries)]) {
    const docs = await searchKeyword(q)
    doc = pickBest(placeName, docs)
    if (doc) break
    await sleep(SLEEP_MS)
  }
  if (!doc) {
    console.warn(`  ⚠ No match: ${placeName}`)
    return { row, enriched: false, missed: true }
  }

  const next = [...row]
  while (next.length < headers.length) next.push('')
  if (!String(next[col.korean_name] ?? '').trim()) next[col.korean_name] = doc.place_name
  if (!String(next[col.kakao_place_id] ?? '').trim()) next[col.kakao_place_id] = doc.id
  const lat = Number(next[col.lat])
  const lng = Number(next[col.lng])
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    next[col.lat] = doc.y
    next[col.lng] = doc.x
  }

  console.log(`  ✓ ${placeName}`)
  console.log(`     → ${doc.place_name} (${doc.id}) @ ${doc.y}, ${doc.x}`)
  return { row: next, enriched: true, doc }
}

async function main() {
  const inputArg = process.argv[2] || path.join(__dirname, 'seoul-first-trip.csv')
  const outputArg = process.argv[3] || inputArg.replace(/\.csv$/i, '') + '-enriched.csv'
  const inputPath = path.isAbsolute(inputArg) ? inputArg : path.join(ROOT, inputArg)

  if (!fs.existsSync(inputPath)) {
    console.error(`Input not found: ${inputPath}`)
    process.exit(1)
  }

  const rows = parseCsv(fs.readFileSync(inputPath, 'utf8'))
  const headers = rows[0].map((h) => String(h).trim().toLowerCase())
  console.log(`▶ Enriching ${rows.length - 1} row(s) from ${path.relative(ROOT, inputPath)}\n`)

  const out = [rows[0]]
  let enriched = 0
  let missed = 0

  for (let i = 1; i < rows.length; i += 1) {
    const result = await enrichRow(rows[i], headers)
    out.push(result.row)
    if (result.enriched) enriched += 1
    if (result.missed) missed += 1
    await sleep(SLEEP_MS)
  }

  const csv = out.map((r) => r.map(escapeCsvCell).join(',')).join('\r\n')
  const outPath = path.isAbsolute(outputArg) ? outputArg : path.join(ROOT, outputArg)
  fs.writeFileSync(outPath, '\uFEFF' + csv, 'utf8')
  console.log(`\n✔ Enriched ${enriched} row(s), missed ${missed}`)
  console.log(`  → ${path.relative(ROOT, outPath)}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
