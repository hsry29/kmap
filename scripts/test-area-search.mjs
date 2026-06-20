import { matchAreaQuery, searchCuratedPlaces } from '../src/utils/areaSearch.js'

const tests = [
  ['Hongdae', 'Hongdae'],
  ['hongdae', 'Hongdae'],
  ['홍대', 'Hongdae'],
  ['Gangnam', 'Gangnam'],
  ['myeongdong', 'Myeongdong'],
  ['Seochon', 'Seochon'],
  ['samcheong', 'Samcheong-dong'],
  ['nonexistent area xyz', null],
]

let failed = 0
for (const [query, expected] of tests) {
  const match = matchAreaQuery(query)
  const got = match?.key ?? null
  if (got !== expected) {
    console.error(`FAIL: "${query}" → expected ${expected}, got ${got}`)
    failed += 1
  } else {
    console.log(`OK: "${query}" → ${got ?? 'null'}`)
  }
}

const samplePlaces = [
  { id: 'a', enName: 'Hongdae Walking Street', koName: '홍대 걷고싶은거리', lat: 37.55, lng: 126.92 },
  { id: 'b', enName: 'Gyeongbokgung Palace', koName: '경복궁', lat: 37.58, lng: 126.98 },
]
const curated = searchCuratedPlaces('hongdae walking', samplePlaces, new Set())
if (curated.length !== 1 || curated[0].id !== 'a') {
  console.error('FAIL: curated search for hongdae walking')
  failed += 1
} else {
  console.log('OK: curated local search')
}

if (failed > 0) {
  process.exit(1)
}
console.log('All area search tests passed.')
