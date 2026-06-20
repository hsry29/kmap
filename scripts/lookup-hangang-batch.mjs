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
  { en: 'Yeouido Hangang Park', ko: '여의도한강공원', queries: ['여의도한강공원', '여의도 한강공원'], x: '126.934', y: '37.528', pickName: '여의도한강공원' },
  { en: 'Banpo Hangang Park', ko: '반포한강공원', queries: ['반포한강공원', '반포 한강공원'], x: '126.997', y: '37.511', pickName: '반포한강공원' },
  { en: 'Some Sevit (Sebitseom)', ko: '세빛섬', queries: ['세빛섬', 'Some Sevit', 'Sebitseom'], x: '126.995', y: '37.512', pickName: '세빛섬' },
  { en: 'Nodeul Island', ko: '노들섬', queries: ['노들섬', '노들섬 공원'], x: '126.958', y: '37.518', pickName: '노들섬' },
  { en: 'Ichon Hangang Park', ko: '이촌한강공원', queries: ['이촌한강공원', '이촌 한강공원'], x: '126.971', y: '37.517', pickName: '이촌한강공원' },
  { en: 'Jamwon Hangang Park', ko: '잠원한강공원', queries: ['잠원한강공원', '잠원 한강공원'], x: '127.012', y: '37.518', pickName: '잠원한강공원' },
  { en: 'Ttukseom Hangang Park', ko: '뚝섬한강공원', queries: ['뚝섬한강공원', '뚝섬 한강공원'], x: '127.069', y: '37.529', pickName: '뚝섬한강공원' },
  { en: 'Jamsil Hangang Park', ko: '잠실한강공원', queries: ['잠실한강공원', '잠실 한강공원'], x: '127.082', y: '37.514', pickName: '잠실한강공원' },
  { en: 'Gwangnaru Hangang Park', ko: '광나루한강공원', queries: ['광나루한강공원', '광나루 한강공원'], x: '127.104', y: '37.554', pickName: '광나루한강공원' },
  { en: 'Mangwon Hangang Park', ko: '망원한강공원', queries: ['망원한강공원', '망원 한강공원'], x: '126.896', y: '37.555', pickName: '망원한강공원' },
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
  if (/주차장|배달존|화장실|매표소|입구\d|교차로/.test(row.koName)) return -100
  if (place.pickName && row.koName === place.pickName) return 100
  if (place.pickName && row.koName.startsWith(place.pickName) && !/주차|배달|화장실/.test(row.koName)) return 70
  let s = 0
  if (/공원|명소|관광/.test(row.category)) s += 15
  if (row.koName.includes('한강공원') || row.koName === '세빛섬' || row.koName === '노들섬') s += 10
  if (/주차|편의|ATM|병원/.test(row.category)) s -= 10
  return s
}

for (const place of places) {
  const seen = new Set()
  const candidates = []
  let best = null
  let bestScore = -999

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
      }
    }
    await sleep(120)
  }

  candidates.sort((a, b) => score(place, b) - score(place, a))

  console.log(`\n=== ${place.en} (${place.ko}) ===`)
  if (best) {
    console.log(`PICK: ${best.koName}\t${best.kakaoId}\t${best.lat}\t${best.lng}\t${best.address}`)
  } else {
    console.log('PICK: NOT FOUND')
  }
  for (const c of candidates.slice(0, 4)) {
    console.log(`  ${c.koName}\t${c.kakaoId}\t${c.lat}\t${c.lng}`)
  }
}
