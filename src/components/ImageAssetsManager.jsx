import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createImageAsset,
  deleteImageAsset,
  fetchAllImageAssets,
  imageAssetRowKey,
  importImageAssetsCsvRows,
  updateImageAsset,
} from '../utils/imageAssets'
import {
  downloadCsvFile,
  imageAssetsCsvTemplate,
  imageAssetsExportFilename,
  imageAssetsToCsv,
  validateImageAssetsCsvImport,
} from '../utils/imageAssetsCsv'
import { refreshPlaceImageCatalog } from '../utils/placeImageCatalog'
import { isSyncEnabled } from '../utils/supabaseClient'
import { ImageAssetsCsvImportModal } from './ImageAssetsCsvImportModal.jsx'
import './ImageAssetsManager.css'

const EMPTY_FORM = {
  place_name: '',
  file_name: '',
  image_source: '',
  image_author: '',
  image_license: '',
  image_source_url: '',
  notes: '',
}

/** @param {{ onChanged?: () => void }} props */
export function ImageAssetsManager({ onChanged }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  /** @type {[import('../utils/imageAssets').ImageAssetRow | null, Function]} */
  const [editingOriginal, setEditingOriginal] = useState(null)
  const [flash, setFlash] = useState('')
  const [importValidation, setImportValidation] = useState(null)
  const [importFlash, setImportFlash] = useState('')
  const importInputRef = useRef(null)

  const loadRows = useCallback(async () => {
    if (!isSyncEnabled) {
      setRows([])
      setLoading(false)
      setError('Supabase is required for image metadata.')
      return
    }
    setLoading(true)
    setError('')
    try {
      setRows(await fetchAllImageAssets())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingOriginal(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      if (editingOriginal) {
        await updateImageAsset(editingOriginal, form)
        setFlash('Updated metadata')
      } else {
        await createImageAsset(form)
        setFlash('Saved metadata (upserted by place)')
      }
      await refreshPlaceImageCatalog()
      onChanged?.()
      resetForm()
      await loadRows()
      window.setTimeout(() => setFlash(''), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleEdit = (row) => {
    setEditingOriginal(row)
    setForm({
      place_name: row.place_name ?? '',
      file_name: row.file_name ?? '',
      image_source: row.image_source ?? '',
      image_author: row.image_author ?? '',
      image_license: row.image_license ?? '',
      image_source_url: row.image_source_url ?? '',
      notes: row.notes ?? '',
    })
  }

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete metadata for "${row.place_name || row.file_name}"?`)) {
      return
    }
    try {
      await deleteImageAsset(row)
      await refreshPlaceImageCatalog()
      onChanged?.()
      if (editingOriginal && imageAssetRowKey(editingOriginal) === imageAssetRowKey(row)) {
        resetForm()
      }
      await loadRows()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleExportCsv = () => {
    downloadCsvFile(imageAssetsToCsv(rows), imageAssetsExportFilename())
  }

  const handleDownloadTemplate = () => {
    downloadCsvFile(imageAssetsCsvTemplate(), 'kmap-image_assets-template.csv')
  }

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }
    setImportFlash('')
    try {
      const text = await file.text()
      const existing = rows.length ? rows : await fetchAllImageAssets()
      setImportValidation(validateImageAssetsCsvImport(text, existing))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleConfirmImport = async () => {
    const toImport = importValidation?.rows ?? []
    if (!toImport.length) {
      return
    }
    setError('')
    try {
      const result = await importImageAssetsCsvRows(toImport)
      await refreshPlaceImageCatalog()
      onChanged?.()
      await loadRows()
      setImportValidation(null)
      setImportFlash(`Imported ${result.inserted} row(s) (upserted by place_key)`)
      window.setTimeout(() => setImportFlash(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="iam">
      <header className="iam-head">
        <div>
          <h3>Image metadata</h3>
          <p className="iam-sub">
            Photo credits for Storage files in <code>kmapimages</code>. One row per place — CSV
            import upserts by <code>place_key</code> (derived from place_name).
          </p>
        </div>
        <div className="iam-head-actions">
          <button type="button" className="iam-btn" onClick={handleDownloadTemplate}>
            Template
          </button>
          <button type="button" className="iam-btn" onClick={handleExportCsv} disabled={loading}>
            Export CSV
          </button>
          <label className="iam-btn iam-btn--file">
            Import CSV
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={handleImportFile}
            />
          </label>
          <button type="button" className="iam-btn" onClick={loadRows} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      {flash ? <p className="iam-flash">{flash}</p> : null}
      {importFlash ? <p className="iam-flash">{importFlash}</p> : null}
      {error ? <p className="iam-error">{error}</p> : null}

      <form className="iam-form" onSubmit={handleSubmit}>
        <div className="iam-form-grid">
          <label>
            <span>Place name</span>
            <input
              value={form.place_name}
              onChange={(e) => setForm((prev) => ({ ...prev, place_name: e.target.value }))}
              placeholder="Gyeongbokgung Palace"
              required
            />
          </label>
          <label>
            <span>File name</span>
            <input
              value={form.file_name}
              onChange={(e) => setForm((prev) => ({ ...prev, file_name: e.target.value }))}
              placeholder="Gyeongbokgung_Palace.jpg"
            />
          </label>
          <label>
            <span>Author</span>
            <input
              value={form.image_author}
              onChange={(e) => setForm((prev) => ({ ...prev, image_author: e.target.value }))}
            />
          </label>
          <label>
            <span>Source</span>
            <input
              value={form.image_source}
              onChange={(e) => setForm((prev) => ({ ...prev, image_source: e.target.value }))}
              placeholder="Wikimedia Commons"
            />
          </label>
          <label>
            <span>License</span>
            <input
              value={form.image_license}
              onChange={(e) => setForm((prev) => ({ ...prev, image_license: e.target.value }))}
              placeholder="CC BY-SA 4.0"
            />
          </label>
          <label className="iam-source-url">
            <span>Source URL</span>
            <div className="iam-source-url-row">
              <input
                type="url"
                value={form.image_source_url}
                onChange={(e) => setForm((prev) => ({ ...prev, image_source_url: e.target.value }))}
              />
              {form.image_source_url.trim() ? (
                <a
                  className="iam-link iam-link--external"
                  href={form.image_source_url.trim()}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Open
                </a>
              ) : null}
            </div>
          </label>
        </div>
        <label className="iam-notes">
          <span>Notes</span>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </label>
        <div className="iam-form-actions">
          {editingOriginal ? (
            <button type="button" className="iam-btn" onClick={resetForm}>
              Cancel edit
            </button>
          ) : null}
          <button type="submit" className="iam-btn iam-btn--primary">
            {editingOriginal ? 'Save metadata' : 'Add metadata'}
          </button>
        </div>
      </form>

      {loading ? <p className="iam-muted">Loading…</p> : null}
      {!loading && rows.length === 0 ? (
        <p className="iam-muted">No image metadata yet.</p>
      ) : null}

      {rows.length > 0 ? (
        <div className="iam-table-wrap">
          <table className="iam-table">
            <thead>
              <tr>
                <th>Place</th>
                <th>place_key</th>
                <th>File</th>
                <th>Credit</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={imageAssetRowKey(row)}>
                  <td>{row.place_name || '—'}</td>
                  <td>
                    <code>{row.place_key || '—'}</code>
                  </td>
                  <td>{row.file_name || '—'}</td>
                  <td>
                    {[row.image_author, row.image_source].filter(Boolean).join(' / ') || '—'}
                  </td>
                  <td className="iam-row-actions">
                    {row.image_source_url ? (
                      <a
                        className="iam-link iam-link--external"
                        href={row.image_source_url}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        Open URL
                      </a>
                    ) : null}
                    <button type="button" className="iam-link" onClick={() => handleEdit(row)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="iam-link iam-link--danger"
                      onClick={() => handleDelete(row)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {importValidation ? (
        <ImageAssetsCsvImportModal
          validation={importValidation}
          onConfirm={handleConfirmImport}
          onClose={() => setImportValidation(null)}
        />
      ) : null}
    </div>
  )
}

export default ImageAssetsManager
