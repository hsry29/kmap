import { convert } from 'hangul-romanization'
import { applyCategoryLexiconPatches } from './categoryLexicon'

const HANGUL_SYLLABLE = /[\uAC00-\uD7AF]/

function titleCaseRoman(syllable) {
  const s = String(syllable ?? '').trim()
  if (!s) {
    return ''
  }
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

function normalizeKoreanFoodRomanization(text) {
  return String(text ?? '')
    .replace(/\bSun\s*Dae\b/gi, 'Soon Dea')
    .replace(/\bSun\s*Dea\b/gi, 'Soon Dea')
    .replace(/\bSeu\s*Ta\s*Pil\s*Deu\b/gi, 'Starfield')
    .replace(/\bChaem\s*Pi\s*Eon\s*Deo\s*Beul\s*Raek\s*Bel\s*Teu\b/gi, 'Champion The Black Belt')
    .replace(/\bBeul\s*Reok\s*Peul\s*Re\s*I\b/gi, 'Blockplay')
    .replace(/\bE\s*Geu\s*Seul\s*Ra\s*Im\b/gi, 'EggSlime')
    .replace(/\bSeul\s*Ra\s*Im\s*Pap\s*(?:&|And)?\s*Pon\s*De\s*Ko\b/gi, 'Slime Pop&Phone Deco')
    .replace(/\bSeul\s*Ra\s*Im\s*Pap\s*Pon\s*De\s*Ko\b/gi, 'Slime Pop&Phone Deco')
    .replace(/\bKi\s*Jeu\s*Mi\s*Di\s*Eo\b/gi, 'Kids Media')
    .replace(/\bKi\s*Jeu\s*Ka\s*Pe\b/gi, 'Kids Cafe')
    .replace(/\bMa\s*Eul\b/gi, 'Village')
    .replace(/\bTogether\s*Kids\s*Cafe\b/gi, 'U Ri Kki Ri Kids Cafe')
    .replace(/\bDream\s*Village\b/gi, 'Kkum Kku Neun Village')
    .replace(/\bTa\s*I\s*Ni\s*Ki\s*Jeu\s*Pa\s*Keu\b/gi, 'Tiny Kids Park')
    .replace(/\bPol\s*Haem\s*Ki\s*Jeu\b/gi, 'Polham kids')
    .replace(/\bTap\s*Ten\s*Ki\s*Jeu\b/gi, 'TopTen Kids')
}

/**
 * 한글 음절마다 로마자 변환 후 Title Case, 음절 사이·단어 사이 공백.
 * 예: 등촌샤브칼국수 상현점 → Deung Chon Sya Beu Kal Guk Su Sang Hyeon Jeom
 */
export function romanizeHangulBySyllable(text) {
  if (!text || typeof text !== 'string') {
    return ''
  }
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return ''
  }
  const romanizedWords = words.map((word) =>
    [...word]
      .filter((ch) => HANGUL_SYLLABLE.test(ch))
      .map((ch) => titleCaseRoman(convert(ch)))
      .filter(Boolean)
      .join(' '),
  )
  const joined = romanizedWords.filter((w) => w.length > 0).join(' ')
  return applyCategoryLexiconPatches(normalizeKoreanFoodRomanization(joined))
}

/** @deprecated 이름 호환 — romanizeHangulBySyllable 과 동일 */
export function romanizeHangulRuns(text) {
  return romanizeHangulBySyllable(text)
}

/** 큐레이션용 수동 발음(하이픈·공백 구분)을 음절 단위 표기로 정리 */
function formatManualPronunciation(manual) {
  const trimmed = manual.trim()
  if (!trimmed) {
    return ''
  }
  if (HANGUL_SYLLABLE.test(trimmed)) {
    return romanizeHangulBySyllable(trimmed)
  }
  return trimmed
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => titleCaseRoman(part))
    .join(' ')
}

/**
 * 시설명·주소 등에서 보여 줄 발음 한 줄.
 * - `pronunciation` 이 있으면 수동 가이드(하이픈 구분 → 음절별 공백 표기)
 * - 없으면 enName → name → koAddress → address 순으로 한글 음절별 자동 생성
 */
export function getFacilityPronunciation(place) {
  const manual = place.pronunciation?.trim()
  if (manual) {
    return { text: formatManualPronunciation(manual), isManual: true }
  }
  const fields = [place.koName, place.name, place.enName, place.koAddress, place.address]
  for (const field of fields) {
    const spoken = romanizeHangulBySyllable(field || '')
    if (spoken) {
      return { text: spoken, isManual: false }
    }
  }
  return null
}
