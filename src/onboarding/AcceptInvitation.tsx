import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { errorMessage } from '../api/client'
import type { Acceptance } from './accept'

type Preview = {
  brandName: string
  recipientEmail: string
  expiresAt: string
  termsVersion: string
  existingAccount: boolean
}
export function AcceptInvitation() {
  const { store, session } = useAuth()
  const [token, setToken] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get('token') || '',
  )
  const [preview, setPreview] = useState<Preview | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [terms, setTerms] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [accepted, setAccepted] = useState<Acceptance | null>(null)
  const pending = useRef(false)
  useEffect(() => {
    if (window.location.hash)
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }, [])
  async function verify(event: FormEvent) {
    event.preventDefault()
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      setPreview(
        await store.client.request<Preview>('/merchant-registration/verify', null, {
          method: 'POST',
          body: JSON.stringify({ token }),
          signal: AbortSignal.timeout(20000),
        }),
      )
    } catch {
      setError(
        'This invitation could not be verified. It may be expired, revoked, or already used. Ask Brandista for a new link, or try again if the connection failed.',
      )
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!preview || pending.current) return
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }
    if (!terms) {
      setError('Please read and accept the merchant terms.')
      return
    }
    pending.current = true
    setBusy(true)
    setError('')
    const secret = password
    setPassword('')
    setConfirmPassword('')
    try {
      setAccepted(
        await store.client.request<Acceptance>('/merchant-registration/complete', null, {
          method: 'POST',
          signal: AbortSignal.timeout(20000),
          body: JSON.stringify({
            token,
            email: preview.recipientEmail,
            password: secret,
            termsAccepted: true,
            termsVersion: preview.termsVersion,
          }),
        }),
      )
      setToken('')
      setPreview(null)
    } catch (failure) {
      setError(
        errorMessage(failure) +
          ' If the request timed out, try merchant sign-in before retrying. Existing account passwords are never reset by this form.',
      )
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return (
    <main className="public-workspace">
      <header className="public-header">
        <Link to="/login">
          <img src="/brandista-approved-logo.jpeg.jpeg" alt="Brandista" />
        </Link>
        <span>MERCHANT PARTNERSHIPS</span>
      </header>
      <section className="panel onboarding-panel">
        <span className="eyebrow">WELCOME TO BRANDISTA</span>
        <h1>{accepted ? 'Your merchant account is ready.' : 'Activate your merchant account.'}</h1>
        {session ? (
          <div className="notice">
            <p>Sign out of your workspace before accepting an invitation.</p>
            <button className="button primary" onClick={() => store.logout('You have signed out.')}>
              Sign out of workspace
            </button>
          </div>
        ) : accepted ? (
          <div role="status">
            <p>
              Your account has access to brand #{accepted.brandId}. Sign in and select “Merchant ·
              assigned brands” to manage your catalogue.
            </p>
            <Link className="button primary" to="/login">
              Continue to merchant sign-in
            </Link>
          </div>
        ) : !preview ? (
          <form onSubmit={(event) => void verify(event)}>
            <p>
              Your application has been approved. Verify your private invitation to continue. Links
              expire after 48 hours.
            </p>
            <fieldset disabled={busy}>
              <label htmlFor="invitation-token">Invitation secret</label>
              <input
                id="invitation-token"
                type="password"
                autoComplete="off"
                required
                pattern="[A-Za-z0-9_-]{43}"
                value={token}
                onChange={(event) => setToken(event.target.value.trim())}
              />
              <button className="button primary" type="submit">
                {busy ? 'Verifying…' : 'Verify invitation'}
              </button>
            </fieldset>
          </form>
        ) : (
          <form onSubmit={(event) => void submit(event)}>
            <h2>{preview.brandName}</h2>
            <p>
              Invited email: <strong>{preview.recipientEmail}</strong>
            </p>
            <p>
              Expires{' '}
              {new Date(
                preview.expiresAt.endsWith('Z') ? preview.expiresAt : preview.expiresAt + 'Z',
              ).toLocaleString()}
              .
            </p>
            <p>
              {preview.existingAccount
                ? 'Enter your existing Brandista password. This invitation adds your approved brand assignment without creating a duplicate account.'
                : 'Set a password for your new merchant account.'}
            </p>
            <fieldset disabled={busy}>
              <label htmlFor="merchant-password">
                {preview.existingAccount ? 'Existing account password' : 'Create password'}
              </label>
              <input
                id="merchant-password"
                type="password"
                autoComplete={preview.existingAccount ? 'current-password' : 'new-password'}
                required
                minLength={12}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <label htmlFor="merchant-password-confirm">Confirm password</label>
              <input
                id="merchant-password-confirm"
                type="password"
                autoComplete={preview.existingAccount ? 'current-password' : 'new-password'}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              <p className="muted">
                At least 12 characters and at most 72 UTF-8 bytes. Keep your password private.
              </p>
              <label className="check-line">
                <input
                  type="checkbox"
                  required
                  checked={terms}
                  onChange={(event) => setTerms(event.target.checked)}
                />{' '}
                I accept the{' '}
                <Link to="/merchant-terms" target="_blank" rel="noreferrer">
                  merchant terms
                </Link>{' '}
                ({preview.termsVersion}).
              </label>
              <button className="button primary full" type="submit">
                {busy ? 'Activating account…' : 'Accept terms and activate account'}
              </button>
            </fieldset>
          </form>
        )}
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        <p className="security-note">
          Your invitation is single-use and bound to your approved brand. We never save it or your
          password in browser storage. If you already accepted it, continue to sign-in.
        </p>
        <Link to="/login">Back to workspace sign-in</Link>
      </section>
    </main>
  )
}
