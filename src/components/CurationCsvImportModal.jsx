import { useId, useState } from 'react'
import { CSV_HEADERS } from '../utils/curationCsv'
import './CurationCsvImportModal.css'

const PREVIEW_LIMIT = 25

function matchTypeLabel(type) {
  if (type === 'kakao_place_id') {
    return 'Kakao Place ID'
  }
  if (type === 'place_id') {
    return 'Place ID'
  }
  if (type === 'coordinates') {
    return 'Coordinates'
  }
  return type
}

/**
 * CSV Import 미리보기·검증 모달.
 */
export function CurationCsvImportModal({ validation, onConfirm, onClose }) {
  const headingId = useId()
  const [overwritePlaces, setOverwritePlaces] = useState(false)

  if (!validation) {
    return null
  }

  const {
    ok,
    errors = [],
    rowErrors = [],
    warnings = [],
    previewRows = [],
    duplicates = [],
    stats = {},
  } = validation

  const allIssues = [...errors, ...rowErrors]

  const validRows = previewRows.filter((r) => r.valid)
  const previewSlice = previewRows.slice(0, PREVIEW_LIMIT)
  const hasMorePreview = previewRows.length > PREVIEW_LIMIT
  const canImport = ok && validRows.length > 0
  const needsOverwriteChoice = duplicates.length > 0

  const handleConfirm = () => {
    if (!canImport) {
      return
    }
    if (needsOverwriteChoice && !overwritePlaces) {
      const proceed = window.confirm(
        `${duplicates.length} place(s) already exist and will be skipped.\n\nImport anyway (keep existing data)?`,
      )
      if (!proceed) {
        return
      }
    }
    onConfirm?.({ overwritePlaces })
  }

  return (
    <div className="csv-import-backdrop" role="presentation" onClick={onClose}>
      <section
        className="csv-import"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="csv-import-head">
          <div>
            <span className="csv-import-kicker">CSV Import</span>
            <h2 id={headingId}>Review before import</h2>
            <p className="csv-import-sub">
              {stats.collectionCount ?? 0} collection(s) · {stats.placeCount ?? 0} place(s) ·{' '}
              {stats.rowCount ?? 0} data row(s)
            </p>
          </div>
          <button type="button" className="csv-import-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="csv-import-body">
          <div className="csv-import-stats">
            <span className="csv-import-stat">
              <strong>{stats.newCollections ?? 0}</strong> new collection(s)
            </span>
            <span className="csv-import-stat">
              <strong>{stats.updatedCollections ?? 0}</strong> update existing
            </span>
            {duplicates.length > 0 ? (
              <span className="csv-import-stat csv-import-stat--warn">
                <strong>{duplicates.length}</strong> duplicate place(s)
              </span>
            ) : null}
          </div>

          {allIssues.length > 0 ? (
            <div className="csv-import-block csv-import-block--error" role="alert">
              <h3>Issues ({allIssues.length})</h3>
              <ul>
                {allIssues.slice(0, 15).map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
                {allIssues.length > 15 ? <li>…and {allIssues.length - 15} more</li> : null}
              </ul>
            </div>
          ) : null}

          {warnings.length > 0 ? (
            <div className="csv-import-block csv-import-block--warn">
              <h3>Warnings ({warnings.length})</h3>
              <ul>
                {warnings.slice(0, 12).map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
                {warnings.length > 12 ? <li>…and {warnings.length - 12} more</li> : null}
              </ul>
            </div>
          ) : null}

          {duplicates.length > 0 ? (
            <div className="csv-import-block">
              <h3>Duplicate places</h3>
              <p className="csv-import-hint">
                These places already exist in a collection with the same name. Choose whether to
                overwrite them with CSV data. Image URLs from CSV are always applied to matching
                places, even without overwrite.
              </p>
              <label className="csv-import-overwrite">
                <input
                  type="checkbox"
                  checked={overwritePlaces}
                  onChange={(e) => setOverwritePlaces(e.target.checked)}
                />
                Overwrite existing places (match by Kakao Place ID, place ID, or coordinates)
              </label>
              <div className="csv-import-table-wrap">
                <table className="csv-import-table">
                  <thead>
                    <tr>
                      <th>Collection</th>
                      <th>Match</th>
                      <th>Existing</th>
                      <th>CSV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duplicates.slice(0, 15).map((d) => (
                      <tr key={`${d.collectionTitle}-${d.matchKey}`}>
                        <td>{d.collectionTitle}</td>
                        <td>
                          {matchTypeLabel(d.matchType)}
                          {d.kakaoPlaceId ? (
                            <span className="csv-import-id"> · {d.kakaoPlaceId}</span>
                          ) : null}
                        </td>
                        <td>{d.existingLabel}</td>
                        <td>{d.importedLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {duplicates.length > 15 ? (
                <p className="csv-import-more">…and {duplicates.length - 15} more duplicate(s)</p>
              ) : null}
            </div>
          ) : null}

          <div className="csv-import-block">
            <h3>Preview</h3>
            <p className="csv-import-hint">
              Expected columns: <code>{CSV_HEADERS.join(', ')}</code>
            </p>
            <div className="csv-import-table-wrap">
              <table className="csv-import-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Collection</th>
                    <th>Place</th>
                    <th>Kakao ID</th>
                    <th>Image</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewSlice.map((row) => (
                    <tr key={row.rowNum} className={row.valid ? '' : 'invalid'}>
                      <td>{row.rowNum}</td>
                      <td>{row.collectionName || '—'}</td>
                      <td>{row.placeName || '—'}</td>
                      <td>{row.kakaoPlaceId || '—'}</td>
                      <td className="csv-import-image-cell">
                        {row.imageUrl ? (
                          <span title={row.imageUrl}>✓</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <span
                          className={`csv-import-status${row.status === 'published' ? ' published' : ''}`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasMorePreview ? (
              <p className="csv-import-more">
                Showing {PREVIEW_LIMIT} of {previewRows.length} row(s)
              </p>
            ) : null}
            {previewRows.length === 0 ? (
              <p className="csv-import-empty">No rows to preview.</p>
            ) : null}
          </div>

          <p className="csv-import-note">
            <strong>draft</strong> = hidden from map users · <strong>published</strong> = visible on
            map
          </p>
        </div>

        <footer className="csv-import-actions">
          <button type="button" className="csv-import-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="csv-import-btn csv-import-btn--primary"
            disabled={!canImport}
            onClick={handleConfirm}
          >
            {canImport
              ? needsOverwriteChoice && overwritePlaces
                ? `Import & overwrite ${duplicates.length} place(s)`
                : `Import ${stats.placeCount ?? 0} place(s)`
              : 'Fix errors to import'}
          </button>
        </footer>
      </section>
    </div>
  )
}

export default CurationCsvImportModal
