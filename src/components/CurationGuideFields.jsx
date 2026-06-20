import { CURATION_FIELDS } from '../utils/adminCuration'
import { isRouteCollection } from '../utils/collectionTypes'
import './CurationGuideFields.css'

/**
 * 큐레이션 가이드 5필드 입력 폼(관리자 전용, 재사용).
 * @param {{ value: Record<string, string>, onChange: (key: string, value: string) => void, compact?: boolean, collectionType?: string }} props
 */
export function CurationGuideFields({ value, onChange, compact = false, collectionType = 'route' }) {
  const showNextStop = isRouteCollection({ type: collectionType })
  const fields = showNextStop
    ? CURATION_FIELDS
    : CURATION_FIELDS.filter((field) => field.key !== 'nextStop')

  return (
    <div className={compact ? 'cgf cgf--compact' : 'cgf'}>
      {fields.map((field) => (
        <label key={field.key} className="cgf-field">
          <span className="cgf-label">{field.label}</span>
          {field.hint ? <span className="cgf-hint">{field.hint}</span> : null}
          {field.multiline ? (
            <textarea
              className="cgf-input"
              rows={compact ? 2 : 3}
              value={value[field.key] ?? ''}
              placeholder={field.placeholder}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          ) : (
            <input
              className="cgf-input"
              type="text"
              value={value[field.key] ?? ''}
              placeholder={field.placeholder}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          )}
          {field.example ? (
            <span className="cgf-example">
              e.g. <em>{field.example}</em>
            </span>
          ) : null}
        </label>
      ))}
    </div>
  )
}

export default CurationGuideFields
