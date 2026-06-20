import { useEffect, useMemo, useRef, useState } from 'react'
import {
  COLLECTION_TEMPLATES,
  countFilledCurationFields,
  curationFromAdminForm,
  curationToAdminForm,
  CURATION_FIELDS,
  hasCurationContent,
  isCurationComplete,
  normalizeCuration,
} from '../utils/adminCuration'
import { COLLECTION_STATUS, exportCollectionsConfig } from '../utils/adminCollections'
import {
  COLLECTION_TYPE,
  DEFAULT_COLLECTION_TYPE,
  getCollectionTypeMeta,
  isRouteCollection,
} from '../utils/collectionTypes'
import { curationCsvTemplate, downloadCsvFile, validateCsvImport } from '../utils/curationCsv'
import { DEFAULT_PIN_ID, PIN_DESIGNS } from '../data/pinDesigns'
import { CurationGuideFields } from './CurationGuideFields.jsx'
import { PlaceImageUrlField } from './PlaceImageUrlField.jsx'
import { CurationCsvImportModal } from './CurationCsvImportModal.jsx'
import { resolvePlaceImageUrl } from '../utils/placeImage'
import './CurationManager.css'

function placeLabel(place) {
  return String(place.enName || place.koName || place.koAddress || place.id || 'Place')
}

/**
 * 관리자 전용 큐레이션 컬렉션 관리 UI.
 * 템플릿으로 컬렉션 생성 + 장소별 5필드 인라인 가이드 입력.
 */
export function CurationManager({
  collections = [],
  onCreate,
  onRename,
  onDelete,
  onChangePin,
  onSetType,
  onAddPlace,
  onRemovePlace,
  onClearPlaces,
  onClearAll,
  onMovePlace,
  onReorderPlace,
  onSaveGuide,
  onSetStatus,
  onImportCsv,
  onExportCsv,
}) {
  const [newTitle, setNewTitle] = useState('')
  const [newPin, setNewPin] = useState(DEFAULT_PIN_ID)
  const [newType, setNewType] = useState(DEFAULT_COLLECTION_TYPE)
  const [selectedId, setSelectedId] = useState(collections[0]?.id ?? null)
  const [expandedPlaceId, setExpandedPlaceId] = useState(null)
  const [drafts, setDrafts] = useState({})
  const [imageDrafts, setImageDrafts] = useState({})
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [copyFlash, setCopyFlash] = useState('')
  const [saveFlash, setSaveFlash] = useState('')
  const [importFlash, setImportFlash] = useState('')
  const [importValidation, setImportValidation] = useState(null)
  const [dragPlaceId, setDragPlaceId] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const placesRef = useRef(null)
  const fileInputRef = useRef(null)

  const selected = useMemo(
    () => collections.find((c) => c.id === selectedId) ?? null,
    [collections, selectedId],
  )

  const collectionStats = useMemo(() => {
    if (!selected) {
      return { total: 0, complete: 0, partial: 0, empty: 0 }
    }
    let complete = 0
    let partial = 0
    let empty = 0
    const collectionType = selected.type
    for (const place of selected.places) {
      if (isCurationComplete(place.curation, undefined, collectionType)) {
        complete += 1
      } else if (hasCurationContent(place.curation)) {
        partial += 1
      } else {
        empty += 1
      }
    }
    return { total: selected.places.length, complete, partial, empty }
  }, [selected])

  useEffect(() => {
    if (collections.length === 0) {
      setSelectedId(null)
      return
    }
    if (!collections.some((c) => c.id === selectedId)) {
      setSelectedId(collections[0].id)
    }
  }, [collections, selectedId])

  useEffect(() => {
    setExpandedPlaceId(null)
    setDrafts({})
  }, [selectedId])

  const applyTemplate = (template) => {
    setNewTitle(template.title)
    setNewPin(template.pin)
  }

  const handleCreate = (e) => {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title) {
      return
    }
    onCreate?.(title, newPin, newType)
    setNewTitle('')
    setNewPin(DEFAULT_PIN_ID)
    setNewType(DEFAULT_COLLECTION_TYPE)
  }

  const handleRename = () => {
    if (!selected) {
      return
    }
    const next = window.prompt('Rename collection', selected.title)
    if (next == null || !next.trim()) {
      return
    }
    onRename?.(selected.id, next.trim())
  }

  const handleDelete = () => {
    if (!selected) {
      return
    }
    if (window.confirm(`Delete "${selected.title}" and its ${selected.places.length} place(s)?`)) {
      onDelete?.(selected.id)
    }
  }

  const handleClearAllPlaces = () => {
    if (!selected || selected.places.length === 0) {
      return
    }
    const count = selected.places.length
    if (
      !window.confirm(
        `Remove all ${count} spot(s) from "${selected.title}"?\n\nThe collection will stay — only its places are cleared.`,
      )
    ) {
      return
    }
    onClearPlaces?.(selected.id)
    setExpandedPlaceId(null)
    setDrafts({})
    setImageDrafts({})
  }

  const totalPlaceCount = useMemo(
    () => collections.reduce((sum, c) => sum + (c.places?.length ?? 0), 0),
    [collections],
  )

  const handleClearAllCollections = () => {
    if (collections.length === 0) {
      return
    }
    const collectionCount = collections.length
    const placeCount = totalPlaceCount
    if (
      !window.confirm(
        `Delete all ${collectionCount} collection(s) and ${placeCount} spot(s)?\n\nThis cannot be undone. Export CSV first if you need a backup.`,
      )
    ) {
      return
    }
    const typed = window.prompt('Type DELETE to confirm removing all collections:')
    if (typed?.trim().toUpperCase() !== 'DELETE') {
      return
    }
    onClearAll?.()
    setExpandedPlaceId(null)
    setDrafts({})
    setImageDrafts({})
    setSelectedId(null)
  }

  const runSearch = (e) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) {
      return
    }
    const services = window.kakao?.maps?.services
    if (!services) {
      window.alert('Map is still loading. Try again in a moment.')
      return
    }
    setSearching(true)
    const ps = new services.Places()
    ps.keywordSearch(q, (data, status) => {
      setSearching(false)
      if (status === services.Status.OK) {
        setResults(data.slice(0, 12))
      } else {
        setResults([])
      }
    })
  }

  const handleAdd = (result) => {
    if (!selected) {
      return
    }
    onAddPlace?.(selected.id, result)
    window.requestAnimationFrame(() => {
      placesRef.current?.scrollTo({ top: placesRef.current.scrollHeight, behavior: 'smooth' })
    })
  }

  const openPlaceEditor = (place) => {
    const isOpen = expandedPlaceId === place.id
    if (isOpen) {
      setExpandedPlaceId(null)
      return
    }
    setExpandedPlaceId(place.id)
    setDrafts((prev) => ({
      ...prev,
      [place.id]: curationToAdminForm(place.curation),
    }))
    setImageDrafts((prev) => ({
      ...prev,
      [place.id]: resolvePlaceImageUrl(place),
    }))
  }

  const handleDraftChange = (placeId, key, value) => {
    setDrafts((prev) => ({
      ...prev,
      [placeId]: { ...(prev[placeId] ?? {}), [key]: value },
    }))
  }

  const handleSavePlaceGuide = (place) => {
    if (!selected) {
      return
    }
    const fields = curationFromAdminForm(drafts[place.id] ?? curationToAdminForm(place.curation), place.curation)
    onSaveGuide?.(selected.id, place.id, {
      curation: fields,
      imageUrl: String(imageDrafts[place.id] ?? resolvePlaceImageUrl(place)).trim(),
    })
    setSaveFlash(place.id)
    window.setTimeout(() => setSaveFlash(''), 1500)
  }

  const handleClearPlaceGuide = (place) => {
    if (!selected) {
      return
    }
    if (!window.confirm('Clear all guide fields for this spot?')) {
      return
    }
    const empty = normalizeCuration({})
    setDrafts((prev) => ({ ...prev, [place.id]: empty }))
    setImageDrafts((prev) => ({ ...prev, [place.id]: '' }))
    onSaveGuide?.(selected.id, place.id, { curation: empty, imageUrl: '' })
  }

  const handleCopy = async () => {
    const text = exportCollectionsConfig()
    try {
      await navigator.clipboard.writeText(text)
      setCopyFlash('Copied!')
      window.setTimeout(() => setCopyFlash(''), 2000)
    } catch {
      window.prompt('Copy this JSON into src/data/adminCurationCollections.js:', text)
    }
  }

  const handleImportFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      try {
        setImportValidation(validateCsvImport(text, collections))
      } catch (err) {
        setImportValidation({
          ok: false,
          collections: [],
          errors: [
            `Failed to read CSV: ${err instanceof Error ? err.message : String(err)}`,
            'Re-save as UTF-8 CSV with comma delimiter. Quote cells that contain commas.',
          ],
          rowErrors: [],
          warnings: [],
          previewRows: [],
          duplicates: [],
          stats: { rowCount: 0, collectionCount: 0, placeCount: 0, duplicateCount: 0 },
        })
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleConfirmImport = ({ overwritePlaces }) => {
    const result = onImportCsv?.(importValidation?.collections ?? [], { overwritePlaces })
    if (result?.ok) {
      setImportFlash(`Imported ${result.count} collection(s)`)
      window.setTimeout(() => setImportFlash(''), 2500)
    }
    setImportValidation(null)
  }

  const handleCancelImport = () => {
    setImportValidation(null)
  }

  const handleDragStart = (placeId) => {
    setDragPlaceId(placeId)
  }

  const handleDragEnd = () => {
    setDragPlaceId(null)
    setDragOverIndex(null)
  }

  const handleDragOver = (event, index) => {
    event.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (index) => {
    if (!selected || !dragPlaceId) {
      handleDragEnd()
      return
    }
    onReorderPlace?.(selected.id, dragPlaceId, index)
    handleDragEnd()
  }

  const handleDownloadTemplate = () => {
    downloadCsvFile(curationCsvTemplate(), 'kmap-curation-template.csv')
  }

  return (
    <div className="cm">
      <p className="admin-panel-hint">
        Create tours in Excel or Google Sheets, then import CSV. Columns:{' '}
        <code>collection_name, type, place_name, korean_name, kakao_place_id, lat, lng, image_url, …</code>{' '}
        <strong>draft</strong> stays hidden; <strong>published</strong> shows on the map.
      </p>

      <div className="cm-io-bar">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="cm-file-input"
          onChange={handleImportFile}
        />
        <button type="button" className="cm-btn" onClick={() => fileInputRef.current?.click()}>
          {importFlash || 'Import CSV'}
        </button>
        <button type="button" className="cm-btn" onClick={() => onExportCsv?.()}>
          Export CSV
        </button>
        <button type="button" className="cm-btn cm-btn--ghost" onClick={handleDownloadTemplate}>
          Template
        </button>
        {collections.length > 0 ? (
          <button
            type="button"
            className="cm-btn cm-btn--danger cm-btn--danger-outline"
            onClick={handleClearAllCollections}
          >
            Delete all collections
          </button>
        ) : null}
      </div>

      <section className="cm-create-section" aria-labelledby="cm-create-heading">
        <h3 id="cm-create-heading" className="cm-section-title">
          New collection
        </h3>
        <div className="cm-templates" role="group" aria-label="Quick start templates">
          <span className="cm-templates-label">Quick start</span>
          {COLLECTION_TEMPLATES.map((template) => (
            <button
              key={template.title}
              type="button"
              className="cm-template-btn"
              onClick={() => applyTemplate(template)}
            >
              {template.title}
            </button>
          ))}
        </div>
        <form className="cm-create" onSubmit={handleCreate}>
          <input
            className="cm-input"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Collection name · e.g. Seoul Night View Tour"
            maxLength={48}
          />
          <button type="submit" className="cm-btn cm-btn--primary">
            Create
          </button>
        </form>
        <div className="cm-create-type" role="group" aria-label="Collection type">
          <span className="cm-type-label">Type</span>
          <label className={`cm-type-option${newType === COLLECTION_TYPE.ROUTE ? ' active' : ''}`}>
            <input
              type="radio"
              name="cm-new-type"
              value={COLLECTION_TYPE.ROUTE}
              checked={newType === COLLECTION_TYPE.ROUTE}
              onChange={() => setNewType(COLLECTION_TYPE.ROUTE)}
            />
            <span>Route</span>
            <span className="cm-type-hint">Ordered tour</span>
          </label>
          <label className={`cm-type-option${newType === COLLECTION_TYPE.SPOTS ? ' active' : ''}`}>
            <input
              type="radio"
              name="cm-new-type"
              value={COLLECTION_TYPE.SPOTS}
              checked={newType === COLLECTION_TYPE.SPOTS}
              onChange={() => setNewType(COLLECTION_TYPE.SPOTS)}
            />
            <span>Spots</span>
            <span className="cm-type-hint">Themed picks</span>
          </label>
        </div>
        <div className="cm-create-pins" role="group" aria-label="Pin for new collection">
          <span className="cm-pins-label">Pin</span>
          {PIN_DESIGNS.map((design) => (
            <button
              key={design.id}
              type="button"
              title={design.label}
              aria-label={design.label}
              aria-pressed={newPin === design.id}
              className={`cm-pin${newPin === design.id ? ' active' : ''}`}
              onClick={() => setNewPin(design.id)}
            >
              {design.marker ? (
                <img src={design.marker.src} alt="" width="16" height="19" />
              ) : (
                <span className="cm-pin-dot" style={{ background: design.color }} />
              )}
            </button>
          ))}
        </div>
      </section>

      {collections.length > 0 ? (
        <div className="cm-collection-chips" role="tablist">
          {collections.map((c) => {
            const typeMeta = getCollectionTypeMeta(c.type)
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={c.id === selectedId}
                className={c.id === selectedId ? 'cm-chip active' : 'cm-chip'}
                onClick={() => setSelectedId(c.id)}
              >
                {c.status === COLLECTION_STATUS.DRAFT ? (
                  <span className="cm-chip-draft" aria-label="Draft">
                    ○
                  </span>
                ) : null}
                <span className={`cm-chip-type cm-chip-type--${typeMeta.type}`}>
                  {typeMeta.label}
                </span>
                {c.title} <span className="cm-chip-count">{c.places.length}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <p className="cm-empty">No collections yet. Pick a template or type a name above.</p>
      )}

      {selected ? (
        <div className="cm-detail">
          <div className="cm-detail-head">
            <div>
              <h3 className="cm-detail-title">
                {selected.title}
                <span
                  className={`cm-type-badge cm-type-badge--${getCollectionTypeMeta(selected.type).type}`}
                >
                  {getCollectionTypeMeta(selected.type).label}
                </span>
                <span
                  className={`cm-status-badge${selected.status === COLLECTION_STATUS.PUBLISHED ? ' published' : ''}`}
                >
                  {selected.status === COLLECTION_STATUS.PUBLISHED ? 'Published' : 'Draft'}
                </span>
              </h3>
              <div className="cm-detail-type" role="group" aria-label="Collection type">
                <span className="cm-type-label">Type</span>
                <select
                  className="cm-type-select"
                  value={selected.type ?? COLLECTION_TYPE.ROUTE}
                  onChange={(e) => onSetType?.(selected.id, e.target.value)}
                >
                  <option value={COLLECTION_TYPE.ROUTE}>Route — ordered tour</option>
                  <option value={COLLECTION_TYPE.SPOTS}>Spots — themed picks</option>
                </select>
              </div>
              {collectionStats.total > 0 ? (
                <p className="cm-stats">
                  <span className="cm-stats-complete">{collectionStats.complete} complete</span>
                  {collectionStats.partial > 0 ? (
                    <span className="cm-stats-partial">{collectionStats.partial} in progress</span>
                  ) : null}
                  {collectionStats.empty > 0 ? (
                    <span className="cm-stats-empty">{collectionStats.empty} not started</span>
                  ) : null}
                </p>
              ) : null}
            </div>
            <div className="cm-detail-actions">
              {selected.status === COLLECTION_STATUS.DRAFT ? (
                <button
                  type="button"
                  className="cm-btn cm-btn--sm cm-btn--primary"
                  onClick={() => onSetStatus?.(selected.id, COLLECTION_STATUS.PUBLISHED)}
                >
                  Publish
                </button>
              ) : (
                <button
                  type="button"
                  className="cm-btn cm-btn--sm"
                  onClick={() => onSetStatus?.(selected.id, COLLECTION_STATUS.DRAFT)}
                >
                  Unpublish
                </button>
              )}
              <button type="button" className="cm-btn cm-btn--sm" onClick={handleRename}>
                Rename
              </button>
              <button type="button" className="cm-btn cm-btn--sm cm-btn--danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>

          <div className="cm-pins" role="group" aria-label="Pin design">
            <span className="cm-pins-label">Pin</span>
            {PIN_DESIGNS.map((design) => (
              <button
                key={design.id}
                type="button"
                title={design.label}
                aria-label={design.label}
                aria-pressed={selected.pin === design.id}
                className={`cm-pin${selected.pin === design.id ? ' active' : ''}`}
                onClick={() => onChangePin?.(selected.id, design.id)}
              >
                {design.marker ? (
                  <img src={design.marker.src} alt="" width="16" height="19" />
                ) : (
                  <span className="cm-pin-dot" style={{ background: design.color }} />
                )}
              </button>
            ))}
          </div>

          <form className="cm-search" onSubmit={runSearch}>
            <input
              className="cm-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a place to add (Korean or English)"
            />
            <button type="submit" className="cm-btn" disabled={searching}>
              {searching ? '…' : 'Search'}
            </button>
          </form>

          {results.length > 0 ? (
            <ul className="cm-results">
              {results.map((r) => (
                <li key={r.id} className="cm-result">
                  <div className="cm-result-text">
                    <span className="cm-result-name">{r.place_name}</span>
                    <span className="cm-result-addr">{r.road_address_name || r.address_name}</span>
                  </div>
                  <button type="button" className="cm-btn cm-btn--sm cm-btn--primary" onClick={() => handleAdd(r)}>
                    Add
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {selected.places.length > 0 ? (
            <div className="cm-places-toolbar">
              <span className="cm-places-count">
                {selected.places.length} spot{selected.places.length === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                className="cm-btn cm-btn--sm cm-btn--danger"
                onClick={handleClearAllPlaces}
              >
                Remove all
              </button>
            </div>
          ) : null}

          <div className="cm-places" ref={placesRef}>
            {selected.places.length === 0 ? (
              <p className="cm-empty">No spots yet. Search above and tap “Add”, then fill the 5 guide fields.</p>
            ) : (
              selected.places.map((place, idx) => {
                const isExpanded = expandedPlaceId === place.id
                const draft = drafts[place.id] ?? curationToAdminForm(place.curation)
                const filled = countFilledCurationFields(
                  isExpanded ? draft : place.curation,
                  undefined,
                  selected.type,
                )
                const complete = isCurationComplete(
                  isExpanded ? draft : place.curation,
                  undefined,
                  selected.type,
                )
                const routeMode = isRouteCollection(selected)
                const guideFieldCount = routeMode ? CURATION_FIELDS.length : CURATION_FIELDS.length - 1

                return (
                  <article
                    key={place.id}
                    className={`cm-place-card${isExpanded ? ' expanded' : ''}${dragPlaceId === place.id ? ' dragging' : ''}${dragOverIndex === idx ? ' drag-over' : ''}`}
                    onDragOver={routeMode ? (e) => handleDragOver(e, idx) : undefined}
                    onDrop={routeMode ? () => handleDrop(idx) : undefined}
                  >
                    <div className="cm-place">
                      {routeMode ? (
                        <div className="cm-place-order">
                          <button
                            type="button"
                            className="cm-order-btn"
                            onClick={() => onMovePlace?.(selected.id, place.id, -1)}
                            disabled={idx === 0}
                            aria-label="Move up"
                          >
                            ↑
                          </button>
                          <span className="cm-place-num" aria-hidden>
                            {idx + 1}
                          </span>
                          <button
                            type="button"
                            className="cm-order-btn"
                            onClick={() => onMovePlace?.(selected.id, place.id, 1)}
                            disabled={idx === selected.places.length - 1}
                            aria-label="Move down"
                          >
                            ↓
                          </button>
                          <span
                            className="cm-drag-handle"
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = 'move'
                              handleDragStart(place.id)
                            }}
                            onDragEnd={handleDragEnd}
                            title="Drag to reorder"
                            aria-label={`Drag stop ${idx + 1} to reorder`}
                          >
                            ⠿
                          </span>
                        </div>
                      ) : (
                        <span className="cm-place-spot" aria-hidden>
                          📍
                        </span>
                      )}
                      <button type="button" className="cm-place-summary" onClick={() => openPlaceEditor(place)}>
                        <span className="cm-place-name">{placeLabel(place)}</span>
                        {place.koName && place.enName ? (
                          <span className="cm-place-sub">{place.koName}</span>
                        ) : null}
                        <span
                          className={`cm-place-guide${complete ? ' ok' : filled > 0 ? ' partial' : ''}`}
                        >
                          {complete
                            ? `✦ ${guideFieldCount}/${guideFieldCount} complete`
                            : filled > 0
                              ? `${filled}/${guideFieldCount} fields`
                              : 'Tap to add guide'}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="cm-btn cm-btn--sm cm-btn--danger"
                        onClick={() => onRemovePlace?.(selected.id, place.id)}
                      >
                        Remove
                      </button>
                    </div>

                    {isExpanded ? (
                      <div className="cm-place-editor">
                        <PlaceImageUrlField
                          compact
                          value={imageDrafts[place.id] ?? resolvePlaceImageUrl(place)}
                          onChange={(value) =>
                            setImageDrafts((prev) => ({
                              ...prev,
                              [place.id]: value,
                            }))
                          }
                        />
                        <CurationGuideFields
                          value={draft}
                          onChange={(key, value) => handleDraftChange(place.id, key, value)}
                          collectionType={selected.type}
                          compact
                        />
                        <div className="cm-place-editor-actions">
                          <button
                            type="button"
                            className="cm-btn cm-btn--sm"
                            onClick={() => handleClearPlaceGuide(place)}
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            className="cm-btn cm-btn--sm cm-btn--primary"
                            onClick={() => handleSavePlaceGuide(place)}
                          >
                            {saveFlash === place.id ? 'Saved!' : 'Save guide'}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                )
              })
            )}
          </div>
        </div>
      ) : null}

      <button type="button" className="cm-btn cm-copy" onClick={handleCopy}>
        {copyFlash || 'Copy collections (JSON)'}
      </button>

      {importValidation ? (
        <CurationCsvImportModal
          validation={importValidation}
          onConfirm={handleConfirmImport}
          onClose={handleCancelImport}
        />
      ) : null}
    </div>
  )
}

export default CurationManager
