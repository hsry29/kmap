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
    en: 'Starfield Library',
    queries: ['별마당도서관', 'Starfield Library', '코엑스 별마당도서관'],
    x: '127.059',
    y: '37.512',
    pickName: '별마당도서관',
    preferCategory: /도서|문화|명소/,
  },
  {
    en: 'Dongdaemun Design Plaza',
    queries: ['동대문디자인플aza', 'DDP', '동대문디자인플라자'],
    x: '127.009',
    y: '37.567',
    pickName: '동대문디자인플라자',
    preferCategory: /문화|명소|전시/,
  },
  {
    en: 'Seongsu Cafe Street',
    queries: ['성수동카페거리', '성수 카페거리', 'Seongsu cafe street'],
    x: '127.056',
    y: '37.542',
    pickName: '성수동카페거리',
    preferCategory: /카페거리|테마거리|명소/,
  },
  {
    en: 'Seoul Forest',
    queries: ['서울숲', 'Seoul Forest'],
    x: '127.044',
    y: '37.544',
    pickName: '서울숲',
    preferCategory: /공원/,
  },
  {
    en: 'Ihwa Mural Village',
    queries: ['이화벽화마을', 'Ihwa Mural Village', '이화동 벽화마을'],
    x: '127.006',
    y: '37.579',
    pickName: '이화벽화마을',
    preferCategory: /명소|마을|관광/,
  },
  {
    en: 'Bukchon Hanok Village',
    queries: ['북촌한옥마을', 'Bukchon Hanok Village'],
    x: '126.985',
    y: '37.582',
    pickName: '북촌한옥마을',
    preferCategory: /명소|마을|관광/,
  },
  {
    en: 'Lotte World Tower',
    queries: ['롯데월드타워', 'Lotte World Tower'],
    x: '127.102',
    y: '37.513',
    pickName: '롯데월드타워',
    preferCategory: /명소|빌딩|관광/,
  },
  {
    en: 'Seokchon Lake',
    queries: ['석촌호수', '석촌호수 서호', 'Seokchon Lake'],
    x: '127.100',
    y: '37.508',
    pickName: '석촌호수',
    preferCategory: /호수|명소|공원/,
  },
  {
    en: 'Some Sevit',
    queries: ['세빛섬', 'Some Sevit', 'Sebitseom'],
    x: '126.996',
    y: '37.512',
    pickName: '세빛섬',
    preferCategory: /명소|문화/,
  },
  {
    en: 'Yeouido Hangang Park',
    queries: ['여의도한강공원', 'Yeouido Hangang Park'],
    x: '126.935',
    y: '37.526',
    pickName: '여의도한강공원',
    preferCategory: /공원/,
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

  report.push({ en: place.en, best, bestScore, usedQ, topCandidates: candidates.slice(0, 5) })
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
