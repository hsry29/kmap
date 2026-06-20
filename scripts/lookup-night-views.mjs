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
    en: 'N Seoul Tower',
    queries: ['N서울타워', 'N Seoul Tower', '남산서울타워'],
    x: '126.988',
    y: '37.551',
    pickName: 'N서울타워',
    preferCategory: /명소|관광|전망/,
  },
  {
    en: 'Lotte World Tower Seoul Sky',
    queries: ['서울스카이', 'Seoul Sky', '롯데월드타워 서울스카이'],
    x: '127.102',
    y: '37.513',
    pickName: '서울스카이',
    preferCategory: /명소|전망|관광/,
  },
  {
    en: 'Banpo Hangang Park',
    queries: ['반포한강공원', 'Banpo Hangang Park'],
    x: '126.997',
    y: '37.511',
    pickName: '반포한강공원',
    preferCategory: /공원/,
  },
  {
    en: 'Eungbongsan Observatory',
    queries: ['응봉산', '응봉산 전망대', '응봉산 팔각정'],
    x: '127.030',
    y: '37.548',
    pickName: '응봉산',
    preferCategory: /명소|전망|공원|정/,
  },
  {
    en: 'Bugaksan Palgakjeong',
    queries: ['북악산 팔각정', '팔각정', '북악산'],
    x: '126.982',
    y: '37.592',
    pickName: '팔각정',
    preferCategory: /명소|전망|정/,
  },
  {
    en: 'Nodeul Island',
    queries: ['노들섬', 'Nodeul Island'],
    x: '126.958',
    y: '37.518',
    pickName: '노들섬',
    preferCategory: /공원|명소/,
  },
  {
    en: 'Sevit Some',
    queries: ['세빛섬', 'Sevit Some', '세빛섬 Some'],
    x: '126.934',
    y: '37.512',
    pickName: '세빛섬',
    preferCategory: /명소|관광/,
  },
  {
    en: 'Yongyangbong Peak Observatory',
    queries: ['용양봉 전망대', '용양봉', '용마산 전망대'],
    x: '127.091',
    y: '37.573',
    pickName: '용양봉',
    preferCategory: /전망|명소|공원/,
  },
  {
    en: 'Achasan Observatory',
    queries: ['아차산 전망대', '아차산', '아차산성'],
    x: '127.104',
    y: '37.553',
    pickName: '아차산',
    preferCategory: /전망|명소|공원/,
  },
  {
    en: 'Haneul Park Observatory',
    queries: ['하늘공원 전망대', '하늘공원', 'Haneul Park'],
    x: '126.887',
    y: '37.569',
    pickName: '하늘공원',
    preferCategory: /공원|전망|명소/,
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
