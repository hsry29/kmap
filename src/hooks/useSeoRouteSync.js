import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { buildPathFromAppState, parseSeoPath, resolveRouteTarget } from '../utils/seo'

/**
 * Syncs public SEO URLs with map app state.
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
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const applyingUrlRef = useRef(false)
  const readyRef = useRef(false)

  useEffect(() => {
    if (isAdmin) {
      return
    }
    const parsed = parseSeoPath(location.pathname)
    if (parsed.kind !== 'home' && visibleCollections.length === 0) {
      return
    }
    const target = resolveRouteTarget(visibleCollections, parsed)
    if (!target) {
      return
    }
    applyingUrlRef.current = true
    setMode(target.mode)
    setActiveCategory(target.activeCategory)
    setSelectedPlaceId(target.selectedPlaceId)
    setSelectedPlaceCollectionId(target.selectedPlaceCollectionId)
    readyRef.current = true
    applyingUrlRef.current = false
  }, [
    isAdmin,
    location.pathname,
    setActiveCategory,
    setMode,
    setSelectedPlaceCollectionId,
    setSelectedPlaceId,
    visibleCollections,
  ])

  useEffect(() => {
    if (isAdmin || applyingUrlRef.current) {
      return
    }
    if (!readyRef.current && parseSeoPath(location.pathname).kind !== 'home') {
      return
    }
    readyRef.current = true
    const nextPath = buildPathFromAppState({
      mode,
      activeCategory,
      selectedPlace,
      activeCollection,
      visibleCollections,
    })
    if (nextPath !== location.pathname) {
      navigate(nextPath, { replace: true })
    }
  }, [
    activeCategory,
    activeCollection,
    isAdmin,
    location.pathname,
    mode,
    navigate,
    selectedPlace,
    visibleCollections,
  ])
}
