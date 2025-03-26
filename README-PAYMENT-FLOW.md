# Payment Flow Implementation

## Overview
The payment system is designed as a generic solution that works across multiple product types:
- Course bookings
- Gift cards
- Shop items

## Current Implementation

### Component Structure
```
/src/components/booking/
  ├── PaymentSelection.tsx      # Main payment selection component
  ├── SwishPaymentSection.tsx   # Handles Swish-specific payment logic
  ├── SwishPaymentForm.tsx      # Swish phone number input form
  └── SwishPaymentDialog.tsx    # Dialog showing payment status
```

### Key Components

1. **PaymentSelection**
   - Main component for payment method selection
   - Handles both Swish and invoice payments
   - Manages form state and validation
   - Coordinates between different payment methods

2. **SwishPaymentSection**
   - Handles all Swish-specific payment logic
   - Manages phone number validation
   - Creates and monitors Swish payments
   - Exposes payment creation via ref

3. **useSwishPaymentStatus**
   - Custom hook for managing Swish payment status
   - Handles polling and status updates
   - Manages payment dialog state
   - Handles success/failure redirects

### Payment Flow

1. **Payment Creation**
   ```typescript
   // In SwishPaymentSection
   const handleCreatePayment = async (): Promise<boolean> => {
     // Validate phone number
     // Create payment via SwishPaymentService
     // Show payment dialog
     // Start status polling
   };
   ```

2. **Status Monitoring**
   ```typescript
   // In useSwishPaymentStatus
   useEffect(() => {
     // Poll status every 2 seconds
     // Update dialog state
     // Handle success/failure
   }, [paymentReference]);
   ```

3. **Payment Completion**
   - User approves in Swish app
   - Status updates via polling
   - Redirect to confirmation on success

### API Endpoints

```typescript
// Create Swish payment
POST /api/payments/swish/create
Body: {
  phone_number: string;
  payment_method: "swish";
  product_type: "course";
  product_id: string;
  amount: number;
  quantity: number;
  user_info: UserInfo;
}

// Check payment status
GET /api/payments/status/[reference]
Response: {
  success: boolean;
  data: {
    payment: {
      reference: string;
      status: "CREATED" | "PAID" | "ERROR" | "DECLINED";
      amount: number;
    };
    booking: BookingData | null;
  }
}
```

### Environment Variables
```bash
# Swish Configuration
NEXT_PUBLIC_SWISH_TEST_MODE=true|false
SWISH_TEST_API_URL=https://mss.cpc.getswish.net/swish-cpcapi/api/v1
SWISH_TEST_PAYEE_ALIAS=1234679304
SWISH_TEST_CERT_PATH=certs/swish/test/Swish_Merchant_TestCertificate_1234679304.pem
SWISH_TEST_KEY_PATH=certs/swish/test/Swish_Merchant_TestCertificate_1234679304.key
SWISH_TEST_CA_PATH=certs/swish/test/Swish_TLS_RootCA.pem
```

### Database Schema
```sql
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
```

### Recent Changes
1. **Component Refactoring**
   - Extracted Swish payment logic to dedicated components
   - Implemented ref-based communication
   - Improved error handling and validation

2. **Code Organization**
   - Separated concerns between components
   - Created custom hook for payment status
   - Improved type safety

3. **Payment Flow**
   - Streamlined payment creation process
   - Enhanced status monitoring
   - Better error handling and user feedback

### Test Environment
- Uses Swish MSS (Merchant Swish Simulator)
- Test phone numbers:
  - `0739000001`: Returns PAID
  - `0739000002`: Returns DECLINED
  - `0739000003`: Returns ERROR

### Security Considerations
1. **Certificate Handling**
   - Certificates stored in `/certs/swish/[test|prod]`
   - Restricted file permissions (600)
   - Restricted directory permissions (700)

2. **Request Validation**
   - Idempotency key required
   - Rate limiting on endpoints
   - Signature validation for callbacks

### Next Steps
1. **Code Cleanup**
   - Remove unused Swish code from PaymentSelection
   - Simplify validation logic
   - Improve error messages

2. **Testing**
   - Add unit tests for components
   - Add integration tests for payment flow
   - Test error scenarios

3. **Documentation**
   - Add JSDoc comments
   - Create component documentation
   - Update API documentation