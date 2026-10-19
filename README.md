# Brandista Administration

React / TypeScript / Vite administration web application for the existing Brandista Spring Boot backend. This is a separate application from the customer web and mobile repositories.

## Windows development

Use Node 24 (declared supported engines also accept current compatible Node 22/26). No global npm package install is needed.

```powershell
Set-Location 'D:\Brandista Workplace\brandista-admin'
npm ci
if (-not (Test-Path -LiteralPath '.env.local')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env.local'
}
notepad .env.local
npm run dev
```

Open `http://localhost:5174`. The development server binds only to loopback. If the backend runs on another local port (for example 8083), set `VITE_API_BASE_URL=http://localhost:8083/api/v1` in the ignored `.env.local`, then restart Vite. HTTPS is required for non-loopback API hosts; URLs containing credentials, query strings or fragments are rejected. `VITE_` values are public bundle configuration, never secrets.

The backend must allow the **exact browser origin**, for example `http://localhost:5174`, in its existing `CORS_ALLOWED_ORIGINS` configuration. `http://127.0.0.1:5174` is a different origin. No Vite proxy bypasses backend CORS. Do not use wildcard CORS or change backend authorization to make this application work. This PR does not modify backend configuration, start its services, provision accounts, deliver real invitations or mutate real data.

Use an already-authorized account in an explicitly isolated development environment. There are no bundled users, default passwords, public super-admin signup, production login mocks or token fixtures in application code. No real account is created by these commands. Follow authorized backend operator procedures separately when account provisioning is required.

## Implemented screens

- Login with explicit super-admin or merchant workspace selection.
- Super-admin overview with counts derived from actual application records.
- Application list with search/status filters, detail and review (approve, reject, request information).
- Application onboarding, invitation list/pagination, create/revoke/reissue, and eligibility-controlled brand activation.
- Read-only merchant assigned-brand foundation with isolated navigation.
- Responsive shell, account display, loading/empty/errors, confirmation panels, expiry and sign-out.

Super-admin access is verified through `/super-admin/identity` after login; the login account's `role` string is not authority. Merchant access is verified separately through `/merchant/brands`. A merchant does not gain access to administration pages even by typing a privileged URL. Actual authorization and race-sensitive eligibility checks always remain on the backend.

The original approved logo is copied **byte-for-byte** from the official mobile repository. See [logo provenance](docs/LOGO.md); no substitute or derivative was generated.

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
```

Preview binds to loopback port 4174; configure that exact CORS origin if testing it with a backend. Production build output is `dist/`. CI runs the same lint/typecheck/test/build checks on Node 24. Tests use mocked network responses and synthetic `example.invalid` identities only. Runtime code has no mock server or sample account mode.

For automated visual inspection, `tests/visual/index.html` is a separate development-only test document with a visible fixture banner and mocked requests. It is not a production entry point and is excluded from `dist/`. Serve only `dist/` in production, never the repository source tree.

## Integration and production limits

Read [API contracts](docs/BACKEND-CONTRACT.md) and [security and deployment](docs/SECURITY.md) before deploying. Backend contract baseline: merged PR4, `brandista-mvp` commit `c5c11b9a828a2b72512cd4207ca17fd301a002c0`.

Production invitation delivery must be configured separately on the backend. A 503 is surfaced as unavailable, with no claim that delivery succeeded. Recipient email comes only from the approved application; no recipient override or invitation-token input/output exists here.

This foundation does **not** implement invitation acceptance, account provisioning, administrator grant management, complete merchant catalogue/order screens, a delivery provider, refresh-token sessions, cross-tab logout, server-side session revocation, or a production deployment. An INACTIVE brand awaiting acceptance may not appear in the merchant list until activation; the super-admin onboarding screen handles that transition.

Reloading a tab deliberately loses the in-memory bearer token and requires sign-in again. Signing out clears this browser session but does not revoke the JWT on the backend. Production operational acceptance still needs an approved environment, accounts, HTTPS/CORS/headers, delivery adapter, and manual browser/device/accessibility verification; passing isolated tests does not establish those.
