# FINAL-001 revised: three-sided marketplace presentation

2026-10-24, Asia/Karachi. This continues the existing admin application; it does not create a second portal. Customer APK code and the previously verified universal binary are carried forward unchanged.

## Applications and routes

| Surface                                   | Existing repository | Local production-preview route                                  |
| ----------------------------------------- | ------------------- | --------------------------------------------------------------- |
| Super-admin login                         | brandista-admin     | http://127.0.0.1:4174/login — select Super-admin administration |
| Brand-admin login                         | brandista-admin     | http://127.0.0.1:4174/login — select Merchant / assigned brands |
| Invitation acceptance                     | brandista-admin     | http://127.0.0.1:4174/accept-invitation                         |
| Offline presentation materials            | brandista-admin     | http://127.0.0.1:4174/presentation                              |
| Customer web and public brand application | brandista-frontend  | http://127.0.0.1:4173/partners                                  |
| Customer offline showcase                 | brandista-mobile    | Standalone Android APK; see APK link below                      |

These are exact local startup targets, **not public deployments**. Public HTTPS hosting, DNS, API/DB secrets, approved accounts, delivery provider and operational acceptance remain required. The public customer storefront is not the administration app.

## Starting the verified web build

From brandista-admin, use Node24 with the committed lockfile:

```powershell
npm ci
# Set only a public configuration value, never credentials:
$env:VITE_API_BASE_URL = '<approved HTTPS API ending in /api/v1>'
# For an approved local backend, loopback HTTP is permitted.
npm run build
npm run preview
```

The existing preview script binds 127.0.0.1:4174 with strict port checking. `/presentation` works without a reachable backend. It bundles explanatory role panels and fictional scenario data, makes no API calls and creates no account, invitation, stock, order, payment or fulfillment event. An offline laptop can serve the extracted `dist` using the existing Vite preview tooling after dependencies are installed; this is not a second functioning offline admin system. Keep a local copy of the build before the hosted artifact's retention expires.

The CI **Brandista-Admin-Portal** artifact contains `dist/`, this guide and deployment files. Both admin roles use this same build. To serve an extracted artifact, place its `dist` into this repository or configure an approved static server with SPA fallback; do not open index.html directly with file:// and expect browser routing to work.

## Super-admin account status and supervised provisioning

No approved public environment or privileged account has been verified. An existing local Compose database rejected the application's read-only status query; that is **not proof that no super-admin exists**. No password, grant, account, database or bootstrap marker was reset. Existing containers were not reconfigured.

Follow the existing [secure operator procedure](https://github.com/Brandista-App/brandista-mvp/blob/main/docs/admin/PR2-SUPER-ADMIN-OPERATIONS.md). The owner must approve the exact environment and identity. A trusted operator verifies the database and reviewed artifact, uses Java21 and an interactive non-recorded terminal, then chooses INITIAL_CREATE or INITIAL_GRANT only as appropriate. Never delete the provisioning marker or use direct SQL as a shortcut. If already initialized, use the documented separately authorized recovery path. Do not put passwords in scripts, tickets, environment templates, browser URLs or this report.

After supervised provisioning, sign in normally, select Super-admin administration, and verify `/super-admin/identity` confirms the explicit grant. Legacy ADMIN role alone is insufficient. Use Applications for review → invitation → acceptance eligibility → activation. No public super-admin signup is added.

## Recipient and brand workflow

1. The applicant submits the customer storefront's `/partners` form. Use the contact email the brand controls. The response means received for review, not approval or partnership.
2. An authorized super-admin reviews and approves. The backend creates an INACTIVE brand. Issue an invitation to the application-bound recipient; there is no recipient override.
3. The recipient opens `/accept-invitation`, signs out of any other workspace first, then enters the invited email, customer-identity password and delivered invitation secret. They may explicitly choose normal customer registration first if that identity does not exist. This form never creates platform grants or bypasses the invitation.
4. The form uses the existing registration/auth/acceptance contracts. It does not require an active merchant assignment before acceptance, because activation is a later operator step. Secrets are masked, cleared when submitted, kept out of URLs/storage/logs and not installed as a portal session. The server verifies recipient and invitation status. Failed/ambiguous requests require an operator status check; there is no automatic retry or fake success.
5. Super-admin refreshes eligibility and explicitly activates. Recipient then chooses Merchant at `/login`, sees assigned active brands only and selects a brand.
6. Create/edit a draft product, choose an existing category, set PKR price and stock, review and publish. Product publication, availability and stock are distinct. The overview's stock summaries clearly describe their page scope. No image-upload, SKU, payment or courier API is invented.
7. Customer places a real COD order only in the approved isolated backend with COD explicitly enabled. Merchant orders expose only the assigned brand's lines and immutable delivery snapshot. Advance adjacent PLACED → ACCEPTED → PACKED → SHIPPED → DELIVERED states using the returned version. No cash collection or settlement is recorded by these transitions.
8. Sign out clears the in-memory browser session. Reload also requires sign-in. Client logout does not revoke a copied JWT; server checks remain authoritative.

## Delivery and full demonstration boundary

There is no configured/verified production email provider. Default backend invitation delivery fails closed with 503. The existing `invitation-dev` encrypted-file adapter is for a separately authorized isolated synthetic environment, never production. Follow backend PR4's protected-directory/AES-key procedure and operator helper; do not expose a token retrieval endpoint or post secrets in the application form. New acceptance UI does not make email delivery operational.

For an actual eight-step demonstration, first select a fresh isolated MySQL database, apply V1–V14, configure local CORS for both exact preview origins and opt into synthetic invitation delivery. Have the owner supervise the platform custodian setup. Then create brand A/brand B applications through the public form, approve/invite/accept/activate separately, register an ordinary customer and perform a disposable COD transaction. Demonstrate A cannot access B resources and only A's fulfillment changes. Do not use an existing/production database for rehearsal, create fake production orders, or automatically provision a privileged demonstration account.

When that setup is unavailable, `/presentation` provides the clearly labelled alternative: eight lifecycle steps, super-admin responsibilities, fictional brand A/B panels, customer boundaries and a five-minute walkthrough. It is **illustrative material**, not live transaction evidence. The APK's demo checkout is also simulated; its cart/orders never sync to real accounts.

## Customer APK carried forward

[Verified universal APK artifact](https://github.com/Brandista-App/brandista-mobile/actions/runs/40027697735/artifacts/12534045575), file `Brandista-Showcase-Universal.apk`, 56,084,827 bytes. SHA256 `f57068708d662c01ba23d0e759445121618659f36b52450bca93225a1f56de5d`. Android7/API24+, armeabi-v7a + arm64-v8a, internal v2 signature, embedded Hermes bundle and original bundled assets verified. Physical-device acceptance of this APK remains NOT RUN; previous AND-021 device evidence does not certify this build. No new APK is required for web-only changes.

## Deployment and commercial gates

`deploy/Dockerfile` builds this existing app and refuses a missing API build argument. `deploy/nginx.conf` serves SPA routes with security headers; it is an internal HTTP container behind approved TLS ingress, not public TLS provisioning. Supply the approved HTTPS API, exact backend CORS origins, trusted certificates/DNS, image digest review, least-privilege MySQL/secret injection, logs/monitoring, encrypted backups and a demonstrated restore. Restrict CSP connect-src to the selected API origin before production. Review the backend deployment-preparation PR #27 and existing runbooks; do not deploy or change DNS as part of this milestone.

Security: reassess npm findings using the current lockfile/advisory database. The mobile PR19 internal-testing exception expires **2026-11-05**; this report does not extend it. Automated auth/tenant/invitation/inventory/checkout/fulfillment tests and build checks are verification evidence, not commercial-production approval. General profile editing, live photo/SKU APIs, courier booking, COD settlement and returns/cancellation operations are not promised here.

Current-run tests, browser evidence, artifact/PR links and unresolved gates are recorded in the final release handoff. No deployed URL, privileged account, production email delivery, physical-device PASS or commercial launch is claimed without evidence.
