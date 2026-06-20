import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { resolveCuration } from '../utils/adminCuration'
import { resolveCuratedPlaceImage } from '../utils/placeImageCatalog'
import { usePlaceImageCatalog } from '../utils/usePlaceImageCatalog'
import { RouteColorIndicator } from './RouteColorIndicator'
import './RouteItineraryPanel.css'

const MOBILE_MQ = '(max-width: 768px)'
const SNAP_COLLAPSED_RATIO = 0.25
const SNAP_HALF_RATIO = 0.45
const SNAP_EXPANDED_RATIO = 0.75

function truncateText(text, maxLen = 72) {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) {
    return ''
  }
  if (trimmed.length <= maxLen) {
    return trimmed
  }
  return `${trimmed.slice(0, maxLen - 1).trim()}…`
}

function formatStopSummary(curation) {
  const parts = []
  const why = truncateText(curation?.whyVisit)
  const time = String(curation?.timeNeeded ?? '').trim()
  if (why) {
    parts.push(why)
  }
  if (time) {
    parts.push(time)
  }
  return parts.join(' · ')
}

function resolvePlaceTitle(place) {
  return String(place.enName || place.name || '').trim()
}

function resolvePlaceKoName(place) {
  return String(place.koName || '').trim()
}

function getViewportHeight() {
  if (typeof window === 'undefined') {
    return 800
  }
  return window.visualViewport?.height ?? window.innerHeight
}

function getMaxSheetHeight() {
  const vh = getViewportHeight()
  const topSafe = 56
  return Math.max(vh * SNAP_COLLAPSED_RATIO, vh - topSafe)
}

/** @typedef {'collapsed' | 'half' | 'expanded'} SheetSnap */

/** @param {SheetSnap} snap */
function heightForSnap(snap) {
  const vh = getViewportHeight()
  const maxH = getMaxSheetHeight()
  const ratio =
    snap === 'expanded'
      ? SNAP_EXPANDED_RATIO
      : snap === 'half'
        ? SNAP_HALF_RATIO
        : SNAP_COLLAPSED_RATIO
  return Math.min(vh * ratio, maxH)
}

/** @param {number} height */
function snapFromHeight(height) {
  const collapsed = heightForSnap('collapsed')
  const half = heightForSnap('half')
  const expanded = heightForSnap('expanded')

  if (height < (collapsed + half) / 2) {
    return 'collapsed'
  }
  if (height < (half + expanded) / 2) {
    return 'half'
  }
  return 'expanded'
}

function syncSheetLayout(snap, height) {
  if (typeof document === 'undefined') {
    return
  }
  document.documentElement.dataset.routeSheetSnap = snap
  document.documentElement.style.setProperty('--route-sheet-height', `${height}px`)
}

function clearSheetLayout() {
  if (typeof document === 'undefined') {
    return
  }
  delete document.documentElement.dataset.routeSheetSnap
  document.documentElement.style.removeProperty('--route-sheet-height')
}

function StopList({
  orderedStops,
  selectedPlaceId,
  curationMap,
  onSelectStop,
  scrollable = false,
  preview = false,
}) {
  usePlaceImageCatalog()
  const visibleStops = preview ? orderedStops.slice(0, 2) : orderedStops

  return (
    <ol
      className={`route-itinerary-list${scrollable ? ' scrollable' : ''}${preview ? ' preview' : ''}`}
    >
      {visibleStops.map((place) => {
        const order = place._tourOrder ?? 0
        const title = resolvePlaceTitle(place)
        const koName = resolvePlaceKoName(place)
        const summary = formatStopSummary(resolveCuration(place, curationMap))
        const selected = selectedPlaceId === place.id
        const thumbUrl = resolveCuratedPlaceImage(place).url

        return (
          <li key={place.id}>
            <button
              type="button"
              className={`route-itinerary-item${selected ? ' active' : ''}`}
              onClick={() => onSelectStop(place)}
              aria-current={selected ? 'true' : undefined}
            >
              {thumbUrl ? (
                <span className="route-itinerary-thumb" aria-hidden>
                  <img src={thumbUrl} alt="" loading="lazy" />
                </span>
              ) : null}
              <span className="route-itinerary-num" aria-hidden>
                {order}
              </span>
              <span className="route-itinerary-copy">
                <span className="route-itinerary-name">{title || koName || 'Untitled stop'}</span>
                {title && koName ? <span className="route-itinerary-ko">{koName}</span> : null}
                {!preview && summary ? (
                  <span className="route-itinerary-summary">{summary}</span>
                ) : null}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function MobileRouteItinerarySheet({
  collection,
  orderedStops,
  routeDescription,
  routeColor,
  selectedPlaceId,
  curationMap,
  onSelectStop,
}) {
  /** @type {[SheetSnap, Function]} */
  const [snap, setSnap] = useState('collapsed')
  const [sheetHeight, setSheetHeight] = useState(() => heightForSnap('collapsed'))
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef({ startY: 0, startHeight: 0, active: false, moved: false })
  const heightRef = useRef(sheetHeight)

  useEffect(() => {
    heightRef.current = sheetHeight
  }, [sheetHeight])

  const applySnap = useCallback((/** @type {SheetSnap} */ nextSnap) => {
    const nextHeight = heightForSnap(nextSnap)
    setSnap(nextSnap)
    setSheetHeight(nextHeight)
    syncSheetLayout(nextSnap, nextHeight)
  }, [])

  useEffect(() => {
    applySnap('collapsed')
  }, [collection?.id, applySnap])

  useEffect(() => {
    syncSheetLayout(snap, sheetHeight)
    return () => clearSheetLayout()
  }, [snap, sheetHeight])

  useEffect(() => {
    const onResize = () => {
      const nextHeight = heightForSnap(snap)
      setSheetHeight(nextHeight)
      syncSheetLayout(snap, nextHeight)
    }
    window.visualViewport?.addEventListener('resize', onResize)
    window.addEventListener('resize', onResize)
    return () => {
      window.visualViewport?.removeEventListener('resize', onResize)
      window.removeEventListener('resize', onResize)
    }
  }, [snap])

  const onDragStart = useCallback((clientY) => {
    dragRef.current = {
      startY: clientY,
      startHeight: heightRef.current,
      active: true,
      moved: false,
    }
    setDragging(true)
  }, [])

  const onDragMove = useCallback((clientY) => {
    if (!dragRef.current.active) {
      return
    }
    const delta = dragRef.current.startY - clientY
    if (Math.abs(delta) > 6) {
      dragRef.current.moved = true
    }
    const minH = heightForSnap('collapsed')
    const next = Math.min(getMaxSheetHeight(), Math.max(minH, dragRef.current.startHeight + delta))
    setSheetHeight(next)
    syncSheetLayout(snap, next)
  }, [snap])

  const onDragEnd = useCallback(() => {
    if (!dragRef.current.active) {
      return
    }
    dragRef.current.active = false
    setDragging(false)
    applySnap(snapFromHeight(heightRef.current))
  }, [applySnap])

  const bindDragZone = (allowDrag) => ({
    onPointerDown: (event) => {
      if (!allowDrag) {
        return
      }
      if (event.target.closest('.route-itinerary-item')) {
        return
      }
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      onDragStart(event.clientY)
    },
    onPointerMove: (event) => {
      if (!dragRef.current.active) {
        return
      }
      event.preventDefault()
      onDragMove(event.clientY)
    },
    onPointerUp: (event) => {
      if (!dragRef.current.active) {
        return
      }
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      onDragEnd()
    },
    onPointerCancel: (event) => {
      if (!dragRef.current.active) {
        return
      }
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      onDragEnd()
    },
  })

  const handleHeaderClick = () => {
    if (dragRef.current.moved) {
      return
    }
    if (snap === 'collapsed') {
      applySnap('half')
      return
    }
    if (snap === 'half') {
      applySnap('expanded')
      return
    }
    applySnap('collapsed')
  }

  const stopCountLabel = `${orderedStops.length} ${orderedStops.length === 1 ? 'stop' : 'stops'}`
  const isExpanded = snap === 'expanded'
  const isCollapsed = snap === 'collapsed'
  const sheetDragZone = !isExpanded

  return createPortal(
    <section
      className={`route-itinerary-sheet snap-${snap}${dragging ? ' dragging' : ''}${isExpanded ? ' expanded' : ''}`}
      style={{ height: `${sheetHeight}px` }}
      aria-label={`${collection.title} itinerary`}
    >
      <div className="route-itinerary-sheet-header" {...bindDragZone(true)}>
        <button
          type="button"
          className="route-itinerary-sheet-header-btn"
          onClick={handleHeaderClick}
          aria-expanded={snap !== 'collapsed'}
        >
          <span className="route-itinerary-handle-track" aria-hidden>
            <span className="route-itinerary-handle-bar" />
          </span>
          <span className="route-itinerary-toggle-main">
            <RouteColorIndicator color={routeColor} size="sm" />
            <span className="route-itinerary-toggle-text">
              <span className="route-itinerary-toggle-title">{collection.title}</span>
              <span className="route-itinerary-toggle-meta">{stopCountLabel}</span>
            </span>
          </span>
        </button>
      </div>

      <div
        className={`route-itinerary-sheet-body${sheetDragZone ? ' sheet-drag-zone' : ''}`}
        {...bindDragZone(sheetDragZone)}
      >
        {!isCollapsed && routeDescription ? (
          <p className="route-itinerary-description">{routeDescription}</p>
        ) : null}
        <StopList
          orderedStops={orderedStops}
          selectedPlaceId={selectedPlaceId}
          curationMap={curationMap}
          onSelectStop={onSelectStop}
          scrollable={isExpanded}
          preview={isCollapsed}
        />
        {isCollapsed && orderedStops.length > 2 ? (
          <p className="route-itinerary-more-hint">Drag up for full itinerary</p>
        ) : null}
      </div>
    </section>,
    document.body,
  )
}

function DesktopRouteItineraryPanel({
  collection,
  orderedStops,
  routeDescription,
  routeColor,
  selectedPlaceId,
  curationMap,
  onSelectStop,
}) {
  const stopCountLabel = `${orderedStops.length} ${orderedStops.length === 1 ? 'stop' : 'stops'}`

  return (
    <section className="route-itinerary-panel route-itinerary-panel--desktop" aria-label={`${collection.title} itinerary`}>
      <div className="route-itinerary-toggle route-itinerary-toggle--desktop">
        <span className="route-itinerary-toggle-main">
          <RouteColorIndicator color={routeColor} size="sm" />
          <span className="route-itinerary-toggle-text">
            <span className="route-itinerary-toggle-title">{collection.title}</span>
            <span className="route-itinerary-toggle-meta">{stopCountLabel}</span>
          </span>
        </span>
      </div>

      <div className="route-itinerary-body">
        {routeDescription ? <p className="route-itinerary-description">{routeDescription}</p> : null}
        <StopList
          orderedStops={orderedStops}
          selectedPlaceId={selectedPlaceId}
          curationMap={curationMap}
          onSelectStop={onSelectStop}
          scrollable
        />
      </div>
    </section>
  )
}

/**
 * Selected route stop list — desktop sidebar / mobile bottom sheet.
 */
export function RouteItineraryPanel({
  collection,
  stops,
  selectedPlaceId,
  routeColor,
  curationMap,
  onSelectStop,
}) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return window.matchMedia(MOBILE_MQ).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }
    const mq = window.matchMedia(MOBILE_MQ)
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const orderedStops = useMemo(
    () =>
      [...(stops ?? [])].sort(
        (a, b) => (a._tourOrder ?? Number.MAX_SAFE_INTEGER) - (b._tourOrder ?? Number.MAX_SAFE_INTEGER),
      ),
    [stops],
  )

  const routeDescription = String(collection?.description ?? collection?.summary ?? '').trim()

  if (!collection || orderedStops.length === 0) {
    return null
  }

  const shared = {
    collection,
    orderedStops,
    routeDescription,
    routeColor,
    selectedPlaceId,
    curationMap,
    onSelectStop,
  }

  if (isMobile) {
    return <MobileRouteItinerarySheet {...shared} />
  }

  return <DesktopRouteItineraryPanel {...shared} />
}

export default RouteItineraryPanel
