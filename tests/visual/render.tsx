/** Automated visual inspection fixture only. Not a production entry point. */
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../src/App'
import { ApiClient } from '../../src/api/client'
import { SessionContext } from '../../src/auth/context'
import { SessionStore } from '../../src/auth/session'
import { application, approved, identity, invitation, json, login, onboarding } from '../fixtures'
import '../../src/styles.css'
import './visual.css'

// All requests in this automated test document stay mocked; never contact a real API.
window.fetch = async (input) => {
  const url = String(input)
  if (url.endsWith('/auth/login')) return json(login)
  if (url.endsWith('/super-admin/identity')) return json(identity)
  if (url.endsWith('/admin/brand-applications'))
    return json([approved, { ...application, id: 8, brandName: 'Test Studio' }])
  if (url.endsWith('/onboarding')) return json(onboarding)
  if (url.includes('/invitations?'))
    return json({ content: [invitation], page: 0, size: 20, totalElements: 1 })
  return json({}, 409)
}
const store = new SessionStore(new ApiClient('https://visual-test.example.invalid/api/v1'))
await store.login(login.account.email, 'visual-fixture-only', 'admin')
createRoot(document.getElementById('root')!).render(
  <SessionContext value={store}>
    <div role="status" className="visual-test-banner">
      Automated visual test · synthetic records · no live backend
    </div>
    <MemoryRouter initialEntries={['/overview']}>
      <App />
    </MemoryRouter>
  </SessionContext>,
)
