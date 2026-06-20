import { fetchAllConfig, isSyncEnabled, subscribeConfig } from './remoteConfig'
import { setRemotePartners } from './adminPartners'
import { setRemoteHidden } from './hiddenPlaces'
import { setRemoteCollections } from './adminCollections'
import { setRemoteCuration } from './adminCuration'

export { isSyncEnabled }

const APPLIERS = {
  partners: setRemotePartners,
  hidden: setRemoteHidden,
  collections: setRemoteCollections,
  curation: setRemoteCuration,
}

function applyAll(config) {
  setRemotePartners(config.partners ?? null)
  setRemoteHidden(config.hidden ?? null)
  setRemoteCollections(config.collections ?? null)
  setRemoteCuration(config.curation ?? null)
}

/**
 * 시작 시 원격 게시본을 한 번 읽어 각 store 의 remote 레이어에 주입.
 * @returns {Promise<{ ok: boolean, syncEnabled: boolean, configFetched: boolean, errors: { source: string, message: string }[], hasCollections: boolean }>}
 */
export async function initRemoteConfig() {
  if (!isSyncEnabled) {
    return {
      ok: false,
      syncEnabled: false,
      configFetched: false,
      errors: [],
      hasCollections: false,
    }
  }

  const { config, error } = await fetchAllConfig()
  applyAll(config)

  const errors = error ? [{ source: 'app_config', message: error }] : []
  const hasCollections = Boolean(
    config.collections &&
      Array.isArray(config.collections.collections) &&
      config.collections.collections.length > 0,
  )

  return {
    ok: true,
    syncEnabled: true,
    configFetched: !error,
    errors,
    hasCollections,
  }
}

/**
 * 다른 관리자가 게시한 변경을 실시간 반영.
 * @param {() => void} onChange store 갱신 후 호출(App 상태 새로고침용)
 * @returns {() => void} 구독 해제
 */
export function subscribeRemoteConfig(onChange) {
  if (!isSyncEnabled) {
    return () => {}
  }
  return subscribeConfig((key, value) => {
    const apply = APPLIERS[key]
    if (apply) {
      apply(value ?? null)
      onChange()
    }
  })
}
