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
    en: 'Onion Anguk',
    queries: ['어니언 안국', 'Onion Anguk', '어니언 안국점'],
    x: '126.986',
    y: '37.576',
    pickName: '어니언',
    preferArea: /종로|안국|계동/,
  },
  {
    en: 'Fritz Dosan',
    queries: ['프ritz 도산', 'Fritz 도산', '프리츠 도산', 'Fritz Coffee Dosan'],
    x: '127.044',
    y: '37.524',
    pickName: '프리츠',
    preferArea: /강남|신사|도산/,
  },
  {
    en: 'Rain Report',
    queries: ['Rain Report', '레인리포트', '비의 보고서'],
    x: '127.056',
    y: '37.544',
    pickName: 'Rain',
    preferArea: /성동|성수/,
  },
  {
    en: 'Center Coffee',
    queries: ['센터커피', 'Center Coffee', '센터 커피'],
    x: '127.056',
    y: '37.544',
    pickName: '센터',
    preferArea: /성동|성수|용산/,
  },
  {
    en: 'Daelim Changgo',
    queries: ['대림창고', 'Daelim Changgo', '대림 창고'],
    x: '127.056',
    y: '37.544',
    pickName: '대림',
    preferArea: /성동|성수/,
  },
  {
    en: 'Blue Bottle Seongsu',
    queries: ['블루보틀 성수', 'Blue Bottle 성수', '블루보틀'],
    x: '127.056',
    y: '37.544',
    pickName: '블루보틀',
    preferArea: /성동|성수/,
  },
  {
    en: 'Terrarosa Hannam',
    queries: ['테라로사 한남', 'Terrarosa Hannam', '테라로사'],
    x: '127.002',
    y: '37.534',
    pickName: '테라로사',
    preferArea: /용산|한남/,
  },
  {
    en: 'Cafe Highwaist Ikseon',
    queries: ['하이웨스트 이촌', 'Cafe Highwaist', '하이웨스트 익선', '하이웨스트'],
    x: '126.990',
    y: '37.574',
    pickName: '하이웨스트',
    preferArea: /종로|익선|이화/,
  },
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
  if (!res.ok) throw new Error(await res.text())
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
  if (/주차장|ATM|편의점|약국/.test(row.category)) return -20
  let s = 0
  if (/카페/.test(row.category)) s += 15
  if (place.pickName && row.koName.includes(place.pickName)) s += 20
  if (place.preferArea && place.preferArea.test(row.address)) s += 10
  if (place.en.includes('Anguk') && /안국|계동/.test(row.address + row.koName)) s += 15
  if (place.en.includes('Dosan') && /도산|신사/.test(row.address + row.koName)) s += 15
  if (place.en.includes('Seongsu') && /성수/.test(row.address + row.koName)) s += 15
  if (place.en.includes('Hannam') && /한남/.test(row.address + row.koName)) s += 15
  if (place.en.includes('Ikseon') && /익선|이촌|이화/.test(row.address + row.koName)) s += 10
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
        bestScore = s
        best = row
      }
    }
    await sleep(120)
  }

  candidates.sort((a, b) => score(place, b) - score(place, a))

  console.log(`\n=== ${place.en} ===`)
  for (const c of candidates.slice(0, 5)) {
    console.log(`${c.koName}\t${c.kakaoId}\t${c.lat}\t${c.lng}\t${c.category}\t${c.address}`)
  }
  if (best) console.log(`→ BEST: ${best.koName}\t${best.kakaoId}\t${best.lat}\t${best.lng}`)
}
