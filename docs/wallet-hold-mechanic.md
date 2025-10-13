# Wallet Hold Mechanic Implementation

## Overview

This document describes the implementation of a balance holding mechanism to fix a critical logic flaw in the booking system for CashOnHand payments.

## Problem Statement

### The Flaw

In the original `acceptBooking` function for CashOnHand payments, the system only validated that the provider had sufficient wallet balance to cover the commission fee. However, it did NOT hold or debit that amount upon acceptance.

**Exploitation Scenario:**

1. Provider tops up wallet with enough balance for 1 commission (e.g., 100 PHP)
2. Provider accepts multiple booking requests (e.g., 10 bookings, each requiring 100 PHP commission)
3. All 10 bookings pass the balance check since balance is still 100 PHP
4. Provider never completes the services (so commission never gets debited)
5. Result: Provider accepted 10 bookings but only has funds for 1 commission

This allowed providers to accept unlimited bookings with minimal wallet balance.

## Solution: Hold Mechanism

The hold mechanism reserves funds without creating transaction records, ensuring accurate commission calculations while maintaining clean transaction logs.

### Key Concepts

- **Balance**: Total amount in wallet
- **Held Balance**: Amount reserved for pending transactions
- **Available Balance**: `Balance - Held Balance` (what can actually be used)

### Wallet Data Structure

```javascript
{
  balance: 1000,              // Total balance
  heldBalance: 300,           // Amount currently held
  holds: [                    // Array of hold records
    {
      holdReference: "booking-123",
      amount: 100,
      reason: "Commission hold for booking #booking-123",
      createdAt: "2025-10-13T10:00:00Z"
    },
    {
      holdReference: "booking-456",
      amount: 200,
      reason: "Commission hold for booking #booking-456",
      createdAt: "2025-10-13T11:00:00Z"
    }
  ],
  updatedAt: "2025-10-13T11:00:00Z"
}
```

Available balance for new bookings: `1000 - 300 = 700 PHP`

## Implementation Details

### New Wallet Functions

#### 1. `holdBalanceInternal(userId, amount, holdReference, reason)`

**Purpose**: Hold funds without creating a transaction

**Process**:

- Validates available balance (balance - heldBalance)
- Creates a hold record with reference (bookingId)
- Increments heldBalance
- Does NOT create transaction log entry

**Returns**:

```javascript
{
  success: true,
  heldAmount: 100,
  totalHeldBalance: 300,
  availableBalance: 700
}
```

#### 2. `releaseHoldInternal(userId, holdReference)`

**Purpose**: Release a held amount back to available balance

**Process**:

- Finds hold by reference
- Removes hold from holds array
- Decrements heldBalance
- Does NOT create transaction log entry

**Use Cases**:

- Booking is cancelled
- Booking is declined
- Admin manually releases hold for dispute resolution

**Returns**:

```javascript
{
  success: true,
  releasedAmount: 100,
  totalHeldBalance: 200,
  availableBalance: 800
}
```

#### 3. `convertHoldToDebitInternal(userId, holdReference, description, paymentChannel)`

**Purpose**: Convert held amount to actual debit with transaction record

**Process**:

- Finds hold by reference
- Removes hold from holds array
- Debits the balance
- Decrements heldBalance
- **Creates transaction log entry** (commission payment)

**Use Cases**:

- Booking is completed (commission is finalized)

**Returns**:

```javascript
{
  success: true,
  newBalance: 900,
  transactionId: "txn_1697200000_abc123",
  debitedAmount: 100
}
```

#### 4. `releaseHold(userId, holdReference)` (Admin Cloud Function)

**Purpose**: Admin function for manual hold release

**Use Cases**:

- Dispute resolution
- System error recovery
- Manual intervention

#### 5. `getWalletDetails(userId)` (Cloud Function)

**Purpose**: Get comprehensive wallet information including holds

**Returns**:

```javascript
{
  success: true,
  balance: 1000,
  heldBalance: 300,
  availableBalance: 700,
  holds: [
    {
      holdReference: "booking-123",
      amount: 100,
      reason: "Commission hold for booking #booking-123",
      createdAt: "2025-10-13T10:00:00Z"
    }
  ]
}
```

### Updated Booking Functions

#### `validateCommissionBalance(booking)`

**Before**:

```javascript
const walletBalance = walletData.balance || 0;
return walletBalance >= commissionFee;
```

**After**:

```javascript
const walletBalance = walletData.balance || 0;
const heldBalance = walletData.heldBalance || 0;
const availableBalance = walletBalance - heldBalance;
return availableBalance >= commissionFee;
```

#### `acceptBooking(bookingId, scheduledDate)`

**New Logic**:

1. Validate commission balance (checks available balance)
2. Calculate commission amount
3. **Hold the commission** using `holdBalanceInternal()`
4. Update booking status to "Accepted"
5. Cancel conflicting bookings
6. Send notifications

**Code Addition**:

```javascript
// Hold commission for cash jobs to prevent over-acceptance
if (booking.paymentMethod === "CashOnHand") {
  // Calculate commission...

  await holdBalanceInternal(
    booking.providerId,
    totalCommission,
    bookingId,
    `Commission hold for booking #${bookingId}`,
  );
}
```

#### `completeBooking(bookingId, amountPaid)`

**Before**:

- Directly debited commission using `debitBalanceInternal()`

**After**:

- **Converts hold to debit** using `convertHoldToDebitInternal()`
- If conversion fails, releases the hold to avoid stuck funds

**Code Change**:

```javascript
// Convert held commission to debit (creates transaction record)
try {
  await convertHoldToDebitInternal(
    booking.providerId,
    bookingId,
    commissionDescription,
    "SRV_COMMISSION",
  );
} catch (debitError) {
  // If conversion fails, release the hold
  await releaseHoldInternal(booking.providerId, bookingId);
  throw error;
}
```

#### `cancelBooking(bookingId)`

**New Logic**:

- Release held commission if booking was "Accepted"
- Only releases for CashOnHand payments
- Continues even if release fails (logs error)

**Code Addition**:

```javascript
// Release held commission for cash jobs (if booking was accepted)
if (booking.paymentMethod === "CashOnHand" && booking.status === "Accepted") {
  try {
    await releaseHoldInternal(booking.providerId, bookingId);
  } catch (releaseError) {
    console.error(`Failed to release held commission: ${releaseError.message}`);
    // Don't throw - cancellation should succeed
  }
}
```

## Flow Diagrams

### Happy Path (Booking Completed)

```
1. Client creates booking
2. Provider accepts booking
   → holdBalanceInternal(provider, commission, bookingId)
   → Available balance reduced
3. Provider completes booking
   → convertHoldToDebitInternal(provider, bookingId)
   → Hold released, balance debited, transaction logged
4. Commission successfully deducted ✓
```

### Cancellation Path

```
1. Client creates booking
2. Provider accepts booking
   → holdBalanceInternal(provider, commission, bookingId)
   → Available balance reduced
3. Client/Provider cancels booking
   → releaseHoldInternal(provider, bookingId)
   → Hold released, available balance restored
4. No commission charged ✓
```

### Multiple Booking Scenario (Fixed)

**Before Fix**:

```
Balance: 100 PHP (commission = 100 PHP each)
Accept Booking #1 → ✓ (balance check passes)
Accept Booking #2 → ✓ (balance check still passes!)
Accept Booking #3 → ✓ (still passes! BUG)
```

**After Fix**:

```
Balance: 100 PHP, Held: 0, Available: 100
Accept Booking #1 → ✓ (holds 100, Available: 0)
Accept Booking #2 → ✗ (insufficient available balance)
```

## Benefits

1. **Prevents Over-Acceptance**: Providers can only accept as many bookings as they can afford
2. **Clean Transaction Logs**: Holds don't create transaction entries until finalized
3. **Accurate Balance Tracking**: Separates committed funds from available funds
4. **Dispute Support**: Admins can manually release holds for dispute resolution
5. **Cancellation Support**: Holds are automatically released on cancellation
6. **Transparency**: `getWalletDetails()` shows all holds for auditing

## API Changes

### New Exported Functions (index.js)

```javascript
exports.releaseHold = releaseHold; // Admin function
exports.getWalletDetails = getWalletDetails; // User/Admin function
```

### Updated Function Response (getBalance)

**Before**:

```javascript
{
  success: true,
  balance: 1000
}
```

**After**:

```javascript
{
  success: true,
  balance: 1000,
  heldBalance: 300,
  availableBalance: 700
}
```

## Testing Scenarios

### Test 1: Multiple Booking Prevention

```javascript
// Provider has 100 PHP
// Each booking requires 100 PHP commission

// Should succeed
await acceptBooking("booking-1", scheduledDate);
// Provider now has: balance=100, held=100, available=0

// Should fail with "Insufficient available balance"
await acceptBooking("booking-2", scheduledDate);
```

### Test 2: Cancellation Releases Hold

```javascript
await acceptBooking("booking-1", scheduledDate);
// balance=100, held=100, available=0

await cancelBooking("booking-1");
// balance=100, held=0, available=100

// Now this should succeed
await acceptBooking("booking-2", scheduledDate);
```

### Test 3: Completion Debits Correctly

```javascript
await acceptBooking("booking-1", scheduledDate);
// balance=1000, held=100, available=900

await completeBooking("booking-1");
// balance=900, held=0, available=900
// Transaction created in logs
```

## Migration Notes

### Existing Bookings

For bookings created before this update:

- No holds exist in wallet
- `completeBooking` will fail if trying to convert non-existent hold
- **Workaround**: Falls back to direct debit if hold not found

### Wallet Data Migration

No database migration required. The system gracefully handles:

- Wallets without `heldBalance` field (defaults to 0)
- Wallets without `holds` array (defaults to empty array)

## Security Considerations

1. **Hold References**: Use bookingId as unique reference to prevent duplicate holds
2. **Admin-Only Release**: Manual release restricted to admin users only
3. **Atomic Operations**: All hold operations use Firestore transactions
4. **Error Handling**: Failed conversions automatically release holds

## Future Enhancements

1. **Hold Expiration**: Automatically release holds after X days
2. **Hold Notifications**: Notify providers when holds are placed/released
3. **Hold History**: Track hold lifecycle in separate collection
4. **Partial Holds**: Support holding partial amounts for complex scenarios

## Related Files

- `functions/src/wallet.js` - Hold mechanic implementation
- `functions/src/booking.js` - Booking integration
- `functions/index.js` - Function exports
- `docs/wallet-hold-mechanic.md` - This documentation

## Changelog Entry

```markdown
## [Unreleased]

### Added

- Add wallet hold mechanic for commission reservation in CashOnHand bookings

### Fixed

- Fix logic flaw allowing providers to accept unlimited bookings with minimal wallet balance
```
