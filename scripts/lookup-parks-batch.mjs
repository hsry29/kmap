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
    en: 'Olympic Park',
    queries: ['올림픽공원', 'Olympic Park 서울'],
    x: '127.121',
    y: '37.521',
    pickName: '올림픽공원',
    preferCategory: /공원|명소/,
  },
  {
    en: 'Yangjaecheon',
    queries: ['양재천', '양재천 수변공원'],
    x: '127.040',
    y: '37.477',
    pickName: '양재천',
    preferCategory: /공원|하천|명소/,
  },
  {
    en: 'Jamsil Hangang Park',
    queries: ['잠실한강공원', '잠실 한강공원'],
    x: '127.082',
    y: '37.514',
    pickName: '잠실한강공원',
    preferCategory: /공원/,
  },
  {
    en: 'Jamwon Hangang Park',
    queries: ['잠원한강공원', '잠원 한강공원'],
    x: '127.012',
    y: '37.518',
    pickName: '잠원한강공원',
    preferCategory: /공원/,
  },
  {
    en: "Children's Grand Park",
    queries: ['어린이대공원', 'Children Grand Park'],
    x: '127.075',
    y: '37.548',
    pickName: '어린이대공원',
    preferCategory: /공원/,
  },
  {
    en: 'Bongeunsa',
    queries: ['봉은사', 'Bongeunsa'],
    x: '127.054',
    y: '37.515',
    pickName: '봉은사',
    preferCategory: /종교|명소|문화/,
  },
  {
    en: 'Seonjeongneung',
    queries: ['선정릉', '선릉', 'Seonjeongneung'],
    x: '127.049',
    y: '37.508',
    pickName: '선정릉',
    preferCategory: /유적|명소|문화/,
  },
  {
    en: 'Dogok Maeheon Citizen Forest',
    queries: ['도곡 매헌시민의숲', '매헌시민의숲', '도곡시민의숲'],
    x: '127.045',
    y: '37.491',
    pickName: '매헌시민의숲',
    preferCategory: /공원|숲/,
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
  if (place.pickName && row.koName === place.pickName) return 100
  if (place.pickName && row.koName.includes(place.pickName)) return 95
  if (place.rejectName?.test(row.koName)) return -100
  let s = 0
  if (place.preferCategory?.test(row.category)) s += 10
  if (/주차장|입구|출입구|ATM|편의점/.test(row.category)) s -= 12
  if (/역\s/.test(row.koName) || row.koName.endsWith('역')) s -= 5
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
