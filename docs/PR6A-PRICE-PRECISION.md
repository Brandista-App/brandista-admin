# PR6A — PKR price precision

The PR6 live acceptance report found correct storage/API price `2750.50` rendered as `Rs 2,751`. The old merchant formatter relied on `Intl.NumberFormat('en-PK', {style: 'currency', currency: 'PKR'})` defaults. In the tested runtime, `resolvedOptions()` reports minimum/maximum fraction digits **0**; this rounded display to whole rupees. Storage and backend calculations were not responsible.

The shared `formatCurrency` helper now explicitly sets both fraction-digit options to **2**, preserving the backend's supported two-decimal prices. Nonbreaking currency spacing is normalized to ordinary spaces for consistent `Rs 2,750.50` text. Product list (including overview/inventory tables) and detail use this helper. Edit inputs initialize to two decimals without grouping; request bodies still transmit the unchanged numeric price. No backend price model, storage, calculation, currency or API contract changes.

| Value     | Previous display | Correct display |
| --------- | ---------------- | --------------- |
| 2750.50   | Rs 2,751         | Rs 2,750.50     |
| 2750.00   | Rs 2,750         | Rs 2,750.00     |
| 0.50      | Rs 1             | Rs 0.50         |
| 999999.99 | Rs 1,000,000     | Rs 999,999.99   |
| 0.00      | Rs 0             | Rs 0.00         |

The formatter is also tested at the backend upper bound, `9999999999.99`. Repository-wide source inspection found no other monetary display formatter outside the merchant workspace. Dates, product-count and stock-count formatting are unrelated and unchanged.

Regression tests assert exact strings plus actual list → detail → edit/save and creation flows for all four requested amounts, including unchanged numeric JSON payloads. These mocked tests do not mutate the persistent PR6 acceptance fixtures. Security workflow findings and live-acceptance blockers are documented separately in [security workflow discovery](PR6A-SECURITY-WORKFLOWS.md).

## Verification — 2026-10-20

- Formatting, ESLint, TypeScript and production build: passed.
- Frontend: **116 tests passed** (14 new precision/workflow cases plus all 102 existing tests). Initial fork-based run passed 88 tests but one existing file's worker timed out before startup. Full retry with `npm test -- --pool=threads --maxWorkers=1 --reporter=dot` passed all four files without errors; no test/config behavior was weakened.
- Relevant backend reference suites: **33 tests passed**, no failures/errors/skips: MerchantIsolationIntegrationTests (16), OperatorProvisioningIntegrationTests (16), OperatorConfigurationTests (1). Executed against their isolated H2 fixtures with optional PR2/PR3 MySQL overrides removed from that process; no persistent acceptance/security data changed.
- Real portal read-only check: the existing synthetic product displays `Rs 2,750.50` in its list/detail and `2750.50` in its edit input. Editing was cancelled without saving. Read-only database inspection still shows price 2750.50, UNPUBLISHED, stock 0.
- Backend source, schema, price calculations and existing account/membership/grant state were not modified. Live revocation/ordinary-account-disable acceptance remains blocked as documented separately; this PR does not claim a full security acceptance PASS.
