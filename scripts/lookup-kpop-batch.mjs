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
    en: 'YG Entertainment',
    queries: ['YG엔터테인먼트', 'YG Entertainment', '와이지엔터테인먼트'],
    x: '126.901',
    y: '37.548',
    pickName: 'YG엔터테인먼트',
  },
  {
    en: 'JYP Entertainment',
    queries: ['JYP엔터테인먼트', 'JYP Entertainment', '제이와이피엔터테인먼트'],
    x: '127.045',
    y: '37.523',
    pickName: 'JYP엔터테인먼트',
  },
  {
    en: 'Seoul Forest K-Star Zone',
    queries: ['서울숲 K-Star Zone', 'K-Star Zone', '서울숲 케이스타존', 'Seoul Forest K-Star Zone'],
    x: '127.038',
    y: '37.544',
    pickName: 'K-Star',
  },
  {
    en: 'KWANGYA SEOUL',
    queries: ['KWANGYA SEOUL', '광야 서울', 'SM 광야', 'KWANGYA @ SEOUL'],
    x: '127.048',
    y: '37.544',
    pickName: 'KWANGYA',
  },
  {
    en: 'Myeongdong K-POP Stores',
    queries: ['명동 K-POP', '명동 케이팝', 'Myeongdong K-POP', '명동 K팝스토어', 'K-POP Plaza 명동'],
    x: '126.986',
    y: '37.563',
    pickName: 'K-POP',
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
  return (await res.json()).documents || []
}

function toRow(d, q) {
  return {
    koName: d.place_name,
    kakaoId: d.id,
    lat: Number(d.y),
    lng: Number(d.x),
    category: d.category_name,
    address: d.road_address_name || d.address_name,
    query: q,
  }
}

function score(place, row) {
  const cat = row.category || ''
  const name = row.koName || ''
  if (place.pickName && name === place.pickName) return 200
  if (place.en.includes('YG') && /YG/i.test(name) && cat.includes('엔터')) return 180
  if (place.en.includes('JYP') && /JYP/i.test(name) && cat.includes('엔터')) return 180
  if (place.pickName && name.includes(place.pickName)) return 150
  if (cat.includes('엔터') || cat.includes('문화') || cat.includes('쇼핑')) return 80
  if (cat.includes('카페') && place.en.includes('KWANGYA')) return 70
  return 10
}

const results = []

for (const place of places) {
  const seen = new Set()
  const candidates = []
  for (const q of place.queries) {
    const docs = await search(q, place.x, place.y)
    for (const d of docs) {
      if (seen.has(d.id)) continue
      seen.add(d.id)
      candidates.push(toRow(d, q))
    }
    await sleep(120)
  }
  candidates.sort((a, b) => score(place, b) - score(place, a))
  results.push({ en: place.en, picked: candidates[0] || null, candidates: candidates.slice(0, 10) })
}

const outPath = path.join(ROOT, 'scripts', 'kpop-batch-results.json')
fs.writeFileSync(outPath, JSON.stringify(results, null, 2))

for (const r of results) {
  const p = r.picked
  if (!p) {
    console.log(`${r.en}\tNOT FOUND`)
    continue
  }
  console.log(`${r.en}\t${p.koName}\t${p.kakaoId}\t${p.lat}\t${p.lng}`)
}
