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
    en: 'Gyeongbokgung Palace',
    queries: ['경복궁'],
    x: '126.977',
    y: '37.578',
    pickName: '경복궁',
  },
  {
    en: 'Cheonggyecheon Stream',
    queries: ['청계천', '청계천광장', 'Cheonggyecheon Stream'],
    x: '126.978',
    y: '37.569',
    pickName: '청계천',
  },
  {
    en: 'Seoul Forest',
    queries: ['서울숲', 'Seoul Forest'],
    x: '127.038',
    y: '37.544',
    pickName: '서울숲',
  },
  {
    en: 'Oil Tank Culture Park',
    queries: ['문화비축기지', 'Oil Tank Culture Park', '문화유산공원'],
    x: '126.913',
    y: '37.549',
    pickName: '문화비축기지',
  },
  {
    en: 'Banpo Hangang Park',
    queries: ['반포한강공원', '반포 한강공원'],
    x: '126.997',
    y: '37.511',
    pickName: '반포한강공원',
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
  if (cat.includes('관광') || cat.includes('공원') || cat.includes('문화유적')) return 80
  if (cat.includes('음식점') || cat.includes('가정,생활')) return -50
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

const outPath = path.join(ROOT, 'scripts', 'landmarks-batch-results.json')
fs.writeFileSync(outPath, JSON.stringify(results, null, 2))

for (const r of results) {
  const p = r.picked
  if (!p) {
    console.log(`${r.en}\tNOT FOUND`)
    continue
  }
  console.log(`${r.en}\t${p.koName}\t${p.kakaoId}\t${p.lat}\t${p.lng}`)
}
