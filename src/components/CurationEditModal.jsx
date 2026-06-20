import { useEffect, useId, useState } from 'react'
import {
  countFilledCurationFields,
  curationToAdminForm,
  CURATION_FIELDS,
} from '../utils/adminCuration'
import { CurationGuideFields } from './CurationGuideFields.jsx'
import { PlaceImageUrlField } from './PlaceImageUrlField.jsx'
import './CurationEditModal.css'
import { resolvePlaceImageUrl } from '../utils/placeImage'

/**
 * 관리자 전용 큐레이션 가이드 편집 모달(지도 상세 카드에서 열림).
 */
export function CurationEditModal({ place, initial, onSave, onClear, onClose }) {
  const headingId = useId()
  const [form, setForm] = useState(() => curationToAdminForm(initial))
  const [imageUrl, setImageUrl] = useState(() => resolvePlaceImageUrl(place))
  const filled = countFilledCurationFields(form)

  useEffect(() => {
    setForm(curationToAdminForm(initial))
    setImageUrl(resolvePlaceImageUrl(place))
  }, [initial, place])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const title = String(place?.enName || place?.koName || place?.name || place?.id || 'Place')

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave?.({ curation: form, imageUrl: imageUrl.trim() })
  }

  return (
    <div className="curation-edit-backdrop" role="presentation" onClick={onClose}>
      <section
        className="curation-edit"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="curation-edit-head">
          <div>
            <span className="curation-edit-kicker">Curator&apos;s guide · Admin</span>
            <h2 id={headingId}>{title}</h2>
            <span className="curation-edit-progress">
              {filled}/{CURATION_FIELDS.length} fields filled
            </span>
          </div>
          <button type="button" className="curation-edit-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <form className="curation-edit-form" onSubmit={handleSubmit}>
          <PlaceImageUrlField value={imageUrl} onChange={setImageUrl} />
          <CurationGuideFields
            value={form}
            onChange={handleChange}
            collectionType={place?._collectionType}
          />

          <div className="curation-edit-actions">
            {onClear ? (
              <button type="button" className="curation-edit-btn curation-edit-btn--ghost" onClick={onClear}>
                Clear all
              </button>
            ) : (
              <span />
            )}
            <div className="curation-edit-actions-right">
              <button type="button" className="curation-edit-btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="curation-edit-btn curation-edit-btn--primary">
                Save guide
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}

export default CurationEditModal
