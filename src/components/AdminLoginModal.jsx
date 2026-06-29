import { useState } from 'react'
import { isAdminEnabled, loginAdmin, getAdminNotConfiguredMessage } from '../utils/adminAuth'
import './AdminLoginModal.css'

/**
 * @param {{ onClose: () => void, onSuccess: () => void }} props
 */
export function AdminLoginModal({ onClose, onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!isAdminEnabled()) {
      setError(getAdminNotConfiguredMessage())
      return
    }
    const result = loginAdmin(password)
    if (!result.ok) {
      setError(result.reason === 'badpassword' ? 'Wrong password.' : 'Could not sign in.')
      return
    }
    setPassword('')
    setError('')
    onSuccess()
  }

  return (
    <div className="admin-login-backdrop" onClick={onClose} role="presentation">
      <section
        className="admin-login-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-login-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="admin-login-title">Admin login</h2>
        <p className="admin-login-hint">Manage places hidden from search for all users.</p>
        <form onSubmit={handleSubmit}>
          <label className="admin-login-label" htmlFor="admin-password">
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            className="admin-login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {error ? <p className="admin-login-error">{error}</p> : null}
          <div className="admin-login-actions">
            <button type="button" className="admin-login-btn admin-login-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="admin-login-btn admin-login-btn--primary">
              Sign in
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
