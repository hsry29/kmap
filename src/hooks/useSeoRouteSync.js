import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { buildPathFromAppState, parseSeoPath, resolveRouteTarget } from '../utils/seo'

/**
 * Syncs public SEO URLs with map app state.
 * Pauses while admin UI is open or URL is /admin so login and dashboard are not disrupted.
 * @param {{
 *   visibleCollections: unknown[]
 *   mode: string
 *   setMode: (mode: string) => void
 *   activeCategory: string
 *   setActiveCategory: (category: string) => void
 *   setSelectedPlaceId: (id: string | null) => void
 *   setSelectedPlaceCollectionId: (id: string | null) => void
 *   selectedPlace: Record<string, unknown> | null
 *   activeCollection: Record<string, unknown> | null
 *   isAdmin: boolean
 *   adminUiActive: boolean
 * }} options
 */
export function useSeoRouteSync({
  visibleCollections,
  mode,
  setMode,
  activeCategory,
  setActiveCategory,
  setSelectedPlaceId,
  setSelectedPlaceCollectionId,
  selectedPlace,
  activeCollection,
  isAdmin,
  adminUiActive,
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const collectionsRef = useRef(visibleCollections)
  const lastAppliedPathRef = useRef(null)

  collectionsRef.current = visibleCollections

  const seoSyncPaused = isAdmin || adminUiActive || parseSeoPath(location.pathname).kind === 'admin'

  // URL → app state (pathname changes only; not on every collections refresh)
  useEffect(() => {
    if (seoSyncPaused) {
      return
    }

    const parsed = parseSeoPath(location.pathname)
    if (parsed.kind === 'admin') {
      return
    }

    if (parsed.kind !== 'home' && collectionsRef.current.length === 0) {
      return
    }

    if (lastAppliedPathRef.current === location.pathname) {
      return
    }

    const target = resolveRouteTarget(collectionsRef.current, parsed)
    if (!target) {
      return
    }

    lastAppliedPathRef.current = location.pathname
    setMode(target.mode)
    setActiveCategory(target.activeCategory)
    setSelectedPlaceId(target.selectedPlaceId)
    setSelectedPlaceCollectionId(target.selectedPlaceCollectionId)
  }, [
    location.pathname,
    seoSyncPaused,
    setActiveCategory,
    setMode,
    setSelectedPlaceCollectionId,
    setSelectedPlaceId,
  ])

  // app state → URL
  useEffect(() => {
    if (seoSyncPaused) {
      return
    }

    const parsed = parseSeoPath(location.pathname)
    if (parsed.kind === 'admin') {
      return
    }

    if (parsed.kind !== 'home' && collectionsRef.current.length === 0) {
      return
    }

    const nextPath = buildPathFromAppState({
      mode,
      activeCategory,
      selectedPlace,
      activeCollection,
      visibleCollections: collectionsRef.current,
    })

    if (nextPath === location.pathname) {
      lastAppliedPathRef.current = location.pathname
      return
    }

    // Avoid redirect loops when the current URL is a valid public page we cannot resolve yet.
    if (parsed.kind !== 'home' && !resolveRouteTarget(collectionsRef.current, parsed)) {
      return
    }

    lastAppliedPathRef.current = nextPath
    navigate(nextPath, { replace: true })
  }, [
    activeCategory,
    activeCollection,
    location.pathname,
    mode,
    navigate,
    selectedPlace,
    seoSyncPaused,
  ])
}
