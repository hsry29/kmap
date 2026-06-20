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
  ['Fritz', '프릳츠', '127.036', '37.523'],
  ['Fritz2', '프릳츠커피 강남', '127.036', '37.523'],
  ['Fritz3', '프릳츠커피 신사', '127.023', '37.523'],
  ['Center', '센터커피 성수', '127.056', '37.544'],
  ['Center2', '센터커피 성동', '127.056', '37.544'],
  ['Center3', '센터커피 연무장길', '127.056', '37.544'],
  ['Center4', '센터커피 아차산', '127.056', '37.544'],
  ['Terra', '테라로사 용산', '127.005', '37.536'],
  ['Terra2', '테라로사 이태원', '127.005', '37.536'],
  ['Terra3', '테라로사 한남동', '127.005', '37.536'],
  ['Terra4', '테라로사커피 한남', '127.005', '37.536'],
]

for (const [label, q, x, y] of queries) {
  const docs = await search(q, x, y)
  console.log(`\n=== ${label} (${q}) ===`)
  for (const d of docs.slice(0, 8)) {
    console.log(`${d.place_name}\t${d.id}\t${d.y}\t${d.x}\t${d.road_address_name || d.address_name}`)
  }
  await new Promise((r) => setTimeout(r, 120))
}
