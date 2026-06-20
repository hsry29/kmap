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
    en: 'Eungbongsan Observatory',
    queries: ['응봉산 전망대', '응봉산', 'Eungbongsan Observatory'],
    x: '127.028',
    y: '37.553',
    pickName: '응봉산',
  },
  {
    en: 'Naksan Park',
    queries: ['낙산공원', 'Naksan Park', '낙산'],
    x: '127.006',
    y: '37.580',
    pickName: '낙산공원',
  },
  {
    en: 'Haneul Park',
    queries: ['하늘공원', 'Haneul Park', '월드컵공원 하늘공원'],
    x: '126.886',
    y: '37.569',
    pickName: '하늘공원',
  },
  {
    en: 'Cheonggyecheon Stream',
    queries: ['청계천', '청계천광장', 'Cheonggyecheon Stream'],
    x: '126.978',
    y: '37.569',
    pickName: '청계천',
  },
  {
    en: 'Ichon Hangang Park',
    queries: ['이촌한강공원', '이촌 한강공원', 'Ichon Hangang Park'],
    x: '126.972',
    y: '37.519',
    pickName: '이촌한강공원',
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
  if (place.pickName && row.koName.includes(place.pickName)) return 150
  if (place.en.includes('Observatory') && row.koName.includes('전망')) return 120
  if (cat.includes('관광') || cat.includes('공원') || cat.includes('전망')) return 80
  if (cat.includes('음식점') || cat.includes('가정,생활') || cat.includes('부동산')) return -50
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
  const picked = candidates[0] || null
  results.push({ en: place.en, picked, candidates: candidates.slice(0, 8) })
}

const outPath = path.join(ROOT, 'scripts', 'landmarks-batch2-results.json')
fs.writeFileSync(outPath, JSON.stringify(results, null, 2))

for (const r of results) {
  const p = r.picked
  if (!p) {
    console.log(`${r.en}\tNOT FOUND`)
    continue
  }
  console.log(`${r.en}\t${p.koName}\t${p.kakaoId}\t${p.lat}\t${p.lng}`)
}
