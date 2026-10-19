import { useEffect, useState, type FormEvent } from 'react'
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useLocation,
} from 'react-router-dom'
import { errorMessage } from './api/client'
import { useAuth } from './auth/context'
import { Applications, ApplicationDetail, Overview, AssignedBrands } from './pages'

function Login() {
  const { store, session } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'admin' | 'merchant'>('admin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (session) return <Navigate to={session.mode === 'admin' ? '/overview' : '/brands'} replace />
  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const secret = password
    setPassword('')
    try {
      await store.login(email, secret, mode)
      navigate(mode === 'admin' ? '/overview' : '/brands', { replace: true })
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="login-layout">
      <section className="login-brand" aria-label="Brandista identity">
        <div className="eyebrow">BRANDISTA · OPERATIONS</div>
        <img
          className="login-logo"
          src="/brandista-approved-logo.jpeg.jpeg"
          alt="Brandista — Many brands. One destination."
        />
        <div>
          <span className="eyebrow">THE CONTROL CENTER</span>
          <h1>
            Thoughtful brands.
            <br />
            Confident operations.
          </h1>
          <p>
            A considered workspace for reviewing applications, welcoming partners, and growing
            Brandista.
          </p>
        </div>
        <span className="brand-footer">MANY BRANDS. ONE DESTINATION.</span>
      </section>
      <section className="login-panel">
        <div className="login-form">
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Enter your workspace</h2>
          <p className="muted">Sign in with your existing Brandista account.</p>
          {store.notice && !error && (
            <p role="status" className="notice">
              {store.notice}
            </p>
          )}
          {error && (
            <p role="alert" className="notice error">
              {error}
            </p>
          )}
          <form onSubmit={submit}>
            <fieldset disabled={busy}>
              <label htmlFor="workspace">Workspace</label>
              <select
                id="workspace"
                value={mode}
                onChange={(event) => setMode(event.target.value as 'admin' | 'merchant')}
              >
                <option value="admin">Super-admin administration</option>
                <option value="merchant">Merchant · assigned brands</option>
              </select>
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button className="button primary full" type="submit">
                {busy ? 'Verifying access…' : 'Sign in securely'}
                <span aria-hidden="true">↗</span>
              </button>
            </fieldset>
          </form>
          <p className="security-note">
            Access is verified by the backend. Sessions stay in this tab and end when you reload or
            sign out. This portal does not create administrator accounts.
          </p>
          <div className="login-help">
            <strong>Need access?</strong>
            <p>Contact your authorized Brandista operator.</p>
          </div>
        </div>
      </section>
    </main>
  )
}

function ProtectedShell() {
  const { store, session } = useAuth()
  const location = useLocation()
  useEffect(() => {
    if (session) {
      document.getElementById('main-content')?.focus({ preventScroll: true })
      window.scrollTo(0, 0)
    }
  }, [location.pathname, session])
  if (!session) return <Navigate to="/login" replace />
  return (
    <div className="app-layout" key={`${session.userId}:${session.mode}:${session.expiresAt}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link to="/" className="brand-lockup" aria-label="Brandista home">
          <img src="/brandista-approved-logo.jpeg.jpeg" alt="" />
          <span>
            BRANDISTA<small>CONTROL CENTER</small>
          </span>
        </Link>
        <span className="nav-caption">YOUR WORKSPACE</span>
        <nav aria-label="Main navigation">
          {session.mode === 'admin' ? (
            <>
              <NavLink to="/overview">
                <span aria-hidden="true">◫</span> Overview
              </NavLink>
              <NavLink to="/applications">
                <span aria-hidden="true">▤</span> Brand applications
              </NavLink>
            </>
          ) : (
            <NavLink to="/brands">
              <span aria-hidden="true">◫</span> Assigned brands
            </NavLink>
          )}
        </nav>
        <div className="sidebar-bottom">
          <span className="eyebrow">A SHARED STANDARD</span>
          <p>
            Many brands.
            <br />
            One destination.
          </p>
          <small>Brandista operations · v0.1</small>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <span className="workspace-label">
            {session.mode === 'admin' ? 'Administration' : 'Merchant workspace'}
          </span>
          <div className="account">
            <span>
              <strong>{session.email}</strong>
              <small>
                {session.mode === 'admin' ? 'Verified super-admin' : 'Assigned-brand access'} · #
                {session.userId}
              </small>
            </span>
            <button className="button text" onClick={() => store.logout('You have signed out.')}>
              Sign out
            </button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="page-footer">
          <span>BRANDISTA · CONTROL CENTER</span>
          <span>
            Session ends{' '}
            {new Date(session.expiresAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </footer>
      </div>
    </div>
  )
}
function AdminOnly() {
  const { session } = useAuth()
  return session?.mode === 'admin' ? (
    <Outlet />
  ) : (
    <section className="page">
      <span className="eyebrow">ACCESS RESTRICTED</span>
      <h1>Administration access required</h1>
      <p>Your merchant workspace does not provide access to administration pages.</p>
      <Link to="/brands">Return to assigned brands</Link>
    </section>
  )
}
function Home() {
  const { session } = useAuth()
  return <Navigate to={session?.mode === 'admin' ? '/overview' : '/brands'} replace />
}
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedShell />}>
        <Route index element={<Home />} />
        <Route element={<AdminOnly />}>
          <Route path="overview" element={<Overview />} />
          <Route path="applications" element={<Applications />} />
          <Route path="applications/:id" element={<ApplicationDetail />} />
        </Route>
        <Route path="brands" element={<AssignedBrands />} />
        <Route
          path="*"
          element={
            <section className="page">
              <h1>Page not found</h1>
              <Link to="/">Return to your workspace</Link>
            </section>
          }
        />
      </Route>
    </Routes>
  )
}
