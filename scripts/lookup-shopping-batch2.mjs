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
  { en: 'COEX Mall', ko: '코엑스', queries: ['코엑스', 'COEX Mall', '코엑스몰'], x: '127.059', y: '37.512', pickName: '코엑스', rejectName: /주차|입구|역|아쿠아|컨벤션|별마당/ },
  { en: 'Starfield Library', ko: '별마당도서관', queries: ['별마당도서관', 'Starfield Library', '코엑스 별마당도서관'], x: '127.059', y: '37.512', pickName: '별마당도서관', rejectName: /주차/ },
  { en: 'Bongeunsa', ko: '봉은사', queries: ['봉은사', 'Bongeunsa'], x: '127.054', y: '37.515', pickName: '봉은사', rejectName: /주차|입구|역|템플|스테이/ },
  { en: 'Apgujeong Rodeo', ko: '압구정로데오', queries: ['압구정로데오', '압구정 로데오거리', 'Apgujeong Rodeo'], x: '127.039', y: '37.527', pickName: '압구정로데오', rejectName: /주차|역|입출구/ },
  { en: 'Dosan Park', ko: '도산공원', queries: ['도산공원', 'Dosan Park'], x: '127.031', y: '37.527', pickName: '도산공원', rejectName: /주차|입구|역/ },
  { en: 'Garosu-gil', ko: '가로수길', queries: ['가로수길', '신사 가로수길', 'Garosu-gil'], x: '127.023', y: '37.520', pickName: '가로수길', pickAddress: /강남|신사/, rejectName: /주차|역|입출구|카페|식당/ },
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
    if (place.pickAddress && !place.pickAddress.test(row.address)) return 55
    return 100
  }
  if (place.pickName && row.koName.includes(place.pickName) && !/주차|입구/.test(row.koName)) return 70
  let s = 0
  if (place.pickAddress?.test(row.address)) s += 20
  if (/명소|거리|관광|쇼핑|문화|종교|공원|백화점/.test(row.category)) s += 10
  if (/주차|편의|ATM|역|입출구/.test(row.category + row.koName)) s -= 10
  return s
}

for (const place of places) {
  const seen = new Set()
  let best = null
  let bestScore = -999

  for (const q of place.queries) {
    const docs = await search(q, place.x, place.y)
    for (const d of docs) {
      if (seen.has(d.id)) continue
      seen.add(d.id)
      const row = toRow(d, q)
      const s = score(place, row)
      if (s > bestScore) {
        best = row
        bestScore = s
      }
    }
    await sleep(120)
  }

  console.log(`\n=== ${place.en} (${place.ko}) ===`)
  if (best) {
    console.log(`PICK: ${best.koName}\t${best.kakaoId}\t${best.lat}\t${best.lng}\t${best.address}`)
  } else {
    console.log('PICK: NOT FOUND')
  }
}
