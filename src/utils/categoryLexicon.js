/**
 * 카카오 카테고리·시설 유형: 의미 중심 영어 우선, 로마자는 최후 수단(categoryTranslate).
 * 새로 자주 보이는 항목은 여기에 추가.
 */

import { KOREAN_FOOD_ROMANIZED_PATCHES } from './koreanFoodLexicon'
import { INTERNATIONAL_FOOD_MAP, INTERNATIONAL_FOOD_ROMANIZED_PATCHES } from './internationalFoodLexicon'

/** 카테고리 조각에서 제외 (로마자만 남기지 않음) */
export const CATEGORY_OMIT_TERMS = new Set(['노인', 'no in'])

/** @type {[string, string][]} 의료 과목·시설 (긴 표기 우선) */
export const MEDICAL_DEPARTMENT_PAIRS = [
  ['노인요양병원', 'Nursing Hospital'],
  ['노인,요양병원', 'Nursing Hospital'],
  ['정신건강의학과', 'Psychiatry'],
  ['재활의학과', 'Rehabilitation Medicine'],
  ['가정의학과', 'Family Medicine'],
  ['비뇨의학과', 'Urology'],
  ['비뇨기과의원', 'Urology Clinic'],
  ['비뇨기과', 'Urology'],
  ['이비인후과', 'ENT'],
  ['성형외과', 'Plastic Surgery'],
  ['신경외과', 'Neurosurgery'],
  ['정형외과', 'Orthopedics'],
  ['산부인과의원', 'OB-GYN Clinic'],
  ['산부인과', 'OB-GYN'],
  ['내과의원', 'Internal Medicine Clinic'],
  ['외과의원', 'Surgery Clinic'],
  ['안과의원', 'Ophthalmology Clinic'],
  ['피부과의원', 'Dermatology Clinic'],
  ['치과의원', 'Dental Clinic'],
  ['소아과의원', 'Pediatrics Clinic'],
  ['신경과의원', 'Neurology Clinic'],
  ['항문외과', 'Proctology'],
  ['항외과', 'Proctology'],
  ['요양병원', 'Nursing Hospital'],
  ['한방병원', 'Korean Medicine Hospital'],
  ['한의원', 'Korean Medicine Clinic'],
  ['병원', 'Hospital'],
  ['피부과', 'Dermatology'],
  ['소아과', 'Pediatrics'],
  ['신경과', 'Neurology'],
  ['치과', 'Dentistry'],
  ['안과', 'Ophthalmology'],
  ['외과', 'Surgery'],
  ['내과', 'Internal Medicine'],
  ['의원', 'Clinic'],
]

/** 로마자 의료 과목 → 영어 */
const MEDICAL_ROMANIZED_PATCHES_RAW = [
  ['jeong sin geon gang ui hak gwa', 'Psychiatry'],
  ['jae hwal ui hak gwa', 'Rehabilitation Medicine'],
  ['ga jeong ui hak gwa', 'Family Medicine'],
  ['bi nyo ui hak gwa', 'Urology'],
  ['bi nyo gi gwa ui won', 'Urology Clinic'],
  ['bi nyo gi gwa', 'Urology'],
  ['i bi in hu gwa', 'ENT'],
  ['seong hyeong oe gwa', 'Plastic Surgery'],
  ['sin gyeong oe gwa', 'Neurosurgery'],
  ['jeong hyeong oe gwa', 'Orthopedics'],
  ['hang mun oe gwa', 'Proctology'],
  ['hang oe gwa', 'Proctology'],
  ['san bu in gwa ui won', 'OB-GYN Clinic'],
  ['san bu in gwa', 'OB-GYN'],
  ['nae gwa ui won', 'Internal Medicine Clinic'],
  ['oe gwa ui won', 'Surgery Clinic'],
  ['an gwa ui won', 'Ophthalmology Clinic'],
  ['pi bu gwa ui won', 'Dermatology Clinic'],
  ['chi gwa ui won', 'Dental Clinic'],
  ['so a gwa ui won', 'Pediatrics Clinic'],
  ['sin gyeong gwa ui won', 'Neurology Clinic'],
  ['sin gyeong gwa', 'Neurology'],
  ['reo seu keu yo yang byeong won', 'Rusk Nursing Hospital'],
  ['no in, yo yang byeong won', 'Nursing Hospital'],
  ['no in, nursing hospital', 'Nursing Hospital'],
  ['yo yang byeong won', 'Nursing Hospital'],
  ['reo seu keu', 'Rusk'],
  ['han bang byeong won', 'Korean Medicine Hospital'],
  ['han ui won', 'Korean Medicine Clinic'],
  ['byeong won', 'Hospital'],
  ['pi bu gwa', 'Dermatology'],
  ['so a gwa', 'Pediatrics'],
  ['an gwa', 'Ophthalmology'],
  ['chi gwa', 'Dentistry'],
  ['oe gwa', 'Surgery'],
  ['nae gwa', 'Internal Medicine'],
  ['ui won', 'Clinic'],
]

/** @type {Record<string, string>} */
export const CATEGORY_TERM_EN_EXTRA = {
  // 교육·보육
  학원: 'Academy',
  독서실: 'Study Room',
  도서관: 'Library',
  보육: 'Childcare',
  놀이터: 'Playground',
  놀이방: 'Playroom',
  // 미용·생활
  미용실: 'Hair Salon',
  미용: 'Beauty Salon',
  네일숍: 'Nail Salon',
  네일: 'Nails',
  피부관리: 'Skincare',
  화장품: 'Cosmetics',
  // 쇼핑·식품
  정육점: 'Butcher Shop',
  청과물: 'Produce',
  수산시장: 'Fish Market',
  주류: 'Liquor Store',
  제과점: 'Bakery Shop',
  분식점: 'Snack Shop',
  할인점: 'Discount Store',
  아울렛: 'Outlet',
  신발: 'Shoes',
  가구: 'Furniture',
  가전: 'Home Appliances',
  문구: 'Stationery',
  서점: 'Bookstore',
  식품: 'Food',
  고기: 'Meat',
  육류: 'Meat',
  커피전문점: 'Cafe',
  초밥: 'Sushi',
  롤: 'Sushi',
  스시: 'Sushi',
  냉면: 'Naeng Myeon',
  면옥: 'Naeng Myeon',
  교동면옥: 'Naeng Myeon',
  // 서비스
  부동산: 'Real Estate',
  세탁소: 'Laundry',
  이사: 'Moving Services',
  주유소: 'Gas Station',
  주유: 'Gas Station',
  렌터카: 'Car Rental',
  여행사: 'Travel Agency',
  인테리어: 'Interior Design',
  건축: 'Construction',
  법률: 'Legal Services',
  회계: 'Accounting',
  통신: 'Telecommunications',
  정비: 'Auto Repair',
  세차: 'Car Wash',
  // 여가
  노래방: 'Karaoke',
  PC방: 'Internet Cafe',
  당구장: 'Billiards',
  볼링장: 'Bowling',
  헬스: 'Gym',
  피트니스: 'Fitness',
  수영장: 'Swimming Pool',
  골프장: 'Golf Course',
  스파: 'Spa',
  사우나: 'Sauna',
  오락실: 'Arcade',
  게임: 'Games',
  // 대분류
  여가: 'Leisure',
  오락: 'Entertainment',
  '여가,오락': 'Leisure & Entertainment',
  문화: 'Culture',
  반려동물: 'Pets',
  애완동물: 'Pets',
  자동차: 'Automotive',
  금융: 'Finance',
  공공: 'Public Services',
  // 의료·복지 (과목·시설 — MEDICAL_DEPARTMENT_PAIRS 와 동기화)
  ...Object.fromEntries(MEDICAL_DEPARTMENT_PAIRS),
  한약방: 'Herbal Medicine',
  요양: 'Nursing Care',
  요양원: 'Nursing Home',
  // 숙박·관광
  펜션: 'Pension',
  게스트하우스: 'Guesthouse',
  한옥스테이: 'Hanok Stay',
  호스텔: 'Hostel',
  레지던스: 'Residence',
  리조트: 'Resort',
}

/** 로마자 음절 표기 → 영어 (긴 패턴을 앞에 둠) */
const ROMANIZED_CATEGORY_PATCHES_RAW = [
  ...INTERNATIONAL_FOOD_ROMANIZED_PATCHES,
  ...KOREAN_FOOD_ROMANIZED_PATCHES,
  ...MEDICAL_ROMANIZED_PATCHES_RAW,
  ['gyo yuk, hak mun', 'Education, Academics'],
  ['gyo yuk hak mun', 'Education, Academics'],
  ['seo bi seu, san eop', 'Service, Industry'],
  ['in swae, bok sa', 'Printing, Copying'],
  ['yeo ga, o rak', 'Leisure & Entertainment'],
  ['eo rin i jip', 'Daycare Center'],
  ['yu chi won', 'Kindergarten'],
  ['be seu teu', 'Best'],
  ['on ke eo365 ui won', 'On Care 365 Clinic'],
  ['on ke eo 365 ui won', 'On Care 365 Clinic'],
  ['on ke eo365', 'On Care 365'],
  ['on ke eo 365', 'On Care 365'],
  ['on ke eo', 'On Care'],
  ['hak mun', 'Academics'],
  ['gyo yuk', 'Education'],
  ['seo bi seu', 'Service'],
  ['san eop', 'Industry'],
  ['in swae', 'Printing'],
  ['bok sa', 'Copying'],
  ['eui ryu', 'Clothing'],
  ['hak won', 'Academy'],
  ['dok seo sil', 'Study Room'],
  ['mi yong sil', 'Hair Salon'],
  ['no rae bang', 'Karaoke'],
  ['pi teon', 'Fitness'],
  ['hel seu', 'Gym'],
  ['su yeong jang', 'Swimming Pool'],
  ['bol ling jang', 'Bowling'],
  ['bol ling', 'Bowling'],
  ['dang gu jang', 'Billiards'],
  ['bu dong san', 'Real Estate'],
  ['se tat so', 'Laundry'],
  ['je gwa jeom', 'Bakery Shop'],
  ['jeong yuk jeom', 'Butcher Shop'],
  ['jeong yuk', 'Butcher Shop'],
  ['cheong gwa mul', 'Produce'],
  ['hwa jang pin', 'Cosmetics'],
  ['mun gu jeom', 'Stationery'],
  ['seo jeom', 'Bookstore'],
  ['ju yu so', 'Gas Station'],
  ['yeo haeng sa', 'Travel Agency'],
  ['ban ryeo dong mul', 'Pets'],
  ['o rak sil', 'Arcade'],
  ['yeo ga', 'Leisure'],
  ['o rak', 'Entertainment'],
  ['eum sig jeom', 'Restaurants'],
  ['meat, go gi', 'Meat'],
  ['go gi', 'Meat'],
  ['yuk ryu', 'Meat'],
  ['keo pi jeon mun jeom', 'Cafe'],
  ['cho bap, rol', 'Sushi'],
  ['cho bap', 'Sushi'],
  ['gyo dong myeon ok', 'Naeng Myeon'],
  ['naeng myeon', 'Naeng Myeon'],
  ['ka pe', 'Cafe'],
  ['pyeon ui jeom', 'Convenience Store'],
  ['pyu jeon il sik', 'Fusion Japanese'],
  ['pyu jeon han sik', 'Fusion Korean'],
  ['pyu jeon jung sik', 'Fusion Chinese'],
  ['pyu jeon yang sik', 'Fusion Western'],
  ['il sik', 'Japanese Restaurant'],
  ['han sik', 'Korean Restaurant'],
  ['jung sik', 'Chinese Restaurant'],
  ['yang sik', 'Western Restaurant'],
  ['go git jip', 'Korean BBQ'],
  ['hae san mul', 'Seafood Restaurant'],
  ['bun sik', 'Korean Snack Food'],
  ['chi kin', 'Chicken Restaurant'],
  ['de ji teu ka pe', 'Dessert Cafe'],
  ['be i keo ri', 'Bakery'],
  ['sul jip', 'Pub'],
  ['ho peu', 'Beer Pub'],
  ['wa in ba', 'Wine Bar'],
  ['jeong hyeong oe gwa', 'Orthopedic Clinic'],
  ['nae gwa', 'Internal Medicine Clinic'],
  ['chi gwa', 'Dental Clinic'],
  ['an gwa', 'Ophthalmology Clinic'],
  ['yak guk', 'Pharmacy'],
]

const ROMANIZED_CATEGORY_PATCHES = ROMANIZED_CATEGORY_PATCHES_RAW.map(([source, label]) => ({
  pattern: new RegExp(`\\b${source.replace(/\s+/g, '\\s+')}\\b`, 'gi'),
  label,
})).sort((a, b) => b.pattern.source.length - a.pattern.source.length)

/** 로마자+영어 업종어가 붙은 경우 공백 보정 (예: MinDaycare → Min Daycare) */
export function normalizePlaceEnglishSpacing(text) {
  let out = String(text ?? '').trim()
  if (!out) {
    return ''
  }
  out = out.replace(/([a-z])([A-Z])/g, '$1 $2')
  return out.replace(/\s+/g, ' ').trim()
}

/** @param {string} text */
export function applyCategoryLexiconPatches(text) {
  let out = String(text ?? '').trim()
  if (!out) {
    return ''
  }
  for (const { pattern, label } of ROMANIZED_CATEGORY_PATCHES) {
    out = out.replace(pattern, label)
  }
  out = out
    .replace(/^\s*no\s+in\s*,\s*/gi, '')
    .replace(/,\s*no\s+in\s*(?=,|$)/gi, '')
    .replace(/\s*no\s+in\s*$/gi, '')
    .replace(/\bmeat\s*,\s*go\s+gi\b/gi, 'Meat')
    .replace(/\bgo\s+gi\s*,\s*meat\b/gi, 'Meat')
    .replace(/\bsushi\s*,\s*rol\b/gi, 'Sushi')
    .replace(/\bcho\s+bap\s*,\s*rol\b/gi, 'Sushi')
  return normalizePlaceEnglishSpacing(out)
}

/** 글로벌 편의점 브랜드 — 로마자 표기 금지 (긴 항목 우선) */
export { CONVENIENCE_STORE_BRAND_PAIRS } from './convenienceBrandLexicon.js'
import { CONVENIENCE_STORE_BRAND_PAIRS } from './convenienceBrandLexicon.js'

/** 가게명에 자주 섞이는 영어·업종 단어 (긴 항목 우선 적용) */
export const NAME_EN_TOKENS_EXTRA = [
  ...CONVENIENCE_STORE_BRAND_PAIRS,
  ...MEDICAL_DEPARTMENT_PAIRS,
  ['러스크요양병원', 'Rusk Nursing Hospital'],
  ['러스크', 'Rusk'],
  ['온케어365의원', 'On Care 365 Clinic'],
  ['온케어365', 'On Care 365'],
  ['온케어', 'On Care'],
  ['베스트', 'Best'],
  ['어린이집', 'Daycare Center'],
  ['유치원', 'Kindergarten'],
  ['우편취급국', 'Post Office'],
  ['미용실', 'Hair Salon'],
  ['피트니스', 'Fitness'],
  ['휘트니스', 'Fitness'],
  ['공업사', 'Auto Repair'],
  ['학원', 'Academy'],
  ['노래방', 'Karaoke'],
  ['PC방', 'Internet Cafe'],
  ['키즈', 'Kids'],
  ['파크', 'Park'],
  ['센터', 'Center'],
  ['커피전문점', 'Cafe'],
  ['카페', 'Cafe'],
  ['초밥', 'Sushi'],
  ['스시', 'Sushi'],
  ['교동면옥', 'Naeng Myeon'],
  ['호텔', 'Hotel'],
  ['헬스', 'Fitness'],
  ['골프', 'Golf'],
  ['마트', 'Mart'],
  ['스토어', 'Store'],
  ['몰', 'Mall'],
  ['백화점', 'Department Store'],
  ['아울렛', 'Outlet'],
  ['편의점', 'Convenience Store'],
]
