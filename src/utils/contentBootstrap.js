import { hasRemoteCollections } from './adminCollections'
import { initPlaceImageCatalog } from './placeImageCatalog'
import { initRemoteConfig } from './remoteSync'
import { isSyncEnabled } from './contentSource'

/** @typedef {'idle' | 'loading' | 'ready' | 'error'} ContentBootstrapStatus */

/** @type {{ status: ContentBootstrapStatus, syncEnabled: boolean, errors: { source: string, message: string }[], emptyCollections: boolean, imagesReady: boolean }} */
let state = {
  status: 'idle',
  syncEnabled: isSyncEnabled,
  errors: [],
  emptyCollections: false,
  imagesReady: false,
}

/** @type {Set<(typeof state) => void>} */
const listeners = new Set()

function emit() {
  const snapshot = { ...state, errors: [...state.errors] }
  listeners.forEach((listener) => listener(snapshot))
}

function setState(patch) {
  state = { ...state, ...patch }
  emit()
}

export function getContentBootstrapState() {
  return { ...state, errors: [...state.errors] }
}

/** @param {(next: typeof state) => void} listener */
export function subscribeContentBootstrap(listener) {
  listeners.add(listener)
  listener(getContentBootstrapState())
  return () => listeners.delete(listener)
}

/**
 * Load Supabase content (app_config + image catalog) once at app start.
 * Never throws — failures are recorded in state.errors.
 * @returns {Promise<typeof state>}
 */
export async function bootstrapContent() {
  setState({ status: 'loading', errors: [], emptyCollections: false, imagesReady: false })

  /** @type {{ source: string, message: string }[]} */
  const errors = []
  let imagesReady = false

  try {
    await initPlaceImageCatalog()
    imagesReady = true
  } catch (err) {
    const message = String(err?.message ?? err)
    console.warn('[content] image catalog init failed:', message)
    errors.push({ source: 'images', message })
    imagesReady = true
  }

  if (!isSyncEnabled) {
    setState({
      status: 'ready',
      syncEnabled: false,
      errors,
      emptyCollections: false,
      imagesReady,
    })
    return getContentBootstrapState()
  }

  const remote = await initRemoteConfig()
  if (remote.errors?.length) {
    errors.push(...remote.errors)
  }

  const emptyCollections = !hasRemoteCollections()
  const status = remote.configFetched || imagesReady ? 'ready' : 'error'

  if (status === 'error') {
    console.warn('[content] Supabase bootstrap incomplete:', errors)
  }

  setState({
    status,
    syncEnabled: true,
    errors,
    emptyCollections,
    imagesReady,
  })

  return getContentBootstrapState()
}
