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

---

### **Phase 3 (Advanced): Payment Flow Enhancement & Environment Integration**

**Goal:** Enhance payment flows with dynamic commission integration, implement payment holding/release mechanism, improve frontend payment tracking, and create comprehensive cash job wallet deduction system.

**3.1. Enhanced Direct Payment with Dynamic Commission Integration**
- **Action:** MODIFY `functions/createDirectPayment.js`.
- **Content:** 
  - Add environment detection (local vs deployed/playground) for proper canister ID resolution
  - Implement automatic payout creation within the function (not just webhook)
  - Add payment holding logic where payments are collected but payouts are held until booking completion
  - Include comprehensive error handling and logging for commission calculation failures
  - Add metadata tracking for payment status transitions (held → released → completed)

**3.2. Payment Holding and Release Mechanism**
- **Action:** MODIFY `functions/xenditWebhook.js` and CREATE `functions/releaseHeldPayment.js`.
- **Content:**
  - Enhance webhook to handle payment holding instead of immediate payout
  - Create separate function to release held payments when bookings are completed
  - Implement Firestore-based payment state management (pending → paid → held → released → completed)
  - Add automatic commission retention and provider payout calculation
  - Include booking status validation before payment release
  - Add comprehensive audit trail for payment state changes

**3.3. Frontend Payment Progress Enhancement**
- **Action:** MODIFY `src/frontend/src/pages/provider/bookings.tsx` and related booking components.
- **Content:**
  - Add payment progress tracking UI component showing: Payment Pending → Payment Received → Payment Held → Payment Released → Payment Completed
  - Implement real-time payment status updates using Firestore listeners
  - Add payment timeline visualization for e-wallet payments
  - Include estimated payment release date based on booking completion
  - Add payment amount breakdown showing original amount, commission, and net provider amount
  - Implement payment status badges and progress indicators

**3.4. Enhanced Booking Canister for Payment Integration**
- **Action:** MODIFY `src/backend/function/booking.mo`.
- **Content:**
  - Add payment status tracking fields to Booking type (paymentStatus, paymentId, heldAmount, releaseDate)
  - Implement `releasePayment(booking_id: Text)` function that triggers payment release
  - Add `getPaymentStatus(booking_id: Text)` query function for frontend status checks
  - Enhance `completeBooking()` to automatically trigger payment release for digital payments
  - Add payment validation checks in booking state transitions
  - Include comprehensive payment history tracking within booking records

**3.5. Enhanced Cash Job Wallet Deduction System**
- **Action:** MODIFY `src/backend/function/wallet.mo` and CREATE `functions/processCashCommission.js`.
- **Content:**
  - Enhance wallet.mo with `deductCommission(provider: Principal, booking_id: Text, amount: Nat)` function
  - Add transaction categorization for commission deductions with booking reference
  - Create Firebase function `processCashCommission.js` that calls wallet canister for commission deduction
  - Implement environment-aware canister communication (local/deployed/playground)
  - Add comprehensive error handling for insufficient balance scenarios
  - Include automatic wallet top-up suggestions when balance is insufficient
  - Add commission deduction confirmation system with provider notifications

**3.6. Environment-Aware Canister Integration**
- **Action:** CREATE `functions/utils/canisterConfig.js` and MODIFY all canister-calling functions.
- **Content:**
  - Create centralized canister configuration utility detecting environment (local, ic, playground)
  - Implement automatic canister ID resolution based on environment
  - Add proper authentication setup for each environment type
  - Include connection validation and retry mechanisms
  - Add comprehensive logging for canister communication debugging
  - Implement fallback mechanisms for network issues

**3.7. Advanced Frontend Payment Dashboard**
- **Action:** CREATE `src/frontend/src/pages/provider/payment-dashboard.tsx`.
- **Content:**
  - Build comprehensive payment dashboard showing all payment types (digital, cash, wallet)
  - Implement payment analytics with earnings breakdown by payment method
  - Add held payment monitoring with expected release dates
  - Include commission tracking and wallet balance trends
  - Add payment method performance metrics and recommendations
  - Implement export functionality for payment reports

**3.8. Comprehensive Testing and Validation**
- **Action:** CREATE test files for each new function and component.
- **Content:**
  - Create unit tests for enhanced commission calculation logic
  - Add integration tests for payment holding and release flow
  - Implement end-to-end tests for complete payment cycles
  - Add environment switching tests (local ↔ deployed)
  - Include error scenario testing (insufficient balance, network failures, etc.)
  - Add performance testing for high-volume payment processing

**PAUSE FOR CONFIRMATION (End of Phase 3)**

- **Action:** Stop and report to the user: "Phase 3 is complete. The payment system now includes dynamic commission integration, payment holding/release mechanisms, enhanced frontend tracking, and comprehensive cash job wallet deduction with multi-environment support. The system is production-ready with full payment lifecycle management."
