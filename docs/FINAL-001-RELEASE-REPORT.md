# FINAL-001 revised release handoff

Verified 2026-10-24. The existing customer APK, shared super-admin/brand-admin portal, public onboarding storefront and backend are retained. No privileged runtime account was created and nothing was deployed publicly or merged automatically.

## Delivered builds

| Build                                     | Verified source                          | Download                                                                                                                   |
| ----------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Customer Android showcase                 | ab3c2660f53420cf7143c606cd4aa92e5585528e | [Universal APK artifact](https://github.com/Brandista-App/brandista-mobile/actions/runs/40027697735/artifacts/12534045575) |
| Shared administration portal              | 5f141e0                                  | [Admin portal artifact](https://github.com/Brandista-App/brandista-admin/actions/runs/40081726722/artifacts/12556015090)   |
| Public onboarding and customer storefront | ec1d478                                  | [Public web artifact](https://github.com/Brandista-App/brandista-frontend/actions/runs/40081154074/artifacts/12555665545)  |

Download artifacts while retained; GitHub sign-in may be required. Extract the APK archive before installing. APK SHA256: `f57068708d662c01ba23d0e759445121618659f36b52450bca93225a1f56de5d`. The unchanged 56,084,827-byte APK has an internal v2 signature, embedded Hermes bundle, original assets and both ARM architectures verified. Android 7/API24 or later is required. Physical-device acceptance of this exact APK is **NOT RUN**.

## What changed

The portal now includes public invitation acceptance using the existing registration, login and invitation contracts. A recipient can accept before merchant activation; normal customer registration is an explicit option. Secrets are masked, cleared on submission, excluded from URLs and persistent storage, and never installed as a portal session. Acceptance does not activate a brand or grant platform administration.

The shared portal also includes clearly labelled, bundled offline presentation materials, eight lifecycle steps and fictional role panels. These make no API calls and create no accounts or orders. Merchant overview guidance explains catalogue, stock and fulfillment. Public brand onboarding explains application, review, invitation and activation while retaining its real API form. Responsive layout, navigation cleanup and deployment templates were checked.

The backend gained a real HTTP/database integration scenario covering two applications, approval, invitation, acceptance, activation, separate catalogues, customer registration, a mixed-brand COD order and fulfillment. Brand A cannot access brand B resources; only A's fulfillment changes, and payment remains unpaid. Test-only fixtures and captured delivery are not runtime provisioning or production email.

## Verification

| Check                                         | Result                                                                                                                                             |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin hosted CI                               | 155 tests; formatting, lint, typecheck, build and audit pass; zero audit findings                                                                  |
| Public web hosted CI                          | 69 tests; lint, build and audit pass; zero audit findings                                                                                          |
| Backend hosted CI                             | 191 tests, zero failures/errors/skips                                                                                                              |
| Disposable MySQL onboarding/invitation checks | 18 tests pass; includes complete two-brand journey                                                                                                 |
| Disposable MySQL fulfillment checks           | 20 tests pass; migration, authorization, concurrency and money invariants                                                                          |
| Customer mobile current verification          | 72 tests pass; APK checksum/native-library/bundle evidence carried forward                                                                         |
| Browser                                       | Downloaded CI production builds opened at the local URLs below; public onboarding, invitation/presentation layouts and responsive behavior checked |
| Nginx configuration                           | Syntax check passes in a disposable container                                                                                                      |

MySQL test containers were removed after verification; pre-existing user containers were left unchanged. Local web test-worker contention occurred; the complete successful hosted CI runs above are the release evidence. Authenticated role workflows were covered by automated checks, not a claimed browser sign-in with an approved runtime administrator.

## Open locally and present

- [Offline presentation](http://127.0.0.1:4174/presentation): begin here for a five-minute walkthrough; show the eight lifecycle steps, brand A/B boundaries and customer experience.
- [Both administration roles](http://127.0.0.1:4174/login): choose Super-admin or Merchant. These require an operational backend and authorized identity.
- [Invitation acceptance](http://127.0.0.1:4174/accept-invitation): requires the invited identity and delivered secret.
- [Public brand application](http://127.0.0.1:4173/partners): form submission requires the backend.

The downloaded builds are served on loopback only. For restart/build commands, owner-supervised account provisioning, full isolated demonstration steps and deployment requirements, follow [FINAL-001-REVISED.md](FINAL-001-REVISED.md). Offline materials and APK checkout are illustrative/simulated; they are not live transaction evidence.

## Outstanding operational gates

The existing local backend health check returned **HTTP503**. A read-only database status query was rejected, so existing super-admin provisioning is **UNVERIFIED**, not absent. No account, password, grant or bootstrap marker was reset. Follow the existing owner-supervised operator procedure before using real workspaces.

Production invitation email is not configured/verified; default delivery fails closed. Public HTTPS hosting, DNS, approved API/CORS configuration, secrets, MySQL operations, monitoring, backup/restore and operational acceptance remain outstanding. No live payment, courier booking, COD settlement or commercial launch is claimed.

The mobile dependency audit currently has **five high and zero critical** entries. The existing internal-testing exception expires **2026-11-05** and is not extended here. Physical-device validation remains required.

## Review links

- [Admin PR5](https://github.com/Brandista-App/brandista-admin/pull/5)
- [Public onboarding PR3](https://github.com/Brandista-App/brandista-frontend/pull/3)
- [Backend marketplace acceptance PR28](https://github.com/Brandista-App/brandista-mvp/pull/28), source cee2c62
- [Existing customer APK PR24](https://github.com/Brandista-App/brandista-mobile/pull/24)
- [Existing backend deployment preparation PR27](https://github.com/Brandista-App/brandista-mvp/pull/27)

All remain reviewable pull requests. The published web artifacts above identify the tested runtime source; this subsequent report is documentation only.
