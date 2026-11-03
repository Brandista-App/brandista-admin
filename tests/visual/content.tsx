/** Synthetic visual fixture, excluded from production build. */
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../src/App'
import { SessionContext } from '../../src/auth/context'
import { SessionStore } from '../../src/auth/session'
import { ApiClient } from '../../src/api/client'
import { identity, json, login } from '../fixtures'
import '../../src/styles.css'
import './visual.css'
window.fetch = async (input) => {
  const url = String(input)
  if (url.endsWith('/auth/login')) return json(login)
  if (url.endsWith('/identity')) return json(identity)
  if (url.endsWith('/brands'))
    return json([
      { id: 1, name: 'Studio Noor' },
      { id: 2, name: 'The Local Edit' },
    ])
  if (url.includes('/categories')) return json({ content: [], totalPages: 1 })
  return json({
    version: 12,
    draft: {
      banners: [],
      sections: [
        { key: 'HERO', enabled: true },
        { key: 'COLLECTIONS', enabled: true },
        { key: 'BRANDS', enabled: true },
        { key: 'PRODUCTS', enabled: false },
      ],
      brandIds: [1, 2],
      collectionIds: [],
    },
    published: { banners: [], sections: [], brandIds: [], collectionIds: [] },
  })
}
const store = new SessionStore(new ApiClient('https://visual.example.invalid/api/v1'))
await store.login(login.account.email, 'synthetic-preview', 'admin')
createRoot(document.getElementById('root')!).render(
  <SessionContext value={store}>
    <div className="visual-test-banner">Preview · synthetic content · no live backend</div>
    <MemoryRouter
      initialEntries={[
        '/content/' + (new URLSearchParams(location.search).get('tab') ?? 'dashboard'),
      ]}
    >
      <App />
    </MemoryRouter>
  </SessionContext>,
)
