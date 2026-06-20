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
    en: 'Noryangjin Fish Market',
    queries: ['노량진수산시장', '노량진 수산시장', 'Noryangjin Fish Market'],
    x: '126.942',
    y: '37.513',
    pickName: '노량진수산시장',
  },
  {
    en: 'Majang Meat Market',
    queries: ['마장동축산시장', '마장 축산시장', 'Majang Meat Market'],
    x: '127.039',
    y: '37.566',
    pickName: '마장동축산시장',
  },
  {
    en: 'Seoul Folk Flea Market',
    queries: ['서울풍물시장', '풍물시장', 'Seoul Folk Flea Market'],
    x: '127.038',
    y: '37.571',
    pickName: '서울풍물시장',
  },
  {
    en: 'Garak Market',
    queries: ['가락시장', 'Garak Market', '가락동 농수산물시장'],
    x: '127.118',
    y: '37.495',
    pickName: '가락시장',
  },
  {
    en: 'Hwanghak-dong Flea Market',
    queries: ['황학동벼룩시장', '황학동 벼룩시장', 'Hwanghak-dong Flea Market'],
    x: '127.020',
    y: '37.571',
    pickName: '황학동벼룩시장',
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
  if (cat.includes('시장')) return 100
  if (cat.includes('관광') || cat.includes('명소')) return 60
  if (cat.includes('주차장') || cat.includes('음식점') || cat.includes('편의')) return -40
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

const outPath = path.join(ROOT, 'scripts', 'markets-batch2-results.json')
fs.writeFileSync(outPath, JSON.stringify(results, null, 2))

for (const r of results) {
  const p = r.picked
  if (!p) {
    console.log(`${r.en}\tNOT FOUND`)
    continue
  }
  console.log(`${r.en}\t${p.koName}\t${p.kakaoId}\t${p.lat}\t${p.lng}`)
}
