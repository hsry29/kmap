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
    en: 'Ttukseom Hangang Park',
    queries: ['뚝섬한강공원'],
    x: '127.069',
    y: '37.529',
    pickName: '뚝섬한강공원',
    preferCategory: /공원/,
  },
  {
    en: 'Gwangnaru Hangang Park',
    queries: ['광나루한강공원', 'Gwangnaru Hangang Park'],
    x: '127.104',
    y: '37.554',
    pickName: '광나루한강공원',
    preferCategory: /공원/,
  },
  {
    en: 'Seokchon Lake',
    queries: ['석촌호수', '석촌호수 서호'],
    x: '127.100',
    y: '37.508',
    pickName: '석촌호수',
    preferCategory: /호수|명소/,
  },
  {
    en: 'Daemosan Observatory',
    queries: ['대모산 전망대', '대모산', '대모산 봉우대'],
    x: '127.075',
    y: '37.465',
    pickName: '대모산',
    preferCategory: /전망|명소|공원|산/,
  },
  {
    en: 'Maebongsan Observatory',
    queries: ['매봉산 전망대', '매봉산', '매봉산 정상'],
    x: '127.068',
    y: '37.495',
    pickName: '매봉산',
    preferCategory: /전망|명소|공원|산/,
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

function score(place, row) {
  if (place.pickName && row.koName === place.pickName) return 100
  if (place.pickName && row.koName.includes(place.pickName)) return 95
  let s = 0
  if (place.preferCategory?.test(row.category)) s += 10
  if (/주차장|입구|편의점/.test(row.category)) s -= 12
  if (/전망대/.test(row.koName) && place.en.includes('Observatory')) s += 8
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
      const row = {
        koName: d.place_name,
        kakaoId: d.id,
        lat: Number(d.y),
        lng: Number(d.x),
        category: d.category_name,
        address: d.road_address_name || d.address_name,
      }
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
