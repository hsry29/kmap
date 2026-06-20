/**
 * Patch Supabase collections — enrich "Seoul First Trip" places via Kakao API.
 * Usage: node scripts/patch-seoul-first-trip.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function loadEnv() {
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!m || process.env[m[1]]) continue
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}
loadEnv()

const REST_KEY = process.env.KAKAO_REST_API_KEY
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY
const COLLECTION_TITLE = 'Seoul First Trip'

const SEARCH_HINTS = {
  'Gyeongbokgung Palace': '경복궁',
  'Bukchon Hanok Village': '북촌한옥마을',
  Insadong: '인사동',
  Myeongdong: '명동',
  'N Seoul Tower': 'N서울타워',
}

const SEOUL = { lat: 37.5665, lng: 126.978 }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function searchKeyword(query) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
  url.searchParams.set('query', query)
  url.searchParams.set('x', String(SEOUL.lng))
  url.searchParams.set('y', String(SEOUL.lat))
  url.searchParams.set('radius', '20000')
  url.searchParams.set('size', '5')
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${REST_KEY}` } })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()).documents || []
}

function pickBest(enName, docs) {
  const hint = SEARCH_HINTS[enName]
  if (hint) {
    const m = docs.find((d) => d.place_name.includes(hint))
    if (m) return m
  }
  return docs[0] || null
}

async function resolvePlace(enName) {
  for (const q of [SEARCH_HINTS[enName], `${enName} 서울`, enName].filter(Boolean)) {
    const docs = await searchKeyword(q)
    const doc = pickBest(enName, docs)
    if (doc) return doc
    await sleep(120)
  }
  return null
}

async function main() {
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  }

  const getRes = await fetch(`${SUPABASE_URL}/rest/v1/app_config?key=eq.collections&select=value`, {
    headers,
  })
  const [row] = await getRes.json()
  const data = row.value
  const col = data.collections.find((c) => c.title === COLLECTION_TITLE)
  if (!col) {
    console.error(`Collection "${COLLECTION_TITLE}" not found`)
    process.exit(1)
  }

  console.log(`▶ Enriching ${col.places.length} places in "${COLLECTION_TITLE}"\n`)

  for (const place of col.places) {
    const needs =
      !place.koName ||
      !place.kakaoId ||
      !place.lat ||
      !place.lng ||
      (place.lat === 0 && place.lng === 0)
    if (!needs) {
      console.log(`  · ${place.enName} — already complete`)
      continue
    }
    const doc = await resolvePlace(place.enName)
    if (!doc) {
      console.warn(`  ⚠ ${place.enName} — no Kakao match`)
      continue
    }
    place.koName = doc.place_name
    place.kakaoId = String(doc.id)
    place.lat = Number(doc.y)
    place.lng = Number(doc.x)
    place.koAddress = doc.road_address_name || doc.address_name || ''
    place.placeUrl = doc.place_url || ''
    place.id = `kakao-${doc.id}`
    console.log(`  ✓ ${place.enName} → ${doc.place_name} (${doc.id})`)
    await sleep(120)
  }

  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/app_config?key=eq.collections`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ value: data }),
  })
  if (!patchRes.ok) {
    console.error('Supabase PATCH failed:', await patchRes.text())
    process.exit(1)
  }

  const csvHeaders =
    'collection_name,place_name,korean_name,kakao_place_id,lat,lng,why_visit,best_time,time_needed,tips,next_spot,status'
  const esc = (v) => {
    const s = String(v ?? '')
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [csvHeaders]
  for (const p of col.places) {
    const c = p.curation || {}
    lines.push(
      [
        COLLECTION_TITLE,
        p.enName,
        p.koName,
        p.kakaoId,
        p.lat,
        p.lng,
        c.whyVisit?.en ?? '',
        c.bestTime?.en ?? '',
        c.timeNeeded?.en ?? '',
        c.tips?.en ?? '',
        c.nextStop ?? '',
        col.status ?? 'draft',
      ]
        .map(esc)
        .join(','),
    )
  }
  const csvPath = path.join(__dirname, 'seoul-first-trip-enriched.csv')
  fs.writeFileSync(csvPath, '\uFEFF' + lines.join('\r\n'), 'utf8')

  console.log(`\n✔ Supabase updated + ${path.relative(ROOT, csvPath)} written`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
