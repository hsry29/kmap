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
  { en: 'Seongsu-dong', queries: ['성수동 카페거리', '성수동', 'Seongsu-dong 서울'] },
  { en: 'Ikseon-dong', queries: ['익선동 한옥마을', '익선동', 'Ikseon-dong 서울'] },
  { en: 'Yeonnam-dong', queries: ['연남동', '연남동 거리', 'Yeonnam-dong 서울'] },
  { en: 'Hannam-dong', queries: ['한남동', '한남동 거리', 'Hannam-dong 서울'] },
  { en: 'Euljiro', queries: ['을지로', '을지로 거리', 'Euljiro 서울'] },
  { en: 'HYBE Headquarters', queries: ['하이브 본사', 'HYBE Yongsan', 'HYBE 서울'] },
  { en: 'K-Star Road', queries: ['케이스타로드', 'K-Star Road 압구정'] },
  { en: 'SM Entertainment Building', queries: ['SM엔터테인먼트', '에스엠엔터테인먼트', 'SM Entertainment 서울'] },
  { en: 'COEX', queries: ['코엑스', 'COEX 서울'] },
  { en: 'Myeongdong Album Shops', queries: ['명동 레코드샵', '명동 K-POP', '명동 앨범', 'Myeongdong album shop'] },
  { en: 'Bukchon Hanok Village', queries: ['북촌한옥마을', 'Bukchon Hanok Village'] },
  { en: 'Naksan Park', queries: ['낙산공원', 'Naksan Park 서울'] },
  { en: 'Nodeul Island', queries: ['노들섬', 'Nodeul Island 서울'] },
  { en: 'Seoullo 7017', queries: ['서울로7017', 'Seoullo 7017'] },
  { en: 'Yeouido Yunjung-ro', queries: ['여의도 윤중로', '윤중로 여의도', 'Yeouido Yunjung-ro'] },
  { en: 'Seokchon Lake', queries: ['석촌호수', 'Seokchon Lake'] },
  { en: 'Seoul Forest', queries: ['서울숲', 'Seoul Forest'] },
  { en: "Children's Grand Park", queries: ['어린이대공원', "Children's Grand Park 서울"] },
  { en: 'Kyung Hee University', queries: ['경희대학교 서울캠퍼스', '경희대학교', 'Kyung Hee University 서울'] },
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
