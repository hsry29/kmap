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
  { en: 'Mongchontoseong Fortress', ko: '몽촌토성', queries: ['몽촌토성', 'Mongchontoseong Fortress'], x: '127.121', y: '37.518', pickName: '몽촌토성', rejectName: /주차|입구/ },
  { en: 'SOMA Museum of Art', ko: '소마미술관', queries: ['소마미술관', 'SOMA Museum of Art'], x: '127.121', y: '37.518', pickName: '소마미술관', rejectName: /주차|입구/ },
  { en: 'Seokchon Lake', ko: '석촌호수', queries: ['석촌호수', '석촌호수 서호'], x: '127.100', y: '37.508', pickName: '석촌호수', rejectName: /주차|입구|역/ },
  { en: 'Songridan-gil', ko: '송리단길', queries: ['송리단길', 'Songridan-gil'], x: '127.100', y: '37.508', pickName: '송리단길', pickAddress: /송파/ },
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
  if (place.pickName && row.koName === place.pickName) {
    if (place.pickAddress && !place.pickAddress.test(row.address)) return 55
    return 100
  }
  if (place.pickName && row.koName.startsWith(place.pickName) && !/주차|입구/.test(row.koName)) return 70
  let s = 0
  if (place.pickAddress?.test(row.address)) s += 20
  if (/공원|명소|호수|미술|유적|거리|관광/.test(row.category)) s += 10
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
