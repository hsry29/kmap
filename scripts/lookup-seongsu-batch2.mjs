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
  { en: 'Seoul Forest', ko: '서울숲', queries: ['서울숲'], x: '127.044', y: '37.544', pickName: '서울숲', rejectName: /아파트|포휴|씨어터|주차/ },
  { en: 'SMTOWN @ Seongsu', ko: 'KWANGYA SEOUL', queries: ['KWANGYA SEOUL', 'SMTOWN 성수', '에스엠타운 성수'], x: '127.044', y: '37.544', pickName: 'KWANGYA SEOUL', rejectName: /주차|입구|트래블|플래너/ },
  { en: 'Seongsu Yeonmujang-gil', ko: '연무장길', queries: ['연무장길', '성수 연무장길', '성수동 연무장길'], x: '127.055', y: '37.544', pickName: '연무장길', pickAddress: /성동|성수/, preferCategory: /명소|거리|테마/, rejectName: /주차|역|입출구|은행|올리브|무신사|디올/ },
  { en: 'Seongsu Cafe Street', ko: '성수동카페거리', queries: ['성수동카페거리', '성수 카페거리'], x: '127.056', y: '37.544', pickName: '성수동카페거리', rejectName: /주차|역|입출구|컴포즈|요거트|포토/ },
  { en: 'Ttukseom Observatory', ko: '뚝섬전망대', queries: ['뚝섬전망대', '뚝섬 한강전망대', 'Ttukseom Observatory', '뚝섬한강공원 전망대'], x: '127.069', y: '37.529', preferCategory: /전망|명소|관광/, rejectName: /주차|입구/ },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function search(query, x, y) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
  url.searchParams.set('query', query)
  url.searchParams.set('x', x)
  url.searchParams.set('y', y)
  url.searchParams.set('radius', '15000')
  url.searchParams.set('size', '10')
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } })
  return (await res.json()).documents || []
}

function toRow(d) {
  return {
    koName: d.place_name,
    kakaoId: d.id,
    lat: Number(d.y),
    lng: Number(d.x),
    category: d.category_name,
    address: d.road_address_name || d.address_name,
  }
}

function score(place, row) {
  if (place.rejectName?.test(row.koName)) return -100
  if (place.pickName && row.koName === place.pickName) {
    if (place.pickAddress && !place.pickAddress.test(row.address)) return 55
    return 100
  }
  let s = 0
  if (place.pickAddress?.test(row.address)) s += 20
  if (place.preferCategory?.test(row.category)) s += 12
  if (place.preferCategory?.test(row.koName)) s += 8
  if (/명소|거리|공원|관광|테마|전망/.test(row.category)) s += 8
  if (place.en.includes('SMTOWN') && /KWANGYA|에스엠/.test(row.koName)) s += 15
  if (place.en.includes('Observatory') && /전망/.test(row.koName)) s += 15
  if (place.en.includes('Yeonmujang') && /연무장/.test(row.address)) s += 10
  if (/주차|역|입출구|교차로/.test(row.category + row.koName)) s -= 10
  return s
}

for (const place of places) {
  const seen = new Set()
  let best = null
  let bestScore = -999
  const candidates = []

  for (const q of place.queries) {
    const docs = await search(q, place.x, place.y)
    for (const d of docs) {
      if (seen.has(d.id)) continue
      seen.add(d.id)
      const row = toRow(d)
      candidates.push(row)
      const s = score(place, row)
      if (s > bestScore) {
        best = row
        bestScore = s
      }
    }
    await sleep(120)
  }

  candidates.sort((a, b) => score(place, b) - score(place, a))
  console.log(`\n=== ${place.en} (${place.ko}) ===`)
  if (best) console.log(`PICK: ${best.koName}\t${best.kakaoId}\t${best.lat}\t${best.lng}\t${best.address}`)
  else console.log('PICK: NOT FOUND')
  for (const c of candidates.slice(0, 4)) {
    console.log(`  ${c.koName}\t${c.kakaoId}\t${c.lat}\t${c.lng}`)
  }
}
