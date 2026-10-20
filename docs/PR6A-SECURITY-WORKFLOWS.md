# PR6A — security acceptance workflow discovery

Backend inspected: `brandista-mvp` main `c5c11b9a828a2b72512cd4207ca17fd301a002c0`. This document records existing support and missing operator capabilities. It implements no backend security changes and authorizes no account or membership mutation.

## Existing mechanisms

| Mechanism                                        | What it actually supports                                                                                                                                                                                              | Can it close the remaining live merchant acceptance?                                                                                                                      |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BrandMembershipService.revoke(userId, brandId)` | Internal Spring service, method authorization plus a current database-backed SUPER_ADMIN check; lock, membership update and audit are transactional.                                                                   | Not directly. There is deliberately no HTTP controller or supported operator CLI/UI invoking it. Calling it through an ad-hoc harness would invent an operator interface. |
| PR2 offline `BootstrapMain`, `REVOKE`            | Revokes an explicit **platform SUPER_ADMIN grant**, not a brand membership. Requires real interactive console, explicit recovery opt-in, verified user ID/email and confirmation; protects the last enabled custodian. | No. It is the wrong privilege type.                                                                                                                                       |
| PR2 offline `DISABLE`                            | Disables an enabled account with a current or historical **platform grant**; otherwise returns NOT_GRANTED. Last-custodian protection applies. No general ordinary-customer disable/restore mode exists.               | No for the existing ordinary synthetic merchant/customer accounts. Do not grant platform privileges just to make them eligible. Do not disable the sole operator.         |
| PR4 invitation revoke endpoint                   | Revokes an unconsumed invitation. Accepted invitations return conflict; existing active membership is not revoked by this operation.                                                                                   | No. Revoking invitation delivery is not membership revocation.                                                                                                            |
| Existing brand deactivate/update API             | Suspends/restores the brand, preserving memberships.                                                                                                                                                                   | Already tested during PR6; does not prove user-disable or membership-revocation behavior.                                                                                 |

Repository-wide controller/operator inspection found no other supported membership revoke or ordinary-account disable/restore interface. No new public endpoint is necessary merely to satisfy this test: a separately reviewed restricted operator workflow could reuse the existing application service.

## Existing denial enforcement and automated evidence

- `CurrentAccountAuthorities.convert`: checks the current account exists and is ENABLED on authenticated requests. Disabled accounts fail bearer authentication (401); JWT role/tenant claims do not confer authority.
- `BrandAccess.requireBrand`: requires an active membership and ACTIVE brand in the database on each merchant request. An enabled account with revoked/missing membership receives 403.
- `MerchantCatalogueService.assignedBrands`: filters current active assignments, and denies empty results. Existing JWTs do not preserve removed access.
- `MerchantIsolationIntegrationTests.revocationDeniesTheSameJwtImmediatelyAndRegrantIsExplicit` covers same-JWT revocation/regrant.
- `MerchantIsolationIntegrationTests.disabledAccountsAndInactiveBrandsFailClosedWithPreviouslyIssuedTokens` covers account/brand denial.
- `OperatorProvisioningIntegrationTests` covers verified-identity boundaries, last-super-admin invariants, audit and recovery restrictions; `OperatorConfigurationTests` covers the separate offline context.

These tests use isolated H2 fixtures when the optional PR2/PR3 MySQL override variables are absent. Fixture-level JDBC changes in tests are **not** a supported procedure for changing the persistent acceptance database.

## Live acceptance decision

**Cannot close both remaining live authorization scenarios with the current supported interfaces.** No existing account, membership or privilege was changed during PR6A. No security-table SQL, recovery command, new privileged account, token-claim manipulation or application-service bypass was used. Previous PR6 live evidence remains valid for the scenarios actually executed; it must not be relabeled a full PASS solely because the price display is fixed.

## Recommended separate backend milestone

Plan a reviewed **restricted security operator lifecycle workflow**, with scope and approval separate from this frontend PR:

1. Expose an operator-only supported way to call the existing secured membership revoke/regrant service; no public/self-service grant endpoint. Explicitly verify the isolated database, artifact, authenticated/authorized custodian, numeric user/brand IDs and synthetic identity before mutations.
2. Add an approved ordinary-account disable/restore workflow using application-level authorization, transaction/audit and account invariants. Define restore semantics and guard last-admin protection independently of the account's legacy customer role.
3. Preserve append-only audit, membership version fencing and existing accounts/customer data. A regrant must not silently reuse stale invitation acceptance evidence; existing onboarding rules may require a fresh invitation/acceptance before reactivation.
4. Use a designated synthetic ordinary account/membership. Capture its baseline, sign in privately, perform the approved mutation, then test the **same previously issued JWT** on merchant list/detail/stock reads and stock writes. Expect revoked enabled membership to lose merchant access (403); expect disabled-account bearer requests to fail authentication (401). Confirm sign-in denial and customer-access semantics separately. Never print credentials/tokens.
5. Restore only through the newly reviewed explicit workflow, verify intended final state and audit, and repeat cross-brand/customer regressions. Changes to timestamps/versions/audit are intentional evidence; do not erase history to simulate an untouched fixture.

No backend interface, authorization rule or security schema implementation is included in PR6A. Live closure remains blocked pending that separately approved capability; frontend price correctness can be reviewed and merged independently.
