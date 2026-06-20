import { isSyncEnabled } from './supabaseClient'

/** When true, admin localStorage drafts take priority over Supabase (admin panel editing). */
let adminDraftMode = false

export function setAdminDraftMode(enabled) {
  adminDraftMode = Boolean(enabled)
}

export function isAdminDraftMode() {
  return adminDraftMode
}

/** Production/APK path: content should come from Supabase, not bundled seeds. */
export function useRemoteContentSource() {
  return isSyncEnabled && !adminDraftMode
}

export { isSyncEnabled }
