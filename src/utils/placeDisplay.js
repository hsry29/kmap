import {
  applyCategoryLexiconPatches,
  CATEGORY_OMIT_TERMS,
  CATEGORY_TERM_EN_EXTRA,
  NAME_EN_TOKENS_EXTRA,
  normalizePlaceEnglishSpacing,
} from './categoryLexicon'
import {
  CONVENIENCE_STORE_BRAND_PATTERN,
  extractKoreanPlaceName,
  isConvenienceStoreContext,
  looksLikeRomanizedConvenienceBrand,
  normalizeConvenienceBrandEnglish,
  normalizeKoreanStoreName,
} from './convenienceBrandLexicon'
import { translateCategorySemantic } from './categoryTranslate'
import { KOREAN_FOOD_NAME_MAP } from './koreanFoodLexicon'
import { INTERNATIONAL_FOOD_MAP } from './internationalFoodLexicon'
import { buildSemanticDisplayName, containsHangul } from './koreanDisplayName'
import { applyLodgingTypePatches, LODGING_NAME_VARIANT_PAIRS } from './lodgingTypeLexicon'
import { romanizeHangulBySyllable } from './pronunciation'
import { isSubwayStationContext, resolveSubwayStationDisplay } from './subwayStationNames'

export { containsHangul } from './koreanDisplayName'

const KNOWN_NAME_EN_TOKENS = [
  ['앤티앤스프레즐', "Auntie Anne's Pretzels"],
  ['앤티앤스', "Auntie Anne's"],
  ['프레즐', 'Pretzels'],
  ['파리바게뜨', 'Paris Baguette'],
  ['뚜레쥬르', 'Tous Les Jours'],
  ['베스킨라빈스', 'Baskin-Robbins'],
  ['롯데하이마트', 'Lotte Hi-Mart'],
  ['하이마트', 'Hi-Mart'],
  ['롯데몰', 'Lotte Mall'],
  ['롯데', 'Lotte'],
  ['스타필드마켓', 'Starfield Market'],
  ['스타필드', 'Starfield'],
  ['챔피언더블랙벨트', 'Champion The Black Belt'],
  ['블럭플레이', 'Blockplay'],
  ['에그슬라임', 'EggSlime'],
  ['슬라임팝&폰데코', 'Slime Pop&Phone Deco'],
  ['슬라임팝', 'Slime Pop'],
  ['키즈미디어', 'Kids Media'],
  ['키드미디어', 'Kids Media'],
  ['타이니키즈파크', 'Tiny Kids Park'],
  ['타이니 키즈파크', 'Tiny Kids Park'],
  ['키즈파크', 'Kids Park'],
  ['타이니', 'Tiny'],
  ['탑텐키즈', 'TopTen Kids'],
  ['탑텐', 'TopTen'],
  ['폴햄키즈', 'Polham kids'],
  ['폴햄', 'Polham'],
  ['우리끼리키즈카페', 'U Ri Kki Ri Kids Cafe'],
  ['꿈꾸는마을', 'Kkum Kku Neun Village'],
  ['우리끼리', 'U Ri Kki Ri'],
  ['꿈꾸는', 'Kkum Kku Neun'],
  ['키즈카페', 'Kids Cafe'],
  ['마을', 'Village'],
  ['애슐리퀸즈', 'Ashley Queens'],
  ['애슐리', 'Ashley'],
  ['에슐리', 'Ashley'],
  ['빕스', 'Vips'],
  ['아웃백', 'Outback Steakhouse'],
  ['매드포갈릭', 'Mad for Garlic'],
  ['삼성스토어', 'Samsung Store'],
  ['삼성', 'Samsung'],
  ['스토어', 'Store'],
  ['수지', 'Suji'],
  ['강남', 'Gangnam'],
  ['용인', 'Yongin'],
  ['서울역', 'Seoul Station'],
  ...LODGING_NAME_VARIANT_PAIRS,
  ...NAME_EN_TOKENS_EXTRA,
].sort((a, b) => b[0].length - a[0].length)

function toSemanticEnglishName(name) {
  const raw = normalizeKoreanStoreName(String(name ?? '').trim())
  if (!raw || !containsHangul(raw)) {
    return ''
  }
  let prepared = applyLodgingTypePatches(raw)
  for (const [ko, en] of KNOWN_NAME_EN_TOKENS) {
    if (!prepared.includes(ko)) {
      continue
    }
    prepared = prepared.split(ko).join(` ${en} `)
  }
  prepared = prepared.replace(/\s+/g, ' ').trim()
  const semantic = buildSemanticDisplayName(prepared)
  const candidate = semantic && /[A-Za-z]/.test(semantic) ? semantic : ''
  if (candidate) {
    return normalizeConvenienceBrandEnglish(candidate)
  }
  if (/[A-Za-z]/.test(prepared)) {
    return normalizeConvenienceBrandEnglish(
      normalizePlaceEnglishSpacing(applyCategoryLexiconPatches(prepared)),
    )
  }
  return ''
}

/**
 * Single English title builder for live POIs and curated places.
 * Input must be a Korean store/place name (Hangul); never pass category or image metadata.
 * @param {string} koreanName
 */
export function buildEnglishPlaceTitle(koreanName) {
  const ko = normalizeKoreanStoreName(String(koreanName ?? '').trim())
  if (!ko) {
    return ''
  }
  if (containsHangul(ko)) {
    return toSemanticEnglishName(ko)
  }
  return normalizeConvenienceBrandEnglish(ko)
}

/** @param {string} en @param {string} ko @param {Record<string, unknown>} place */
function isStaleEnglishTitle(en, ko, place) {
  const english = String(en ?? '').trim()
  const korean = String(ko ?? '').trim()
  if (!english) {
    return true
  }
  if (containsHangul(english)) {
    return true
  }
  if (looksLikeRomanizedConvenienceBrand(english)) {
    return true
  }
  if (!isConvenienceStoreContext(place, korean)) {
    return false
  }
  const normalized = normalizeConvenienceBrandEnglish(english)
  if (/^(7-Eleven|CU|GS25|emart24|MINISTOP)\b/i.test(normalized)) {
    return false
  }
  // e.g. "New Wave" while Korean is "세븐일레븐 명동점"
  return Boolean(korean && containsHangul(korean))
}

/** @param {Record<string, unknown>} place @param {'planning' | 'nearby' | 'search'} kind */
function resolveKoreanNameSource(place, kind) {
  if (kind === 'planning') {
    const koExtra = String(place.koName ?? place.koPlaceName ?? '').trim()
    if (koExtra) {
      return normalizeKoreanStoreName(koExtra)
    }
    const en = String(place.enName ?? '').trim()
    if (containsHangul(en)) {
      return normalizeKoreanStoreName(en)
    }
    const fromName = extractKoreanPlaceName(String(place.name ?? place.placeName ?? '').trim())
    return fromName || normalizeKoreanStoreName(String(place.name ?? place.placeName ?? '').trim())
  }

  // Live Kakao POIs: Korean store name only — never enName / image_assets.place_name.
  const fields = [place.koName, place.name, place.placeName]
  for (const field of fields) {
    const korean = extractKoreanPlaceName(String(field ?? '').trim())
    if (korean) {
      return korean
    }
  }
  for (const field of fields) {
    const raw = normalizeKoreanStoreName(String(field ?? '').trim())
    if (raw && containsHangul(raw)) {
      return raw
    }
  }
  return ''
}

/** @param {string} curatedEn @param {string} koreanName @param {Record<string, unknown>} place */
function resolvePlanningEnglishTitle(curatedEn, koreanName, place) {
  const ko = String(koreanName ?? '').trim()
  if (isStaleEnglishTitle(curatedEn, ko, place)) {
    const generated = buildEnglishPlaceTitle(ko)
    if (generated) {
      return generated
    }
  }
  const en = String(curatedEn ?? '').trim()
  if (en && !containsHangul(en)) {
    return normalizeConvenienceBrandEnglish(en)
  }
  return buildEnglishPlaceTitle(ko)
}

/**
 * Strip stale English / image metadata from Kakao POI records at ingest.
 * @param {Record<string, unknown>} record
 */
export function normalizeLiveKakaoPlace(record) {
  const src = record && typeof record === 'object' ? record : {}
  const rawName = String(src.name ?? src.place_name ?? '').trim()
  const categoryName = String(src.categoryName ?? src.category_name ?? src.category ?? '').trim()
  const koreanName =
    extractKoreanPlaceName(String(src.koName ?? '').trim()) ||
    extractKoreanPlaceName(rawName) ||
    (containsHangul(rawName) ? normalizeKoreanStoreName(rawName) : '')

  const { enName: _dropEn, place_name: _dropPlaceName, ...rest } = src
  return {
    ...rest,
    ...(categoryName ? { categoryName } : {}),
    ...(koreanName
      ? { name: koreanName, koName: koreanName }
      : rawName
        ? { name: rawName }
        : {}),
  }
}

/**
 * Card/list display model — single source for visible titles.
 * @param {Record<string, unknown>} place
 * @param {'planning' | 'nearby' | 'search'} kind
 */
export function resolvePlaceDisplayModel(place, kind) {
  const { nameKo, nameEn, subwayLines, isSubway } = resolveDisplayNames(place, kind)
  const convenience = isConvenienceStoreContext(place, nameKo)
  let englishTitle = nameEn
  if ((!englishTitle || isStaleEnglishTitle(englishTitle, nameKo, place)) && nameKo) {
    englishTitle = buildEnglishPlaceTitle(nameKo) || englishTitle
  }
  const primaryTitle = englishTitle || nameKo || 'Place'
  const showKoreanSubtitle = Boolean(nameKo && englishTitle && nameKo !== englishTitle)
  return {
    nameKo,
    nameEn: englishTitle,
    primaryTitle,
    showKoreanSubtitle,
    subwayLines,
    isSubway,
    isConvenience: convenience,
  }
}

/**
 * Primary display label for lists (English preferred, Korean fallback).
 * @param {Record<string, unknown>} place
 * @param {'planning' | 'nearby' | 'search'} kind
 */
export function getPlaceDisplayTitle(place, kind) {
  return resolvePlaceDisplayModel(place, kind).primaryTitle
}

const CATEGORY_TERM_EN = {
  음식점: 'Restaurants',
  카페: 'Cafes',
  커피전문점: 'Cafe',
  커피: 'Coffee',
  술집: 'Pub',
  주점: 'Pub',
  호프: 'Beer Pub',
  와인바: 'Wine Bar',
  칵테일바: 'Cocktail Bar',
  치킨: 'Chicken Restaurant',
  피자: 'Pizza',
  패스트푸드: 'Fast Food',
  햄버거: 'Burgers',
  분식: 'Korean Snack Food',
  한식: 'Korean Restaurant',
  중식: 'Chinese Restaurant',
  일식: 'Japanese Restaurant',
  퓨전일식: 'Fusion Japanese',
  퓨전한식: 'Fusion Korean',
  퓨전중식: 'Fusion Chinese',
  퓨전양식: 'Fusion Western',
  고깃집: 'Korean BBQ',
  초밥: 'Sushi',
  롤: 'Sushi',
  스시: 'Sushi',
  양식: 'Western Restaurant',
  아시아음식: 'Asian',
  베이커리: 'Bakery',
  제과: 'Bakery',
  디저트카페: 'Dessert Cafe',
  편의점: 'Convenience Stores',
  마트: 'Markets',
  슈퍼마켓: 'Supermarkets',
  숙박: 'Lodging',
  호텔: 'Hotel',
  모텔: 'Motel',
  호스텔: 'Hostel',
  한옥스테이: 'Hanok Stay',
  레지던스: 'Residence',
  게스트하우스: 'Guesthouse',
  펜션: 'Pension',
  관광명소: 'Attractions',
  문화시설: 'Cultural Venues',
  교육: 'Education',
  학문: 'Academics',
  '교육,학문': 'Education, Academics',
  어린이집: 'Daycare Center',
  유치원: 'Kindergarten',
  박물관: 'Museums',
  미술관: 'Art Galleries',
  공연장: 'Performance Venues',
  영화관: 'Cinemas',
  쇼핑: 'Shopping',
  백화점: 'Department Stores',
  의류: 'Clothing',
  의류판매: 'Clothing Stores',
  생활서비스: 'Services',
  서비스: 'Service',
  산업: 'Industry',
  '서비스,산업': 'Service, Industry',
  인쇄: 'Printing',
  복사: 'Copying',
  '인쇄,복사': 'Printing, Copying',
  가정: 'Home',
  생활: 'Living',
  '가정,생활': 'Home & Living',
  교통: 'Transport',
  지하철역: 'Subway Stations',
  버스정류장: 'Bus Stop',
  버스터미널: 'Bus Terminal',
  종합버스터미널: 'Bus Terminal',
  주차장: 'Parking',
  은행: 'Banks',
  약국: 'Pharmacy',
  병원: 'Hospital',
  의료: 'Medical',
  건강: 'Health',
  의료기관: 'Medical Facilities',
  클리닉: 'Clinic',
  의원: 'Clinic',
  일반의원: 'Clinic',
  보건소: 'Public Health Center',
  응급의료: 'Emergency Care',
  응급실: 'Emergency Room',
  내과: 'Internal Medicine Clinic',
  외과: 'Surgery Clinic',
  정형외과: 'Orthopedic Clinic',
  소아과: 'Pediatrics',
  산부인과: 'OB-GYN',
  피부과: 'Dermatology Clinic',
  치과: 'Dental Clinic',
  정신건강의학과: 'Psychiatry Clinic',
  신경과: 'Neurology Clinic',
  신경외과: 'Neurosurgery Clinic',
  이비인후과: 'ENT Clinic',
  비뇨의학과: 'Urology Clinic',
  안과: 'Ophthalmology Clinic',
  한의원: 'Korean Medicine Clinic',
  재활의학과: 'Rehabilitation Medicine Clinic',
  성형외과: 'Plastic Surgery Clinic',
  가정의학과: 'Family Medicine Clinic',
  육류: 'Meat',
  고기: 'Meat',
  소고기: 'Beef',
  돼지고기: 'Pork',
  닭요리: 'Chicken Dishes',
  곱창: 'Grilled Tripe',
  갈비: 'Ribs',
  삼겹살: 'Pork Belly BBQ',
  해산물: 'Seafood Restaurant',
  해물: 'Seafood Restaurant',
  생선: 'Fish',
  게: 'Crab',
  대게: 'Snow Crab',
  생선회: 'Sashimi',
  회: 'Sashimi',
  Hoe: 'Sashimi',
  Ge: 'Crab',
  'Dae Ge': 'Snow Crab',
  'Hae Mul': 'Seafood',
  'Saeng Seon': 'Fish',
  'Hae Mul Saeng Seon': 'Seafood, Fish',
  'Hae-Mul Saeng-Seon': 'Seafood, Fish',
  'HaeMul SaengSeon': 'Seafood, Fish',
  전골: 'Hot Pot',
  찌개: 'Stew',
  ...INTERNATIONAL_FOOD_MAP,
  ...KOREAN_FOOD_NAME_MAP,
  교동면옥: 'Naeng Myeon',
  포장마차: 'Pojangmacha',
  치킨전문점: 'Chicken',
  호프: 'Beer Pub',
  이자카야: 'Izakaya',
  마크: 'Mart',
  패밀리레스토랑: 'Casual Dining',
  키즈카페: 'Kids Cafe',
  테마카페: 'Experience Cafe',
  체험카페: 'Experience Cafe',
  ...CATEGORY_TERM_EN_EXTRA,
}

function normalizeCategoryKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[·,/_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

const CATEGORY_TERM_EN_NORMALIZED = Object.fromEntries(
  Object.entries(CATEGORY_TERM_EN).map(([k, v]) => [normalizeCategoryKey(k), v]),
)

const ROMANIZED_CATEGORY_HINTS = [
  { pattern: /\bui\s*ryo\b/i, label: 'Medical' },
  { pattern: /\bil\s*ban\s*ui\s*won\b/i, label: 'Clinic' },
  { pattern: /\bgeon\s*gang\b/i, label: 'Health' },
  { pattern: /\ban\s*gwa\b/i, label: 'Ophthalmology Clinic' },
  { pattern: /\bnae\s*gwa\b/i, label: 'Internal Medicine' },
  { pattern: /\boe\s*gwa\b/i, label: 'Surgery Clinic' },
  { pattern: /\bso\s*a\s*gwa\b/i, label: 'Pediatrics' },
  { pattern: /\bpi\s*bu\s*gwa\b/i, label: 'Dermatology Clinic' },
  { pattern: /\bchi\s*gwa\b/i, label: 'Dental Clinic' },
  { pattern: /\bi\s*bi\s*in\s*hu\s*gwa\b/i, label: 'ENT Clinic' },
  { pattern: /퓨전\s*일식|pyu\s*jeon\s*il\s*sik/i, label: 'Fusion Japanese' },
  { pattern: /퓨전\s*한식|pyu\s*jeon\s*han\s*sik/i, label: 'Fusion Korean' },
  { pattern: /\bil\s*sik\b/i, label: 'Japanese Restaurant' },
  { pattern: /\bhan\s*sik\b/i, label: 'Korean Restaurant' },
  { pattern: /\bjung\s*sik\b/i, label: 'Chinese Restaurant' },
  { pattern: /\byang\s*sik\b/i, label: 'Western Restaurant' },
  { pattern: /\bgo\s*git\s*jip\b/i, label: 'Korean BBQ' },
  { pattern: /\bhae\s*jang\s*guk\b/i, label: 'Haejangguk' },
  { pattern: /\bguk\s*bap\b/i, label: 'Gukbap' },
  { pattern: /\bgam\s*ja\s*tang\b/i, label: 'Gamjatang' },
  { pattern: /\bnaeng\s*myeon\b/i, label: 'Naengmyeon' },
  { pattern: /해장국/i, label: 'Haejangguk' },
  { pattern: /국밥/i, label: 'Gukbap' },
  { pattern: /스테이크\s*전문점|seu\s*te\s*i\s*keu\s*jeon\s*mun\s*jeom/i, label: 'Steakhouse' },
  { pattern: /스테이크하우스|스테이크집/i, label: 'Steakhouse' },
  { pattern: /스테이크/i, label: 'Steak' },
  { pattern: /\bseu\s*te\s*i\s*keu\b/i, label: 'Steak' },
  { pattern: /\bpi\s*ja\b/i, label: 'Pizza' },
  { pattern: /\bpa\s*seu\s*ta\b/i, label: 'Pasta' },
  { pattern: /\bbeu\s*geo\b|\bhaem\s*beo\s*geo\b/i, label: 'Burger' },
  { pattern: /\bsaen\s*deu\s*wi\s*chi\b/i, label: 'Sandwich' },
  { pattern: /\bjeong\s*hyeong\s*oe\s*gwa\b/i, label: 'Orthopedic Clinic' },
  { pattern: /\bsun\s*dae\s*guk\b/i, label: 'Sundaeguk' },
  { pattern: /\bsam\s*gye\s*tang\b/i, label: 'Samgyetang' },
  { pattern: /\bsoup\s*rice\b/i, label: 'Gukbap' },
  { pattern: /\bhangover\s*soup\b/i, label: 'Haejangguk' },
  { pattern: /\bga\s*jeong\b/i, label: 'Home' },
  { pattern: /\bsaeng\s*hwal\b/i, label: 'Living' },
  { pattern: /\bga\s*jeong\s*,?\s*saeng\s*hwal\b/i, label: 'Home & Living' },
  { pattern: /\bje\s*gwa\b/i, label: 'Bakery' },
  { pattern: /\bjok\s*bal\b/i, label: 'Jok Bal' },
  { pattern: /\bsun\s*dae\b/i, label: 'Soon Dea' },
  { pattern: /\bsoon\s*dea\b/i, label: 'Soon Dea' },
  { pattern: /\bkal\s*(guk\s*su|guksu)\b/i, label: 'Kal Noodles' },
  { pattern: /\bdae\s*ge\b/i, label: 'Snow Crab' },
  { pattern: /떡볶이/i, label: 'Tteok Bok I' },
  { pattern: /\btteok\s*bo\s*k+i\b/i, label: 'Tteok Bok I' },
  { pattern: /\btteok\s*bok\s*i\b/i, label: 'Tteok Bok I' },
  { pattern: /\bkeo\s*pi\s*jeon\s*mun\s*jeom\b/i, label: 'Cafe' },
  { pattern: /\bcho\s*bap\s*,?\s*rol\b/i, label: 'Sushi' },
  { pattern: /\bcho\s*bap\b/i, label: 'Sushi' },
  { pattern: /\bgyo\s*dong\s*myeon\s*ok\b/i, label: 'Naeng Myeon' },
  { pattern: /\bnaeng\s*myeon\b/i, label: 'Naeng Myeon' },
  { pattern: /\bki\s*jeu\s*ka\s*pe\b/i, label: 'Kids Cafe' },
  { pattern: /\bte\s*ma\s*ka\s*pe\b/i, label: 'Experience Cafe' },
  { pattern: /\bche\s*heom\s*ka\s*pe\b/i, label: 'Experience Cafe' },
  { pattern: /\bseo\s*bi\s*seu\b/i, label: 'Service' },
  { pattern: /\bsan\s*eop\b/i, label: 'Industry' },
  { pattern: /\bin\s*swae\b/i, label: 'Printing' },
  { pattern: /\bbok\s*sa\b/i, label: 'Copying' },
  { pattern: /\bseo\s*bi\s*seu\s*,?\s*san\s*eop\b/i, label: 'Service, Industry' },
  { pattern: /\bin\s*swae\s*,?\s*bok\s*sa\b/i, label: 'Printing, Copying' },
  { pattern: /\beui\s*ryu\b/i, label: 'Clothing' },
  { pattern: /\bpol\s*haem\b/i, label: 'Polham' },
  { pattern: /\bge\s*seu\s*teu\s*hau\s*seu\b/i, label: 'Guesthouse' },
  { pattern: /\bgeseuteuhauseu\b/i, label: 'Guesthouse' },
  { pattern: /\bhan\s*ok\s*seu\s*te\s*i\b/i, label: 'Hanok Stay' },
  { pattern: /\bho\s*seu\s*tel\b/i, label: 'Hostel' },
  { pattern: /\bre\s*ji\s*deon\s*seu\b/i, label: 'Residence' },
  { pattern: /\bmo\s*tel\b/i, label: 'Motel' },
  { pattern: /\bho\s*tel\b/i, label: 'Hotel' },
  { pattern: /\bpen\s*sion\b/i, label: 'Pension' },
  { pattern: /\beo\s*rin\s*i\s*jip\b/i, label: 'Daycare Center' },
  { pattern: /\byu\s*chi\s*won\b/i, label: 'Kindergarten' },
  { pattern: /\bgyo\s*yuk\b/i, label: 'Education' },
  { pattern: /\bhak\s*mun\b/i, label: 'Academics' },
  { pattern: /\bgyo\s*yuk\s*,?\s*hak\s*mun\b/i, label: 'Education, Academics' },
]

const MARKET_BRAND_PATTERN =
  /(더프레시|deo\s*peu\s*re\s*si|롯데슈퍼프레시|rot\s*de\s*syu\s*peo\s*peo?\s*re\s*si|롯데슈퍼|lotte\s*super|gs\s*the\s*fresh|homeplus|홈플러스|하나로마트|hanaro\s*mart)/i
const BRAND_STORE_PATTERN =
  /(삼성스토어|sam\s*seong\s*seu\s*to\s*eo|apple\s*store|애플스토어|스토어|store|seu\s*to\s*eo)/i
const BAKERY_BRAND_PATTERN =
  /(앤티앤스프레즐|aen\s*ti\s*aen\s*seu\s*peu\s*re\s*jel|auntie\s*anne|파리바게뜨|paris\s*baguette|뚜레쥬르|tous\s*les\s*jours|던킨|dunkin|크리스피크림|krispy\s*kreme|베이커리|bakery|제과)/i
/** Ashley, Vips 등 패밀리 레스토랑 브랜드 (이름·카테고리 문자열 모두 검사) */
const CASUAL_DINING_BRAND_PATTERN =
  /(애슐리퀸즈|애슐리|에슐리|ashley|ae\s*syul\s*ri|퀸즈|kwin\s*jeu|queens|빕스|vips|\boutback|아웃백|tgif|t\.?\s*g\.?\s*i\.?\s*f|티지아이|매드포갈릭|mad\s*for\s*garlic|패밀리레스토랑|paem\s*i\s*li\s*re\s*seu\s*to\s*rang)/i
const KIDS_CAFE_PATTERN =
  /(챔피언더블랙벨트|키즈\s*카페|키즈카페|chaem\s*pi\s*eon\s*deo\s*beul\s*raek\s*bel\s*teu|kids?\s*cafe|ki\s*jeu\s*ka\s*pe)/i
const EXPERIENCE_CAFE_PATTERN =
  /(슬라임팝|slime\s*pop|seul\s*ra\s*im\s*pap|테마카페|te\s*ma\s*ka\s*pe|체험카페|experience\s*cafe)/i
const CLOTHING_BRAND_PATTERN =
  /(폴햄키즈|폴햄|탑텐키즈|탑텐|pol\s*haem|polham|tap\s*ten|top\s*ten|의류|eui\s*ryu)/i
const NAENGMYEON_PLACE_PATTERN = /(교동면옥|gyo\s*dong\s*myeon\s*ok)/i

function isStorePlace(place) {
  const fields = [place.name, place.placeName, place.categoryName, place.category]
  return fields.some((field) => BRAND_STORE_PATTERN.test(String(field ?? '')))
}

function isBakeryPlace(place) {
  const fields = [place.name, place.placeName, place.categoryName, place.category]
  return fields.some((field) => BAKERY_BRAND_PATTERN.test(String(field ?? '')))
}

function isCasualDiningPlace(place) {
  const fields = [place.name, place.placeName, place.categoryName, place.category]
  return fields.some((field) => CASUAL_DINING_BRAND_PATTERN.test(String(field ?? '')))
}

function isKidsCafePlace(place) {
  const fields = [place.name, place.placeName, place.categoryName, place.category]
  return fields.some((field) => KIDS_CAFE_PATTERN.test(String(field ?? '')))
}

function isExperienceCafePlace(place) {
  const fields = [place.name, place.placeName, place.categoryName, place.category]
  return fields.some((field) => EXPERIENCE_CAFE_PATTERN.test(String(field ?? '')))
}

function isClothingPlace(place) {
  const fields = [place.name, place.placeName, place.categoryName, place.category]
  return fields.some((field) => CLOTHING_BRAND_PATTERN.test(String(field ?? '')))
}

function isNaengMyeonPlace(place) {
  const fields = [place.name, place.placeName, place.categoryName, place.category]
  return fields.some((field) => NAENGMYEON_PLACE_PATTERN.test(String(field ?? '')))
}

function finishCategoryTerm(result) {
  return applyCategoryLexiconPatches(String(result ?? '').trim())
}

function translateCategoryTerm(part) {
  const value = String(part ?? '').trim()
  if (!value) {
    return ''
  }
  const normalizedOmit = normalizeCategoryKey(value)
  if (CATEGORY_OMIT_TERMS.has(value) || CATEGORY_OMIT_TERMS.has(normalizedOmit)) {
    return ''
  }
  if (BRAND_STORE_PATTERN.test(value)) {
    return finishCategoryTerm('Store')
  }
  if (MARKET_BRAND_PATTERN.test(value)) {
    return finishCategoryTerm('Market')
  }
  if (CONVENIENCE_STORE_BRAND_PATTERN.test(value)) {
    return finishCategoryTerm('Convenience Store')
  }
  if (/\s+-\s+/.test(value)) {
    const pieces = value
      .split(/\s+-\s+/)
      .map((piece) => translateCategoryTerm(piece))
      .filter(Boolean)
    if (pieces.length > 0) {
      return finishCategoryTerm(pieces.join(' · '))
    }
  }
  if (/[,/]/.test(value)) {
    const pieces = value
      .split(/[,/]/)
      .map((piece) => translateCategoryTerm(piece))
      .filter(Boolean)
    if (pieces.length > 0) {
      const deduped = []
      const seen = new Set()
      for (const piece of pieces) {
        const key = piece.toLowerCase()
        if (seen.has(key)) {
          continue
        }
        seen.add(key)
        deduped.push(piece)
      }
      return finishCategoryTerm(deduped.join(', '))
    }
  }
  const normalized = normalizeCategoryKey(value)
  const mapped = CATEGORY_TERM_EN[value] || CATEGORY_TERM_EN_NORMALIZED[normalized]
  if (mapped) {
    return finishCategoryTerm(mapped)
  }
  if (containsHangul(value)) {
    const semantic = translateCategorySemantic(value)
    if (semantic) {
      return finishCategoryTerm(semantic)
    }
  }
  for (const hint of ROMANIZED_CATEGORY_HINTS) {
    if (hint.pattern.test(value)) {
      return finishCategoryTerm(hint.label)
    }
  }
  if (containsHangul(value)) {
    return finishCategoryTerm(romanizeHangulBySyllable(value) || value)
  }
  return finishCategoryTerm(value)
}

export function formatCategoryEnglish(categoryName) {
  if (!categoryName || typeof categoryName !== 'string') {
    return ''
  }
  const parts = categoryName
    .split('>')
    .map((p) => translateCategoryTerm(p))
    .filter(Boolean)
  if (parts.length === 0) {
    return ''
  }
  if (parts.length === 1) {
    return parts[0]
  }
  return `${parts[0]} · ${parts[parts.length - 1]}`
}

/** Kakao-style "대분류 > 중분류 > 소분류" → 대분류 + 최하위만 */
export function formatCategoryFirstLast(categoryName) {
  if (!categoryName || typeof categoryName !== 'string') {
    return ''
  }
  const parts = categoryName
    .split('>')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) {
    return ''
  }
  if (parts.length === 1) {
    return parts[0]
  }
  return `${parts[0]} · ${parts[parts.length - 1]}`
}

/**
 * 장소명·도로명·지번 등에서 층 정보 추출 (예: 1층, 2층, 지하 1층, B1, 3F)
 * @param {string[]} texts
 * @returns {string | null}
 */
export function extractFloorLabels(texts) {
  const hay = texts.filter(Boolean).join(' ')
  if (!hay) {
    return null
  }
  const found = []
  const seen = new Set()
  const add = (label) => {
    if (!label || seen.has(label)) {
      return
    }
    seen.add(label)
    found.push(label)
  }

  for (const m of hay.matchAll(/지하\s*(\d+)\s*층/gi)) {
    add(`지하 ${m[1]}층`)
  }
  for (const m of hay.matchAll(/(\d+)\s*층/g)) {
    const idx = m.index ?? 0
    const before = hay.slice(Math.max(0, idx - 6), idx)
    if (/지하\s*$/i.test(before)) {
      continue
    }
    add(`${m[1]}층`)
  }
  for (const m of hay.matchAll(/\bB\s*(\d+)\b/gi)) {
    add(`B${m[1]}`)
  }
  for (const m of hay.matchAll(/\b(\d+)\s*F\b/gi)) {
    add(`${m[1]}F`)
  }

  return found.length > 0 ? found.join(', ') : null
}

/** @param {string} text */
export function hasDriverStreetAddress(text) {
  return /(특별|광역|시|도|구|군|읍|면|동|로|길|번길|\d{2,})/.test(String(text ?? ''))
}

/** @param {{ name?: string, road?: string, jibun?: string }} parts */
export function formatDriverKoLines({ name = '', road = '', jibun = '' }) {
  const lines = []
  const trimmedName = String(name ?? '').trim()
  const trimmedRoad = String(road ?? '').trim()
  const trimmedJibun = String(jibun ?? '').trim()
  if (trimmedName) {
    lines.push(trimmedName)
  }
  if (trimmedRoad) {
    lines.push(trimmedRoad)
  } else if (trimmedJibun) {
    lines.push(trimmedJibun)
  }
  return lines.join('\n').trim()
}

/**
 * 택시 기사용 한글 주소 — 상호명 + 도로명/지번. 상호명만 저장된 koAddress는 무시.
 * @param {Record<string, unknown>} place
 */
export function resolveDriverKoAddress(place) {
  const name = String(place?.koName || place?.name || place?.placeName || '').trim()
  let road = String(place?.roadAddress ?? '').trim()
  let jibun = String(place?.jibunAddress ?? '').trim()
  const address = String(place?.address ?? '').trim()
  if (!road && address && address !== 'Address unavailable') {
    road = address
  }

  const saved = String(place?.koAddress ?? '').trim()
  if (!road && !jibun && saved && hasDriverStreetAddress(saved)) {
    const savedLines = saved
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    const addressLines = savedLines.filter((line) => line !== name && hasDriverStreetAddress(line))
    if (addressLines.length > 0) {
      road = addressLines[0]
      jibun = addressLines[1] || ''
    } else if (saved !== name) {
      road = saved
    }
  }

  const formatted = formatDriverKoLines({ name, road, jibun })
  if (formatted) {
    return formatted
  }
  return String(place?.enName ?? '').trim()
}

/** @param {Record<string, unknown>} place */
export function buildDriverModalPlace(place) {
  return {
    ...place,
    koAddress: resolveDriverKoAddress(place),
  }
}

/**
 * @param {Record<string, unknown>} place
 * @param {'planning' | 'nearby' | 'search'} kind
 */
export function resolveDisplayNames(place, kind) {
  const subwayDisplay = resolveSubwayStationDisplay(place)
  if (subwayDisplay) {
    return {
      nameKo: subwayDisplay.nameKo,
      nameEn: subwayDisplay.nameEn,
      subwayLines: subwayDisplay.subwayLines,
      isSubway: true,
    }
  }

  const nameKo = resolveKoreanNameSource(place, kind)
  if (!nameKo) {
    const latinOnly = normalizeConvenienceBrandEnglish(
      String(place.name ?? place.enName ?? '').trim(),
    )
    if (latinOnly && !containsHangul(latinOnly)) {
      return {
        nameKo: '',
        nameEn: latinOnly,
        subwayLines: [],
        isSubway: false,
      }
    }
    return { nameKo: '', nameEn: '', subwayLines: [], isSubway: false }
  }

  if (kind === 'planning') {
    const nameEn = resolvePlanningEnglishTitle(place.enName, nameKo, place)
    return { nameKo, nameEn, subwayLines: [], isSubway: false }
  }

  const nameEn = buildEnglishPlaceTitle(nameKo)
  return { nameKo, nameEn, subwayLines: [], isSubway: false }
}

/**
 * @param {Record<string, unknown>} place
 * @param {'planning' | 'nearby' | 'search'} kind
 */
export function resolveFloorLabel(place, kind) {
  const texts = [
    place.name,
    place.placeName,
    place.address,
    place.roadAddress,
    place.jibunAddress,
    kind === 'planning' ? place.koAddress : '',
  ]
    .filter(Boolean)
    .map(String)
  return extractFloorLabels(texts)
}

/**
 * @param {Record<string, unknown>} place
 * @param {'planning' | 'nearby' | 'search'} kind
 * @param {Record<string, string>} [themeBadge]
 */
export function resolveCategoryLabel(place, kind, themeBadge = {}) {
  if (isSubwayStationContext(place)) {
    return '🚇 Subway Station'
  }
  if (isStorePlace(place)) {
    return 'Store'
  }
  if (isBakeryPlace(place)) {
    return 'Bakery'
  }
  if (isCasualDiningPlace(place)) {
    return 'Casual Dining'
  }
  if (isKidsCafePlace(place)) {
    return 'Kids Cafe'
  }
  if (isExperienceCafePlace(place)) {
    return 'Experience Cafe'
  }
  if (isClothingPlace(place)) {
    return 'Clothing'
  }
  if (isNaengMyeonPlace(place)) {
    return 'Naeng Myeon'
  }
  if (kind === 'planning') {
    const cat = place.category ? String(place.category) : ''
    const badge = themeBadge[cat]
    if (badge) {
      return formatCategoryEnglish(badge) || badge
    }
    if (place.categoryName) {
      return formatCategoryEnglish(String(place.categoryName))
    }
    return cat || 'Place'
  }
  return formatCategoryEnglish(String(place.categoryName || '')) || 'Place'
}
