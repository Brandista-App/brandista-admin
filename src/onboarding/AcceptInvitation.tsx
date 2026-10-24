import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { errorMessage } from '../api/client'
import { acceptBrandInvitation, type Acceptance } from './accept'
export function AcceptInvitation() {
  const { store, session } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [createAccount, setCreateAccount] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [accepted, setAccepted] = useState<Acceptance | null>(null)
  const request = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      request.current?.abort()
    }
  }, [])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setError('')
    const input = { email, password, token, createAccount }
    setPassword('')
    setToken('')
    const timeout = setTimeout(() => controller.abort(), 20000)
    try {
      const result = await acceptBrandInvitation(store.client, input, controller.signal)
      if (!controller.signal.aborted) setAccepted(result)
    } catch (failure) {
      if (!mounted.current) return
      if (!controller.signal.aborted) setError(errorMessage(failure))
      else
        setError(
          'The request timed out or was cancelled. Ask your operator to check invitation status before retrying.',
        )
    } finally {
      clearTimeout(timeout)
      request.current = null
      if (mounted.current) setBusy(false)
    }
  }
  return (
    <main className="public-workspace">
      <header className="public-header">
        <Link to="/login">
          <img src="/brandista-approved-logo.jpeg.jpeg" alt="Brandista" />
        </Link>
        <Link to="/presentation">Marketplace presentation guide</Link>
      </header>
      <section className="panel onboarding-panel">
        <span className="eyebrow">YOUR BRAND JOURNEY</span>
        <h1>Accept your invitation.</h1>
        <p>
          Use the approved application's contact email and the secret delivered by your authorized
          Brandista operator. Acceptance establishes the invited membership; the operator activates
          the brand separately.
        </p>
        {session ? (
          <div className="notice">
            <p>
              Sign out of your current workspace before accepting an invitation for another
              identity.
            </p>
            <button
              className="button primary"
              onClick={() =>
                store.logout('Workspace signed out. Continue with the invited identity.')
              }
            >
              Sign out of workspace
            </button>
          </div>
        ) : accepted ? (
          <div role="status" className="notice">
            <h2>Invitation accepted</h2>
            <p>
              Brand #{accepted.brandId} membership was accepted by the backend. Ask your operator to
              activate the brand, then choose “Merchant · assigned brands” at sign-in.
            </p>
            <Link className="button primary" to="/login">
              Continue to workspace sign-in
            </Link>
          </div>
        ) : (
          <form onSubmit={(event) => void submit(event)}>
            <fieldset disabled={busy}>
              <label htmlFor="invited-email">Invited email</label>
              <input
                id="invited-email"
                type="email"
                autoComplete="username"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label htmlFor="recipient-password">Recipient account password</label>
              <input
                id="recipient-password"
                type="password"
                autoComplete={createAccount ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label className="check-line">
                <input
                  type="checkbox"
                  checked={createAccount}
                  onChange={(e) => setCreateAccount(e.target.checked)}
                />
                Create a new customer identity for this invited email first
              </label>
              <p className="muted">
                Existing accounts: leave this unchecked. New passwords: at least 12 characters, at
                most 72 UTF-8 bytes. Creating an identity does not grant brand or platform access by
                itself.
              </p>
              <label htmlFor="invitation-secret">Invitation secret</label>
              <input
                id="invitation-secret"
                type="password"
                autoComplete="off"
                spellCheck={false}
                required
                maxLength={256}
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              {error && (
                <p role="alert" className="notice error">
                  {error}
                </p>
              )}
              <button className="button primary full" type="submit">
                {busy ? 'Verifying invitation…' : 'Verify identity and accept invitation'}
              </button>
            </fieldset>
          </form>
        )}
        <p className="security-note">
          Secrets are used only for this acceptance attempt, never read from URLs or saved in
          browser storage. If registration succeeds but a later step fails, use the existing-account
          option on retry. Lost, expired or rejected invitation? Ask your operator for a status
          check or reissue. Production email delivery requires a configured provider.
        </p>
        <Link to="/login">Back to workspace sign-in</Link>
      </section>
    </main>
  )
}
