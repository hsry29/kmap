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
  url.searchParams.set('radius', '20000')
  url.searchParams.set('size', '10')
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } })
  return (await res.json()).documents || []
}

const queries = [
  ['Bugaksan', '북악팔각정', '126.981', '37.602'],
  ['Yongyangbong', '용양봉저정공원', '127.095', '37.570'],
  ['Yongyangbong 2', '용양봉 전망대', '127.095', '37.570'],
  ['Achasan view', '아차산성', '127.103', '37.567'],
  ['Achasan view 2', '아차산 전망대', '127.103', '37.567'],
  ['Achasan view 3', '아차산 해맞이공원', '127.103', '37.567'],
  ['Haneul view', '하늘공원 전망대', '126.887', '37.569'],
  ['Achasan peak', '아차산', '127.103', '37.567'],
  ['Achasan peak 2', '아차산구봉', '127.103', '37.567'],
]

for (const [label, q, x, y] of queries) {
  const docs = await search(q, x, y)
  console.log(`\n=== ${label} (${q}) ===`)
  for (const d of docs.slice(0, 6)) {
    console.log(`${d.place_name}\t${d.id}\t${d.y}\t${d.x}\t${d.category_name}`)
  }
  await new Promise((r) => setTimeout(r, 120))
}
