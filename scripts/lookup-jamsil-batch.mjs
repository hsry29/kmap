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
  { en: 'Olympic Park', ko: '올림픽공원', queries: ['올림픽공원'], x: '127.121', y: '37.521', pickName: '올림픽공원', rejectName: /주차|입구|역|수영|아레나|잔디/ },
  { en: 'Seokchon Lake', ko: '석촌호수', queries: ['석촌호수', '석촌호수 서호'], x: '127.100', y: '37.508', pickName: '석촌호수', rejectName: /주차|입구|역/ },
  { en: 'Lotte World Mall', ko: '롯데월드몰', queries: ['롯데월드몰', 'Lotte World Mall'], x: '127.102', y: '37.512', pickName: '롯데월드몰', rejectName: /주차|입구|역|타워|아울렛/ },
  { en: 'Seoul Sky', ko: '서울스카이', queries: ['서울스카이', 'Seoul Sky', '롯데월드타워 서울스카이'], x: '127.102', y: '37.512', pickName: '서울스카이', rejectName: /주차|입구|역/ },
  { en: 'Jamsil Hangang Park', ko: '잠실한강공원', queries: ['잠실한강공원'], x: '127.082', y: '37.514', pickName: '잠실한강공원', rejectName: /주차|입구|농구|모래|광장/ },
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
  return (await res.json()).documents || []
}

function score(place, row) {
  if (place.rejectName?.test(row.koName)) return -100
  if (place.pickName && row.koName === place.pickName) return 100
  if (place.pickName && row.koName.startsWith(place.pickName)) return 70
  let s = 0
  if (/공원|명소|호수|쇼핑|관광|전망/.test(row.category)) s += 10
  if (/주차|역|입출구/.test(row.category + row.koName)) s -= 10
  return s
}

for (const place of places) {
  const seen = new Set()
  let best = null
  let bestScore = -999

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
        address: d.road_address_name || d.address_name,
        category: d.category_name,
      }
      const s = score(place, row)
      if (s > bestScore) {
        best = row
        bestScore = s
      }
    }
    await sleep(120)
  }

  console.log(`${place.en}\t${best?.koName}\t${best?.kakaoId}\t${best?.lat}\t${best?.lng}\t${best?.address}`)
}
