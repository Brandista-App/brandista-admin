# PR6 — Merchant catalogue and inventory

Sign in with **Merchant · assigned brands**. Choose **Manage catalogue** on an assigned brand. The workspace rechecks `/merchant/brands`; a typed URL cannot select an unassigned brand. A selector appears for multiple assignments and clears the prior brand's page/drafts when switching.

## Workflow

1. Overview shows the backend's brand product total. Stock units and low/out-of-stock counts describe **only the current page**, including drafts/deactivated records. Low stock is a presentation threshold of 1–5 units, not a reorder policy.
2. Products and Inventory list 50 products per backend page. Search (name, slug, category), publication and stock filters apply to that page, with explicit pagination. They do not imply server-wide search.
3. Add a product using an active public category, name, unique slug, description, price in PKR and availability. Creation produces a DRAFT with zero stock. Brand ID is fixed by the route and cannot be edited; stock is not submitted with metadata.
4. Open a product to inspect details, edit metadata, manage publication or update inventory. Publish, unpublish and permanent deactivation require explicit confirmation. Deactivated products cannot be edited, restocked or republished through the current backend.
5. Inventory's Update stock link opens the product's stock form. Enter an **absolute total**, not a delta. The form re-reads stock before PUT and rejects a changed baseline. Refresh the product and reconsider the intended quantity after a conflict. A successful update is confirmed only after the backend response and automatically reloads the product; Refresh product also reads the latest quantity.

## Inspected backend contract

Reference: `brandista-mvp` main `c5c11b9a828a2b72512cd4207ca17fd301a002c0`. All paths relative to `/api/v1`. Merchant operations use current database-backed account/membership/ACTIVE-brand checks, not JWT tenant or role claims. The shared product service is reached through the authorized merchant facade only.

| Method | Path                                                | Contract                                                            |
| ------ | --------------------------------------------------- | ------------------------------------------------------------------- |
| GET    | `/merchant/brands`                                  | Authorized active assignments only                                  |
| GET    | `/merchant/brands/{brand}/products?page=0&size=50`  | `{content,page,size,totalElements,totalPages}`; name/id ordering    |
| GET    | `/merchant/brands/{brand}/products/{id}`            | Product detail; mismatched response brand fails closed in UI        |
| POST   | `/merchant/brands/{brand}/products`                 | Create metadata; response 201                                       |
| PUT    | `/merchant/brands/{brand}/products/{id}`            | Complete metadata update                                            |
| PATCH  | `/merchant/brands/{brand}/products/{id}/publish`    | No body                                                             |
| PATCH  | `/merchant/brands/{brand}/products/{id}/unpublish`  | No body                                                             |
| PATCH  | `/merchant/brands/{brand}/products/{id}/deactivate` | No body; permanent through current API                              |
| GET    | `/merchant/brands/{brand}/products/{id}/stock`      | `{productId,stockQuantity}`                                         |
| PUT    | `/merchant/brands/{brand}/products/{id}/stock`      | `{stockQuantity}` absolute integer total                            |
| GET    | `/categories?page=0&size=100`                       | Public active-category page; all category pages loaded for selector |

Metadata body: `{name,slug,description,brandId,categoryId,price,availability}`. Name trimmed/nonblank/max 150; slug lowercase alphanumeric words separated by single hyphens/max 160; description optional/max 4000; positive category ID; price nonnegative/up to 10 integer and 2 fractional digits; availability AVAILABLE or UNAVAILABLE. Stock 0–2147483647 integer. The browser supplements server validation and never substitutes for it. Duplicate slug, inactive category, deactivated record and other conflicts show sanitized backend-status guidance while retaining form input.

Product responses expose IDs/names, description, category, price/currency, availability, publication status, timestamps and stock quantity. There is **no product image/media field** to render. No fake image or upload control is provided. Public categories are a narrowly allowed read exception to the merchant-only session request guard; admin routes and category writes remain blocked.

## Security and verification

- Bearer sessions remain in memory; 401/403 ends the session and removes merchant content. Refresh/logout clears sessions as in PR5.
- Brand selector options come only from fresh assignments; each API request stays brand-scoped. No membership/provisioning API is added.
- Revoked/disabled membership and inactive-brand HTTP 403 fail closed. Backend checks are authoritative even when a previously loaded selector is stale.
- Product/stock writes never use global admin product endpoints. No mutations or new accounts were made in the existing PR5 acceptance database for PR6.
- Tests cover routes, selection, form validation, create/edit, pagination, stock conflicts, confirmation/lifecycle, response-brand mismatch, denied sessions and existing PR5/login workflows. Mocked denial tests establish frontend handling, not new evidence of real backend enforcement; PR5 acceptance and existing backend PR3 tests established that separately.
- `tests/visual/merchant.html` is a synthetic, mocked visual fixture excluded from the Vite production entry point. It cannot contact a real API.

## Backend gaps and limits (separate follow-ups)

- No variants, SKU/barcode, product images, media upload, bulk import/export or delete/restore API. These controls are intentionally absent.
- No category management route for merchants; operator must configure active categories. If the public list is empty, creation/editing is disabled with guidance. No made-up category IDs.
- No aggregate inventory endpoint or merchant server-side search/filter; current-page summaries/filters are labeled. Global analytics need backend support.
- No ETag/version/compare-and-set on metadata or stock PUT. The preflight stock read detects an already changed value but **is not atomic**; another writer or checkout between GET and PUT can still be overwritten. Coordinate stock edits; transactional optimistic concurrency is a backend follow-up. Metadata is also last-write-wins.
- Availability, publication and stock are distinct. Low-stock labels do not automatically unpublish/change availability.
- Order dashboards, fulfillment and customer storefront/mobile changes are outside this PR.

Local checks: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm audit --omit=dev`, `npm audit`. Existing CI runs formatting, lint, typecheck, tests, build and production dependency audit. No database is needed for frontend verification.
