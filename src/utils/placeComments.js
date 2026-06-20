/** @typedef {{ id: string, nickname: string, body: string, passwordHash: string, createdAt: number }} StoredComment */

const STORAGE_KEY = 'kmap:place-comments:v1'

export function commentStorageKey(kind, placeId) {
  return `${kind}:${placeId}`
}

export async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function loadMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function saveMap(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

/** @param {string} kind @param {string} placeId @returns {StoredComment[]} */
export function getComments(kind, placeId) {
  const key = commentStorageKey(kind, placeId)
  const map = loadMap()
  const list = map[key]
  return Array.isArray(list) ? list : []
}

/**
 * @param {string} kind
 * @param {string} placeId
 * @param {{ nickname: string, password: string, body: string }} input
 * @returns {Promise<StoredComment[]>}
 */
export async function addComment(kind, placeId, input) {
  const key = commentStorageKey(kind, placeId)
  const map = loadMap()
  const list = Array.isArray(map[key]) ? [...map[key]] : []
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const passwordHash = await sha256Hex(input.password)
  list.push({
    id,
    nickname: input.nickname.trim(),
    body: input.body.trim(),
    passwordHash,
    createdAt: Date.now(),
  })
  map[key] = list
  saveMap(map)
  return list
}

/**
 * 삭제 시 입력 비밀번호를 SHA-256으로 해시해 저장된 passwordHash와 비교한다.
 * @param {string} kind
 * @param {string} placeId
 * @param {string} commentId
 * @param {string} passwordPlain
 * @returns {Promise<{ ok: true } | { ok: false, reason: 'notfound' | 'badpassword' }>}
 */
export async function deleteComment(kind, placeId, commentId, passwordPlain) {
  const key = commentStorageKey(kind, placeId)
  const map = loadMap()
  const list = Array.isArray(map[key]) ? [...map[key]] : []
  const idx = list.findIndex((c) => c.id === commentId)
  if (idx === -1) {
    return { ok: false, reason: 'notfound' }
  }
  const hash = await sha256Hex(passwordPlain)
  if (list[idx].passwordHash !== hash) {
    return { ok: false, reason: 'badpassword' }
  }
  list.splice(idx, 1)
  map[key] = list
  saveMap(map)
  return { ok: true }
}
