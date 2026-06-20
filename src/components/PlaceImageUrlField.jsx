import { useEffect, useRef, useState } from 'react'
import {
  getImageUrlLoadHint,
  normalizeImageUrl,
  resolveImageReferrerPolicy,
} from '../utils/placeImage'
import { uploadPlaceImage } from '../utils/placeImageUpload'
import './CurationGuideFields.css'

/**
 * Optional hero image URL for curated Route/Spot places.
 */
export function PlaceImageUrlField({ value, onChange, compact = false }) {
  const fileInputRef = useRef(null)
  const url = normalizeImageUrl(value)
  const loadHint = getImageUrlLoadHint(url)
  const [previewState, setPreviewState] = useState('idle')
  const [uploadState, setUploadState] = useState('idle')
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    setPreviewState(url ? 'loading' : 'idle')
  }, [url])

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (!file) {
      return
    }
    setUploadState('uploading')
    setUploadError('')
    const result = await uploadPlaceImage(file)
    if (result.ok) {
      onChange(result.publicUrl)
      setUploadState('done')
      window.setTimeout(() => setUploadState('idle'), 2000)
    } else {
      setUploadState('error')
      setUploadError(result.error)
    }
  }

  return (
    <div className={`cgf-field cgf-field--image${compact ? ' cgf-field--image-compact' : ''}`}>
      <span className="cgf-label">Image URL</span>
      <span className="cgf-hint">
        Hero photo for the place detail card. Paste a direct image link, or upload a file
        (recommended for Naver/blog images).
      </span>
      <div className="cgf-image-row">
        <input
          className="cgf-input"
          type="url"
          inputMode="url"
          autoComplete="off"
          value={value ?? ''}
          placeholder="https://example.com/image.jpg"
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="cgf-image-upload-btn"
          onClick={handleUploadClick}
          disabled={uploadState === 'uploading'}
        >
          {uploadState === 'uploading' ? 'Uploading…' : 'Upload file'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="cgf-image-file-input"
          onChange={handleFileChange}
        />
      </div>
      {uploadState === 'done' ? (
        <span className="cgf-image-preview-status cgf-image-preview-status--ok">Upload complete</span>
      ) : null}
      {uploadError ? (
        <span className="cgf-image-preview-status cgf-image-preview-status--error">{uploadError}</span>
      ) : null}
      {loadHint ? <span className="cgf-image-warn">{loadHint}</span> : null}
      {url ? (
        <div
          className={`cgf-image-preview${previewState === 'error' ? ' cgf-image-preview--error' : ''}`}
        >
          <img
            key={url}
            src={url}
            alt=""
            loading="lazy"
            referrerPolicy={resolveImageReferrerPolicy(url)}
            onLoad={() => setPreviewState('ok')}
            onError={() => setPreviewState('error')}
          />
          {previewState === 'loading' ? (
            <span className="cgf-image-preview-status">Loading preview…</span>
          ) : null}
          {previewState === 'error' ? (
            <span className="cgf-image-preview-status cgf-image-preview-status--error">
              Preview failed — use Upload file or host the image on Imgur / your CDN.
            </span>
          ) : null}
          {previewState === 'ok' ? (
            <span className="cgf-image-preview-status cgf-image-preview-status--ok">Preview OK</span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default PlaceImageUrlField
