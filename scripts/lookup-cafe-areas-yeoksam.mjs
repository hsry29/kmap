import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const KEY = process.env.KAKAO_REST_API_KEY

async function search(query, x, y, radius = 3000) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
  url.searchParams.set('query', query)
  url.searchParams.set('x', x)
  url.searchParams.set('y', y)
  url.searchParams.set('radius', String(radius))
  url.searchParams.set('size', '10')
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } })
  return (await res.json()).documents || []
}

const queries = [
  ['Yeoksam cafe 1', '역삼 카페', '127.036', '37.501'],
  ['Yeoksam cafe 2', '역삼역 카페', '127.036', '37.501'],
  ['Yeoksam cafe 3', '테헤란로 카페', '127.036', '37.501'],
  ['Yeoksam cafe 4', '역삼역', '127.036', '37.501'],
  ['Yeonmujang address', '성동구 연무장길', '127.055', '37.544'],
  ['Yeonmujang spot', '성수 연무장길 카페', '127.055', '37.544'],
]

for (const [label, q, x, y] of queries) {
  const docs = await search(q, x, y)
  console.log(`\n=== ${label} (${q}) ===`)
  for (const d of docs.slice(0, 8)) {
    console.log(`${d.place_name}\t${d.id}\t${d.y}\t${d.x}\t${d.category_name}\t${d.road_address_name || d.address_name}`)
  }
  await new Promise((r) => setTimeout(r, 120))
}

// Average coords for Yeonmujang-gil shops on 연무장길
const yeonmujang = [
  { name: '무신사 스탠다드 성수점', lat: 37.541680943746, lng: 127.058635647292 },
  { name: '레드버튼 성수점', lat: 37.5437358671727, lng: 127.051454136678 },
  { name: '디올 성수', lat: 37.54386439075724, lng: 127.0521818170282 },
]
const avgLat = yeonmujang.reduce((s, p) => s + p.lat, 0) / yeonmujang.length
const avgLng = yeonmujang.reduce((s, p) => s + p.lng, 0) / yeonmujang.length
console.log(`\nYeonmujang-gil centroid: ${avgLat}, ${avgLng}`)
