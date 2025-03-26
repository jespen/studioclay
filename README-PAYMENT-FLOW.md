# Payment Flow Implementation

## Overview
The payment system is designed as a generic solution that works across multiple product types:
- Course bookings
- Gift cards
- Shop items

## Current Setup and Configuration

### API Endpoints and URLs
```typescript
// Test Environment
const TEST_BASE_URL = 'https://mss.cpc.getswish.net'
const TEST_API_VERSION = '/swish-cpcapi/api/v1'

// Production Environment
const PROD_BASE_URL = 'https://cpc.getswish.net'
const PROD_API_VERSION = '/swish-cpcapi/api/v1'

// Endpoints
const ENDPOINTS = {
  createPayment: '/paymentrequests',
  getPayment: '/paymentrequests',
  cancelPayment: '/paymentrequests/cancel'
}
```

### Certificate Structure
```bash
/certs
  /swish
    /test
      Swish_Merchant_TestCertificate_1234679304.pem  # Certificate
      Swish_Merchant_TestCertificate_1234679304.key  # Private key
      Swish_TLS_RootCA.pem                          # CA certificate
    /prod
      [CERT].pem    # Production certificate
      [KEY].key     # Production private key
      [CA].pem      # Production CA certificate
```

### Environment Variables
```bash
# Base Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # Development
NEXT_PUBLIC_BASE_URL=https://studioclay.se  # Production

# Swish Mode
NEXT_PUBLIC_SWISH_TEST_MODE=true    # Development
NEXT_PUBLIC_SWISH_TEST_MODE=false   # Production

# Swish Test Configuration
SWISH_TEST_API_URL=https://mss.cpc.getswish.net/swish-cpcapi/api/v1
SWISH_TEST_PAYEE_ALIAS=1234679304
SWISH_TEST_CERT_PATH=certs/swish/test/Swish_Merchant_TestCertificate_1234679304.pem
SWISH_TEST_KEY_PATH=certs/swish/test/Swish_Merchant_TestCertificate_1234679304.key
SWISH_TEST_CA_PATH=certs/swish/test/Swish_TLS_RootCA.pem

# Swish Production Configuration
SWISH_PROD_API_URL=https://cpc.getswish.net/swish-cpcapi/api/v1
SWISH_PROD_PAYEE_ALIAS=[YOUR_SWISH_NUMBER]
SWISH_PROD_CERT_PATH=certs/swish/prod/[CERT].pem
SWISH_PROD_KEY_PATH=certs/swish/prod/[KEY].key
SWISH_PROD_CA_PATH=certs/swish/prod/[CA].pem

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_KEY]
```

### Frontend Implementation
Located in `src/components/booking/PaymentSelection.tsx`:
```typescript
interface PaymentRequest {
  phone_number: string;      // Format: 0739000001
  payment_method: "swish";
  product_type: "course";
  product_id: string;
  amount: number;
  quantity: number;
  user_info: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    numberOfParticipants: string;
  };
}
```

### Backend Implementation
Key files:
- `src/app/api/payments/swish/create/route.ts`: Creates Swish payment
- `src/app/api/payments/swish/callback/route.ts`: Handles Swish callbacks
- `src/app/api/payments/status/[reference]/route.ts`: Checks payment status

### Database Schema (Supabase)
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'CREATED',
  payment_method TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SEK',
  payment_reference TEXT NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('course', 'gift_card', 'shop_item')),
  product_id UUID NOT NULL,
  user_info JSONB NOT NULL,
  metadata JSONB,
  booking_id UUID REFERENCES bookings(id),
  phone_number TEXT NOT NULL
);

-- Valid Payment Status Values (matching Swish API)
-- 'CREATED'   - Initial state when payment is created
-- 'PAID'      - Payment confirmed by Swish
-- 'ERROR'     - Payment failed (technical error)
-- 'DECLINED'  - Payment declined by user or Swish
```

### Security Implementation
1. **Certificate Handling**:
   - Certificates stored in `/certs/swish/[test|prod]`
   - File permissions: 600 for certificates
   - Directory permissions: 700

2. **Request Validation**:
   - Idempotency key required for payment creation
   - Rate limiting on payment endpoints
   - Signature validation for callbacks (production only)

3. **Public Endpoints** (No Auth Required):
   - `/api/payments/swish/create`
   - `/api/payments/swish/callback`
   - `/api/payments/status/[reference]`

### Test Environment
- Uses Swish MSS (Merchant Swish Simulator)
- Test merchant number: 1234679304
- Test phone numbers:
  - `0739000001`: Returns PAID
  - `0739000002`: Returns DECLINED
  - `0739000003`: Returns ERROR

### Complete Payment Flow
1. **Frontend Validation**:
   - Validate phone number format
   - Generate idempotency key
   - Format data according to schema

2. **Payment Creation**:
   - Frontend sends request to `/api/payments/swish/create`
   - Backend creates payment record (status: CREATED)
   - Backend calls Swish API
   - Returns payment reference to frontend

3. **Status Monitoring**:
   - Frontend polls `/api/payments/status/[reference]`
   - Backend checks local database status
   - Polling continues until final status or timeout

4. **Payment Completion**:
   - User approves in Swish app
   - Swish sends callback to our endpoint
   - Backend verifies callback and updates status
   - Frontend receives updated status on next poll

5. **Post-Payment Actions**:
   - Create booking record
   - Send confirmation email
   - Update course availability

### Error Handling
1. **Network Errors**:
   - Retry with same idempotency key
   - Max 3 retries with exponential backoff

2. **Validation Errors**:
   - Clear error messages to frontend
   - Logging for debugging

3. **Timeout Handling**:
   - Frontend: 60 second timeout (30 polls * 2 seconds)
   - Backend: 30 second timeout for Swish API calls

## Implementation Choices

### Idempotency Handling
For a small pottery studio with limited transaction volume (a few courses per month), we've chosen a simplified but robust approach to handle idempotency:

- **Storage**: Using Supabase's `payments` table with `metadata->idempotency_key` instead of a separate Redis cache
- **Benefits**:
  - Reduced infrastructure complexity
  - Single source of truth for all payment data
  - No additional service dependencies
  - Sufficient performance for our scale
- **Implementation**: Each payment request includes an idempotency key that's stored in the payment metadata

This approach was chosen because:
1. Our transaction volume is low (few courses per month)
2. Response time requirements are not millisecond-critical
3. Simplified maintenance and reduced operational costs
4. Supabase provides sufficient performance for our needs

## Database Structure

### Tables

```sql
-- Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'CREATED',
    payment_method TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'SEK',
    payment_reference TEXT NOT NULL,
    product_type TEXT NOT NULL CHECK (product_type IN ('course', 'gift_card', 'shop_item')),
    product_id UUID NOT NULL,
    user_info JSONB NOT NULL,
    metadata JSONB, -- Contains idempotency_key and other payment-specific data
    booking_id UUID REFERENCES bookings(id),
    phone_number TEXT NOT NULL -- Required for Swish payments
);

-- Valid Payment Status Values (matching Swish API)
-- 'CREATED'   - Initial state when payment is created
-- 'PAID'      - Payment confirmed by Swish
-- 'ERROR'     - Payment failed (technical error)
-- 'DECLINED'  - Payment declined by user or Swish
```

## Payment Flow

### 1. Payment Creation
- User selects product(s) and payment method
- Frontend generates unique idempotency key (UUID)
- Frontend calls appropriate payment endpoint based on method:

For Swish payments (`/api/payments/swish/create`):
```typescript
interface SwishPaymentRequest {
  phone_number: string;  // Required: The Swish phone number to send payment request to (stored in payments.phone_number)
  payment_method: "swish"; // Required: Must be "swish" for Swish payments
  product_type: "course" | "gift_card" | "shop_item";
  product_id: string;
  amount: number;
  quantity: number;
  user_info: {  // Required user info
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    numberOfParticipants: string;
  };
}
```

### 2. Payment Method Specific Flow

#### Swish Flow
1. Backend calls Swish API with payment details
2. Payment status set to "CREATED"
3. Frontend shows Swish payment dialog
4. User completes payment in Swish app
5. Swish calls our callback endpoint
6. Backend verifies payment with Swish
7. Payment status updated to "PAID" or "DECLINED"

### 3. Post-Payment Actions
When payment status becomes "PAID":
1. Create product-specific record:
   - For courses: Create booking
   - For gift cards: Generate and activate gift card
   - For shop items: Create order
2. Update inventory/participant counts if applicable
3. Send confirmation email
4. Return success to frontend

## API Endpoints

### Payment Creation and Management
```typescript
// Create new Swish payment
POST /api/payments/swish/create
Body: SwishPaymentRequest
Returns: { success: boolean, paymentReference: string }

// Get payment status
GET /api/payments/status/[reference]
Returns: { 
  success: boolean, 
  data: {
    payment: {
      reference: string,
      status: "CREATED" | "PAID" | "ERROR" | "DECLINED",
      amount: number
    },
    booking: BookingData | null
  }
}

// Payment provider callbacks
POST /api/payments/swish/callback
Body: SwishCallbackData
Returns: { success: boolean }
```

## Error Handling

### Payment Errors
- Technical errors: Status set to "ERROR"
- User cancellation: Status set to "DECLINED"
- Provider decline: Status set to "DECLINED"

### Recovery Procedures
1. For technical errors:
   - Safe to retry with same idempotency key
   - Original response returned if payment exists
2. For user cancellation:
   - New idempotency key required for new attempt
   - Original payment marked as declined
3. For declined payments:
   - New idempotency key required for new attempt
   - Original payment marked as declined

## Security Considerations

### Certificates and Keys
- Swish certificates stored in `/certs/swish/[test|prod]`
- Certificates have restricted permissions (600)
- Directories have restricted permissions (700)

### Environment Variables
```bash
# Swish Configuration
SWISH_TEST_MODE=true|false
SWISH_TEST_CERT_PATH=certs/swish/test/Swish_Merchant_TestCertificate_[NUMBER].pem
SWISH_TEST_KEY_PATH=certs/swish/test/Swish_Merchant_TestCertificate_[NUMBER].key
SWISH_TEST_CA_PATH=certs/swish/test/Swish_TLS_RootCA.pem
SWISH_TEST_PAYEE_ALIAS=[NUMBER]
SWISH_PROD_CERT_PATH=certs/swish/prod/[CERT].pem
SWISH_PROD_KEY_PATH=certs/swish/prod/[KEY].key
SWISH_PROD_CA_PATH=certs/swish/prod/[CA].pem
SWISH_PROD_PAYEE_ALIAS=[NUMBER]

# Database Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Testing

### Test Environment
- All development uses Swish MSS (Merchant Swish Simulator)
- Test phone numbers:
  - `0739000001`: Successful payment (status: PAID)
  - `0739000002`: Declined payment (status: DECLINED)
  - `0739000003`: Technical error (status: ERROR)

### Test Scenarios
1. Happy path: Complete payment flow
2. Cancellation: User cancels payment
3. Error handling: Technical errors
4. Timeout: Payment timeout handling
5. Duplicate requests: Idempotency handling (using same key)

NEXT_PUBLIC_SWISH_TEST_MODE=true
SWISH_TEST_API_URL=https://mss.cpc.getswish.net/swish-cpcapi/api/v2
SWISH_TEST_PAYEE_ALIAS=1234679304
NEXT_PUBLIC_BASE_URL=http://localhost:3000
SWISH_TEST_CERT_PATH=certs/swish/test/Swish_Merchant_TestCertificate_1234679304.pem
SWISH_TEST_KEY_PATH=certs/swish/test/Swish_Merchant_TestCertificate_1234679304.key
SWISH_TEST_CA_PATH=certs/swish/test/Swish_TLS_RootCA.pem

## ✅ VERIFIED WORKING IMPLEMENTATION

### Current Working Version Details
This section documents the exact implementation that has been verified to work with Swish test environment.

### 🔑 Key Files and Their Roles

1. **Frontend Payment Handler** (`src/components/booking/PaymentSelection.tsx`):
```typescript
// Verified working payment request format
const paymentData = {
  phone_number: formattedPhone,    // Format: "0739000001" (converted to "46739000001" in backend)
  payment_method: "swish",
  product_type: "course",
  product_id: courseId,            // UUID from course
  amount: amount,                  // Integer in SEK
  quantity: parseInt(userInfo?.numberOfParticipants || '1'),
  user_info: {
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    numberOfParticipants: string
  }
};

// Verified working status polling configuration
const POLLING_INTERVAL = 2000;     // 2 seconds
const MAX_POLLING_ATTEMPTS = 30;   // Total timeout: 60 seconds
```

2. **Swish Service** (`src/services/swish/swishService.ts`):
```typescript
// ✅ Working Swish service implementation
class SwishService {
  private static instance: SwishService;
  private readonly payeeAlias: string;
  private readonly baseUrl: string;
  private readonly certPath: string;
  private readonly keyPath: string;
  private readonly caPath: string;

  // Singleton pattern for consistent configuration
  public static getInstance(): SwishService {
    if (!SwishService.instance) {
      SwishService.instance = new SwishService();
    }
    return SwishService.instance;
  }

  // Handles phone number formatting and API requests
  public formatPhoneNumber(phone: string): string {
    // Converts "0739000001" to "46739000001"
  }

  public async createPayment(data: SwishPaymentData): Promise<SwishPaymentResponse> {
    // Handles Swish API communication
  }
}
```

3. **Swish Payment Creator** (`src/app/api/payments/swish/create/route.ts`):
```typescript
// ✅ Working Swish API configuration
const baseUrl = isTestMode 
  ? 'https://mss.cpc.getswish.net'
  : 'https://cpc.getswish.net';
const endpoint = '/swish-cpcapi/api/v1/paymentrequests';

// ✅ Working Swish payment request format
const paymentData = {
  payeePaymentReference: paymentReference,  // Format: "SC-XXXXXX-XXX"
  callbackUrl: callbackUrl,                 // Must be HTTPS
  payeeAlias: process.env.NEXT_PUBLIC_SWISH_TEST_MODE === 'true' 
    ? process.env.SWISH_TEST_PAYEE_ALIAS! 
    : process.env.SWISH_PROD_PAYEE_ALIAS!,
  amount: amount.toFixed(2),                // String with 2 decimals
  currency: "SEK",
  message: `Betalning för ${product_id}`.substring(0, 50),
  payerAlias: payerAlias                    // Format: "46739000001"
};
```

4. **Status Checker** (`src/app/api/payments/status/[reference]/route.ts`):
```typescript
// ✅ Working status check implementation
export async function GET(
  request: Request,
  { params }: { params: { reference: string } }
) {
  // Only check local database status, do not call Swish API
  const { data: payment } = await supabase
    .from('payments')
    .select('*, bookings(*)')
    .eq('payment_reference', reference)
    .single();

  return NextResponse.json({
    success: true,
    data: {
      payment: {
        reference: payment.payment_reference,
        status: payment.status,
        amount: payment.amount,
        metadata: payment.metadata
      },
      booking: payment.bookings?.[0] || null
    }
  });
}
```

5. **Callback Handler** (`src/app/api/payments/swish/callback/route.ts`):
```typescript
// ✅ Working callback data format from Swish
interface SwishCallbackData {
  payeePaymentReference: string;  // Our payment reference
  paymentReference: string;       // Swish payment reference
  status: "PAID" | "DECLINED" | "ERROR";
  amount: string;
  currency: string;
  timestamp: string;
  errorCode?: string;
  errorMessage?: string;
}
```

### 📁 Required File Structure
```
/studioclay
  /src
    /app
      /api
        /payments
          /swish
            /create
              route.ts       ✅ Working
            /callback
              route.ts       ✅ Working
          /status
            /[reference]
              route.ts       ✅ Working
    /components
      /booking
        PaymentSelection.tsx ✅ Working
        SwishPaymentDialog.tsx ✅ New: Extracted dialog component
    /hooks
      useSwishPaymentStatus.ts ✅ New: Custom hook for payment status
    /services
      /swish
        swishService.ts      ✅ New: Handles all Swish-specific logic
        types.ts            ✅ New: Contains Swish-related types
    /utils
      /admin/              ✅ Working
      apiUtils.ts          ✅ Working
      booking.ts           ✅ Working
      confirmationEmail.ts ✅ Working
      invoiceEmail.ts      ✅ Working
      invoicePDF.ts        ✅ Working
      security.ts          ✅ Working
      serverEmail.ts       ✅ Working
      supabase.ts          ✅ Working
  /certs
    /swish
      /test               ✅ Required for test environment
        Swish_Merchant_TestCertificate_1234679304.pem
        Swish_Merchant_TestCertificate_1234679304.key
        Swish_TLS_RootCA.pem
      /prod              🔄 Required for production
        [CERT].pem
        [KEY].key
        [CA].pem
```

### 🔐 Required Environment Variables
```bash
# ✅ VERIFIED WORKING CONFIGURATION
NEXT_PUBLIC_SWISH_TEST_MODE=true
SWISH_TEST_API_URL=https://mss.cpc.getswish.net/swish-cpcapi/api/v1
SWISH_TEST_PAYEE_ALIAS=1234679304
NEXT_PUBLIC_BASE_URL=http://localhost:3000
SWISH_TEST_CERT_PATH=certs/swish/test/Swish_Merchant_TestCertificate_1234679304.pem
SWISH_TEST_KEY_PATH=certs/swish/test/Swish_Merchant_TestCertificate_1234679304.key
SWISH_TEST_CA_PATH=certs/swish/test/Swish_TLS_RootCA.pem
```

### 💾 Database Schema (Supabase)
```sql
-- ✅ VERIFIED WORKING SCHEMA
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'CREATED',
    payment_method TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'SEK',
    payment_reference TEXT NOT NULL,
    product_type TEXT NOT NULL,
    product_id UUID NOT NULL,
    user_info JSONB NOT NULL,
    metadata JSONB,
    phone_number TEXT NOT NULL
);

-- ✅ VERIFIED WORKING STATUS VALUES
-- Only these statuses are currently used and working:
-- 'CREATED'  - Initial state when payment is created
-- 'PAID'     - Payment confirmed
-- 'ERROR'    - Technical error
-- 'DECLINED' - Payment declined
```

### 🔄 Working Payment Flow
1. **Create Payment** (Verified working)
   ```typescript
   POST /api/payments/swish/create
   Headers: {
     'Content-Type': 'application/json',
     'Idempotency-Key': uuid()
   }
   Body: PaymentRequest
   Response: { success: true, data: { reference: "SC-XXXXXX-XXX" } }
   ```

2. **Check Status** (Verified working)
   ```typescript
   GET /api/payments/status/[reference]
   Response: {
     success: true,
     data: {
       payment: {
         reference: string,
         status: "CREATED" | "PAID" | "ERROR" | "DECLINED",
         amount: number
       },
       booking: BookingData | null
     }
   }
   ```

3. **Handle Callback** (Verified working)
   ```typescript
   POST /api/payments/swish/callback
   Body: SwishCallbackData
   Response: { success: true }
   ```

### ⚠️ Known Working Limitations
1. Only works with test phone number `0739000001` in test environment
2. Callback URL must be HTTPS (use ngrok for local testing)
3. Amount must be positive integer in SEK
4. Payment reference format must be "SC-XXXXXX-XXX"
5. Phone numbers must be converted to 46-format (e.g., "0739000001" → "46739000001")

### 🚫 Non-Working/Removed Features
1. ❌ Direct Swish status checking (removed, only use local database)
2. ❌ Payment cancellation (not implemented)
3. ❌ Refund handling (not implemented)
4. ❌ Multiple payment attempts tracking (not implemented)
5. ❌ Payment status history (table exists but not used)

### 🔄 Recent Changes
1. **New Service Layer**:
   - Added `SwishService` class for centralized Swish handling
   - Moved phone number formatting and API communication to service
   - Implemented singleton pattern for consistent configuration

2. **Type System Improvements**:
   - Moved `PaymentStatus` from component to `types.ts`
   - Replaced enum with type union and constant object
   - Improved type safety across the payment system
   - Centralized all Swish-related types in `services/swish/types.ts`

3. **Code Organization**:
   - Better separation of concerns
   - Improved type safety with dedicated types file
   - More maintainable and testable code structure
   - All Swish-related code now centralized in `services/swish`

4. **Removed Files**:
   - Removed `src/utils/payments.ts` (functionality moved to `SwishService`)
   - Removed `src/lib/swish.ts` (functionality moved to `SwishService`)
   - Removed empty `src/lib/swish` directory
   - Removed unused Swish configuration files
