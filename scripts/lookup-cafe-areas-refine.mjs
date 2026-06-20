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
  url.searchParams.set('radius', '5000')
  url.searchParams.set('size', '10')
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } })
  return (await res.json()).documents || []
}

const queries = [
  ['Seorae cafe street', '서래마을카페거리', '126.998', '37.498'],
  ['Dosan park', '도산근린공원', '127.035', '37.524'],
  ['Seoul forest cafe', '서울숲카페거리', '127.043', '37.546'],
  ['Yeoksam dong', '역삼동', '127.036', '37.501'],
  ['Yeoksam station', '역삼역', '127.036', '37.501'],
  ['Gangnam cafe street', '강남역 카페거리', '127.028', '37.498'],
  ['Yeonmujang-gil', '연무장길', '127.055', '37.544'],
  ['Seongsu cafe street', '성수동 카페거리', '127.055', '37.544'],
  ['Seongsu abandoned factory', '성수 연무장길', '127.055', '37.544'],
]

for (const [label, q, x, y] of queries) {
  const docs = await search(q, x, y)
  console.log(`\n=== ${label} (${q}) ===`)
  for (const d of docs.slice(0, 6)) {
    console.log(`${d.place_name}\t${d.id}\t${d.y}\t${d.x}\t${d.category_name}`)
  }
  await new Promise((r) => setTimeout(r, 120))
}
