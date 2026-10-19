# PR5 delivery — Admin Control Center foundation

## Scope and repository

Implemented only in `Brandista-App/brandista-admin`, branch `codex/admin-pr5-control-center`, based on README-only initial main commit `8e8669c`. The repository was empty; that minimal baseline was published so GitHub could host a focused application PR against main. Backend, customer frontend and mobile source were inspected but not modified. No accounts were provisioned or real application records mutated.

Backend integration baseline: merged PR4 commit `c5c11b9a828a2b72512cd4207ca17fd301a002c0`. The existing backend remains the authorization source. No historical prototype token-persistence/authentication implementation was copied.

## Files and screens

- `src/App.tsx`: login, protected shell/sidebar/account, role-aware route boundaries, sign-out, keyboard focus and scroll reset.
- `src/pages.tsx`: overview, application list/search/filter/detail/review, invitations, onboarding/activation, assigned-brand foundation.
- `src/api/client.ts`, `src/api/types.ts`: typed API contracts, transport policy and safe error handling.
- `src/auth/session.ts`, `src/auth/context.ts`: verified capabilities, private in-memory bearer session, expiry and request/session race protection.
- `src/components.tsx`, `src/lib/*`: loading/error/status components, cancellation-safe resources and UTC date/ID handling.
- `src/main.tsx`, `src/styles.css`, `index.html`: app entry and responsive approved visual identity.
- `public/brandista-approved-logo.jpeg.jpeg`: unmodified official original; see `LOGO.md` for SHA-256/provenance.
- `tests/*`: API/session and user-flow tests plus an automated visual-only fixture. No runtime production mocks.
- Root package/lockfile, Vite, TypeScript, ESLint/Prettier configs and `.github/workflows/verify.yml`: reproducible checks; CI actions pinned to verified commit SHAs.
- `README.md`, `.env.example`, `docs/*`: Windows setup, integration contracts, security/deployment limitations and delivery notes.

Screen coverage: secure workspace login; real-data administration overview; applications list and detail; approve/reject/request-information review with confirmation; invitation list/create/revoke/reissue; onboarding eligibility and explicit activation; assigned active merchant brands. Complete merchant catalogue/order dashboards are intentionally not claimed.

## Endpoints

Integrated login POST `/auth/login`; GET `/super-admin/identity`; GET `/admin/brand-applications`; PATCH `/admin/brand-applications/{id}/review`; invitation list/create under `/super-admin/brand-applications/{id}/invitations`; POST revoke/reissue under `/super-admin/brand-invitations/{id}`; GET onboarding and POST activate under `/super-admin/brand-applications/{id}`; GET `/merchant/brands`. All are relative to `/api/v1`; full methods, DTOs and constraints are in `BACKEND-CONTRACT.md`. No single-application GET endpoint was invented.

Recipient is fixed to the approved application contact, with no recipient override or raw invitation-token input/output. Backend 503 delivery failures show safe unavailability and never a delivery-success claim. Frontend gating is supplementary; backend authorization, audit, eligibility and race/conflict enforcement remain authoritative.

## Verification, 19 October 2026

- `npm run format:check`: PASS.
- `npm run lint`: PASS, no errors or warnings.
- `npm run typecheck`: PASS.
- `npm test`: PASS, **63 tests across 2 files**, no failures. Standard reporter used for the final verified count.
- `npm run build`: PASS, TypeScript plus Vite production bundle.
- `npm audit --omit=dev`: PASS, zero reported production-dependency vulnerabilities at audit time. This is not a guarantee against unknown vulnerabilities or a full dependency/security assessment.
- Production output inspected: no test fixture entries, synthetic credentials, or mock labels; original logo copied unchanged.
- Automated browser inspection: actual unauthenticated login plus protected overview/detail using a clearly labeled test document, mocked requests and synthetic records only. Checked narrow viewport rendering, contained table scroll, and main-content focus/navigation. The overflow issue found during inspection was fixed; document width equals viewport width in the verified fixture.
- Git status checked for sibling backend/customer web/mobile: source working trees unchanged.

Coverage includes login success/failure, identity proof/mismatch and untrusted role claims; unauthorized routes; timed expiry/sign-out/401/403; stale/concurrent sessions; merchant isolation; application decisions; invitation lifecycle and 400/409/503 handling; backend eligibility and activation conflicts; safe error redaction and API method/body/path compatibility.

## Recommendation and limitations

**MERGE READY for the PR5 foundation after the PR's GitHub verification job passes and normal human review. Not production-deployment ready.**

No live-backend acceptance was performed with real credentials or applicants. Production readiness still needs an approved backend environment and accounts, exact CORS origin, HTTPS/hosting headers/history fallback, reviewed backend delivery adapter and end-to-end operator/recipient acceptance. Mocked tests validate UI behavior and inspected contract compatibility, not deployment configuration.

Sessions intentionally disappear on reload. Browser sign-out does not revoke a stolen JWT server-side; no refresh token, cross-tab logout, BFF/HttpOnly-cookie session or real-time privilege push is implemented. In-memory tokens reduce persistent-storage exposure but do not defeat same-origin XSS, malicious extensions or process compromise. Merchant capabilities here are read-only assigned-brand navigation. See `SECURITY.md` before deployment.

The PR is not merged automatically. No production infrastructure, accounts, customer application, Android or iOS source was changed.
