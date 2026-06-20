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
    en: 'Apgujeong Rodeo',
    queries: ['압구정로데오거리', '압구정 로데오거리', '압구정로데오'],
    x: '127.039',
    y: '37.527',
    pickName: '압구정로데오거리',
  },
  {
    en: 'Garosu-gil',
    queries: ['가로수길', 'Garosu-gil', '신사 가로수길'],
    x: '127.023',
    y: '37.521',
    pickName: '가로수길',
  },
  {
    en: 'Lotte World Mall',
    queries: ['롯데월드몰', 'Lotte World Mall', '롯데월드타워 몰'],
    x: '127.102',
    y: '37.512',
    pickName: '롯데월드몰',
  },
  {
    en: 'IFC Mall',
    queries: ['IFC몰', 'IFC Mall', '서울 IFC몰'],
    x: '126.925',
    y: '37.525',
    pickName: 'IFC몰',
  },
  {
    en: 'Times Square Mall',
    queries: ['타임스퀘어', 'Times Square Mall', '영등포 타임스퀘어'],
    x: '126.895',
    y: '37.517',
    pickName: '타임스퀘어',
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
  if (place.pickName && row.koName === place.pickName) return 200
  if (place.pickName && row.koName.includes(place.pickName)) return 150
  if (cat.includes('백화점') || cat.includes('쇼핑') || cat.includes('테마거리') || cat.includes('복합쇼핑')) return 90
  if (cat.includes('관광') || cat.includes('명소')) return 70
  if (cat.includes('음식점') || cat.includes('미용') || cat.includes('사진')) return -30
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
  const picked = candidates[0] || null
  results.push({ en: place.en, picked, candidates: candidates.slice(0, 8) })
}

const outPath = path.join(ROOT, 'scripts', 'shopping-batch-results.json')
fs.writeFileSync(outPath, JSON.stringify(results, null, 2))

for (const r of results) {
  const p = r.picked
  if (!p) {
    console.log(`${r.en}\tNOT FOUND`)
    continue
  }
  console.log(`${r.en}\t${p.koName}\t${p.kakaoId}\t${p.lat}\t${p.lng}`)
}
