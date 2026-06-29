import { useId } from 'react'
import { IMAGE_ASSET_CSV_HEADERS } from '../utils/imageAssetsCsv'
import './CurationCsvImportModal.css'

const PREVIEW_LIMIT = 25

/**
 * Image assets CSV Import preview — upserts by place_key (no duplicate rows).
 */
export function ImageAssetsCsvImportModal({ validation, onConfirm, onClose }) {
  const headingId = useId()

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

  const handleConfirm = () => {
    if (!canImport) {
      return
    }
    onConfirm?.()
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
            <h2 id={headingId}>Review image metadata</h2>
            <p className="csv-import-sub">
              {stats.newCount ?? 0} new · {stats.updateCount ?? 0} will update ·{' '}
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
              Columns: {IMAGE_ASSET_CSV_HEADERS.join(', ')}
            </span>
            <span className="csv-import-stat">
              Dedupe key: <code>place_key</code> (from place_name)
            </span>
          </div>

          {allIssues.length > 0 ? (
            <div className="csv-import-block csv-import-block--error" role="alert">
              <strong>Cannot import</strong>
              <ul>
                {allIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {warnings.length > 0 ? (
            <div className="csv-import-block csv-import-block--warn">
              <strong>Warnings</strong>
              <ul>
                {warnings.slice(0, 8).map((w) => (
                  <li key={w}>{w}</li>
                ))}
                {warnings.length > 8 ? (
                  <li>…and {warnings.length - 8} more warning(s)</li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {duplicates.length > 0 ? (
            <div className="csv-import-block">
              <strong>Existing rows to update ({duplicates.length})</strong>
              <p className="csv-import-hint">
                Matching <code>place_key</code> rows will be updated in place — no duplicate rows
                are created.
              </p>
              <div className="csv-import-table-wrap">
                <table className="csv-import-table">
                  <thead>
                    <tr>
                      <th>Place key</th>
                      <th>Existing</th>
                      <th>Imported</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duplicates.slice(0, 15).map((d) => (
                      <tr key={d.placeKey}>
                        <td>
                          <code>{d.placeKey}</code>
                        </td>
                        <td>{d.existingLabel}</td>
                        <td>{d.importedLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {duplicates.length > 15 ? (
                <p className="csv-import-more">…and {duplicates.length - 15} more update(s)</p>
              ) : null}
            </div>
          ) : null}

          <div className="csv-import-block">
            <strong>Preview</strong>
            <p className="csv-import-hint">Required: place_name. place_key is generated automatically.</p>
            <div className="csv-import-table-wrap">
              <table className="csv-import-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Place</th>
                    <th>File</th>
                    <th>place_key</th>
                  </tr>
                </thead>
                <tbody>
                  {previewSlice.map((row) => (
                    <tr key={row.rowNum} className={row.valid ? '' : 'csv-import-row--invalid'}>
                      <td>{row.rowNum}</td>
                      <td>{row.placeName || '—'}</td>
                      <td>{row.fileName || '—'}</td>
                      <td>{row.placeKey ? <code>{row.placeKey}</code> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasMorePreview ? (
              <p className="csv-import-more">…and {previewRows.length - PREVIEW_LIMIT} more row(s)</p>
            ) : null}
            {previewRows.length === 0 ? (
              <p className="csv-import-empty">No rows to preview.</p>
            ) : null}
          </div>

          <p className="csv-import-note">
            Import upserts by <code>place_key</code>. Re-importing the same place updates metadata
            instead of creating a second row.
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
            Import {validRows.length} row(s)
          </button>
        </footer>
      </section>
    </div>
  )
}

export default ImageAssetsCsvImportModal
