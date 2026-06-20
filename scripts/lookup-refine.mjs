import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const KEY = process.env.KAKAO_REST_API_KEY

async function search(query, x = 126.978, y = 37.5665) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
  url.searchParams.set('query', query)
  url.searchParams.set('x', String(x))
  url.searchParams.set('y', String(y))
  url.searchParams.set('radius', '20000')
  url.searchParams.set('size', '8')
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } })
  return (await res.json()).documents || []
}

const queries = [
  ['Seongsu-dong', '성수동'],
  ['Seongsu-dong', '성수동 카페거리'],
  ['Ikseon-dong', '익선동'],
  ['Ikseon-dong', '익선동 한옥마을'],
  ['Yeonnam-dong', '연남동 카페거리'],
  ['Yeonnam-dong', '연남동 거리'],
  ['Euljiro', '을지로입구'],
  ['Euljiro', '을지로 거리'],
  ['K-Star Road', '케이스타로드'],
  ['K-Star Road', 'K스타로드'],
  ['K-Star Road', '압구정 로데오거리'],
  ['K-Star Road', '강남 K스타로드'],
  ['Yeouido Yunjung-ro', '윤중로'],
  ['Yeouido Yunjung-ro', '여의도 윤중로 벚꽃'],
  ['Childrens Park', '서울어린이대공원'],
  ['Childrens Park', '어린이대공원'],
  ['HYBE', '하이브 본사'],
  ['HYBE', '하이브'],
  ['Myeongdong Album', '케이팝팔레트'],
  ['Myeongdong Album', '케이메카 명동'],
]

for (const [label, q] of queries) {
  const docs = await search(q)
  console.log(`\n=== ${label}: "${q}" ===`)
  docs.forEach((d) => console.log(`  ${d.place_name} | ${d.id} | ${d.y} | ${d.x} | ${d.category_name}`))
  await new Promise((r) => setTimeout(r, 100))
}
