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
  { en: 'Yeouido Hangang Park', queries: ['여의도 한강공원', '여의도한강공원'] },
  { en: 'The Hyundai Seoul', queries: ['더현대 서울', '더현대서울'] },
  { en: 'Nodeul Island', queries: ['노들섬', '노들섬 공원'] },
  { en: 'Banpo Hangang Park', queries: ['반포 한강공원', '반포한강공원'] },
  {
    en: 'Lotte World Tower / Seoul Sky',
    queries: ['롯데월드타워', '서울스카이', '롯데월드타워 서울스카이'],
  },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function search(query) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
  url.searchParams.set('query', query)
  url.searchParams.set('x', '126.978')
  url.searchParams.set('y', '37.5665')
  url.searchParams.set('radius', '20000')
  url.searchParams.set('size', '10')
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } })
  return (await res.json()).documents || []
}

for (const place of places) {
  let best = null
  let usedQ = ''
  const seen = new Set()
  const candidates = []

  for (const q of place.queries) {
    const docs = await search(q)
    for (const d of docs) {
      if (seen.has(d.id)) continue
      seen.add(d.id)
      candidates.push({ ...d, query: q })
    }
    if (docs[0] && !best) {
      best = docs[0]
      usedQ = q
    }
    await sleep(150)
  }

  console.log(`=== ${place.en} ===`)
  if (!best) {
    console.log('NOT FOUND')
    continue
  }
  for (const d of candidates.slice(0, 5)) {
    console.log(
      JSON.stringify({
        koName: d.place_name,
        kakaoId: d.id,
        lat: Number(d.y),
        lng: Number(d.x),
        category: d.category_name,
        address: d.address_name,
        query: d.query,
      }),
    )
  }
  console.log(
    '>> PICKED:',
    JSON.stringify({
      koName: best.place_name,
      kakaoId: best.id,
      lat: Number(best.y),
      lng: Number(best.x),
      query: usedQ,
    }),
  )
  console.log()
}

async function searchNear(query, x, y) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
  url.searchParams.set('query', query)
  url.searchParams.set('x', String(x))
  url.searchParams.set('y', String(y))
  url.searchParams.set('radius', '2000')
  url.searchParams.set('size', '10')
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } })
  return (await res.json()).documents || []
}

const seoulSkyDocs = [
  ...(await searchNear('서울스카이', 127.10255558658325, 37.51260447840551)),
  ...(await searchNear('롯데월드타워 서울스카이', 127.10255558658325, 37.51260447840551)),
]
console.log('=== Seoul Sky (observation deck) ===')
const skySeen = new Set()
for (const d of seoulSkyDocs) {
  if (skySeen.has(d.id)) continue
  skySeen.add(d.id)
  console.log(
    JSON.stringify({
      koName: d.place_name,
      kakaoId: d.id,
      lat: Number(d.y),
      lng: Number(d.x),
      category: d.category_name,
      address: d.address_name,
    }),
  )
}
