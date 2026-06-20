// ─────────────────────────────────────────────────────────────────────────────
// 카카오 Local API(키워드 검색) 일괄 추출 스크립트
//
// 사용법:
//   1. Kakao Developers > 내 앱 > 앱 키 > "REST API 키" 발급
//      (지도용 JavaScript 키와는 다른 키입니다)
//   2. 프로젝트 루트의 .env 에 KAKAO_REST_API_KEY=... 추가
//      (Vite 클라이언트 번들에 노출되지 않습니다)
//   3. npm run fetch:places
//
// 결과:
//   src/data/places.generated.js 파일이 생성됩니다.
//   직접 검토 후 좋은 항목만 src/data/places.js 의 RAW_THEME_PLACES 에 옮겨주세요.
//
// 튜닝:
//   THEMES / ANCHORS / RADIUS_M / MAX_PER_THEME / PAGES 상수를 조정.
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

// ─── .env 파싱 (의존성 없이) ─────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(ROOT, '.env')
  if (!fs.existsSync(envPath)) return
  const text = fs.readFileSync(envPath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!m) continue
    const [, key, raw] = m
    if (process.env[key]) continue
    process.env[key] = raw.replace(/^['"]|['"]$/g, '')
  }
}
loadEnv()

const REST_KEY = process.env.KAKAO_REST_API_KEY
if (!REST_KEY) {
  console.error('❌ KAKAO_REST_API_KEY 환경변수가 필요합니다.')
  console.error('   Kakao Developers > 내 앱 > 앱 키 > "REST API 키" 를 .env 에 추가하세요.')
  console.error('   예) KAKAO_REST_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx')
  process.exit(1)
}

if (typeof fetch !== 'function') {
  console.error('❌ Node 18 이상에서 실행해야 합니다 (built-in fetch 필요).')
  process.exit(1)
}

// ─── 검색 설정 ──────────────────────────────────────────────────────────────
// 테마별 키워드. 결과 품질을 보고 조정하세요.
const THEMES = {
  'K-POP': ['K-POP', '엔터테인먼트사', '아이돌 카페'],
  History: ['궁', '문화재', '박물관', '한옥마을'],
  Hiking: ['등산로', '국립공원', '둘레길'],
}

// 검색 중심점. 더 많은 도시를 추가하면 데이터 다양성이 늘어남.
const ANCHORS = [
  { region: 'Seoul', lat: 37.5665, lng: 126.978 },
  { region: 'Busan', lat: 35.1796, lng: 129.0756 },
  { region: 'Jeju', lat: 33.4996, lng: 126.5312 },
  { region: 'Gyeongju', lat: 35.8562, lng: 129.2247 },
  { region: 'Yongin', lat: 37.2411, lng: 127.1776 },
  { region: 'Incheon', lat: 37.4563, lng: 126.7052 },
  { region: 'Daegu', lat: 35.8714, lng: 128.6014 },
  { region: 'Gwangju', lat: 35.1595, lng: 126.8526 },
]

const RADIUS_M = 8000 // 중심점 기준 검색 반경 (최대 20000)
const MAX_PER_THEME = 50 // 테마별 최종 보관 개수
const PAGES = 3 // 페이지 당 15개, 3페이지면 도시당 최대 45개 후보
const PAGE_SIZE = 15 // 카카오 keyword API 한도 (1~15)
const SLEEP_MS = 120 // 호출 간격(과도한 요청 방지)

// ─── 유틸 ───────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function searchOnce({ keyword, lat, lng, page }) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
  url.searchParams.set('query', keyword)
  url.searchParams.set('x', String(lng))
  url.searchParams.set('y', String(lat))
  url.searchParams.set('radius', String(RADIUS_M))
  url.searchParams.set('size', String(PAGE_SIZE))
  url.searchParams.set('page', String(page))
  url.searchParams.set('sort', 'distance')

  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${REST_KEY}` },
  })
  if (!res.ok) {
    throw new Error(`Kakao API ${res.status} ${res.statusText}: ${await res.text()}`)
  }
  return res.json()
}

function normalize({ theme, region, doc }) {
  return {
    id: `dyn-${theme.toLowerCase().replace(/[^a-z0-9]/g, '')}-${doc.id}`,
    region,
    enName: doc.place_name,
    koAddress: doc.road_address_name || doc.address_name || '',
    lat: Number(doc.y),
    lng: Number(doc.x),
    phone: doc.phone || '',
    categoryName: doc.category_name || '',
    placeUrl: doc.place_url || '',
  }
}

async function collectTheme(theme, keywords) {
  const dedup = new Map() // place.id 기준 중복 제거
  for (const anchor of ANCHORS) {
    for (const keyword of keywords) {
      for (let page = 1; page <= PAGES; page += 1) {
        let json
        try {
          json = await searchOnce({ keyword, lat: anchor.lat, lng: anchor.lng, page })
        } catch (err) {
          console.warn(`  ! 실패: [${theme}] "${keyword}" @ ${anchor.region} p${page}`)
          console.warn(`    ${err.message}`)
          break
        }
        const docs = Array.isArray(json.documents) ? json.documents : []
        for (const doc of docs) {
          if (!dedup.has(doc.id)) {
            dedup.set(doc.id, normalize({ theme, region: anchor.region, doc }))
          }
        }
        process.stdout.write(
          `  · [${theme}] "${keyword}" @ ${anchor.region} p${page}: +${docs.length} (총 ${dedup.size})\n`,
        )
        await sleep(SLEEP_MS)
        if (json.meta?.is_end || docs.length < PAGE_SIZE) break
      }
    }
  }
  return Array.from(dedup.values()).slice(0, MAX_PER_THEME)
}

function renderOutput(grouped) {
  const banner = [
    '// ─────────────────────────────────────────────────────────────────────────────',
    '// AUTO-GENERATED by scripts/fetch-kakao-places.mjs',
    `// Generated: ${new Date().toISOString()}`,
    '//',
    '// 이 파일은 자동 생성됩니다. 직접 편집하지 마세요.',
    '// 사용자 큐레이션 데이터는 src/data/places.js 에 추가하세요.',
    '// 좋은 항목만 골라 places.js 의 RAW_THEME_PLACES 에 복사하시면 됩니다.',
    '// ─────────────────────────────────────────────────────────────────────────────',
    '',
  ].join('\n')

  return `${banner}export const GENERATED_PLACES = ${JSON.stringify(grouped, null, 2)}\n`
}

async function main() {
  console.log(`▶ Kakao Local API 일괄 추출 시작 (anchors=${ANCHORS.length}, max/theme=${MAX_PER_THEME})\n`)

  const grouped = {}
  for (const [theme, keywords] of Object.entries(THEMES)) {
    console.log(`\n■ ${theme}`)
    grouped[theme] = await collectTheme(theme, keywords)
    console.log(`  → ${theme}: ${grouped[theme].length}개 확정`)
  }

  const outPath = path.join(ROOT, 'src', 'data', 'places.generated.js')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, renderOutput(grouped), 'utf8')

  const total = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0)
  console.log(`\n✔ 완료: ${total}개 장소 저장`)
  console.log(`  → ${path.relative(ROOT, outPath)}`)
  console.log(`\n다음 단계: 결과를 검토하고 좋은 항목만 src/data/places.js 로 복사하세요.`)
}

main().catch((err) => {
  console.error('\n❌ 스크립트 실패:', err)
  process.exit(1)
})
