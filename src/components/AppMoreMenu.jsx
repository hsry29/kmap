import { useEffect, useId, useRef, useState } from 'react'
import './AppMoreMenu.css'

/**
 * ☰ More 메뉴 — Login/Admin 등 저빈도 기능.
 */
export function AppMoreMenu({ isAdmin, adminEnabled, onLogin, onLogout }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) {
      return undefined
    }
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const handleLogin = () => {
    setOpen(false)
    onLogin?.()
  }

  const handleLogout = () => {
    setOpen(false)
    onLogout?.()
  }

  const handleSettings = () => {
    setOpen(false)
    window.alert('Settings are coming soon.')
  }

  const handleAbout = () => {
    setOpen(false)
    window.alert(
      'KMap\n\nA Seoul exploration map for international visitors.\n\n· Spots — curated spots to discover\n· Places — food, transit & essentials nearby\n· Routes — step-by-step travel courses',
    )
  }

  return (
    <div className="app-more-menu" ref={rootRef}>
      <button
        type="button"
        className={open ? 'app-more-trigger open' : 'app-more-trigger'}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Menu"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="app-more-icon" aria-hidden="true">
          ☰
        </span>
        <span className="app-more-label">Menu</span>
      </button>

      {open ? (
        <div id={menuId} className="app-more-panel" role="menu" aria-label="More options">
          {isAdmin ? (
            <button type="button" className="app-more-item" role="menuitem" onClick={handleLogin}>
              Admin panel
            </button>
          ) : (
            <button type="button" className="app-more-item" role="menuitem" onClick={handleLogin}>
              Login
              {!adminEnabled ? <span className="app-more-hint">Not configured</span> : null}
            </button>
          )}
          {isAdmin ? (
            <button type="button" className="app-more-item" role="menuitem" onClick={handleLogout}>
              Log out
            </button>
          ) : null}
          <button type="button" className="app-more-item" role="menuitem" onClick={handleSettings}>
            Settings
          </button>
          <button type="button" className="app-more-item" role="menuitem" onClick={handleAbout}>
            About KMap
          </button>
          <a
            href="https://ko-fi.com/k_map"
            target="_blank"
            rel="noopener noreferrer"
            className="app-more-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            ☕ Support KMap
          </a>
        </div>
      ) : null}
    </div>
  )
}
