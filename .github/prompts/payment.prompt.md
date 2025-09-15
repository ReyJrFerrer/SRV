/add-feature Payment Integration System

---

## 🤖 AI Agent Instructions

**Objective:** Integrate a payment system into the SRV Marketplace over 2 days.

**Your Core Directives:**

1.  **Read First:** Before starting any task, you **MUST** first read the `CHANGELOG.md` file. Look for the "## Payment Integration Feature" section to understand which steps have already been completed. Do not repeat completed steps.
2.  **Log Your Work:** After you successfully complete **each numbered step**, you **MUST** add an entry to `CHANGELOG.md` under the "## Payment Integration Feature" header. The entry should describe what you did. For example: `feature - 1.0: Created src/backend/function/commission.mo to house the Hybrid Commission Model logic.`
3.  **Follow the Plan:** Execute the tasks sequentially. Do not skip steps.
4.  **Stop and Ask:** When you reach a "PAUSE FOR CONFIRMATION" step, stop and present the required information to the user and ask for confirmation before proceeding.

---

## 📜 The Plan

### **Phase 1 (Day 1): The Internal Wallet & Prepaid Commission Engine**

**Goal:** Implement the Hybrid Commission Model and the internal SRV Wallet, and enforce the prepaid commission model for cash jobs.

**1.0. New Canister: `commission.mo`** - **Action:** CREATE the file `src/backend/function/commission.mo`. - **Content:** Define a new Motoko actor named `Commission`. It will contain a public function `calculate_commission(category: Text, booking_value: Nat) -> Nat` which will house the complete commission logic. - **Tier Logic:** - **Tier A (7% Base):** "Gadget Repair", "Automobile Repair", "Photography" - **Tier B (5% Base):** "General Repairs", "Tutoring", "Beauty Services", "Massage Services" - **Tier C (3.5% Base):** "Cleaning", "Delivery" - **Progressive Fee Logic (Example for Tier B):** - 5% on the first 1,500. - 4% on the value from 1,501 to 10,000. - 3% on the value above 10,000. - _Implement similar progressive structures for Tier A and C._

**1.1. New Canister: `wallet.mo`** - **Action:** CREATE the file `src/backend/function/wallet.mo`. - **Content:** Define a new Motoko actor named `Wallet`. It should include type definitions for balances and a stable `Trie` to map `Principal` to `Nat` (the balance).

**1.2. Implement Core Wallet Functions** - **Action:** MODIFY `src/backend/function/wallet.mo`. - **Content:** Implement the following public functions: - `get_balance()`: (Query) Returns the balance for the calling Principal. - `credit(principal: Principal, amount: Nat)`: (Update) Credits a user's balance. Secure it to be callable only by authorized controller Principals. - `debit(principal: Principal, amount: Nat)`: (Update) Debits a user's balance. Secure it to be callable only by the `booking` canister's Principal. - `transfer(from: Principal, to: Principal, amount: Nat)`: (Update) Transfers funds between two users' wallets.

**1.3. Integrate Canisters with Bookings** - **Action:** MODIFY `src/backend/function/booking.mo`. - **Content:** - **On Acceptance:** Before a provider accepts a cash job, call `commission.calculate_commission(...)` to get the estimated fee. Then, call `wallet.get_balance()` to check their balance against this fee. Reject if insufficient. - **On Completion:** When a cash job is marked "Completed", call `commission.calculate_commission(...)` again to get the final fee. Then, call `wallet.debit()` to deduct this amount from the provider's balance.

**1.4. Update Canister Configuration** - **Action:** MODIFY `dfx.json`. - **Content:** Add the new `commission` and `wallet` canisters to the `canisters` list.

**1.5. Frontend Wallet UI** - **Action:** CREATE the file `src/frontend/src/pages/provider/wallet.tsx`. - **Content:** Build a React component that displays the provider's current wallet balance (fetched from `wallet.mo`) and lists their transaction history.

**1.6. Frontend Booking UI Enforcement** - **Action:** MODIFY `src/frontend/src/components/provider/BookingRequests.tsx`. - **Content:** For cash jobs, call the backend to get the estimated commission. Fetch the provider's balance. If the balance is insufficient, disable the "Accept" button and display an informative message with a link to the new wallet page. Clearly display the estimated commission.

**PAUSE FOR CONFIRMATION (End of Phase 1)**

- **Action:** Stop and report to the user: "Phase 1 is complete. The Hybrid Commission Model and internal wallet system for cash jobs are now functional. The 'Top Up' button is manual. Should I proceed with Phase 2 to implement digital payments?"

---

### **Phase 2 (Day 2): Direct Digital Payments & Wallet Top-Up**

**Goal:** Enable direct-to-GCash payments via xenPlatform and automate wallet top-ups using Firebase Cloud Functions.

**2.1. Setup Firebase Cloud Functions** - **Action:** Initialize Cloud Functions within your existing Firebase project (`firebase init functions`). - **Content:** Create individual function files (e.g., `onboardProvider.js`, `createDirectPayment.js`, `xenditWebhook.js`) inside the `functions` directory.

**2.2. Implement Xendit Logic in Cloud Functions** - **Action:** Write the Node.js logic inside each new Cloud Function. - **Content:** - **`onboardProvider` function:** Handles creating a Xendit sub-account for a provider. - **`createDirectPayment` function:** Generates a xenPlatform invoice, including a `fee_rule` based on our commission logic. - **`createTopupInvoice` function:** Generates a standard Xendit invoice for wallet top-ups. - **`xenditWebhook` function:** This is the most critical function. It will have a public URL to receive notifications from Xendit. It must: 1. Verify the webhook signature to ensure it's from Xendit. 2. Call the appropriate ICP canister (`wallet.credit` or `booking.confirm_digital_payment`) using the Firebase Admin SDK to securely interact with your IC backend. 3. Use the Firebase Admin SDK to send a push notification to the user, confirming the payment status.

**2.3. Connect Booking Canister to Service** - **Action:** MODIFY `src/backend/function/booking.mo`. - **Content:** Add a secure function `confirm_digital_payment(booking_id: Text)` that can only be called by the Principal of your backend service (which will be managed via the Admin SDK).

**2.4. Frontend Provider Onboarding** - **Action:** CREATE `src/frontend/src/pages/provider/payout-settings.tsx`. - **Content:** Build a secure form for providers to submit their GCash details. This form will call the `onboardProvider` Cloud Function.

**2.5. Frontend Payment Flow Integration** - **Action:** MODIFY `src/frontend/src/pages/client/book/[id].tsx`. - **Content:** Update the UI to call the new Cloud Functions (`createDirectPayment`, etc.) when the user selects a payment option.

**2.6. Frontend Wallet Top-Up** - **Action:** MODIFY `src/frontend/src/pages/provider/wallet.tsx`. - **Content:** Connect the "Top Up" button to the `createTopupInvoice` Cloud Function to enable automated wallet top-ups.

**PAUSE FOR CONFIRMATION (End of Project)**

- **Action:** Stop and report to the user: "Project complete. The full payment integration is now implemented using Firebase Cloud Functions."
