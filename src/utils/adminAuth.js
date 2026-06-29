const SESSION_KEY = 'kmap:admin-session:v1'

export function getAdminPassword() {
  return String(import.meta.env.VITE_ADMIN_PASSWORD ?? '').trim()
}

export function isAdminEnabled() {
  return getAdminPassword().length > 0
}

export function isAdminLoggedIn() {
  if (!isAdminEnabled()) {
    return false
  }
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function loginAdmin(password) {
  const expected = getAdminPassword()
  if (!expected) {
    return { ok: false, reason: 'disabled' }
  }
  if (String(password).trim() !== expected) {
    return { ok: false, reason: 'badpassword' }
  }
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
    return { ok: true }
  } catch {
    return { ok: false, reason: 'storage' }
  }
}

export function logoutAdmin() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

/** User-facing message when admin password env is missing. */
export function getAdminNotConfiguredMessage() {
  if (import.meta.env.DEV) {
    return 'Admin is not configured. Add VITE_ADMIN_PASSWORD to .env and restart the dev server.'
  }
  return 'Admin is not configured on this deployment. Add VITE_ADMIN_PASSWORD in Vercel → Settings → Environment Variables, then redeploy.'
}
