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
    en: 'Songridan-gil',
    queries: ['송리단길', '송리단길 카페', '송파 송리단길'],
    x: '127.100',
    y: '37.508',
    pickName: '송리단길',
    preferCategory: /명소|거리|카페|음식점/,
  },
  {
    en: 'Seorae Village',
    queries: ['서래마을', '서래마을 카페', '서초 서래마을'],
    x: '126.989',
    y: '37.488',
    pickName: '서래마을',
    preferCategory: /명소|거리|카페|음식점/,
  },
  {
    en: 'Dosan Park Cafe Street',
    queries: ['도산공원', '도산공원 카페거리', '압구정 도산공원'],
    x: '127.031',
    y: '37.527',
    pickName: '도산공원',
    preferCategory: /공원|명소|거리|카페/,
  },
  {
    en: 'Seoul Forest Cafe Area',
    queries: ['서울숲', '서울숲 카페거리', '성동 서울숲'],
    x: '127.044',
    y: '37.544',
    pickName: '서울숲',
    preferCategory: /공원|명소|거리|카페/,
  },
  {
    en: 'Yeoksam Cafe Street',
    queries: ['역삼 카페거리', '역삼동 카페거리', '역삼동'],
    x: '127.036',
    y: '37.501',
    preferCategory: /명소|거리|카페|음식점/,
  },
  {
    en: 'Seongsu Yeonmujang-gil',
    queries: ['성수 연무장길', '연무장길', '성수동 연무장길'],
    x: '127.056',
    y: '37.544',
    pickName: '연무장길',
    preferCategory: /명소|거리|카페|음식점/,
  },
  {
    en: 'Jamsil Lake Cafe Area',
    queries: ['석촌호수', '잠실 석촌호수', '석촌호수 카페'],
    x: '127.100',
    y: '37.508',
    pickName: '석촌호수',
    preferCategory: /명소|공원|거리|카페/,
  },
  {
    en: 'Ichon Riverside Cafes',
    queries: ['이촌한강공원', '이촌 한강 카페', '이촌동 한강'],
    x: '126.971',
    y: '37.518',
    pickName: '이촌한강공원',
    preferCategory: /공원|명소|거리|카페/,
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
  if (place.pickName && row.koName.includes(place.pickName)) return 100
  if (place.pickName && place.pickName.includes(row.koName)) return 90
  let s = 0
  if (place.preferCategory?.test(row.category)) s += 10
  if (place.preferCategory?.test(row.koName)) s += 5
  if (/주차장|ATM|은행|편의점|약국|병원|입출구|교차로/.test(row.category)) s -= 10
  if (/카페$/.test(row.koName) && !place.en.includes('Cafe')) s -= 3
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

  report.push({
    en: place.en,
    best,
    bestScore,
    usedQ,
    topCandidates: candidates.slice(0, 5),
  })
}

console.log(JSON.stringify(report, null, 2))

console.log('\n=== Summary ===')
for (const r of report) {
  const b = r.best
  if (!b) {
    console.log(`${r.en}: NOT FOUND`)
    continue
  }
  console.log(
    `${r.en}\t${b.koName}\t${b.kakaoId}\t${b.lat}\t${b.lng}\t(${b.category})`,
  )
}
