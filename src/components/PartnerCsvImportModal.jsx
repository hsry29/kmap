import { useId, useState } from 'react'
import { PARTNER_CSV_HEADERS } from '../utils/partnersCsv'
import './CurationCsvImportModal.css'

const PREVIEW_LIMIT = 25

function matchTypeLabel(type) {
  if (type === 'kakao_place_id') {
    return 'Kakao Place ID'
  }
  if (type === 'coordinates') {
    return 'Coordinates'
  }
  if (type === 'name_pair') {
    return 'Name pair'
  }
  return type
}

/**
 * Partner stores CSV Import preview / validation modal.
 */
export function PartnerCsvImportModal({ validation, onConfirm, onClose }) {
  const headingId = useId()
  const [duplicateMode, setDuplicateMode] = useState('skip')

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
  const hasDuplicates = duplicates.length > 0
  const overwrite = duplicateMode === 'overwrite'

  const handleConfirm = () => {
    if (!canImport) {
      return
    }
    if (hasDuplicates && !overwrite) {
      const proceed = window.confirm(
        `${duplicates.length} partner(s) already exist and will be skipped.\n\nImport anyway (keep existing data)?`,
      )
      if (!proceed) {
        return
      }
    }
    onConfirm?.({ overwrite })
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
            <h2 id={headingId}>Review partner stores</h2>
            <p className="csv-import-sub">
              {stats.newCount ?? 0} new · {stats.updateCount ?? 0} existing match(es) ·{' '}
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
              <strong>{stats.newCount ?? 0}</strong> new partner(s)
            </span>
            <span className="csv-import-stat">
              <strong>{stats.updateCount ?? 0}</strong> existing match(es)
            </span>
            {hasDuplicates ? (
              <span className="csv-import-stat csv-import-stat--warn">
                <strong>{duplicates.length}</strong> duplicate(s)
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

          {hasDuplicates ? (
            <div className="csv-import-block">
              <h3>Duplicate partners</h3>
              <p className="csv-import-hint">
                These rows match existing partner stores (Kakao Place ID, coordinates, or name pair).
              </p>
              <fieldset className="csv-import-overwrite-group">
                <label className="csv-import-overwrite">
                  <input
                    type="radio"
                    name="partner-dup-mode"
                    value="skip"
                    checked={duplicateMode === 'skip'}
                    onChange={() => setDuplicateMode('skip')}
                  />
                  Skip duplicates (default)
                </label>
                <label className="csv-import-overwrite">
                  <input
                    type="radio"
                    name="partner-dup-mode"
                    value="overwrite"
                    checked={duplicateMode === 'overwrite'}
                    onChange={() => setDuplicateMode('overwrite')}
                  />
                  Overwrite existing partners
                </label>
              </fieldset>
              <div className="csv-import-table-wrap">
                <table className="csv-import-table">
                  <thead>
                    <tr>
                      <th>Match</th>
                      <th>Existing</th>
                      <th>CSV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duplicates.slice(0, 15).map((d) => (
                      <tr key={`${d.matchKey}-${d.importedLabel}`}>
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
              Expected columns: <code>{PARTNER_CSV_HEADERS.join(', ')}</code>
            </p>
            <div className="csv-import-table-wrap">
              <table className="csv-import-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Partner</th>
                    <th>Korean</th>
                    <th>Kakao ID</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewSlice.map((row) => (
                    <tr key={row.rowNum} className={row.valid ? '' : 'invalid'}>
                      <td>{row.rowNum}</td>
                      <td>{row.partnerName || '—'}</td>
                      <td>{row.koreanName || '—'}</td>
                      <td>{row.kakaoPlaceId || '—'}</td>
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
            <strong>draft</strong> = admin only · <strong>published</strong> = visible to users
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
              ? hasDuplicates && overwrite
                ? `Import & overwrite ${duplicates.length} partner(s)`
                : `Import ${validRows.length} partner(s)`
              : 'Fix errors to import'}
          </button>
        </footer>
      </section>
    </div>
  )
}

export default PartnerCsvImportModal
