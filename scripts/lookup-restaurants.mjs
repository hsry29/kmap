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
  { en: 'Mapo Jeong Daepo', queries: ['마포정대포'], x: '126.951', y: '37.542' },
  {
    en: 'Wangbijib',
    queries: ['왕비집 명동본점', '왕비집 시청무교점', '왕비집'],
    x: '126.951',
    y: '37.542',
    pickName: '왕비집 시청무교점',
  },
  { en: 'Mongtan', queries: ['몽탄 홍익', '몽탄 연남', '몽탄'], x: '126.951', y: '37.542' },
  {
    en: 'Gold Pig',
    queries: ['금돼지식당', '금돼지 식당', '골드피그'],
    x: '127.006',
    y: '37.564',
    pickName: '금돼지식당',
  },
  {
    en: 'Yeontabal',
    queries: ['연타발 압구정본점', '연타발 시청점', '연타발'],
    x: '126.951',
    y: '37.542',
    pickName: '연타발 시청점',
  },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function search(query, x = '126.978', y = '37.5665') {
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
  url.searchParams.set('query', query)
  url.searchParams.set('x', x)
  url.searchParams.set('y', y)
  url.searchParams.set('radius', '20000')
  url.searchParams.set('size', '8')
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } })
  return (await res.json()).documents || []
}

const report = []

for (const place of places) {
  const seen = new Set()
  const candidates = []
  let best = null
  let usedQ = ''

  for (const q of place.queries) {
    const docs = await search(q, place.x, place.y)
    for (const d of docs) {
      if (seen.has(d.id)) continue
      seen.add(d.id)
      const row = {
        koName: d.place_name,
        kakaoId: d.id,
        lat: Number(d.y),
        lng: Number(d.x),
        category: d.category_name,
        address: d.road_address_name || d.address_name,
        query: q,
      }
      candidates.push(row)
      if (place.pickName && d.place_name === place.pickName) {
        best = row
        usedQ = q
      } else if (!best) {
        best = row
        usedQ = q
      }
    }
    await sleep(120)
  }

  report.push({
    en: place.en,
    picked: best,
    pickedQuery: usedQ,
    candidates: candidates.slice(0, 6),
  })
}

const outPath = path.join(ROOT, 'scripts', 'rest-results.json')
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8')
console.log('Wrote', outPath)
