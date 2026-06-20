import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function loadEnv() {
  const envPath = path.join(ROOT, '.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!m) continue
    const [, key, raw] = m
    if (!process.env[key]) process.env[key] = raw.replace(/^['"]|['"]$/g, '')
  }
}
loadEnv()

const REST_KEY = process.env.KAKAO_REST_API_KEY
if (!REST_KEY) {
  console.error('KAKAO_REST_API_KEY required')
  process.exit(1)
}

const places = [
  { en: 'Gyeongbokgung Palace', queries: ['경복궁', 'Gyeongbokgung Palace 서울'] },
  { en: 'Bukchon Hanok Village', queries: ['북촌한옥마을', 'Bukchon Hanok Village'] },
  { en: 'Gwangjang Market', queries: ['광장시장', 'Gwangjang Market 서울'] },
  { en: 'Myeongdong', queries: ['명동거리', '명동', 'Myeongdong 서울'] },
  { en: 'N Seoul Tower', queries: ['N서울타워', 'N Seoul Tower'] },
  { en: 'Yeouido Hangang Park', queries: ['여의도한강공원', 'Yeouido Hangang Park'] },
  { en: 'Banpo Hangang Park', queries: ['반포한강공원', 'Banpo Hangang Park'] },
  { en: 'Some Sevit', queries: ['세빛섬', '썸섹트', 'Some Sevit 서울'] },
  { en: 'Nodeul Island', queries: ['노들섬', 'Nodeul Island 서울'] },
  { en: 'Ttukseom Hangang Park', queries: ['뚝섬한강공원', 'Ttukseom Hangang Park'] },
  { en: 'Deoksugung Palace', queries: ['덕수궁', 'Deoksugung Palace'] },
  { en: 'Jeongdong-gil', queries: ['정동길', 'Jeongdong-gil 서울'] },
  { en: 'Seoul Museum of History', queries: ['서울역사박물관', 'Seoul Museum of History'] },
  { en: 'Gyeonghuigung Palace', queries: ['경희궁', 'Gyeonghuigung Palace'] },
]

const SEOUL = { lat: 37.5665, lng: 126.978 }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function search(query) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
  url.searchParams.set('query', query)
  url.searchParams.set('x', String(SEOUL.lng))
  url.searchParams.set('y', String(SEOUL.lat))
  url.searchParams.set('radius', '20000')
  url.searchParams.set('size', '5')
  url.searchParams.set('sort', 'accuracy')
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${REST_KEY}` } })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  return (await res.json()).documents || []
}

const results = []
for (const place of places) {
  let docs = []
  let usedQuery = ''
  for (const q of place.queries) {
    docs = await search(q)
    if (docs.length) {
      usedQuery = q
      break
    }
    await sleep(100)
  }
  const best = docs[0]
  results.push(
    best
      ? {
          place_name: place.en,
          korean_name: best.place_name,
          kakao_place_id: best.id,
          lat: best.y,
          lng: best.x,
          category: best.category_name,
          address: best.road_address_name || best.address_name,
          query: usedQuery,
          alts: docs.slice(1, 3).map((d) => `${d.place_name} (${d.id})`),
        }
      : { place_name: place.en, error: 'NOT FOUND' },
  )
  await sleep(100)
}

console.log(JSON.stringify(results, null, 2))
