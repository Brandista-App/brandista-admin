# PR7B — merchant order management

Backend reference: merged PR7A (#26), backend main `4c7d09cd58337d3cc5c3a5a29b270e33a3b02354`.
Implementation is limited to brandista-admin; no backend or customer application changes and no persistent acceptance database access.

## Screens and real contracts

The existing merchant workspace adds an Orders tab:

- `/brands/:brandId/orders`: selected-brand reference/date/status, brand items subtotal, order-line count, available next action links, server pagination and fulfillment-status filter.
- `/brands/:brandId/orders/:orderId`: brand-owned snapshots, quantities, unit/line prices, brand items subtotal, authorized delivery information, per-brand timeline and confirmed next transition.

Existing authenticated API infrastructure calls:

| Method | API path under /api/v1                                       | Contract                                                |
| ------ | ------------------------------------------------------------ | ------------------------------------------------------- |
| GET    | /merchant/brands/{brand}/orders?page=0&size=20&status=PLACED | PR7A Page of Summary; status omitted for all statuses   |
| GET    | /merchant/brands/{brand}/orders/{id}                         | PR7A Detail: order, deliveryAddress, items, timeline    |
| POST   | /merchant/brands/{brand}/orders/{id}/fulfillment             | status and expectedVersion only; returns updated Detail |

No fake runtime data or fallback is used in production. Matching-order counts come only from the API's filtered totalElements, not invented aggregate metrics. lineCount is labelled order lines, not quantity sum. PKR uses the existing shared two-decimal formatter, including zero/fractional/large supported values. Dates retain the backend's UTC convention.

## Fulfillment and conflicts

The backend supports PLACED → ACCEPTED → PACKED → SHIPPED → DELIVERED. The UI renders only returned availableTransitions, additionally rejecting unexpected nonadjacent values. The native modal dialog traps focus, initially focuses cancellation, supports Escape while idle and requires explicit confirmation. Request state uses the displayed version. An immediate ref guard plus disabled controls prevents duplicate submissions while pending.

Success reloads authoritative detail/timeline. HTTP409 closes confirmation, clears stale detail during refresh, shows a conflict notice, and requires a new confirmation using the freshly read version. Other failures use sanitized existing API messages; backend bodies are never echoed. A transport failure can leave the operation's outcome uncertain: refresh before retrying; the backend's version fencing prevents an old-version duplicate from advancing fulfillment twice. Do not assume a network error means rollback.

## Tenant and session boundaries

Existing assignment verification gates the workspace; backend authorization remains authoritative on every operation. URLs always include the selected brand. Summaries and all returned lines must match that brand, and details must match the requested order ID before rendering. No other brand's lines or customer account ID/email/global payment totals are displayed. Only explicit authorized delivery fields are rendered; arbitrary response properties are not dumped into the page.

Switching brands from an order route returns to the new brand's Orders list and remounts state. Order IDs also key detail components. Confirmation, notices, errors and old delivery/item data clear. Existing resource cancellation ignores late responses after navigation. No order data is stored in browser persistence. Existing in-memory SessionStore clears sessions and privileged content on401/403; disabled, revoked and inactive access follows that behavior. An account without active assignments cannot create a merchant session; super-admin mode does not substitute for merchant membership. Existing catalogue and super-admin functionality remains in place.

## Financial and unsupported operations

itemsSubtotal means this brand's snapshot line amount. It is neither customer grand total nor merchant payout or amount to collect. Fulfillment sends no price, payment, inventory, tenant or customer-account field. DELIVERED is a merchant attestation, not payment settlement or verified carrier delivery. Cancellation, rejection, returns, refunds, restocking, partial shipments, courier booking, tracking and payment collection are unsupported. No controls imply those capabilities.

## Local checks and visual testing

Use the repository-supported Node version and existing npm setup:

```powershell
npm run format:check
npm run lint
npm run typecheck
npm test -- --maxWorkers=1 --reporter=dot
npm run build
npm audit
```

All frontend mutation tests are mocked. tests/orders.test.tsx covers server pagination/filtering, detail/PKR amounts, confirmations, transitions, version409 refresh, duplicate protection, tenant response rejection, unauthorized/disabled/revoked handling, unassigned/customer denial, brand changes and late responses. Existing merchant and app tests provide catalogue and super-admin regression coverage. This is not live backend acceptance.

The explicitly labelled synthetic preview is `/tests/visual/orders.html` (list) or `/tests/visual/orders.html?detail=1` (detail) on an isolated local Vite server. It mocks every API read/mutation and uses example.invalid identities; it never contacts a real backend/database. Production Vite builds include only the normal application entry, not these test pages. Browser verification should inspect desktop and narrow mobile layouts, scrollable labelled tables, delivery/timeline stacking and native confirmation behavior. Browser viewport overrides must be reset after inspection.

For later real local acceptance, obtain separate authorization and verify the PR7A database migration/artifact and synthetic orders first. Do not point this development task at the retained PR5/PR6 database or silently apply V14 to it. Production rollout and backend migration are separate owner-controlled actions.
