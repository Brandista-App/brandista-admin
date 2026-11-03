# Merchant registration and invitation administration

The public `/accept-invitation` route reads `#token=...` into memory, removes it from
the address bar, and asks the new backend `/merchant-registration/verify` POST for
the approved brand, fixed email, expiry and terms version. Verification is explicit
so mail scanners opening a link cannot consume it. Completion requires matching
password fields and acceptance of `/merchant-terms`; the backend commits account,
brand membership, single-use acceptance, consent and brand activation atomically.
Existing identities must supply their existing password. The page cannot change the
recipient/brand, reset a password, or create an administrator grant.

Super Admin application details retain manual invitation creation for previously
approved applications, resend with token rotation, revocation, expiry and invitation
history. Email delivery is displayed independently as QUEUED, RETRY, SENDING,
PROVIDER_ACCEPTED, DELIVERED, FAILED, CANCELLED or NOT_TRACKED. The portal never
claims delivery from approval or invitation creation. A provider-accepted message
may still bounce or remain undelivered; use the provider and the recipient's inbox
to confirm actual receipt. No invitation secrets are returned to Super Admin.

Deploy only after separate approval. Backend Flyway V16 and the new APIs must be
available first; then build this portal with the deployed HTTPS `VITE_API_BASE_URL`.
Preserve SPA fallbacks for `/accept-invitation` and `/merchant-terms`, HTTPS and
Referrer-Policy no-referrer. There are no email credentials in frontend settings.
Have the authorized Brandista owner review the terms before launch.

The backend's `docs/deployment/MERCHANT-INVITATION-ACTIVATION.md` contains every
backend variable, verified sender/domain requirements, staging email test, retry
limits, and the exact TSC (The Sindhi Culture) walkthrough. Existing APPROVED TSC
must not be approved again: verify the fixed recipient and history, then explicitly
authorize and create its invitation once. No production invitation was sent.

## Automated verification

Run `npm ci`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`,
then `VITE_API_BASE_URL=https://YOUR_API/api/v1 npm run build` (PowerShell: assign
`$env:VITE_API_BASE_URL` first). Frontend tests verify registration consent, atomic
request payload, fragment scrubbing, invalid invitation rejection, and admin status.

The backend also includes a real Playwright browser test against this portal and a
disposable Spring/H2 backend, with no HTTP API mocks and no email transmission:

```powershell
# From the backend checkout. Install Playwright and its browser in a disposable QA cache.
$env:MERCHANT_BROWSER_ADMIN_ROOT = 'ABSOLUTE_PATH_TO_THIS_CHECKOUT'
$env:MERCHANT_BROWSER_PLAYWRIGHT = 'ABSOLUTE_PATH_TO_PLAYWRIGHT/index.mjs'
# Optional installed browser channel, e.g. msedge; omit to use installed Chromium.
$env:MERCHANT_BROWSER_CHANNEL = 'msedge'
.\mvnw.cmd '-Dtest=MerchantActivationIntegrationTests' test
```

The test starts Vite on loopback port 5190, follows the private invitation, accepts
terms, creates the account, signs in as merchant, opens the assigned catalogue and
rejects replay. Results and desktop/mobile screenshots stay in backend `target/`.
The ordinary backend suite skips only this browser test when its explicit runtime
paths are absent; HTTP end-to-end coverage always runs. A dedicated CI job runs it
with the pinned companion admin revision and a clean browser installation.

Live staging email delivery requires separate approval and backend/provider setup;
the prepared backend script is not part of normal CI and refuses to send without
its explicit `--allow-send-staging-email` flag.
