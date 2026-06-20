import './ContentStatusBanner.css'

/**
 * Non-blocking content bootstrap banner (loading / error / empty).
 * Map and app shell remain usable underneath.
 */
export function ContentStatusBanner({ bootstrap, emptyCollections, onRetry }) {
  if (!bootstrap) {
    return null
  }

  if (bootstrap.status === 'loading') {
    return (
      <div className="content-status-banner content-status-banner--loading" role="status" aria-live="polite">
        Loading content from server…
      </div>
    )
  }

  if (bootstrap.status === 'error' && bootstrap.errors?.length) {
    const detail = bootstrap.errors.map((e) => e.message).join(' · ')
    return (
      <div className="content-status-banner content-status-banner--error" role="alert">
        <span>Could not refresh content. Using cached or empty data.</span>
        {detail ? <span className="content-status-banner-detail">{detail}</span> : null}
        {onRetry ? (
          <button type="button" className="content-status-banner-retry" onClick={onRetry}>
            Retry
          </button>
        ) : null}
      </div>
    )
  }

  if (bootstrap.status === 'ready' && bootstrap.syncEnabled && emptyCollections) {
    return (
      <div className="content-status-banner content-status-banner--empty" role="status">
        No spot or route collections published yet. Check Supabase{' '}
        <code className="content-status-banner-code">app_config.collections</code>.
      </div>
    )
  }

  if (bootstrap.status === 'ready' && bootstrap.errors?.length) {
    return (
      <div className="content-status-banner content-status-banner--warn" role="status">
        Some content could not be loaded. The map may show partial data.
      </div>
    )
  }

  return null
}

export default ContentStatusBanner
