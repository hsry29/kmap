import { useMemo, useRef, useState } from 'react'
import { logoutAdmin } from '../utils/adminAuth'
import { exportAdminHiddenConfig, listHiddenEntries, loadHiddenPinsExportMap, removeAdminHiddenKey, restoreAdminHiddenKey } from '../utils/hiddenPlaces'
import { exportAdminPartnersConfig } from '../utils/adminPartners'
import { downloadCsvFile } from '../utils/curationCsv'
import {
  hiddenPinsCsvTemplate,
  hiddenPinsExportFilename,
  hiddenPinsToCsv,
  validateHiddenPinsCsvImport,
} from '../utils/hiddenPinsCsv'
import {
  partnersCsvTemplate,
  partnerExportFilename,
  partnersToCsv,
  validatePartnersCsvImport,
} from '../utils/partnersCsv'
import { CurationManager } from './CurationManager.jsx'
import { HiddenPinsCsvImportModal } from './HiddenPinsCsvImportModal.jsx'
import { ImageAssetsManager } from './ImageAssetsManager.jsx'
import { PartnerCsvImportModal } from './PartnerCsvImportModal.jsx'
import './AdminPanel.css'
import './CurationManager.css'

/**
 * @param {{
 *   hiddenKeys: Set<string>
 *   onHiddenKeysChange: (next: Set<string>) => void
 *   partnerPlaces?: Array<Record<string, unknown>>
 *   partnerMap?: Map<string, unknown>
 *   onImportPartnersCsv?: (rows: Array<Record<string, unknown>>, options?: { overwrite?: boolean }) => { ok?: boolean; count?: number }
 *   onExportPartnersCsv?: () => void
 *   onImportHiddenCsv?: (rows: Array<Record<string, unknown>>, options?: { overwrite?: boolean }) => { ok?: boolean; count?: number }
 *   onExportHiddenCsv?: () => void
 *   onRemovePartner?: (place: Record<string, unknown>) => void
 *   onEditPartnerPerk?: (place: Record<string, unknown>) => void
 *   onClose: () => void
 *   onLogout: () => void
 * }} props
 */
export function AdminPanel({
  hiddenKeys,
  onHiddenKeysChange,
  partnerPlaces = [],
  partnerMap,
  onImportPartnersCsv,
  onExportPartnersCsv,
  onImportHiddenCsv,
  onExportHiddenCsv,
  onRemovePartner,
  onEditPartnerPerk,
  collections = [],
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
  onChangeCollectionPin,
  onSetCollectionType,
  onAddCollectionPlace,
  onRemoveCollectionPlace,
  onClearCollectionPlaces,
  onClearAllCollections,
  onMoveCollectionPlace,
  onReorderCollectionPlace,
  onSaveGuide,
  onSetStatus,
  onImportCsv,
  onExportCsv,
  onClose,
  onLogout,
}) {
  const [tab, setTab] = useState('partners')
  const [copyFlash, setCopyFlash] = useState('')
  const [partnerImportFlash, setPartnerImportFlash] = useState('')
  const [partnerImportValidation, setPartnerImportValidation] = useState(null)
  const [hiddenImportFlash, setHiddenImportFlash] = useState('')
  const [hiddenImportValidation, setHiddenImportValidation] = useState(null)
  const partnerFileInputRef = useRef(null)
  const hiddenFileInputRef = useRef(null)
  const entries = useMemo(() => listHiddenEntries(), [hiddenKeys])

  const handleRemove = (key, builtin) => {
    if (builtin) {
      window.alert('Built-in entries are in src/data/adminHiddenSearch.js — edit that file to remove.')
      return
    }
    onHiddenKeysChange(removeAdminHiddenKey(hiddenKeys, key))
  }

  const handleCopyExport = async () => {
    const text = tab === 'partners' ? exportAdminPartnersConfig() : exportAdminHiddenConfig()
    const target = tab === 'partners' ? 'adminPartners.js' : 'adminHiddenSearch.js'
    try {
      await navigator.clipboard.writeText(text)
      setCopyFlash('Copied!')
      window.setTimeout(() => setCopyFlash(''), 2000)
    } catch {
      window.prompt(`Copy this JSON into ${target}:`, text)
    }
  }

  const handleLogout = () => {
    logoutAdmin()
    onLogout()
    onClose()
  }

  const handlePartnerImportFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      try {
        setPartnerImportValidation(validatePartnersCsvImport(text, partnerMap ?? new Map()))
      } catch (err) {
        setPartnerImportValidation({
          ok: false,
          rows: [],
          errors: [
            `Failed to read CSV: ${err instanceof Error ? err.message : String(err)}`,
            'Re-save as UTF-8 CSV with comma delimiter. Quote cells that contain commas.',
          ],
          rowErrors: [],
          warnings: [],
          previewRows: [],
          duplicates: [],
          stats: { rowCount: 0, newCount: 0, updateCount: 0, duplicateCount: 0 },
        })
      }
      if (partnerFileInputRef.current) {
        partnerFileInputRef.current.value = ''
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleConfirmPartnerImport = ({ overwrite }) => {
    const result = onImportPartnersCsv?.(partnerImportValidation?.rows ?? [], { overwrite })
    if (result?.ok) {
      setPartnerImportFlash(`Imported ${result.count} partner(s)`)
      window.setTimeout(() => setPartnerImportFlash(''), 2500)
    }
    setPartnerImportValidation(null)
  }

  const handleDownloadPartnerTemplate = () => {
    downloadCsvFile(partnersCsvTemplate(), 'kmap-partners-template.csv')
  }

  const handleExportPartners = () => {
    if (onExportPartnersCsv) {
      onExportPartnersCsv()
      return
    }
    if (partnerMap) {
      downloadCsvFile(partnersToCsv(partnerMap), partnerExportFilename())
    }
  }

  const handleHiddenImportFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      try {
        setHiddenImportValidation(
          validateHiddenPinsCsvImport(text, loadHiddenPinsExportMap()),
        )
      } catch (err) {
        setHiddenImportValidation({
          ok: false,
          rows: [],
          errors: [
            `Failed to read CSV: ${err instanceof Error ? err.message : String(err)}`,
            'Re-save as UTF-8 CSV with comma delimiter. Quote cells that contain commas.',
          ],
          rowErrors: [],
          warnings: [],
          previewRows: [],
          duplicates: [],
          stats: { rowCount: 0, newCount: 0, updateCount: 0, duplicateCount: 0 },
        })
      }
      if (hiddenFileInputRef.current) {
        hiddenFileInputRef.current.value = ''
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleConfirmHiddenImport = ({ overwrite }) => {
    const result = onImportHiddenCsv?.(hiddenImportValidation?.rows ?? [], { overwrite })
    if (result?.ok) {
      setHiddenImportFlash(`Imported ${result.count} hidden pin(s)`)
      window.setTimeout(() => setHiddenImportFlash(''), 2500)
    }
    setHiddenImportValidation(null)
  }

  const handleDownloadHiddenTemplate = () => {
    downloadCsvFile(hiddenPinsCsvTemplate(), 'kmap-hidden-pins-template.csv')
  }

  const handleExportHidden = () => {
    if (onExportHiddenCsv) {
      onExportHiddenCsv()
      return
    }
    downloadCsvFile(hiddenPinsToCsv(loadHiddenPinsExportMap()), hiddenPinsExportFilename())
  }

  const handleRestoreHidden = (key, builtin) => {
    if (builtin) {
      return
    }
    onHiddenKeysChange(restoreAdminHiddenKey(hiddenKeys, key))
  }

  return (
    <div className="admin-panel-backdrop" onClick={onClose} role="presentation">
      <section
        className="admin-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-panel-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-panel-head">
          <h2 id="admin-panel-title">Admin controls</h2>
          <button type="button" className="admin-panel-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="admin-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'partners'}
            className={tab === 'partners' ? 'admin-tab active' : 'admin-tab'}
            onClick={() => setTab('partners')}
          >
            ★ Partner stores ({partnerPlaces.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'curation'}
            className={tab === 'curation' ? 'admin-tab active' : 'admin-tab'}
            onClick={() => setTab('curation')}
          >
            ✦ Curation ({collections.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'hidden'}
            className={tab === 'hidden' ? 'admin-tab active' : 'admin-tab'}
            onClick={() => setTab('hidden')}
          >
            Hidden pins ({entries.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'images'}
            className={tab === 'images' ? 'admin-tab active' : 'admin-tab'}
            onClick={() => setTab('images')}
          >
            Image credits
          </button>
        </div>

        {tab === 'partners' ? (
          <>
            <p className="admin-panel-hint">
              Bulk-manage partner stores with CSV, or open any place card and tap{' '}
              <strong>☆ Make partner</strong>. Columns:{' '}
              <code>partner_name, korean_name, kakao_place_id, lat, lng, category, address, partner_perk, status</code>
              . <strong>draft</strong> is admin-only; <strong>published</strong> shows to users.
            </p>

            <div className="cm-io-bar">
              <input
                ref={partnerFileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="cm-file-input"
                onChange={handlePartnerImportFile}
              />
              <button
                type="button"
                className="cm-btn"
                onClick={() => partnerFileInputRef.current?.click()}
              >
                {partnerImportFlash || 'Import CSV'}
              </button>
              <button type="button" className="cm-btn" onClick={handleExportPartners}>
                Export CSV
              </button>
              <button type="button" className="cm-btn cm-btn--ghost" onClick={handleDownloadPartnerTemplate}>
                Template
              </button>
            </div>

            <ul className="admin-hidden-list">
              {partnerPlaces.length === 0 ? (
                <li className="admin-hidden-empty">No partner stores yet.</li>
              ) : (
                partnerPlaces.map((place) => (
                  <li key={String(place.id)} className="admin-hidden-item">
                    <div className="admin-hidden-item-text">
                      <span className="admin-hidden-name">
                        {String(place.enName || place.koName || place.name || place.id)}
                      </span>
                      {place._dataPremium ? <span className="admin-hidden-badge">built-in</span> : null}
                      {place._partnerStatus === 'draft' ? (
                        <span className="admin-hidden-badge">draft</span>
                      ) : null}
                      {place.partnerPerk ? (
                        <span className="admin-partner-perk">🎁 {String(place.partnerPerk)}</span>
                      ) : (
                        <span className="admin-partner-perk admin-partner-perk--empty">No benefit text</span>
                      )}
                    </div>
                    <div className="admin-item-actions">
                      {onEditPartnerPerk ? (
                        <button
                          type="button"
                          className="admin-hidden-remove admin-edit-btn"
                          onClick={() => onEditPartnerPerk(place)}
                        >
                          Edit perk
                        </button>
                      ) : null}
                      {onRemovePartner ? (
                        <button
                          type="button"
                          className="admin-hidden-remove"
                          onClick={() => onRemovePartner(place)}
                        >
                          {place._dataPremium ? 'Turn off' : 'Remove'}
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </>
        ) : null}

        {partnerImportValidation ? (
          <PartnerCsvImportModal
            validation={partnerImportValidation}
            onConfirm={handleConfirmPartnerImport}
            onClose={() => setPartnerImportValidation(null)}
          />
        ) : null}

        {tab === 'curation' ? (
          <CurationManager
            collections={collections}
            onCreate={onCreateCollection}
            onRename={onRenameCollection}
            onDelete={onDeleteCollection}
            onChangePin={onChangeCollectionPin}
            onSetType={onSetCollectionType}
            onAddPlace={onAddCollectionPlace}
            onRemovePlace={onRemoveCollectionPlace}
            onClearPlaces={onClearCollectionPlaces}
            onClearAll={onClearAllCollections}
            onMovePlace={onMoveCollectionPlace}
            onReorderPlace={onReorderCollectionPlace}
            onSaveGuide={onSaveGuide}
            onSetStatus={onSetStatus}
            onImportCsv={onImportCsv}
            onExportCsv={onExportCsv}
          />
        ) : null}

        {tab === 'hidden' ? (
          <>
            <p className="admin-panel-hint">
              Bulk-manage hidden pins with CSV, or tap <strong>Hide pin</strong> on any place card.
              Columns:{' '}
              <code>place_name, korean_name, kakao_place_id, lat, lng, category, reason, status</code>
              . <strong>active</strong> hides from all modes; <strong>inactive</strong> keeps visible.
            </p>

            <div className="cm-io-bar">
              <input
                ref={hiddenFileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="cm-file-input"
                onChange={handleHiddenImportFile}
              />
              <button
                type="button"
                className="cm-btn"
                onClick={() => hiddenFileInputRef.current?.click()}
              >
                {hiddenImportFlash || 'Import CSV'}
              </button>
              <button type="button" className="cm-btn" onClick={handleExportHidden}>
                Export CSV
              </button>
              <button type="button" className="cm-btn cm-btn--ghost" onClick={handleDownloadHiddenTemplate}>
                Template
              </button>
            </div>

            <ul className="admin-hidden-list">
              {entries.length === 0 ? (
                <li className="admin-hidden-empty">No hidden places yet.</li>
              ) : (
                entries.map((entry) => (
                  <li key={entry.key} className="admin-hidden-item">
                    <div className="admin-hidden-item-text">
                      <span className="admin-hidden-name">{entry.label}</span>
                      {entry.builtin ? <span className="admin-hidden-badge">built-in</span> : null}
                      {entry.status === 'inactive' ? (
                        <span className="admin-hidden-badge">inactive</span>
                      ) : null}
                      {entry.reason ? (
                        <span className="admin-partner-perk">{String(entry.reason)}</span>
                      ) : null}
                    </div>
                    <div className="admin-item-actions">
                      {!entry.builtin && entry.status === 'inactive' ? (
                        <button
                          type="button"
                          className="admin-hidden-remove admin-edit-btn"
                          onClick={() => handleRestoreHidden(entry.key, entry.builtin)}
                        >
                          Restore
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="admin-hidden-remove"
                        onClick={() => handleRemove(entry.key, entry.builtin)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </>
        ) : null}

        {tab === 'images' ? <ImageAssetsManager /> : null}

        {hiddenImportValidation ? (
          <HiddenPinsCsvImportModal
            validation={hiddenImportValidation}
            onConfirm={handleConfirmHiddenImport}
            onClose={() => setHiddenImportValidation(null)}
          />
        ) : null}

        <div className="admin-panel-actions">
          {tab !== 'curation' && tab !== 'images' ? (
            <button type="button" className="admin-panel-btn" onClick={handleCopyExport}>
              {copyFlash || (tab === 'partners' ? 'Copy partners (JSON)' : 'Copy hidden (JSON)')}
            </button>
          ) : null}
          <button type="button" className="admin-panel-btn admin-panel-btn--danger" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </section>
    </div>
  )
}
