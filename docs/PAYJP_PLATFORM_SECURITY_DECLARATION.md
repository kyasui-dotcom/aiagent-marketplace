# PAY.JP Platform Security Declaration Notes

These notes map CAIt implementation and operational requirements to the PAY.JP security declaration for Japan EC merchants.

## Payment Model

- CAIt is migrating marketplace payments to PAY.JP Platform.
- Provider seller accounts must be represented as PAY.JP Platform tenants.
- Marketplace buyer charges must include `tenant`, `platform_fee`, and `three_d_secure=true`.
- Card numbers must not be submitted to CAIt servers. Browser payment forms must send PAY.JP tokens only.
- External agent registration can create the listing before money readiness is complete, but provider money actions must require provider billing identity details, saved-card readiness, CAIt admin-approved provider identity, and completed PAY.JP tenant review, including legal/company name, email, phone, postal code, address, and country.

## Vulnerability Controls

1. Admin access control and administrator ID/password management
   - CAIt admin screens require authenticated platform-admin accounts.
   - Admin routes and write APIs are rate-limited and CSRF-protected.
   - Operational requirement: administrator accounts must use two-factor authentication on the upstream identity provider.
   - Operational requirement: add Cloudflare WAF/IP allow rules or equivalent access restriction for production admin surfaces where possible.

2. Data directory exposure prevention
   - Public assets are served from `public`; secrets and runtime state are not stored there.
   - Upload and identity-photo flows must validate file type and size before storing or displaying metadata.

3. Web application vulnerability controls
   - Security-sensitive routes use centralized route declarations, rate limits, CSRF checks, and server-side validation.
   - Regular dependency review, source-code review, and vulnerability checks must be run before production payment changes.
   - PAY.JP Platform charge creation must require tokenized card input and EMV 3-D Secure.

4. Malware controls
   - Operational requirement: developer and administrator endpoints must run active malware protection or equivalent endpoint protection with current signatures and scheduled scans.

5. Malicious card testing / credit-master controls
   - PAY.JP payment actions are rate-limited.
   - EMV 3-D Secure is required for PAY.JP charges.
   - Operational requirement: enable PAY.JP fraud controls, Cloudflare WAF/bot controls, and monitoring alerts for repeated authorization attempts.

## Fraudulent Login Controls

- OAuth login is used for user identity.
- Agent registration is tied to Google/GitHub authenticated accounts; GitHub linking is required for provider listing flows.
- Provider billing identity details, saved-card readiness, CAIt admin-approved provider identity review, and completed PAY.JP tenant review are required before provider money actions can run so card billing and platform tenant onboarding are attached to a known account profile.
- Admin and payment-provider operations require authenticated sessions and CSRF tokens.
- High-risk write endpoints are rate-limited.
- Operational requirement: upstream identity provider accounts used for administration must enable two-factor authentication.
- Operational requirement: monitor suspicious IPs, repeated login failures, and unusual payment/account-change behavior.

## EMV 3-D Secure

- PAY.JP Platform charge creation must set `three_d_secure=true`.
- The 3-D Secure finish endpoint must be called before treating the charge as completed.

## Language Support

- CAIt handles Japanese/English copy in its own UI and API responses while using PAY.JP as the tokenization, Platform tenant, charge, and 3-D Secure API provider.
- PAY.JP hosted tenant review or card-issuer authentication screens may remain outside CAIt localization control, so CAIt responses include localized guidance before and after those redirects.
- PAY.JP action error responses include the original provider error plus localized user-facing `localized_error` and `localized_action` fields.

## Redirects And Webhooks

- PAY.JP tenant application URLs must be opened with a `return_to` redirect URL so providers return to CAIt after the hosted tenant review flow.
- PAY.JP 3-D Secure is only enabled for test/payment verification in the current rollout. Production order fulfillment must not depend on a browser redirect alone.
- PAY.JP Webhook is not required for the current synchronous tenant onboarding and test 3-D Secure flow, but it should be added before production asynchronous fulfillment, subscription renewal, or automatic ledger settlement relies on PAY.JP events.

## Development Model

- CAIt is self-developed.
- Security-sensitive payment code must be reviewed and covered by QA before deployment.
