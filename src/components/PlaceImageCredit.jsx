import { formatImageCredit } from '../utils/imageAssets'

/**
 * @param {{ asset?: import('../utils/imageAssets').ImageAssetRow | null, isNoImage?: boolean }} props
 */
export function PlaceImageCredit({ asset, isNoImage = false }) {
  if (isNoImage) {
    return null
  }
  const credit = formatImageCredit(asset)
  if (!credit) {
    return null
  }

  const creditLine =
    credit.authorLine ||
    [credit.author, credit.source].filter(Boolean).join(' / ') ||
    ''

  return (
    <div className="pdc-photo-credit" aria-label="Photo credit">
      <p className="pdc-photo-credit-label">Photo credit:</p>
      {creditLine ? <p className="pdc-photo-credit-text">{creditLine}</p> : null}
      {credit.license ? <p className="pdc-photo-credit-license">({credit.license})</p> : null}
    </div>
  )
}

export default PlaceImageCredit
