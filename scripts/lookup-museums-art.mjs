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
    en: 'Leeum Museum of Art',
    queries: ['리움미술관', 'Leeum Museum'],
    x: '126.989',
    y: '37.539',
    pickName: '리움미술관',
    preferCategory: /미술|박물|문화/,
  },
  {
    en: 'National Museum of Korea',
    queries: ['국립중앙박물관', 'National Museum of Korea'],
    x: '126.979',
    y: '37.524',
    pickName: '국립중앙박물관',
    preferCategory: /박물|미술|문화/,
  },
  {
    en: 'MMCA Seoul',
    queries: ['국립현대미술관 서울', 'MMCA 서울', '국립현대미술관'],
    x: '126.979',
    y: '37.579',
    pickName: '국립현대미술관',
    preferCategory: /미술|박물|문화/,
  },
  {
    en: 'D Museum',
    queries: ['D Museum', '디뮤지엄', 'D Museum 서울'],
    x: '127.039',
    y: '37.527',
    pickName: 'D Museum',
    preferCategory: /미술|박물|문화/,
  },
  {
    en: 'SongEun Art Space',
    queries: ['송은아트센터', '송은', 'SongEun Art Space'],
    x: '127.044',
    y: '37.525',
    pickName: '송은',
    preferCategory: /미술|박물|문화/,
  },
  {
    en: 'Pace Gallery Seoul',
    queries: ['페이스갤러리 서울', 'Pace Gallery Seoul', '페이스 갤러리'],
    x: '127.039',
    y: '37.527',
    pickName: '페이스',
    preferCategory: /미술|갤러|문화/,
  },
  {
    en: 'Seoul Museum of Craft Art',
    queries: ['서울공예박물관', 'Seoul Museum of Craft Art'],
    x: '126.967',
    y: '37.576',
    pickName: '서울공예박물관',
    preferCategory: /박물|미술|문화/,
  },
  {
    en: 'Horim Museum Sinsa',
    queries: ['호림박물관 신사', '호림박물관', 'Horim Museum'],
    x: '127.024',
    y: '37.518',
    pickName: '호림박물관',
    preferCategory: /박물|미술|문화/,
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
  if (!res.ok) throw new Error(await res.text())
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
  if (place.rejectName?.test(row.koName)) return -100
  if (place.pickName && row.koName === place.pickName) return 100
  if (place.pickName && row.koName.includes(place.pickName)) return 95
  let s = 0
  if (place.preferCategory?.test(row.category)) s += 10
  if (/주차장|입구|카페|편의점/.test(row.category)) s -= 10
  if (/신사$/.test(row.koName) && place.en.includes('Sinsa') && row.koName.includes('호림')) s += 5
  return s
}

const report = []

for (const place of places) {
  const seen = new Set()
  const candidates = []
  let best = null
  let bestScore = -999
  let usedQ = ''

  for (const q of place.queries) {
    const docs = await search(q, place.x, place.y)
    for (const d of docs) {
      if (seen.has(d.id)) continue
      seen.add(d.id)
      const row = toRow(d, q)
      candidates.push(row)
      const s = score(place, row)
      if (s > bestScore) {
        bestScore = s
        best = row
        usedQ = q
      }
    }
    await sleep(120)
  }

  report.push({ en: place.en, best, bestScore, usedQ, topCandidates: candidates.slice(0, 6) })
}

console.log(JSON.stringify(report, null, 2))
console.log('\n=== Summary ===')
for (const r of report) {
  const b = r.best
  if (!b) {
    console.log(`${r.en}: NOT FOUND`)
    continue
  }
  console.log(`${r.en}\t${b.koName}\t${b.kakaoId}\t${b.lat}\t${b.lng}\t(${b.category})`)
}
