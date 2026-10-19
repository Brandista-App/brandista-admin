import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ApiClient } from './api/client'
import { SessionStore } from './auth/session'
import { SessionContext } from './auth/context'
import { App } from './App'
import './styles.css'

const root = createRoot(document.getElementById('root')!)
try {
  const store = new SessionStore(
    new ApiClient(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'),
  )
  root.render(
    <StrictMode>
      <SessionContext value={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SessionContext>
    </StrictMode>,
  )
} catch {
  root.render(
    <main className="configuration-error">
      <h1>Configuration required</h1>
      <p>
        Set VITE_API_BASE_URL to the approved HTTPS backend ending in /api/v1. Loopback HTTP is
        allowed for local development.
      </p>
    </main>,
  )
}
