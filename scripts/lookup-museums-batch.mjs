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
    en: 'War Memorial of Korea',
    queries: ['전쟁기념관', 'War Memorial of Korea', '국립전쟁기념관'],
    x: '126.977',
    y: '37.536',
    pickName: '전쟁기념관',
  },
  {
    en: 'Seosomun Shrine History Museum',
    queries: ['서소문성지역사박물관', 'Seosomun Shrine History Museum', '서소문성지'],
    x: '126.973',
    y: '37.563',
    pickName: '서소문성지역사박물관',
  },
  {
    en: 'Museum Kimchikan',
    queries: ['뮤지엄김치간', 'Museum Kimchikan', '김치간'],
    x: '126.987',
    y: '37.571',
    pickName: '뮤지엄김치간',
  },
  {
    en: 'Oil Tank Culture Park',
    queries: ['문화비축기지', 'Oil Tank Culture Park', '문화유산공원'],
    x: '126.894',
    y: '37.571',
    pickName: '문화비축기지',
  },
  {
    en: 'Amorepacific Museum of Art',
    queries: ['아모레퍼시픽미술관', 'Amorepacific Museum of Art', '아모레퍼시픽 미술관'],
    x: '127.027',
    y: '37.528',
    pickName: '아모레퍼시픽미술관',
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
  if (cat.includes('박물관') || cat.includes('미술관') || cat.includes('기념관')) return 100
  if (cat.includes('공원') && place.en.includes('Oil Tank')) return 90
  if (cat.includes('주차장') || cat.includes('카페')) return -40
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

const outPath = path.join(ROOT, 'scripts', 'museums-batch-results.json')
fs.writeFileSync(outPath, JSON.stringify(results, null, 2))

for (const r of results) {
  const p = r.picked
  if (!p) {
    console.log(`${r.en}\tNOT FOUND`)
    continue
  }
  console.log(`${r.en}\t${p.koName}\t${p.kakaoId}\t${p.lat}\t${p.lng}`)
}
