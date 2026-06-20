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
    en: 'Seochon',
    queries: ['서촌', '서촌마을', '서촌길'],
    x: '126.970',
    y: '37.579',
    pickName: '서촌',
  },
  {
    en: 'Samcheong-dong',
    queries: ['삼청동', '삼청동길', '삼청동 마을'],
    x: '126.982',
    y: '37.586',
    pickName: '삼청동',
  },
  {
    en: 'Mangwon-dong',
    queries: ['망원동', '망원동 카페거리', '망원나들목'],
    x: '126.910',
    y: '37.556',
    pickName: '망원동',
  },
  {
    en: 'Apgujeong Rodeo',
    queries: ['압구정 로데오거리', '압구정로데오', '로데오거리'],
    x: '127.027',
    y: '37.527',
    pickName: '압구정로데오거리',
  },
  {
    en: 'Jamsil',
    queries: ['잠실역', '잠실', '잠실나루'],
    x: '127.100',
    y: '37.513',
    pickName: '잠실역',
  },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function search(query, x = '126.978', y = '37.5665') {
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
  if (place.pickName && row.koName.includes(place.pickName)) return 100
  if (place.pickName && place.pickName.includes(row.koName)) return 90
  if (row.koName.includes(place.en.split('-')[0])) return 40
  return 0
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
        best = row
        bestScore = s
        usedQ = q
      }
    }
    await sleep(120)
  }

  report.push({
    en: place.en,
    picked: best,
    pickedQuery: usedQ,
    candidates: candidates.slice(0, 8),
  })
}

const outPath = path.join(ROOT, 'scripts', 'neighborhood-batch2-results.json')
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8')

for (const r of report) {
  const p = r.picked
  console.log(
    [
      r.en,
      p?.koName ?? '—',
      p?.kakaoId ?? '—',
      p?.lat ?? '—',
      p?.lng ?? '—',
    ].join('\t'),
  )
}

console.log('Wrote', outPath)
