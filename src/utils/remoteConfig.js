import { getSupabase, isSyncEnabled } from './supabaseClient'

const TABLE = 'app_config'

export { isSyncEnabled }

/**
 * 모든 설정 행을 한 번에 읽는다.
 * @returns {Promise<{ config: Record<string, unknown>, error: string | null }>}
 */
export async function fetchAllConfig() {
  const sb = getSupabase()
  if (!sb) {
    return { config: {}, error: null }
  }
  const { data, error } = await sb.from(TABLE).select('key,value')
  if (error) {
    console.warn('[sync] fetch failed:', error.message)
    return { config: {}, error: error.message }
  }
  const out = {}
  for (const row of data ?? []) {
    out[row.key] = row.value
  }
  return { config: out, error: null }
}

/** 설정 한 행을 upsert(게시). 실패해도 앱은 계속 동작(fire-and-forget). */
export async function pushConfig(key, value) {
  const sb = getSupabase()
  if (!sb) {
    return
  }
  // updated_at / updated_by 는 DB 트리거(app_config_set_audit)가 채우므로 보내지 않는다.
  const { error } = await sb.from(TABLE).upsert({ key, value }, { onConflict: 'key' })
  if (error) {
    console.warn('[sync] push failed:', key, error.message)
  }
}

/**
 * app_config 테이블 변경을 실시간 구독.
 * @param {(key: string, value: unknown) => void} onChange
 * @returns {() => void} 구독 해제 함수
 */
export function subscribeConfig(onChange) {
  const sb = getSupabase()
  if (!sb) {
    return () => {}
  }
  const channel = sb
    .channel('app_config_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      (payload) => {
        const row = payload.new ?? payload.old
        if (row?.key) {
          onChange(String(row.key), payload.new?.value ?? null)
        }
      },
    )
    .subscribe()
  return () => {
    sb.removeChannel(channel)
  }
}
