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
  { en: "Yangjae Citizen's Forest", ko: '매헌시민의숲', queries: ['매헌시민의숲', '양재시민의숲'], x: '127.038', y: '37.470', pickName: '매헌시민의숲', rejectName: /역|주차|테니스|위령/ },
  { en: 'Seoul Forest', ko: '서울숲', queries: ['서울숲'], x: '127.044', y: '37.544', pickName: '서울숲', rejectName: /아파트|포휴|씨어터|주차/ },
  { en: 'Ttukseom Hangang Park', ko: '뚝섬한강공원', queries: ['뚝섬한강공원'], x: '127.069', y: '37.529', pickName: '뚝섬한강공원', rejectName: /주차|입구|눈썰매|음악분수|배달/ },
  { en: 'Olympic Park', ko: '올림픽공원', queries: ['올림픽공원'], x: '127.121', y: '37.521', pickName: '올림픽공원', rejectName: /주차|입구|역|수영|아레나|잔디/ },
  { en: 'Dream Forest', ko: '북서울꿈의숲', queries: ['북서울꿈의숲', '드림포레스트', 'Dream Forest'], x: '127.042', y: '37.619', pickName: '북서울꿈의숲', rejectName: /주차|입구/ },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function search(query, x, y) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
  url.searchParams.set('query', query)
  url.searchParams.set('x', x)
  url.searchParams.set('y', y)
  url.searchParams.set('radius', '20000')
  url.searchParams.set('size', '8')
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } })
  return (await res.json()).documents || []
}

for (const place of places) {
  let best = null
  for (const q of place.queries) {
    const docs = await search(q, place.x, place.y)
    for (const d of docs) {
      if (place.rejectName?.test(d.place_name)) continue
      if (d.place_name === place.pickName) {
        best = d
        break
      }
      if (!best) best = d
    }
    if (best?.place_name === place.pickName) break
    await sleep(120)
  }
  console.log(`${place.en}\t${best?.place_name}\t${best?.id}\t${best?.y}\t${best?.x}\t${best?.road_address_name || best?.address_name}`)
}
