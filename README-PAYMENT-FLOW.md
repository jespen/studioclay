# New Payment Flow Implementation

## Overview
We've implemented a new payment-first approach for Swish payments that:
1. Creates a payment record first
2. Only creates a booking after payment is confirmed
3. Updates course participant count after successful payment

This approach ensures that we don't have "ghost bookings" or incorrect participant counts when payments fail.

## Flow Comparison

### Previous Flow (Booking First)
1. Create booking (status: pending)
2. Update course participant count
3. Create payment linked to booking
4. Wait for payment confirmation
5. Update booking status to confirmed when payment is successful

**Problems with this approach:**
- Creates bookings that might never be completed
- Updates course participant count before payment confirmation
- Needs cleanup for abandoned/failed bookings

### New Flow (Payment First)
1. Create payment with user info (no booking yet)
2. Wait for payment confirmation
3. Once payment is confirmed:
   - Create booking (status: confirmed)
   - Update course participant count
   - Link payment to booking
   - Send confirmation email

**Benefits:**
- Only creates bookings for confirmed payments
- Only updates course participant count for confirmed payments
- No need for cleanup of abandoned bookings

## Implementation Details

### Database Changes
- Added `course_id` column to payments table
- Added `user_info` JSONB column to payments table

### API Endpoints Updated
1. `/api/payments/swish/create` - Now creates payment without booking
2. `/api/payments/callback` - Now creates booking when payment is confirmed
3. `/api/payments/status/[reference]` - Updated to handle payments without bookings

### Frontend Updates
1. `PaymentSelection.tsx` - Updated to use the new payment-first approach
2. Removed booking creation step in Swish payment flow
3. Updated status checking to handle the new response format

## Important Considerations
- Invoice payments continue to use the booking-first approach (intentional)
- Legacy Swish flow is still supported for backward compatibility
- Status API handles both payment formats (with/without booking)

## Testing Notes
- In development mode, Swish payments are auto-confirmed after 5 seconds
- Check that:
  - No booking is created initially
  - Booking is created after payment confirmation
  - Course participant count is updated after confirmation
  - Payment record is linked to booking after confirmation 