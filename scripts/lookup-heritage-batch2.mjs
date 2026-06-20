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
    en: 'Gyeonghuigung Palace',
    queries: ['경희궁', 'Gyeonghuigung Palace'],
    x: '126.970',
    y: '37.571',
    pickName: '경희궁',
  },
  {
    en: 'Unhyeongung',
    queries: ['운현궁', 'Unhyeongung'],
    x: '127.000',
    y: '37.576',
    pickName: '운현궁',
  },
  {
    en: 'Jongmyo Shrine',
    queries: ['종묘', 'Jongmyo Shrine'],
    x: '126.995',
    y: '37.572',
    pickName: '종묘',
  },
  {
    en: 'Seonggyungwan',
    queries: ['성균관', 'Seonggyungwan', '성균관대학교'],
    x: '126.992',
    y: '37.586',
    pickName: '성균관',
  },
  {
    en: 'Namsangol Hanok Village',
    queries: ['남산골한옥마을', 'Namsangol Hanok Village', '남산골 한옥마을'],
    x: '126.994',
    y: '37.559',
    pickName: '남산골한옥마을',
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
  if (cat.includes('문화유적') || cat.includes('고궁') || cat.includes('궁') || cat.includes('사적')) return 100
  if (cat.includes('관광') || cat.includes('박물관')) return 80
  if (cat.includes('주차장') || cat.includes('음식점')) return -40
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
  results.push({ en: place.en, picked: candidates[0] || null, candidates: candidates.slice(0, 8) })
}

const outPath = path.join(ROOT, 'scripts', 'heritage-batch2-results.json')
fs.writeFileSync(outPath, JSON.stringify(results, null, 2))

for (const r of results) {
  const p = r.picked
  if (!p) {
    console.log(`${r.en}\tNOT FOUND`)
    continue
  }
  console.log(`${r.en}\t${p.koName}\t${p.kakaoId}\t${p.lat}\t${p.lng}`)
}
