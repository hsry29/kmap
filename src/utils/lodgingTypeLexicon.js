/**
 * 숙박 업종 한글 → 영어 의미 번역.
 * 상호명에서 고유명사는 로마자/브랜드 유지, 업종 접미·수식만 번역.
 */
export const LODGING_TYPE_PAIRS = [
  ['게스트하우스', 'Guesthouse'],
  ['한옥스테이', 'Hanok Stay'],
  ['레지던스', 'Residence'],
  ['호스텔', 'Hostel'],
  ['호텔', 'Hotel'],
  ['모텔', 'Motel'],
  ['펜션', 'Pension'],
]

/** 브랜드·접두와 결합된 변형 (긴 패턴 우선) */
export const LODGING_NAME_VARIANT_PAIRS = [
  ['K-게스트하우스', 'K Guesthouse'],
  ['K게스트하우스', 'K Guesthouse'],
  ...LODGING_TYPE_PAIRS,
]

/** @param {string} name */
export function applyLodgingTypePatches(name) {
  let prepared = String(name ?? '').trim()
  if (!prepared) {
    return ''
  }
  const pairs = [...LODGING_NAME_VARIANT_PAIRS].sort((a, b) => b[0].length - a[0].length)
  for (const [ko, en] of pairs) {
    if (!prepared.includes(ko)) {
      continue
    }
    prepared = prepared.split(ko).join(` ${en} `)
  }
  return prepared.replace(/\s+/g, ' ').trim()
}
