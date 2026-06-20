import { getCollectionTypeMeta } from '../utils/collectionTypes'
import './CollectionPickModal.css'

/**
 * 한 장소가 여러 컬렉션에 속할 때 선택 모달.
 */
export function CollectionPickModal({ placeName, collections, onSelect, onClose }) {
  if (!collections?.length) {
    return null
  }

  return (
    <div className="col-pick-backdrop" role="presentation" onClick={onClose}>
      <section
        className="col-pick"
        role="dialog"
        aria-modal="true"
        aria-labelledby="col-pick-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="col-pick-title" className="col-pick-title">
          Choose a collection
        </h2>
        <p className="col-pick-sub">
          {placeName ? (
            <>
              <strong>{placeName}</strong> belongs to multiple collections.
            </>
          ) : (
            'This place belongs to multiple collections.'
          )}
        </p>
        <ul className="col-pick-list">
          {collections.map((col) => {
            const meta = getCollectionTypeMeta(col.type)
            return (
              <li key={col.id ?? col.title}>
                <button type="button" className="col-pick-item" onClick={() => onSelect?.(col.title)}>
                  <span className={`col-pick-type col-pick-type--${meta.type}`}>
                    {meta.icon} {meta.shortLabel}
                  </span>
                  <span className="col-pick-name">{col.title}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <button type="button" className="col-pick-cancel" onClick={onClose}>
          Cancel
        </button>
      </section>
    </div>
  )
}
