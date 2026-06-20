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
    en: "Samsung d'light",
    queries: ['삼성 d light', '삼성디라이트', "Samsung d'light", '삼성전자 d light'],
    x: '127.048',
    y: '37.508',
    pickName: '삼성',
    preferCategory: /문화|전시|명소/,
  },
  {
    en: 'Jamsu Bridge',
    queries: ['잠수교', 'Jamsu Bridge', '반포 잠수교'],
    x: '127.010',
    y: '37.515',
    pickName: '잠수교',
    preferCategory: /교|명소|도로/,
  },
  {
    en: 'Seoul Sky Observatory',
    queries: ['서울스카이', 'Seoul Sky', '롯데월드타워 전망대'],
    x: '127.102',
    y: '37.513',
    pickName: '서울스카이',
    preferCategory: /전망|명소/,
  },
  {
    en: 'Dosan Park',
    queries: ['도산근린공원', '도산공원', 'Dosan Park'],
    x: '127.035',
    y: '37.524',
    pickName: '도산근린공원',
    preferCategory: /공원/,
    rejectName: /기념관|주차장|분식/,
  },
  {
    en: 'Seoul Botanic Park',
    queries: ['서울식물원', 'Seoul Botanic Park', '마곡 서울식물원'],
    x: '126.835',
    y: '37.569',
    pickName: '서울식물원',
    preferCategory: /공원|식물|명소/,
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
  if (/주차장|입구|편의점|ATM/.test(row.category)) s -= 12
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
      const row = toRow(d, q)
      candidates.push(row)
      const s = score(place, row)
      if (s > bestScore) {
        bestScore = s
        best = row
      }
    }
    await sleep(120)
  }

  console.log(`\n=== ${place.en} ===`)
  for (const c of candidates.slice(0, 5)) {
    console.log(`${c.koName}\t${c.kakaoId}\t${c.lat}\t${c.lng}\t${c.category}`)
  }
  if (best) console.log(`→ BEST: ${best.koName}\t${best.kakaoId}\t${best.lat}\t${best.lng}`)
}
