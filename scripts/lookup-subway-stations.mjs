import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const KEY = process.env.KAKAO_REST_API_KEY

const places = [
  {
    en: '종로역',
    queries: ['종로3가역', '종로역', '종각역'],
    x: '126.992',
    y: '37.571',
    pickName: '종로3가역',
  },
  {
    en: '을지로3가역',
    queries: ['을지로3가역', '을지로 3가역'],
    x: '126.992',
    y: '37.566',
    pickName: '을지로3가역',
  },
  {
    en: '성수역',
    queries: ['성수역', 'Seongsu Station'],
    x: '127.055',
    y: '37.544',
    pickName: '성수역',
  },
  {
    en: '압구정역',
    queries: ['압구정역', 'Apgujeong Station'],
    x: '127.028',
    y: '37.527',
    pickName: '압구정역',
  },
  {
    en: '잠실역',
    queries: ['잠실역', 'Jamsil Station'],
    x: '127.100',
    y: '37.513',
    pickName: '잠실역',
  },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function search(query, x, y) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
  url.searchParams.set('query', query)
  url.searchParams.set('x', x)
  url.searchParams.set('y', y)
  url.searchParams.set('radius', '20000')
  url.searchParams.set('size', '10')
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } })
  return (await res.json()).documents || []
}

function toRow(d, q) {
  return {
    koName: d.place_name,
    kakaoId: d.id,
    lat: Number(d.y),
    lng: Number(d.x),
    category: d.category_name,
    address: d.road_address_name || d.address_name,
    query: q,
  }
}

function score(place, row) {
  const cat = row.category || ''
  if (place.pickName && row.koName === place.pickName) return 200
  if (place.pickName && row.koName.startsWith(place.pickName)) return 180
  if (place.pickName && row.koName.includes(place.pickName)) return 150
  if (cat.includes('지하철') || cat.includes('전철')) return 100
  if (cat.includes('주차장') || cat.includes('화장실')) return -50
  return 10
}

const results = []

for (const place of places) {
  const seen = new Set()
  const candidates = []
  for (const q of place.queries) {
    const docs = await search(q, place.x, place.y)
    for (const d of docs) {
      if (seen.has(d.id)) continue
      seen.add(d.id)
      candidates.push(toRow(d, q))
    }
    await sleep(120)
  }
  candidates.sort((a, b) => score(place, b) - score(place, a))
  results.push({ en: place.en, picked: candidates[0] || null, candidates: candidates.slice(0, 10) })
}

const outPath = path.join(ROOT, 'scripts', 'subway-stations-results.json')
fs.writeFileSync(outPath, JSON.stringify(results, null, 2))

for (const r of results) {
  const p = r.picked
  if (!p) {
    console.log(`${r.en}\tNOT FOUND`)
    continue
  }
  console.log(`${r.en}\t${p.koName}\t${p.kakaoId}\t${p.lat}\t${p.lng}`)
}
