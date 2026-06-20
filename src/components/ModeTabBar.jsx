import { MODE_TAB_COPY } from '../data/modeTabCopy'
import './ModeTabBar.css'

const MODE_TABS = [
  { mode: 'explore', onClickProp: 'onSpotsClick' },
  { mode: 'routes', onClickProp: 'onRoutesClick' },
  { mode: 'places', onClickProp: 'onPlacesClick' },
]

/**
 * Spots / Routes / Places mode switcher.
 * Tab description toast is rendered by the parent (left search column).
 */
export function ModeTabBar({ mode, onSpotsClick, onRoutesClick, onPlacesClick, onTabToast, children }) {
  const handlers = {
    onSpotsClick,
    onRoutesClick,
    onPlacesClick,
  }

  return (
    <div className="mode-tab-bar">
      {MODE_TABS.map(({ mode: tabMode, onClickProp }) => {
        const copy = MODE_TAB_COPY[tabMode]
        const isActive = mode === tabMode
        return (
          <div key={tabMode} className="mode-tab-cell">
            <button
              type="button"
              className={isActive ? 'simple-btn active' : 'simple-btn'}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                onTabToast?.(tabMode)
                handlers[onClickProp]?.()
              }}
            >
              <span className="mode-tab-btn-icon" aria-hidden="true">
                {copy.icon}
              </span>
              {copy.label}
            </button>
          </div>
        )
      })}
      {children}
    </div>
  )
}

export default ModeTabBar
