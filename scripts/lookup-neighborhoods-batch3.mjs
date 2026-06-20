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
  { en: 'Bukchon Hanok Village', ko: '북촌한옥마을', queries: ['북촌한옥마을', 'Bukchon Hanok Village'], x: '126.985', y: '37.582', pickName: '북촌한옥마을', rejectName: /부동산|한복|카페|주차/ },
  { en: 'Seochon', ko: '서촌', queries: ['서촌한옥마을', '서촌', 'Seochon'], x: '126.970', y: '37.579', pickName: '서촌한옥마을', rejectName: /만두|블루스|카페|주차/ },
  { en: 'Ikseon-dong', ko: '익선동', queries: ['익선동한옥거리', '익선동 한옥마을', '익선동'], x: '126.990', y: '37.573', pickName: '익선동한옥거리', rejectName: /북촌|주차/ },
  { en: 'Cheonggyecheon Stream', ko: '청계천', queries: ['청계천', '청계천광장'], x: '126.978', y: '37.569', pickName: '청계천', rejectName: /주차|카페|편의/ },
  { en: 'Seoul City Wall Trail', ko: '서울성곽길', queries: ['서울성곽길', '서울도보관광코스 낙산성곽', '서울한양도성 낙산구간'], x: '127.008', y: '37.580', preferCategory: /명소|관광|도보|공원/, rejectName: /주차|입구|교차로/ },
  { en: 'Yeonnam-dong', ko: '연남동', queries: ['경의선숲길', '연남동 경의선숲길', '연남동'], x: '126.924', y: '37.565', pickName: '경의선숲길', pickAddress: /연남|마포/ },
  { en: 'Songridan-gil', ko: '송리단길', queries: ['송리단길', 'Songridan-gil'], x: '127.100', y: '37.508', pickName: '송리단길', pickAddress: /송파/ },
  { en: 'Seongsu-dong', ko: '성수동', queries: ['성수동카페거리', '성수동', 'Seongsu-dong'], x: '127.056', y: '37.544', pickName: '성수동카페거리', pickAddress: /성동|성수/, rejectName: /역|주차|입출구/ },
  { en: 'Hannam-dong', ko: '한남동', queries: ['한남동 카페거리', '한남동', 'Hannam-dong'], x: '127.005', y: '37.536', pickName: '한남동 카페거리', pickAddress: /용산|한남/, rejectName: /CU|편의|주차/ },
  { en: 'Nodeul Island', ko: '노들섬', queries: ['노들섬', 'Nodeul Island'], x: '126.958', y: '37.518', pickName: '노들섬', rejectName: /주차|라이브|라운지/ },
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
  if (place.rejectName?.test(row.koName)) return -100
  if (place.pickName && row.koName === place.pickName) {
    if (place.pickAddress && !place.pickAddress.test(row.address)) return 55
    return 100
  }
  let s = 0
  if (place.pickAddress?.test(row.address)) s += 20
  if (place.preferCategory?.test(row.category)) s += 12
  if (/명소|거리|관광|테마|공원/.test(row.category)) s += 8
  if (/성곽/.test(row.koName) && place.en.includes('City Wall')) s += 15
  if (/주차|편의|ATM|병원|역|입출구|교차로/.test(row.category + row.koName)) s -= 10
  return s
}

for (const place of places) {
  const seen = new Set()
  const candidates = []
  let best = null
  let bestScore = -999

  for (const q of place.queries) {
    const docs = await search(q, place.x, place.y)
    for (const d of docs) {
      if (seen.has(d.id)) continue
      seen.add(d.id)
      const row = toRow(d, q)
      candidates.push(row)
      const s = score(place, row)
      if (s > bestScore) {
        best = row
        bestScore = s
      }
    }
    await sleep(120)
  }

  console.log(`\n=== ${place.en} (${place.ko}) ===`)
  if (best) {
    console.log(`PICK: ${best.koName}\t${best.kakaoId}\t${best.lat}\t${best.lng}\t${best.address}`)
  } else {
    console.log('PICK: NOT FOUND')
  }
}
