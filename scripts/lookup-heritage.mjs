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
  { en: 'Gyeongbokgung Palace', queries: ['경복궁'] },
  { en: 'National Folk Museum of Korea', queries: ['국립민속박물관', 'National Folk Museum Korea'] },
  { en: 'Bukchon Hanok Village', queries: ['북촌한옥마을'] },
  { en: 'Insadong', queries: ['인사동 문화의거리', '인사동'] },
  { en: 'Ikseon-dong', queries: ['익선동한옥거리', '익선동'] },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function search(query) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
  url.searchParams.set('query', query)
  url.searchParams.set('x', '126.978')
  url.searchParams.set('y', '37.5665')
  url.searchParams.set('radius', '20000')
  url.searchParams.set('size', '5')
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } })
  return (await res.json()).documents || []
}

for (const place of places) {
  let best = null
  for (const q of place.queries) {
    const docs = await search(q)
    if (docs[0]) {
      best = docs[0]
      break
    }
    await sleep(100)
  }
  if (!best) {
    console.log(`${place.en}\tNOT FOUND`)
    continue
  }
  console.log(`${place.en}\t${best.place_name}\t${best.id}\t${best.y}\t${best.x}`)
  await sleep(100)
}
