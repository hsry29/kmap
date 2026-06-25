import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getFacilityPronunciation } from '../utils/pronunciation'
import { resolveImageReferrerPolicy } from '../utils/placeImage'
import { resolveCuratedPlaceImage } from '../utils/placeImageCatalog'
import { getStoragePublicUrl, NO_IMAGE_FILE } from '../utils/placeImageStorage'
import { usePlaceImageCatalog } from '../utils/usePlaceImageCatalog'
import {
  resolveCategoryLabel,
  resolveDisplayNames,
  resolveDriverKoAddress,
  resolveFloorLabel,
} from '../utils/placeDisplay'
import { addComment, deleteComment, getComments } from '../utils/placeComments'
import { CURATION_FIELDS, hasCurationContent } from '../utils/adminCuration'
import { getCollectionTypeMeta, isRouteCollection } from '../utils/collectionTypes'
import { PlaceImageCredit } from './PlaceImageCredit.jsx'
import './PlaceDetailCard.css'

const ADJ = ['Swift', 'Calm', 'Bright', 'Quiet', 'Bold', 'Gentle', 'Happy', 'Clever']
const NOUN = ['Tiger', 'Rabbit', 'Otter', 'Badger', 'Heron', 'Panda', 'Finch', 'Lynx']

function randomNickname() {
  const a = ADJ[Math.floor(Math.random() * ADJ.length)]
  const b = NOUN[Math.floor(Math.random() * NOUN.length)]
  const n = Math.floor(100 + Math.random() * 900)
  return `${a}${b}${n}`
}

function formatRelativeEn(ts) {
  const diff = Date.now() - ts
  const sec = Math.floor(diff / 1000)
  if (sec < 45) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 14) return `${day}d ago`
  const week = Math.floor(day / 7)
  if (week < 8) return `${week}w ago`
  const month = Math.floor(day / 30)
  if (month < 12) return `${month}mo ago`
  const year = Math.floor(day / 365)
  return `${year}y ago`
}

function kakaoMapLink(name, lat, lng) {
  return `https://map.kakao.com/link/map/${encodeURIComponent(name)},${lat},${lng}`
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

/**
 * @param {{
 *   kind: 'planning' | 'nearby' | 'search'
 *   place: Record<string, unknown>
 *   themeDefaultImage?: Record<string, string>
 *   themeBadge?: Record<string, string>
 *   isSaved: boolean
 *   onToggleSave: () => void
 *   isAdmin?: boolean
 *   isHiddenFromSearch?: boolean
 *   onToggleHideFromSearch?: () => void
 *   collectionInfo?: { title: string, type?: unknown, order?: number | null, total?: number | null }
 *   collectionHref?: string
 *   featuredCollections?: Array<{ title: string, type?: unknown, id?: string, href?: string }>
 *   onFeaturedCollectionSelect?: (collectionTitle: string) => void
 *   onShowDriver?: () => void
 *   onClose: () => void
 * }} props
 */
export function PlaceDetailCard({
  kind,
  place,
  themeDefaultImage = {},
  themeBadge = {},
  collectionInfo = null,
  collectionHref = '',
  featuredCollections = [],
  onFeaturedCollectionSelect,
  isSaved,
  onToggleSave,
  isAdmin = false,
  isHiddenFromSearch = false,
  onToggleHideFromSearch,
  isPartner = false,
  onTogglePartner,
  curation = null,
  onEditCuration,
  onShowDriver,
  onClose,
}) {
  const placeId = String(place.id)
  const [comments, setComments] = useState(() => getComments(kind, placeId))
  const [nick, setNick] = useState(() => randomNickname())
  const [pw, setPw] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copyFlash, setCopyFlash] = useState('')

  const imageCatalog = usePlaceImageCatalog()

  const curatedImage = useMemo(() => {
    if (kind !== 'planning') {
      return null
    }
    return resolveCuratedPlaceImage(place)
  }, [kind, place, imageCatalog])

  const model = useMemo(() => {
    const lat = Number(place.lat)
    const lng = Number(place.lng)
    const { nameKo, nameEn, subwayLines = [], isSubway = false } = resolveDisplayNames(place, kind)
    const pronunciation = nameKo && !isSubway
      ? getFacilityPronunciation({ ...place, name: nameKo, koName: nameKo })?.text ?? ''
      : ''
    const showSpokenAsTitle = Boolean(nameKo && !nameEn && pronunciation)
    const categoryLabel = resolveCategoryLabel(place, kind, themeBadge)
    const floorLabel = resolveFloorLabel(place, kind)

    const appendMemoPronunciation = (memoParts) => {
      if (isSubway) {
        return
      }
      if (nameEn && pronunciation) {
        return
      }
      const pr = getFacilityPronunciation({ ...place, name: nameKo || place.name, koName: nameKo })
      if (!pr?.text) {
        return
      }
      if (showSpokenAsTitle && pr.text === pronunciation) {
        return
      }
      memoParts.push(`Pronunciation: ${pr.text}`)
    }

    if (kind === 'planning') {
      const image = curatedImage?.url || ''
      const memoParts = []
      if (place.description) memoParts.push(String(place.description))
      appendMemoPronunciation(memoParts)
      if (place.phone) memoParts.push(`Phone: ${place.phone}`)
      const address = resolveDriverKoAddress(place)
      const driverLine = address || nameKo || nameEn
      return {
        nameKo,
        nameEn,
        pronunciation,
        showSpokenAsTitle,
        isSubway,
        subwayLines,
        address,
        image,
        categoryLabel,
        floorLabel,
        memo: memoParts.join('\n\n'),
        lat,
        lng,
        mapName: nameKo || nameEn || String(place.enName ?? ''),
        hasDriver: Boolean(driverLine && onShowDriver),
        imageCreditAsset: curatedImage?.isNoImage ? null : curatedImage?.asset ?? null,
        isNoImage: curatedImage?.isNoImage ?? false,
      }
    }

    const address = String(place.address ?? '')
    const road = String(place.roadAddress ?? '')
    const jibun = String(place.jibunAddress ?? '')
    const memoParts = []
    if (place.phone) memoParts.push(`Phone: ${place.phone}`)
    appendMemoPronunciation(memoParts)
    const driverLine = road || jibun || address || nameKo || nameEn
    return {
      nameKo,
      nameEn,
      pronunciation,
      showSpokenAsTitle,
      isSubway,
      subwayLines,
      address,
      image: '',
      categoryLabel,
      floorLabel,
      memo: memoParts.join('\n\n') || 'Place found via Kakao map search.',
      lat,
      lng,
      mapName: nameKo || nameEn || String(place.name ?? ''),
      hasDriver: Boolean(driverLine && onShowDriver),
    }
  }, [kind, place, onShowDriver, themeBadge, curatedImage])

  const isPremium = Boolean(place.isPremium)
  const partnerPerk = place.partnerPerk ? String(place.partnerPerk) : ''
  const canCurate = kind === 'planning'
  const curationHasContent = hasCurationContent(curation)
  const showCuration = canCurate && (curationHasContent || (isAdmin && Boolean(onEditCuration)))
  const collectionType = collectionInfo?.type ?? 'route'
  const routeCollection = isRouteCollection({ type: collectionType })
  const collectionTypeMeta = getCollectionTypeMeta(collectionType)
  const curationRows = curation
    ? CURATION_FIELDS.map((field) => ({ ...field, value: String(curation[field.key] ?? '').trim() }))
        .filter((row) => row.value)
        .filter((row) => routeCollection || row.key !== 'nextStop')
    : []

  const [heroSrc, setHeroSrc] = useState(model.image)

  const noImageUrl = useMemo(() => getStoragePublicUrl(NO_IMAGE_FILE), [])
  const isNoImageHero = model.isNoImage || (Boolean(noImageUrl) && heroSrc === noImageUrl)

  useEffect(() => {
    setHeroSrc(model.image)
  }, [model.image, placeId])

  const refreshComments = useCallback(() => {
    setComments(getComments(kind, placeId))
  }, [kind, placeId])

  const flashCopy = useCallback((key) => {
    setCopyFlash(key)
    window.setTimeout(() => setCopyFlash(''), 1200)
  }, [])

  const handleCopyName = useCallback(
    async (label, text) => {
      if (!text) return
      const ok = await copyToClipboard(text)
      if (ok) {
        flashCopy(label)
      } else {
        window.alert('Could not copy to clipboard.')
      }
    },
    [flashCopy],
  )

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nickname = nick.trim()
    const password = pw
    const text = body.trim()
    if (!nickname || !password || !text) {
      window.alert('Please fill in nickname, password, and comment.')
      return
    }
    setSubmitting(true)
    try {
      await addComment(kind, placeId, { nickname, password, body: text })
      setBody('')
      setPw('')
      refreshComments()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (commentId) => {
    const input = window.prompt('Enter the password you set when posting to delete this comment.')
    if (input == null) return
    const result = await deleteComment(kind, placeId, commentId, input)
    if (!result.ok) {
      if (result.reason === 'badpassword') {
        window.alert('Password does not match.')
      } else {
        window.alert('Comment not found.')
      }
      return
    }
    refreshComments()
  }

  const handleBackdrop = (event) => {
    if (event.target === event.currentTarget) onClose()
  }

  const mapHref = kakaoMapLink(model.mapName, model.lat, model.lng)

  return (
    <div className="pdc-backdrop" onClick={handleBackdrop} role="presentation">
      <section
        className="pdc-shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdc-place-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pdc-scroll">
          <div className={`pdc-media${isNoImageHero ? ' pdc-media--no-image' : ''}`}>
            {heroSrc ? (
              <img
                className={isNoImageHero ? 'pdc-media-img pdc-media-img--contain' : 'pdc-media-img'}
                src={heroSrc}
                alt=""
                loading="lazy"
                referrerPolicy={resolveImageReferrerPolicy(heroSrc)}
                onError={() => {
                  if (kind === 'planning') {
                    if (noImageUrl && heroSrc !== noImageUrl) {
                      setHeroSrc(noImageUrl)
                      return
                    }
                  }
                  setHeroSrc('')
                }}
              />
            ) : null}
            <div
              className="pdc-media-placeholder"
              style={{ display: heroSrc ? 'none' : 'grid' }}
              aria-hidden
            >
              📍
            </div>
            <button type="button" className="pdc-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          <div className="pdc-body">
            <header className="pdc-header-block">
              {kind === 'planning' && collectionInfo?.title ? (
                <div className="pdc-collection-banner">
                  {collectionHref ? (
                    <Link to={collectionHref} className="pdc-collection-banner-title pdc-collection-banner-link">
                      📍 {collectionInfo.title}
                    </Link>
                  ) : (
                    <p className="pdc-collection-banner-title">📍 {collectionInfo.title}</p>
                  )}
                  <p className={`pdc-collection-type pdc-collection-type--${collectionTypeMeta.type}`}>
                    {collectionTypeMeta.icon} {collectionTypeMeta.shortLabel} Collection
                  </p>
                  {routeCollection && collectionInfo.order ? (
                    <p className="pdc-tour-stop">
                      Stop {collectionInfo.order} of {collectionInfo.total ?? '—'}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {isPremium ? (
                <span className="pdc-partner-badge">🔥 Partner</span>
              ) : null}
              <div className="pdc-names-simple" role="group" aria-label="Place name">
                {model.nameEn ? (
                  <h2 id="pdc-place-title" className="pdc-name-primary">
                    {model.nameEn}
                  </h2>
                ) : null}
                {model.nameKo && model.nameEn ? (
                  <button
                    type="button"
                    className={`pdc-name-sub${copyFlash === 'ko' ? ' pdc-name-sub--flash' : ''}`}
                    onClick={() => handleCopyName('ko', model.nameKo)}
                  >
                    {model.nameKo}
                  </button>
                ) : null}
                {model.subwayLines.length > 0 ? (
                  <div className="pdc-subway-lines" aria-label="Subway lines">
                    {model.subwayLines.map((line) => (
                      <p key={line} className="pdc-subway-line">
                        🚇 {line}
                      </p>
                    ))}
                  </div>
                ) : null}
                {model.nameEn && model.pronunciation && !model.isSubway ? (
                  <p className="pdc-pronunciation">Pronunciation: {model.pronunciation}</p>
                ) : null}
                {model.showSpokenAsTitle ? (
                  <>
                    <h2 id="pdc-place-title" className="pdc-name-primary">
                      {model.pronunciation}
                    </h2>
                    <button
                      type="button"
                      className={`pdc-name-sub${copyFlash === 'ko' ? ' pdc-name-sub--flash' : ''}`}
                      onClick={() => handleCopyName('ko', model.nameKo)}
                    >
                      {model.nameKo}
                    </button>
                  </>
                ) : null}
                {model.nameKo && !model.nameEn && !model.showSpokenAsTitle ? (
                  <button
                    type="button"
                    className={`pdc-name-primary pdc-name-primary--copy${copyFlash === 'ko' ? ' pdc-name-sub--flash' : ''}`}
                    id="pdc-place-title"
                    onClick={() => handleCopyName('ko', model.nameKo)}
                  >
                    {model.nameKo}
                  </button>
                ) : null}
                {!model.nameKo && !model.nameEn ? (
                  <p id="pdc-place-title" className="pdc-name-primary pdc-name-primary--empty">
                    —
                  </p>
                ) : null}
              </div>
              {model.floorLabel ? (
                <p className="pdc-floor">
                  <span className="pdc-floor-label">Floor</span>
                  <span className="pdc-floor-value">{model.floorLabel}</span>
                </p>
              ) : null}
              {model.address ? <p className="pdc-address">{model.address}</p> : null}
            </header>

            {kind !== 'planning' && featuredCollections.length > 0 ? (
              <section className="pdc-featured" aria-labelledby="pdc-featured-heading">
                <h3 id="pdc-featured-heading" className="pdc-featured-title">
                  Featured in
                </h3>
                <ul className="pdc-featured-list">
                  {featuredCollections.map((collection) => {
                    const typeMeta = getCollectionTypeMeta(collection.type)
                    const itemClass = 'pdc-featured-item'
                    const inner = (
                      <>
                        <span
                          className={`pdc-featured-type pdc-featured-type--${typeMeta.type}`}
                        >
                          {typeMeta.icon} {typeMeta.label}
                        </span>
                        <span className="pdc-featured-name">{collection.title}</span>
                      </>
                    )
                    return (
                      <li key={collection.id ?? collection.title}>
                        {collection.href ? (
                          <Link
                            to={collection.href}
                            className={itemClass}
                            onClick={() => onFeaturedCollectionSelect?.(collection.title)}
                          >
                            {inner}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            className={itemClass}
                            onClick={() => onFeaturedCollectionSelect?.(collection.title)}
                          >
                            {inner}
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}

            <div className="pdc-actions">
              <div className="pdc-action-btn" title={model.categoryLabel} style={{ cursor: 'default' }}>
                <span className="pdc-action-icon" aria-hidden>
                  {model.isSubway ? '🚇' : '🏷️'}
                </span>
                <span className="pdc-action-label pdc-action-label--category">{model.categoryLabel}</span>
              </div>
              <button
                type="button"
                className="pdc-action-btn"
                aria-pressed={isSaved}
                onClick={onToggleSave}
              >
                <span className="pdc-action-icon" aria-hidden>
                  {isSaved ? '♥' : '♡'}
                </span>
                <span>{isSaved ? 'Saved' : 'Save'}</span>
              </button>
              <a className="pdc-action-btn" href={mapHref} target="_blank" rel="noreferrer">
                <span className="pdc-action-icon" aria-hidden>
                  🗺️
                </span>
                <span>Kakao Map</span>
              </a>
            </div>

            {model.hasDriver && onShowDriver ? (
              <button type="button" className="pdc-driver-btn" onClick={onShowDriver}>
                <span className="pdc-driver-icon" aria-hidden>
                  🚕
                </span>
                <span>Show address to taxi driver</span>
              </button>
            ) : null}

            {isAdmin && (onToggleHideFromSearch || onTogglePartner || (canCurate && onEditCuration)) ? (
              <div className="pdc-admin-tools">
                <span className="pdc-admin-tools-label">Admin controls</span>
                {canCurate && onEditCuration ? (
                  <button
                    type="button"
                    className={`pdc-admin-btn pdc-admin-btn--curation${curationHasContent ? ' pdc-admin-btn--on' : ''}`}
                    onClick={onEditCuration}
                  >
                    {curationHasContent ? '✎ Edit guide' : '✎ Add guide'}
                  </button>
                ) : null}
                {onTogglePartner ? (
                  <button
                    type="button"
                    className={`pdc-admin-btn pdc-admin-btn--partner${isPartner ? ' pdc-admin-btn--on' : ''}`}
                    onClick={onTogglePartner}
                  >
                    {isPartner ? '★ Remove partner' : '☆ Make partner'}
                  </button>
                ) : null}
                {onToggleHideFromSearch ? (
                  <button
                    type="button"
                    className={`pdc-admin-btn${isHiddenFromSearch ? ' pdc-admin-btn--on' : ''}`}
                    onClick={onToggleHideFromSearch}
                  >
                    {isHiddenFromSearch ? 'Show pin' : 'Hide pin'}
                  </button>
                ) : null}
              </div>
            ) : null}

            <section className="pdc-section" aria-labelledby="pdc-info-heading">
              <h3 id="pdc-info-heading">About this place</h3>
              {isPremium && partnerPerk ? (
                <div className="pdc-perk" role="note">
                  <span className="pdc-perk-tag" aria-hidden>
                    🎁 Partner perk
                  </span>
                  <p className="pdc-perk-text">{partnerPerk}</p>
                </div>
              ) : null}
              <p>{model.memo || 'No description available.'}</p>
            </section>

            {showCuration ? (
              <section className="pdc-section pdc-curation" aria-labelledby="pdc-curation-heading">
                <div className="pdc-curation-head">
                  <h3 id="pdc-curation-heading">
                    <span className="pdc-curation-star" aria-hidden>
                      ✦
                    </span>
                    Curator&apos;s guide
                  </h3>
                  {isAdmin && onEditCuration ? (
                    <button type="button" className="pdc-curation-edit" onClick={onEditCuration}>
                      {curationHasContent ? 'Edit' : 'Add'}
                    </button>
                  ) : null}
                </div>
                {curationRows.length > 0 ? (
                  <dl className="pdc-curation-list">
                    {curationRows.map((row) => (
                      <div key={row.key} className="pdc-curation-item">
                        <dt>{row.label}</dt>
                        <dd>{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="pdc-muted">No curator notes yet. Tap “Add” to write the guide.</p>
                )}
              </section>
            ) : null}

            <section className="pdc-section" aria-labelledby="pdc-comments-heading">
              <div className="pdc-comments-head">
                <h3 id="pdc-comments-heading">
                  Comments ({comments.length})
                </h3>
              </div>

              <form className="pdc-form" onSubmit={handleSubmit}>
                <div className="pdc-row2">
                  <div className="pdc-nick-wrap">
                    <input
                      className="pdc-input"
                      value={nick}
                      onChange={(e) => setNick(e.target.value)}
                      placeholder="Nickname"
                      maxLength={40}
                      autoComplete="nickname"
                    />
                    <button
                      type="button"
                      className="pdc-shuffle"
                      onClick={() => setNick(randomNickname())}
                      title="Random nickname"
                      aria-label="Random nickname"
                    >
                      🔀
                    </button>
                  </div>
                  <input
                    className="pdc-input"
                    type="password"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    placeholder="Password (for delete)"
                    maxLength={64}
                    autoComplete="new-password"
                  />
                </div>
                <textarea
                  className="pdc-textarea"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write a comment…"
                  maxLength={2000}
                />
                <div className="pdc-submit-row">
                  <button type="submit" className="pdc-submit" disabled={submitting}>
                    Post
                  </button>
                </div>
              </form>

              <div className="pdc-comment-list">
                {comments.length === 0 ? (
                  <p className="pdc-muted">No comments yet. Be the first.</p>
                ) : (
                  comments
                    .slice()
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .map((c) => (
                      <article key={c.id} className="pdc-comment">
                        <div className="pdc-comment-top">
                          <span className="pdc-comment-author">{c.nickname}</span>
                          <time className="pdc-comment-time" dateTime={new Date(c.createdAt).toISOString()}>
                            {formatRelativeEn(c.createdAt)}
                          </time>
                        </div>
                        <p className="pdc-comment-body">{c.body}</p>
                        <div className="pdc-comment-actions">
                          <button type="button" className="pdc-delete" onClick={() => handleDelete(c.id)}>
                            Delete
                          </button>
                        </div>
                      </article>
                    ))
                )}
              </div>
            </section>

            {kind === 'planning' ? (
              <footer className="pdc-photo-credit-footer">
                <PlaceImageCredit asset={model.imageCreditAsset} isNoImage={model.isNoImage} />
              </footer>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}
