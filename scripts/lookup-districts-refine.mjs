import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const KEY = process.env.KAKAO_REST_API_KEY

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

const queries = [
  ['Hannam Art 1', '한남동 예술의거리', '127.005', '37.536'],
  ['Hannam Art 2', '한남동 갤러리', '127.005', '37.536'],
  ['Hannam Art 3', '한남동 아트', '127.005', '37.536'],
  ['Hannam Art 4', '한남동 카페거리', '127.005', '37.536'],
  ['Seongsu 1', '성수동카페거리', '127.056', '37.544'],
  ['Seongsu 2', '성수문화거리', '127.056', '37.544'],
  ['Yongsan 1', '용산 문화지구', '126.978', '37.524'],
  ['Yongsan 2', '용산 문화단지', '126.978', '37.524'],
  ['Yongsan 3', '국립중앙박물관', '126.978', '37.524'],
  ['Yongsan 4', '용산공원', '126.978', '37.524'],
  ['Yongsan 5', '전쟁기념관', '126.978', '37.524'],
]

for (const [label, q, x, y] of queries) {
  const docs = await search(q, x, y)
  console.log(`\n=== ${label} (${q}) ===`)
  for (const d of docs.slice(0, 6)) {
    console.log(`${d.place_name}\t${d.id}\t${d.y}\t${d.x}\t${d.category_name}\t${d.road_address_name || d.address_name}`)
  }
  await new Promise((r) => setTimeout(r, 120))
}
