import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { COLLECTION_STATUS } from '../utils/adminCollections'
import { COLLECTION_TYPE, getCollectionTypeMeta, isRouteCollection } from '../utils/collectionTypes'
import { RouteColorIndicator } from './RouteColorIndicator'
import { getRouteColorFromMap, getSpotsColorFromMap } from '../utils/routeCollectionColors'
import { MODE_TAB_COPY } from '../data/modeTabCopy'
import './CurationPicker.css'

const ALL_VALUE = 'All'

/** @param {'spots' | 'routes' | undefined} filterType */
function getPickerTriggerIcon(filterType) {
  if (filterType === 'spots') {
    return MODE_TAB_COPY.explore.icon
  }
  if (filterType === 'routes') {
    return MODE_TAB_COPY.routes.icon
  }
  return MODE_TAB_COPY.places.icon
}
const DEFAULT_ALL_LABEL = 'All Tours'

function placeCount(collection) {
  return Array.isArray(collection?.places) ? collection.places.length : 0
}

function matchesSearch(collection, query) {
  const q = query.trim().toLowerCase()
  if (!q) {
    return true
  }
  const title = String(collection?.title ?? '').toLowerCase()
  const typeMeta = getCollectionTypeMeta(collection?.type)
  return title.includes(q) || typeMeta.label.toLowerCase().includes(q) || typeMeta.shortLabel.toLowerCase().includes(q)
}

/**
 * 큐레이션 선택 드롭다운.
 */
export function CurationPicker({
  collections,
  routeColorByCollectionId,
  spotsColorByCollectionId,
  activeCategory,
  onSelect,
  isAdmin = false,
  filterType,
  allLabel = DEFAULT_ALL_LABEL,
  allHint = 'Show every tour',
  placeholderLabel = 'Choose a Collection',
  promptSelect = false,
  onIntroDismissed,
  showExploreHeader = false,
  exploreHeaderTitle = 'Explore Seoul',
  exploreHeaderSubtitle,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const rootRef = useRef(null)
  const searchRef = useRef(null)
  const introPendingRef = useRef(false)
  const listboxId = useId()
  const searchId = useId()

  const listable = useMemo(
    () =>
      (collections ?? []).filter((col) => {
        if (placeCount(col) === 0) {
          return false
        }
        if (!isAdmin && col.status === COLLECTION_STATUS.DRAFT) {
          return false
        }
        if (filterType === 'spots' && isRouteCollection(col)) {
          return false
        }
        if (filterType === 'routes' && !isRouteCollection(col)) {
          return false
        }
        return true
      }),
    [collections, isAdmin, filterType],
  )

  const filtered = useMemo(() => listable.filter((col) => matchesSearch(col, search)), [listable, search])

  const routeItems = useMemo(
    () =>
      [...filtered]
        .filter((col) => isRouteCollection(col))
        .sort((a, b) => String(a.title).localeCompare(String(b.title))),
    [filtered],
  )

  const spotsItems = useMemo(
    () =>
      [...filtered]
        .filter((col) => !isRouteCollection(col))
        .sort((a, b) => String(a.title).localeCompare(String(b.title))),
    [filtered],
  )

  const showAllOption = matchesSearch({ title: allLabel, type: COLLECTION_TYPE.ROUTE }, search)

  const activeCollection = useMemo(() => {
    if (activeCategory === ALL_VALUE || activeCategory == null) {
      return null
    }
    return listable.find((col) => col.title === activeCategory) ?? null
  }, [activeCategory, listable])

  const triggerLabel =
    activeCategory == null
      ? placeholderLabel
      : activeCategory === ALL_VALUE
        ? allLabel
        : activeCategory

  const resolvedExploreSubtitle =
    exploreHeaderSubtitle ??
    `${listable.length} Curated Collection${listable.length === 1 ? '' : 's'} Available`

  const searchPlaceholder = filterType === 'spots' ? 'Search collections...' : 'Search tours...'

  useEffect(() => {
    if (promptSelect) {
      introPendingRef.current = true
      setOpen(true)
    }
  }, [promptSelect])

  useEffect(() => {
    if (!open) {
      return undefined
    }
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      window.requestAnimationFrame(() => searchRef.current?.focus())
    } else {
      setSearch('')
      if (introPendingRef.current) {
        introPendingRef.current = false
        onIntroDismissed?.()
      }
    }
  }, [open, onIntroDismissed])

  const handleSelect = (value) => {
    if (introPendingRef.current) {
      introPendingRef.current = false
      onIntroDismissed?.()
    }
    onSelect?.(value)
    setOpen(false)
    setSearch('')
  }

  const renderRouteItem = (collection) => {
    const count = placeCount(collection)
    const isActive = activeCategory === collection.title
    const isDraft = collection.status === COLLECTION_STATUS.DRAFT
    const routeColor = getRouteColorFromMap(routeColorByCollectionId, collection.id)

    return (
      <button
        key={collection.id ?? collection.title}
        type="button"
        role="option"
        aria-selected={isActive}
        className={isActive ? 'curation-picker-item curation-picker-item--route active' : 'curation-picker-item curation-picker-item--route'}
        onClick={() => handleSelect(collection.title)}
      >
        <RouteColorIndicator color={routeColor} size="md" />
        <span className="curation-picker-item-title">
          {collection.title}
          <span className="curation-picker-count">({count})</span>
        </span>
        {isDraft ? <span className="curation-picker-draft">Draft</span> : null}
      </button>
    )
  }

  const renderSpotsItem = (collection) => {
    const count = placeCount(collection)
    const isActive = activeCategory === collection.title
    const isDraft = collection.status === COLLECTION_STATUS.DRAFT
    const spotColor = getSpotsColorFromMap(spotsColorByCollectionId, collection.id)

    return (
      <button
        key={collection.id ?? collection.title}
        type="button"
        role="option"
        aria-selected={isActive}
        className={isActive ? 'curation-picker-item curation-picker-item--route active' : 'curation-picker-item curation-picker-item--route'}
        onClick={() => handleSelect(collection.title)}
      >
        <RouteColorIndicator color={spotColor} size="md" />
        <span className="curation-picker-item-title">
          {collection.title}
          <span className="curation-picker-count">({count})</span>
        </span>
        {isDraft ? <span className="curation-picker-draft">Draft</span> : null}
      </button>
    )
  }

  const showRouteSection = !filterType || filterType === 'routes'
  const showSpotsSection = !filterType || filterType === 'spots'
  const hasResults =
    showAllOption ||
    (showRouteSection && routeItems.length > 0) ||
    (showSpotsSection && spotsItems.length > 0)

  const renderAllOption = () => {
    if (!showAllOption) {
      return null
    }
    return (
      <button
        type="button"
        role="option"
        aria-selected={activeCategory === ALL_VALUE}
        className={activeCategory === ALL_VALUE ? 'curation-picker-item curation-picker-item--all active' : 'curation-picker-item curation-picker-item--all'}
        onClick={() => handleSelect(ALL_VALUE)}
      >
        <span className="curation-picker-item-title">{allLabel}</span>
        <span className="curation-picker-all-hint">{allHint}</span>
      </button>
    )
  }

  const renderListBody = () => (
    <>
      {!hasResults ? <p className="curation-picker-empty">No tours match your search.</p> : null}
      {renderAllOption()}
      {showRouteSection && routeItems.length > 0 ? (
        <div className="curation-picker-group">
          <p className="curation-picker-section">🛣 ROUTE</p>
          {routeItems.map(renderRouteItem)}
        </div>
      ) : null}
      {showSpotsSection && spotsItems.length > 0 ? (
        <div className="curation-picker-group">
          <p className="curation-picker-section">⭐ SPOTS</p>
          {spotsItems.map(renderSpotsItem)}
        </div>
      ) : null}
    </>
  )

  const renderSearchField = () => (
    <label className="curation-picker-search" htmlFor={searchId}>
      <span className="curation-picker-search-icon" aria-hidden="true">
        ⌕
      </span>
      <input
        ref={searchRef}
        id={searchId}
        type="search"
        value={search}
        placeholder={searchPlaceholder}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
      />
    </label>
  )

  const triggerIcon = getPickerTriggerIcon(filterType)

  return (
    <div className="curation-picker" ref={rootRef}>
      <button
        type="button"
        className={open ? 'curation-picker-trigger open' : 'curation-picker-trigger'}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="curation-picker-trigger-label">
          <span className="curation-picker-pin" aria-hidden="true">
            {triggerIcon}
          </span>
          <span className="curation-picker-trigger-text">{triggerLabel}</span>
          {activeCollection && isRouteCollection(activeCollection) ? (
            <RouteColorIndicator
              color={getRouteColorFromMap(routeColorByCollectionId, activeCollection.id)}
              size="sm"
            />
          ) : activeCollection && filterType === 'spots' ? (
            <RouteColorIndicator
              color={getSpotsColorFromMap(spotsColorByCollectionId, activeCollection.id)}
              size="sm"
            />
          ) : activeCollection ? (
            <span className={`curation-picker-trigger-type curation-picker-type--${getCollectionTypeMeta(activeCollection.type).type}`}>
              {getCollectionTypeMeta(activeCollection.type).icon}
            </span>
          ) : null}
        </span>
        <span className="curation-picker-chevron" aria-hidden="true">
          ▼
        </span>
      </button>

      {open ? (
        <div className="curation-picker-menu" role="presentation">
          {showExploreHeader ? (
            <header className="curation-picker-explore-header">
              <p className="curation-picker-explore-title">{exploreHeaderTitle}</p>
              <p className="curation-picker-explore-subtitle">{resolvedExploreSubtitle}</p>
            </header>
          ) : null}
          {renderSearchField()}
          <div id={listboxId} className="curation-picker-list" role="listbox" aria-label="Curation tours">
            {renderListBody()}
          </div>
        </div>
      ) : null}
    </div>
  )
}
