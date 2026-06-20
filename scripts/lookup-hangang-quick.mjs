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
  { en: 'Yeouido Hangang Park', ko: '여의도한강공원', queries: ['여의도한강공원'], x: '126.934', y: '37.528', pickName: '여의도한강공원' },
  { en: 'The Hyundai Seoul', ko: '더현대 서울', queries: ['더현대 서울', '더현대서울', 'The Hyundai Seoul'], x: '126.902', y: '37.526', pickName: '더현대 서울' },
  { en: 'Nodeul Island', ko: '노들섬', queries: ['노들섬'], x: '126.958', y: '37.518', pickName: '노들섬' },
  { en: 'Banpo Hangang Park', ko: '반포한강공원', queries: ['반포한강공원'], x: '126.997', y: '37.511', pickName: '반포한강공원' },
  { en: 'Some Sevit (Sebitseom)', ko: '세빛섬', queries: ['세빛섬', 'Some Sevit'], x: '126.995', y: '37.512', pickName: '세빛섬' },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function search(query, x, y) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
  url.searchParams.set('query', query)
  url.searchParams.set('x', x)
  url.searchParams.set('y', y)
  url.searchParams.set('radius', '15000')
  url.searchParams.set('size', '8')
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } })
  return (await res.json()).documents || []
}

for (const place of places) {
  let best = null
  for (const q of place.queries) {
    const docs = await search(q, place.x, place.y)
    for (const d of docs) {
      if (d.place_name === place.pickName || (!best && !/주차|입구|배달/.test(d.place_name))) {
        if (d.place_name === place.pickName) {
          best = d
          break
        }
        if (!best) best = d
      }
    }
    if (best?.place_name === place.pickName) break
    await sleep(120)
  }
  console.log(`${place.en}\t${best?.place_name}\t${best?.id}\t${best?.y}\t${best?.x}\t${best?.road_address_name || best?.address_name}`)
}
