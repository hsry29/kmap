import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const KEY = process.env.KAKAO_REST_API_KEY

const YONGSAN = { x: '126.978', y: '37.523' }

const places = [
  {
    en: 'National Museum of Korea',
    queries: ['국립중앙박물관', 'National Museum of Korea', '중앙박물관'],
    pickName: '국립중앙박물관',
    reject: /주차|카페|매표|안내|기념품|식당|뮤지엄샵/,
  },
  {
    en: 'Yongsan Family Park',
    queries: ['용산가족공원', 'Yongsan Family Park', '용산 가족공원', '가족공원 용산'],
    pickName: '용산가족공원',
    reject: /주차|화장실|매점/,
  },
  {
    en: 'War Memorial of Korea',
    queries: ['전쟁기념관', 'War Memorial of Korea', '국립전쟁기념관'],
    pickName: '전쟁기념관',
    reject: /주차|카페|매표|안내/,
  },
  {
    en: "I'Park Mall",
    queries: ['아이파크몰', "I'Park Mall", 'IPark Mall', '아이파크몰 용산'],
    pickName: '아이파크몰',
    reject: /주차|입구|지하/,
  },
  {
    en: 'N Seoul Tower',
    queries: ['N서울타워', 'N Seoul Tower', '남산타워', 'N서울 타워'],
    pickName: 'N서울타워',
    reject: /주차|케이블|매표|안내|식당|카페/,
  },
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
  if (place.reject?.test(row.koName)) return -100
  if (place.pickName && row.koName === place.pickName) return 200
  if (place.pickName && row.koName.includes(place.pickName)) return 150
  const cat = row.category || ''
  if (place.en.includes('Museum') && cat.includes('박물관')) return 100
  if (place.en.includes('Memorial') && cat.includes('기념')) return 100
  if (place.en.includes('Park') && cat.includes('공원')) return 100
  if (place.en.includes('Tower') && (cat.includes('전망') || row.koName.includes('타워'))) return 100
  if (place.en.includes('Mall') && (cat.includes('쇼핑') || cat.includes('백화'))) return 100
  return 10
}

const results = []

for (const place of places) {
  const seen = new Set()
  const candidates = []
  for (const q of place.queries) {
    const docs = await search(q, YONGSAN.x, YONGSAN.y)
    for (const d of docs) {
      if (seen.has(d.id)) continue
      seen.add(d.id)
      candidates.push(toRow(d, q))
    }
    await sleep(120)
  }
  candidates.sort((a, b) => score(place, b) - score(place, a))
  results.push({ en: place.en, picked: candidates[0] || null, candidates: candidates.slice(0, 6) })
}

console.log('\n| English | Korean | kakao_place_id | lat | lng | category |')
console.log('|---|---|---:|---:|---:|---|')
for (const r of results) {
  const p = r.picked
  if (!p) {
    console.log(`| ${r.en} | NOT FOUND | | | | |`)
    continue
  }
  console.log(
    `| ${r.en} | ${p.koName} | ${p.kakaoId} | ${p.lat} | ${p.lng} | ${p.category} |`,
  )
}

console.log('\n--- candidates ---')
for (const r of results) {
  console.log(`\n## ${r.en}`)
  for (const c of r.candidates) {
    console.log(`  ${c.koName}\t${c.kakaoId}\t${c.lat}\t${c.lng}\t${c.category}`)
  }
}
