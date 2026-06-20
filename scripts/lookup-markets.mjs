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
  { en: 'Namdaemun Market', queries: ['남대문시장'], x: '126.978', y: '37.559' },
  { en: 'Gwangjang Market', queries: ['광장시장'], x: '127.001', y: '37.570' },
  { en: 'Tongin Market', queries: ['통인시장'], x: '126.969', y: '37.579' },
  { en: 'Mangwon Market', queries: ['망원시장'], x: '126.902', y: '37.556' },
  { en: 'Gyeongdong Market', queries: ['경동시장'], x: '127.038', y: '37.574' },
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
      if (!best) {
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

const outPath = path.join(ROOT, 'scripts', 'market-results.json')
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8')
console.log('Wrote', outPath)
