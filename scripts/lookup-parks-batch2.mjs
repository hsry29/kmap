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
  { en: 'Seoul Forest', ko: '서울숲', queries: ['서울숲', 'Seoul Forest'], x: '127.044', y: '37.544', pickName: '서울숲', rejectName: /카페|역|입구|주차/ },
  { en: 'Olympic Park', ko: '올림픽공원', queries: ['올림픽공원', 'Olympic Park 서울'], x: '127.121', y: '37.521', pickName: '올림픽공원', rejectName: /주차|입구|역/ },
  { en: "Yangjae Citizen's Forest", ko: '양재시민의숲', queries: ['양재시민의숲', '양재 시민의숲', "Yangjae Citizen's Forest"], x: '127.040', y: '37.470', pickName: '양재시민의숲', rejectName: /주차|입구/ },
  { en: 'Namsan Park', ko: '남산공원', queries: ['남산공원', 'Namsan Park'], x: '126.988', y: '37.551', pickName: '남산공원', rejectName: /타워|케이블|주차|입구|팔각|전망대/ },
  { en: 'Dream Forest', ko: '불암산', queries: ['드림포레스트', 'Dream Forest 서울', '불암산'], x: '127.042', y: '37.619', pickName: '드림포레스트', rejectName: /주차|입구|아트센터/ },
  { en: "Children's Grand Park", ko: '어린이대공원', queries: ['어린이대공원', "Children's Grand Park"], x: '127.075', y: '37.548', pickName: '어린이대공원', rejectName: /주차|입구|역/ },
  { en: 'Haneul Park', ko: '하늘공원', queries: ['하늘공원', 'Haneul Park', '월드컵공원 하늘공원'], x: '126.887', y: '37.569', pickName: '하늘공원', rejectName: /주차|입구|전망대|계단/ },
  { en: 'Boramae Park', ko: '보라매공원', queries: ['보라매공원', 'Boramae Park'], x: '126.922', y: '37.492', pickName: '보라매공원', rejectName: /주차|입구|역/ },
  { en: 'Seonyudo Park', ko: '선유도공원', queries: ['선유도공원', 'Seonyudo Park'], x: '126.896', y: '37.543', pickName: '선유도공원', rejectName: /주차|입구/ },
  { en: 'World Cup Park', ko: '월드컵공원', queries: ['월드컵공원', 'World Cup Park'], x: '126.899', y: '37.566', pickName: '월드컵공원', rejectName: /주차|입구|하늘공원|노을공원|평화의공원/ },
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
  if (place.rejectName?.test(row.koName)) return -100
  if (place.pickName && row.koName === place.pickName) return 100
  if (place.pickName && row.koName.startsWith(place.pickName) && !/주차|입구/.test(row.koName)) return 65
  let s = 0
  if (/공원|명소|관광|숲/.test(row.category)) s += 15
  if (/주차|편의|ATM|병원|역/.test(row.category)) s -= 10
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
  for (const c of candidates.slice(0, 5)) {
    console.log(`  ${c.koName}\t${c.kakaoId}\t${c.lat}\t${c.lng}\t${c.address}`)
  }
}
