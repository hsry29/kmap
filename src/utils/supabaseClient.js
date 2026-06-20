import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** 두 env 값이 모두 채워졌을 때만 원격 동기화가 켜진다(없으면 localStorage 단독 모드). */
export const isSyncEnabled = Boolean(url && anonKey)

let client = null

/** 싱글톤 Supabase 클라이언트. 동기화 비활성 시 null. */
export function getSupabase() {
  if (!isSyncEnabled) {
    return null
  }
  if (!client) {
    client = createClient(url, anonKey, {
      // [현재/프로토타입] 로그인 세션 없음(anon).
      // [향후/Auth 도입] persistSession: true 로 바꾸고 signIn 흐름만 추가하면,
      //   쓰기는 supabase/schema.sql 의 "app_config write" 정책(is_admin())이 강제합니다.
      auth: { persistSession: false },
    })
  }
  return client
}
