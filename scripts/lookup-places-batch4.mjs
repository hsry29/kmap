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
    en: 'Apgujeong Rodeo',
    queries: ['압구정로데오거리', '압구정 로데오'],
    x: '127.039',
    y: '37.527',
    pickName: '압구정로데오거리',
    preferCategory: /명소|거리|쇼핑/,
  },
  {
    en: 'Dosan Park',
    queries: ['도산근린공원', '도산공원'],
    x: '127.035',
    y: '37.524',
    pickName: '도산근린공원',
    preferCategory: /공원/,
    rejectName: /기념관|주차장|분식/,
  },
  {
    en: 'Gangnam Station',
    queries: ['강남역 2호선', '강남역'],
    x: '127.028',
    y: '37.498',
    pickName: '강남역 2호선',
    preferCategory: /지하철|전철/,
  },
  {
    en: 'Jamsil Sports Complex',
    queries: ['잠실종합운동장', '잠실 야구장', '잠실종합운동장 주경기장'],
    x: '127.073',
    y: '37.513',
    pickName: '잠실종합운동장',
    preferCategory: /운동장|스포츠|명소/,
  },
  {
    en: 'Olympic Park KSPO Dome',
    queries: ['올림픽공원 KSPO DOME', 'KSPO DOME', '올림픽공원 체조경기장'],
    x: '127.122',
    y: '37.516',
    pickName: 'KSPO',
    preferCategory: /스포츠|공연|체육/,
  },
  {
    en: 'Lotte World Tower',
    queries: ['롯데월드타워', 'Lotte World Tower'],
    x: '127.102',
    y: '37.513',
    pickName: '롯데월드타워',
    preferCategory: /명소|관광|빌딩/,
  },
  {
    en: 'Seongsu Yeonmujang-gil',
    queries: ['성수동카페거리', '성수 연무장길', '연무장길'],
    x: '127.055',
    y: '37.544',
    pickName: '성수동카페거리',
    preferCategory: /카페거리|테마거리|명소/,
  },
  {
    en: 'The Hyundai Seoul',
    queries: ['더현대 서울', 'The Hyundai Seoul', '현대백화점 여의도'],
    x: '126.926',
    y: '37.526',
    pickName: '더현대 서울',
    preferCategory: /백화점|쇼핑/,
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
  if (/주차장|입출구|ATM|편의점|약국/.test(row.category)) s -= 12
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
