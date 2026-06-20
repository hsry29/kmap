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
    en: 'Mapo',
    queries: ['마포역'],
    x: '126.946',
    y: '37.540',
    pickName: '마포역 5호선',
  },
  {
    en: 'Majang-dong',
    queries: ['마장동', '마장동 고기거리', '마장축산물시장'],
    x: '127.038',
    y: '37.566',
    preferCategory: /시장|거리|명소|고기/,
    pickName: '마장축산물시장',
  },
  {
    en: 'Wangsimni',
    queries: ['왕십리광장', '왕십리맛골목', '왕십리역'],
    x: '127.037',
    y: '37.561',
    pickName: '왕십리광장',
  },
  {
    en: 'Yeonnam-dong',
    queries: ['연남동 경의선숲길', '연남동'],
    x: '126.924',
    y: '37.565',
    pickName: '경의선숲길',
    pickAddress: /연남동/,
  },
  {
    en: 'Myeongdong',
    queries: ['명동거리', '명동'],
    x: '126.986',
    y: '37.562',
    pickName: '명동거리',
  },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function search(query, x = '126.978', y = '37.5665') {
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
  if (place.rejectName?.test(row.koName)) return -100
  if (place.pickName && row.koName === place.pickName) {
    if (place.pickAddress && !place.pickAddress.test(row.address)) return 50
    return 100
  }
  let s = 0
  if (place.preferCategory?.test(row.category)) s += 10
  if (place.preferCategory?.test(row.koName)) s += 5
  if (/주차장|ATM|은행|편의점|약국|병원/.test(row.category)) s -= 8
  if (/입출구|교차로/.test(row.category)) s -= 5
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
        best = row
        bestScore = s
        usedQ = q
      }
    }
    await sleep(120)
  }

  report.push({
    en: place.en,
    picked: best,
    pickedQuery: usedQ,
    candidates: candidates.slice(0, 8),
  })
}

const outPath = path.join(ROOT, 'scripts', 'neighborhood-results.json')
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8')
console.log('Wrote', outPath)
