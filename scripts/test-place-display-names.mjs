/**
 * Smoke test: convenience store English titles
 * Run: npx vite-node scripts/test-place-display-names.mjs
 */
import {
  buildEnglishPlaceTitle,
  normalizeLiveKakaoPlace,
  resolveDisplayNames,
  resolvePlaceDisplayModel,
} from '../src/utils/placeDisplay.js'

const cases = [
  {
    label: '7-Eleven Myeongdong Ihwa',
    place: { name: '세븐일레븐 명동이화점', categoryName: '가정,생활 > 편의점 > 세븐일레븐' },
    kind: 'nearby',
    expectEn: '7-Eleven',
  },
  {
    label: '7-Eleven Myeongdong Sejong (user report)',
    place: { name: '세븐일레븐 명동세종점', categoryName: '가정,생활 > 편의점 > 세븐일레븐' },
    kind: 'nearby',
    expectEn: '7-Eleven',
    expectKo: '세븐일레븐 명동세종점',
  },
  {
    label: '7-Eleven Myeongdong (mixed New Wave stripped)',
    place: { name: '세븐일레븐 명동점 New Wave', categoryName: '가정,생활 > 편의점 > 세븐일레븐' },
    kind: 'search',
    expectEn: '7-Eleven',
    expectKo: '세븐일레븐 명동점',
  },
  {
    label: 'Polluted enName rejected at ingest',
    raw: {
      name: '세븐일레븐 명동점 New Wave',
      enName: 'New Wave',
      place_name: 'New Wave',
      categoryName: '편의점 > 세븐일레븐',
    },
    kind: 'nearby',
    normalize: true,
    expectEn: '7-Eleven',
    expectKo: '세븐일레븐 명동점',
    expectPrimary: '7-Eleven',
  },
  {
    label: 'Stale romanized brand rejected',
    place: {
      name: '세븐일레븐 명동세종점',
      enName: 'Sebeunilrebeun Myeongdong Sejong Branch',
      categoryName: '편의점 > 세븐일레븐',
    },
    kind: 'search',
    expectEn: '7-Eleven',
    expectKo: '세븐일레븐 명동세종점',
    expectPrimary: '7-Eleven',
  },
  {
    label: 'GS25 Myeongdong IB (Latin brand in Kakao name)',
    place: { name: 'GS25 명동IB점', categoryName: '가정,생활 > 편의점 > GS25' },
    kind: 'search',
    expectEn: 'GS25',
    expectKo: '지에스25 명동 IB점',
    expectPrimary: 'GS25',
  },
  {
    label: 'GS25 with Kakao rank prefix',
    place: { name: 'A GS25 명동IB점', categoryName: '편의점 > GS25' },
    kind: 'nearby',
    expectEn: 'GS25',
    expectKo: '지에스25 명동 IB점',
  },
  {
    label: 'CU branch',
    place: { name: '씨유 강남역점', categoryName: '편의점 > CU' },
    kind: 'nearby',
    expectEn: 'CU',
  },
  {
    label: 'Spaced brand',
    place: { name: '세븐 일레븐 명동 세종점', categoryName: '편의점' },
    kind: 'nearby',
    expectEn: '7-Eleven',
  },
]

let failed = 0
for (const c of cases) {
  const place = c.normalize ? normalizeLiveKakaoPlace(c.raw) : c.place
  const { nameKo, nameEn } = resolveDisplayNames(place, c.kind)
  const { primaryTitle } = resolvePlaceDisplayModel(place, c.kind)
  const okEn = nameEn.includes(c.expectEn)
  const okKo = c.expectKo ? nameKo === c.expectKo : Boolean(nameKo)
  const okPrimary = c.expectPrimary ? primaryTitle.includes(c.expectPrimary) : true
  if (!okEn || !okKo || !okPrimary) {
    failed += 1
    console.error(`FAIL: ${c.label}`)
    console.error(`  nameKo=${nameKo}`)
    console.error(`  nameEn=${nameEn}`)
    console.error(`  primaryTitle=${primaryTitle}`)
  } else {
    console.log(`OK: ${c.label}`)
    console.log(`  ${nameKo} → ${primaryTitle}`)
  }
}

console.log('\nbuildEnglishPlaceTitle:', buildEnglishPlaceTitle('세븐일레븐 명동세종점'))
process.exit(failed > 0 ? 1 : 0)
