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
  { en: 'Changdeokgung Palace', queries: ['창덕궁'] },
  { en: 'Deoksugung Palace', queries: ['덕수궁'] },
  { en: 'Changgyeonggung Palace', queries: ['창경궁'] },
  { en: 'Jongmyo Shrine', queries: ['종묘'] },
  {
    en: 'National Museum of Modern and Contemporary Art Seoul',
    queries: ['국립현대미술관 서울', '국립현대미술관'],
  },
  { en: 'National Museum of Korea', queries: ['국립중앙박물관'] },
  { en: 'Leeum Museum of Art', queries: ['리움미술관'] },
  { en: 'Seoul Museum of Art', queries: ['서울시립미술관'] },
  { en: 'Daelim Museum', queries: ['대림미술관'] },
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
  let usedQ = ''
  for (const q of place.queries) {
    const docs = await search(q)
    if (docs[0]) {
      best = docs[0]
      usedQ = q
      break
    }
    await sleep(120)
  }
  if (!best) {
    console.log(`${place.en}\tNOT FOUND`)
    continue
  }
  console.log(
    `${place.en}\t${best.place_name}\t${best.id}\t${best.y}\t${best.x}\t${usedQ}`,
  )
  await sleep(120)
}
