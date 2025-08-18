Remittance System Admin Dashboard Works
Got it. Here’s a lean, two-day process flow and build planner tailored for a simple cash-on-hand-only remittance system that uses the media canister to validate uploaded screenshot proofs, settles to a corporate GCash account, and conforms to a minimal Remittance Canister, Admin Canister, and Admin Dashboard.

Scope and constraints

- Payment method: Cash-on-hand only. No direct GCash API integration in this 2-day scope.
- Settlement: Collectors deposit to the corporate GCash account; proof is a GCash deposit/transfer screenshot.
- Verification: Media Canister is the single source to validate and store proofs (basic checks: file hash, size/type, timestamp extraction if present, and optional human review).
- Components:
  - Frontend canister (Collector UI + Admin dashboard UI).
  - Remittance Canister (orders, commission, state machine).
  - Admin Canister (roles + commission rules + settings).
  - Media Canister (existing) for screenshot validation and blob storage.
- Out of scope for 2 days: HTTPS outcalls, automated bank statement ingestion, promotions, complex workflows.

End-to-end process flow

1. Create order

- Actor: Collector
- Frontend calls Remittance.quote_commission(amount, service_type, payment_method="CASH_ON_HAND").
- Frontend shows commission and net proceeds.
- Frontend submits Remittance.create_order(customer_id, amount, service_type, collector_id, branch_id).
- Status = AWAITING_CASH. Commission rule/version attached.

2. Cash received and proof upload

- Actor: Collector
- Collector collects cash physically from customer.
- Collector uploads GCash deposit or transfer screenshot to Media Canister via chunked upload; Media validates:
  - File type/size whitelist; computes SHA-256; extracts timestamp if available.
  - Returns media_id and validation flags.
- Frontend calls Remittance.confirm_cash_received(order_id, media_ids=[proof]) with media validation metadata echoed back.
- Status = CASH_CONFIRMED; deposit_ref generated.

3. Settlement instruction

- Actor: System
- Remittance.generate_settlement_instruction returns deposit_ref and deadline (e.g., T+0 end-of-day).
- Collector deposits cash to corporate GCash using deposit_ref in notes/remark where possible.

4. Manual settlement confirmation (proof-based)

- Actor: Collector or Supervisor
- Collector uploads second screenshot showing successful GCash cash-in/transfer with visible ref/amount into Media Canister; gets media_id_settlement.
- Admin Dashboard (FinOps role) opens “Awaiting Settlement Proof” queue:
  - Cross-verifies screenshot metadata (amount, timestamp range) against order and deposit_ref.
  - If acceptable: Admin marks settled via Remittance.mark_settled(order_id, gcash_ref=text_from_screenshot, amount).
  - Status = SETTLED. Reconciliation = equal to “accepted proof,” since no statement ingestion in 2-day scope.

5. Reporting and oversight

- Admin dashboard shows:
  - Active orders by status
  - Per-collector daily totals and commissions
  - Exception queue (missing or invalid proofs)

Minimal state machine (simple, enforceable in 2 days)

- AWAITING_CASH -> CASH_CONFIRMED (on confirm_cash_received with validated media_id)
- CASH_CONFIRMED -> AWAITING_SETTLEMENT (auto)
- AWAITING_SETTLEMENT -> SETTLED (on mark_settled with verified screenshot and gcash_ref)
- AWAITING_SETTLEMENT -> CANCELLED (admin only)
- SETTLED -> (terminal)

Data model (minimal)

- RemittanceOrder:
  - id, customer_id, amount_php_centavos, service_type, payment_method="CASH_ON_HAND"
  - commission_rule_id, commission_version, commission_amount, net_proceeds
  - collector_id, branch_id
  - status, deposit_ref, gcash_ref?
  - proof_cash_media_ids[], proof_settlement_media_ids[]
  - created_at, cash_confirmed_at?, settled_at?
- CommissionRule:
  - id, version, service_types[], payment_methods[]
  - formula: Flat | Percentage(rate_bps) | Tiered([{up_to, rate_bps}]) | Hybrid({base, rate_bps})
  - caps {min?, max?}, rounding {mode, quantum}, tax {vat_inclusive, vat_rate_bps}
  - priority, effective_from, effective_to?, is_active
- MediaValidationSummary (referenced from Media Canister):
  - media_id, sha256, mime, size_bytes, uploaded_at, extracted_timestamp?, flags {is_valid_type, is_within_size, has_text?, ocr_available?}

APIs (trimmed Candid signatures)

- Remittance Canister
  - quote_commission(amount: nat64, service_type: text, payment_method: text, ts: nat64) -> variant { ok: { rule_id: text; rule_version: nat32; commission: nat64; net: nat64; }; err: text }
  - create_order(input: { customer_id: text; amount: nat64; service_type: text; collector_id: principal; branch_id: text }) -> variant { ok: Order; err: text }
  - confirm*cash_received(order_id: text, proofs: vec text /* media*ids */) -> variant { ok: Order; err: text }
  - generate_settlement_instruction(order_id: text) -> variant { ok: { deposit_ref: text; expires_at: nat64 }; err: text }
  - mark*settled(order_id: text, gcash_ref: text, amount: nat64, proofs: vec text /* media*ids */) -> variant { ok: Order; err: text }
  - get_order(order_id: text) -> opt Order
  - query_orders(filter: { status: opt vec text; collector_id: opt principal; branch_id: opt text; from: opt nat64; to: opt nat64 }, page: { cursor: opt text; size: nat32 }) -> { items: vec Order; next_cursor: opt text }

- Admin Canister
  - upsert_commission_rules(vec CommissionRuleDraft) -> variant { ok: vec CommissionRule; err: text }
  - activate_rule(rule_id: text, version: nat32) -> variant { ok: null; err: text }
  - list_rules(filter: { service_type: opt text; active_only: opt bool }) -> vec CommissionRule
  - assign_role(user: principal, role: text, scope: opt text) -> variant { ok: null; err: text }
  - set_settings({ corporate_gcash_account: text; settlement_deadline_hours: nat32 }) -> variant { ok: null; err: text }
  - get_settings() -> { corporate_gcash_account: text; settlement_deadline_hours: nat32 }

- Media Canister (assumed existing; used, not modified)
  - upload_chunk/init/finalize -> returns media_id
  - get_validation(media_id: text) -> MediaValidationSummary

How backend canisters conform

- Remittance Canister:
  - Pulls a read-only policy snapshot from Admin Canister on first request and caches it; refresh on version bump.
  - Accepts only media_ids from Media Canister; stores references and the minimal validation summary returned (no blobs).
  - Commission is computed deterministically using rule_version; stored at AWAITING_CASH and locked at CASH_CONFIRMED.
- Admin Canister:
  - Owns commission rules, roles, and global settings (corporate GCash account, deadline).
  - Provides lightweight APIs; changes are maker-checker optional but can be skipped for 2 days (single approver).
- Admin Dashboard:
  - Reads rules and orders; provides:
    - Rule list and activation
    - Order board by status
    - Settlement proof review/approve button that calls mark_settled

Dynamic commission system (practical considerations kept simple)

- Matching: service_type + payment_method="CASH_ON_HAND" + optional branch filter.
- Formula: implement Percentage and Flat first; Tiered optional if time permits.
- Caps/floors: single min/max at rule level.
- Rounding: integer centavos, no floating point; optional rounding quantum of 1.
- Tax/VAT: if needed, store vat_inclusive flag; otherwise omit in 2-day MVP.
- Versioning: effective_from only; omit effective_to for now. Lock version at CASH_CONFIRMED.

Security and roles (minimal)

- Roles: ADMIN, FINOPS, COLLECTOR.
- Mutations by role:
  - COLLECTOR: create_order, confirm_cash_received
  - FINOPS: mark_settled
  - ADMIN: rules/settings and all read
- Remittance Canister checks caller role via Admin Canister.

Validation using Media Canister

- On confirm_cash_received and mark_settled:
  - Require media_id(s) that pass Media.get_validation -> is_valid_type && size <= max && sha256 present.
  - Optionally check extracted_timestamp within [order.created_at - 1h, now + 10m].
  - Store media_id and minimal validation summary on the order.
  - Admin uses UI to visually verify details (amount, ref) on the screenshot while backend stores hashes for audit.

Two-day planner
Day 1 (Backend-heavy; 6–8 hours)

- Remittance Canister
  - Define types: Order, CommissionRuleRef, Status enum.
  - Implement quote_commission (Percentage + Flat; select rule by service_type; default rule fallback).
  - Implement create_order, confirm_cash_received (with media validation call), generate_settlement_instruction.
  - Implement mark_settled (requires FINOPS role, validates amount equals order.amount).
  - Basic query: get_order, query_orders (by status and date).
  - Deposit ref generation: branch_code + yyyymmdd + last4(order_id) + checksum mod 97.

- Admin Canister
  - Minimal rule CRUD: upsert_commission_rules, activate_rule, list_rules.
  - set_settings/get_settings.
  - assign_role in-memory mapping.

- Wire Media Canister
  - Client stubs for get_validation.
  - Enforce presence of media validations on confirm_cash_received and mark_settled.

Deliverables end of Day 1:

- .did files for Remittance and Admin.
- Unit tests for commission calculation and state transitions.
- Happy-path flows working via candid calls.

Day 2 (Frontend + admin review; 6–8 hours)

- Frontend Canister (UI)
  - Collector screens:
    - Create Order: amount, service_type -> live commission quote -> submit.
    - Cash Received: upload screenshot -> submit confirm_cash_received.
    - Settlement Instructions: show deposit_ref and deadline.
  - Admin Dashboard:
    - Orders table with filters by status.
    - Detail drawer: view proofs (thumbnails via Media Canister), approve settlement -> mark_settled.
    - Rules page: list rules, simple add/activate.

- QA and hardening
  - Negative tests: wrong role, missing proofs, mismatched amount on settlement.
  - Metrics/basic logs: append audit entries on transitions.
  - Document ops checklist.

Acceptance criteria

- Can create orders, compute and lock commission, and progress through AWAITING_CASH -> CASH_CONFIRMED -> AWAITING_SETTLEMENT -> SETTLED.
- Proofs are uploaded through Media Canister and validated before state changes.
- Admin can approve settlement after cross-checking screenshots.
- Commission rules can be created and activated; percentage and flat formulas supported.
- Basic dashboards show current orders and allow settlement approvals.

Minimal test checklist

- Commission: flat and percentage; min/max caps if provided.
- Access control: COLLECTOR cannot mark_settled; FINOPS cannot upsert rules.
- Media: confirm_cash_received fails without valid media_id; mark_settled fails without valid media_id and amount mismatch.
- State machine: invalid transitions blocked; idempotency on repeated confirm/settle calls.

Nice-to-have if time remains

- Tiered commission support.
- Simple CSV export of daily orders for finance.
- Screenshot OCR stub (not required) to pre-fill gcash_ref field for admin review.

If you want, I can scaffold the two .did files and placeholder canister modules to get you started right away.
