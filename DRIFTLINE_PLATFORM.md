# Driftline Platform Integration

This application is a Driftline Tech product.

All Driftline applications must use the shared Driftline platform services and standards defined by the canonical Driftline Tech platform repository.

The purpose of this document is to prevent individual applications from creating incompatible implementations of shared Driftline services such as licensing, entitlements, authentication, downloads, updates, telemetry, commerce integration, or other common platform functionality.

---

## Core Principle

Do not create application-specific implementations of functionality that is already provided by the Driftline platform.

Applications should consume stable Driftline APIs, SDKs, schemas, and protocols rather than depending directly on internal platform database structures.

The Driftline platform is responsible for shared business rules and platform services.

The application is responsible for implementing its own product functionality and responding appropriately to the state returned by the platform.

---

# Licensing

## Canonical Licensing System

All Driftline applications must use the canonical Driftline Licensing Protocol and SDK.

Do not create a separate licensing system for this application.

Do not:

- create application-specific licensing databases
- create application-specific license-key formats
- create independent activation-count logic
- create independent entitlement schemas
- create independent license validation protocols
- communicate directly with licensing database tables
- embed Supabase service-role credentials
- embed private signing keys
- expose privileged licensing credentials in the client
- duplicate licensing business rules locally
- infer licensing behavior from marketing edition names

Use:

- the canonical Driftline Licensing API
- the current Driftline Licensing SDK
- the application's registered Driftline product identifier
- signed Driftline entitlements where applicable
- the documented Driftline installation-ID protocol
- the documented activation and validation lifecycle
- canonical Driftline licensing error codes and schemas

### Local-first Free baseline

An application's Free baseline must work on a first-ever offline launch without a token, account, license key, activation, network request, or public-key fetch. The Free entitlement resolver is optional diagnostics/synchronization only and must never be a startup or authorization dependency. Signed platform entitlements add paid capabilities; absence of valid paid material falls back to the application's built-in Free baseline.

### Perpetual authorization

A perpetual activation produces an installation-bound signed durable authorization certificate. Its centrally configured `refresh_after` schedules opportunistic validation and is not a hard local expiration. Temporary or prolonged network loss, timeout, rate limiting, or server failure must preserve an already valid perpetual authorization. Paid access is removed after a definitive successful server denial such as revocation, suspension, refund, or invalid/deactivated activation. Trials and subscriptions retain authoritative hard expiry.

---

##STRIPE COMMERCE INTEGRATION

Driftline will use Stripe as the payment processor for software purchases.

The Driftline platform is authoritative for the relationship between:

- Driftline products
- Driftline editions
- Driftline prices
- Stripe Products
- Stripe Prices
- orders
- payments
- licenses
- entitlements

Do not place Stripe business logic inside individual desktop applications.

Desktop applications must never communicate directly with Stripe to determine license ownership.

For MetaTweak:

Product ID:
metatweak

Current intended configuration:

MetaTweak Free
- price: $0
- no purchase required

MetaTweak Pro
- current intended price: $14.99 USD
- one-time payment
- perpetual license
- current activation allowance: 3 active installations

These commercial values must be centrally configurable and must not be treated as hardcoded immutable application rules.

STRIPE PRODUCT MAPPING

Create or support canonical mappings between Driftline product/edition records and Stripe product/price identifiers.

Do not use Stripe product IDs as Driftline's internal product identity.

Driftline product_id remains the canonical internal identifier.

Stripe identifiers are external commerce references.

CHECKOUT

Use Stripe Checkout for one-time software purchases unless there is a documented reason to use another Stripe integration.

Checkout Sessions must be created server-side.

The server must determine:

- product
- edition
- Stripe price
- currency
- expected license type

Do not accept price amounts supplied by the client as authoritative.

WEBHOOKS

Implement secure Stripe webhook handling.

At minimum:

- verify Stripe webhook signatures
- process events server-side
- implement idempotency
- record processed Stripe event IDs
- prevent duplicate order/license issuance
- maintain auditability
- handle delayed or repeated webhook delivery safely

A successful payment must result in the appropriate Driftline order, entitlement, and license according to central product configuration.

Do not issue licenses based solely on redirect/success-page state.

LICENSE ISSUANCE

For a valid completed MetaTweak Pro purchase:

1. create or reconcile the customer/order record
2. record the successful payment
3. create the correct MetaTweak entitlement
4. issue the corresponding perpetual license
5. apply the centrally configured activation allowance
6. associate the license with the purchase/customer as appropriate
7. make the license available for delivery/display

Ensure this flow is transactional or otherwise safely recoverable.

CUSTOMER EXPERIENCE

After successful purchase, the user should receive clear access to their MetaTweak Pro license.

Support a future Driftline customer portal where the customer can:

- view purchased products
- view license keys
- view active installations
- deactivate installations
- download software

Do not require the customer portal to exist before MetaTweak licensing can be tested.

TEST MODE

Use Stripe Test Mode for initial development and validation.

Support the complete test flow:

Stripe test checkout
→ webhook
→ Driftline order
→ license issuance
→ MetaTweak activation
→ entitlement verification

Do not use live payment credentials during automated testing.

SECRETS

Stripe secret keys and webhook signing secrets must remain server-side.

Do not commit them to Git.

Do not expose them in desktop applications or public web bundles.

Document the required environment variables and setup steps.

---

## Product Identification

Every Driftline application must have a permanent registered product identifier.

Example identifiers:

```text
metatweak
ezebay
viewsaic
```
