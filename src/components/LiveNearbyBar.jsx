import { useMemo } from 'react'
import { getNearbyLiveGroupForTab, NEARBY_LIVE_GROUPS } from '../data/nearbyLiveTypes'
import './LiveNearbyBar.css'

/**
 * Live 모드 주변 카테고리 — 그룹 + 하위 칩.
 */
export function LiveNearbyBar({ activeTab, onSelectTab }) {
  const activeGroup = useMemo(() => getNearbyLiveGroupForTab(activeTab), [activeTab])

  const handleGroupClick = (group) => {
    const isActiveGroup = activeGroup?.id === group.id
    if (isActiveGroup && group.items.length > 1) {
      return
    }
    onSelectTab?.(group.items[0].id)
  }

  return (
    <section className="live-nearby" aria-label="Nearby categories">
      <div className="live-nearby-groups" role="tablist" aria-label="Category groups">
        {NEARBY_LIVE_GROUPS.map((group) => {
          const isActiveGroup = activeGroup?.id === group.id
          return (
            <button
              key={group.id}
              type="button"
              role="tab"
              aria-selected={isActiveGroup}
              className={isActiveGroup ? 'live-nearby-group active' : 'live-nearby-group'}
              onClick={() => handleGroupClick(group)}
            >
              <span className="live-nearby-group-icon" aria-hidden="true">
                {group.icon}
              </span>
              <span>{group.label}</span>
            </button>
          )
        })}
      </div>

      {activeGroup && activeGroup.items.length > 1 ? (
        <div className="live-nearby-subs" role="tablist" aria-label={`${activeGroup.label} types`}>
          {activeGroup.items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={activeTab === item.id}
              className={activeTab === item.id ? 'live-nearby-sub active' : 'live-nearby-sub'}
              onClick={() => onSelectTab?.(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
