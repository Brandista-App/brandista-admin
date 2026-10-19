# Security model and production checklist

## Authorization and session boundaries

- Login exchanges credentials only with the configured API over HTTPS (loopback HTTP is permitted for local development).
- Administration mode always calls `GET /super-admin/identity`; no decoded JWT claims, login role string or frontend selection grants access. Identity must match the login account ID and contain SUPER_ADMIN.
- Merchant mode verifies actual assigned brands through the backend and cannot call admin APIs through the session adapter or render privileged routes/navigation. This frontend separation is defense in depth, not a replacement for Spring authorization.
- Tokens are private to the in-memory session store. No localStorage/sessionStorage/cookie persistence, URL token, browser history token, console logging or analytics is used. Login passwords clear from the form when submitted. JavaScript strings cannot be reliably zeroized; in-memory credentials remain vulnerable to compromised same-origin scripts, browser extensions or process memory inspection.
- Timed expiry, request-time expiry, sign-out and 401/403 clear the token and protected UI. Reload requires reauthentication. Concurrent/stale login or response results cannot restore an ended session or sign out a newer one. Changing sessions remounts the shell to drop prior record caches.
- 403 is deliberately conservative: even a resource-level denial signs out the local session and requires fresh verification. 409/503 preserve the session and show safe errors.
- There is no backend logout/revoke-JWT endpoint in the inspected contract. Local sign-out does not revoke an already stolen token. No refresh mechanism or cross-tab sign-out is claimed. Backend privilege revocation is checked on API requests, not pushed live to an idle screen.

## Mutation and invitation controls

Application review, invitation delivery/revocation/reissue and activation require explicit confirmation and disable repeated clicks while in progress. The backend handles concurrency, idempotency/conflicts and audit logging. Mutations are never automatically retried. After a network failure, refresh/check status before retrying: the server may have committed a request whose response was lost.

Recipient email is fixed by the approved application. Raw invitation tokens are not accepted, displayed, copied, persisted or logged by this UI. Only safe status DTO fields are rendered, never generic response JSON. Invite acceptance belongs to the existing recipient/backend flow and is outside PR5. Do not paste invitation secrets into a review note or any other form.

The backend's production delivery adapter is fail-closed until configured. A 503 does not trigger a success toast. No provider credentials, encryption keys or account provisioning interfaces exist here. This PR does not validate a production delivery provider or send messages.

## Deployment requirements

1. Use an owner-approved admin origin, HTTPS API and backend revision; set VITE_API_BASE_URL at **build time**. Vite configuration is embedded in the public JavaScript bundle. Rebuild when changing it. Keep all credentials out of VITE_ variables.
2. Configure backend CORS for that exact origin using existing deployment controls. No wildcard or authorization change is necessary. This repository does not perform that configuration.
3. Serve `dist/` from a trusted static host with SPA history fallback to index.html for application routes. Do not rewrite missing asset requests to HTML. The development/preview servers are loopback tools, not production servers.
4. Configure HTTP headers at the hosting layer: a reviewed CSP allowing only self assets and the exact approved API in connect-src, `frame-ancestors 'none'`, `base-uri 'none'`, restricted form-action, HSTS on the HTTPS deployment, nosniff, restrictive Permissions-Policy, and no-referrer. Disallow inline/eval scripts in the production CSP. Do not deploy dev HMR settings as production policy.
5. Review dependency/lockfile updates, vulnerability findings, hosting access, rate limits, privacy/access logs and incident procedures. Do not capture password inputs, authorization headers, invitation secrets, or private application records in telemetry/session replay.
6. Complete real-backend acceptance with authorized **isolated** accounts and synthetic applications first: login/revocation/expiry, merchant isolation, approval → inactive brand → configured delivery → recipient acceptance → eligible activation, stale state/conflicts, and delivery failure. Do not use live applicants to test these flows.
7. Perform final accessibility/keyboard/screen-reader and mobile/browser acceptance, and arrange administrator recovery through approved offline backend operations. Account provisioning and production deployments require separate authorization.

## Scope limits

No new backend APIs or authorization rules; no real account/application mutation during implementation. This is the first admin foundation, not a full merchant catalogue/order portal, grant-management UI, public admin registration, delivery provider or enterprise session solution. Backend application-list pagination and richer field-level errors may need future agreed contracts. UI/network tests use mocks only in automated tests and are not production acceptance evidence.
