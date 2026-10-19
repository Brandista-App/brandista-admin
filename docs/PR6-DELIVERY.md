# PR6 delivery — merchant catalogue and inventory

Branch: `codex/admin-pr6-merchant-catalogue`, targeting `main`. Backend reference remains `c5c11b9a828a2b72512cd4207ca17fd301a002c0`; no backend source or authorization changes.

## Delivered screens

- Assigned brands with catalogue entry links and multi-brand workspace selector.
- Brand overview, page-scoped stock summaries, product list and inventory navigation.
- Product creation, detail and edit forms with backend-aligned category, price, availability and slug validation.
- Publish/unpublish/permanent-deactivation confirmations; deactivated records are read-only.
- Stock totals with integer validation, stale-baseline detection, sanitized conflict feedback and automatic refresh after save.
- Loading, no categories, empty catalogue, no matches, unassigned-brand, API-error and lost-access states.

Contracts, merchant instructions and unsupported capabilities: [merchant catalogue guide](PR6-MERCHANT-CATALOGUE.md).

## Verification (2026-10-20, Asia/Karachi)

- Prettier formatting check: pass. Added repository-local LF rules for Windows/Linux consistency; no global settings changed.
- ESLint: pass.
- TypeScript typecheck: pass.
- Vitest: **102 tests passed**, including 39 new merchant/numeric/contract cases and all 63 existing PR5 API/login/super-admin cases.
- Production build: pass. `dist` contains the app, approved unchanged logo and generated assets; test fixtures are not production entry points.
- Full and production-only npm audits: **0 vulnerabilities**. CI now includes a production dependency audit.
- Browser preview: actual React forms exercised against the explicitly marked mocked visual fixture (create product, stock update, catalogue). Existing logo/palette/components retained. This is not live-backend mutation acceptance or device/screen-reader certification.
- Actual backend Java controllers, request/response DTOs, page shapes, category validation, product lifecycle, membership enforcement and stock methods inspected for compatibility. No PR5 acceptance database requests or mutations, no account provisioning and no real data used during PR6.

Security tests cover route/body brand binding, assigned-brand selection, manual unassigned routes, cross-brand response rejection, denial/expired-session handling, merchant/admin separation, narrow public category reads, and blocked category writes. Backend account/membership/brand checks remain authoritative. Mocked 403 tests exercise revoked/inactive/unauthorized frontend behavior; they do not replace backend enforcement tests.

## Review recommendation

**MERGE READY for the supported merchant catalogue scope**, after required GitHub checks/review. No automatic merge. Review the documented limits: no image/variant APIs; current-page search/stock summaries; no atomic stock or metadata compare-and-set; no merchant orders or category administration. Production deployment and any live data acceptance are separate operations.
