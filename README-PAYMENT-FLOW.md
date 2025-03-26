# Payment System Documentation

## Overview
The payment system is designed as a generic solution that works across multiple product types:
- Course bookings
- Gift cards
- Shop items

## Component Structure
```
/src/components/booking/
  ├── PaymentSelection.tsx      # Main payment selection component
  ├── SwishPaymentSection.tsx   # Handles Swish-specific payment logic
  ├── SwishPaymentForm.tsx      # Swish phone number input form
  ├── SwishPaymentDialog.tsx    # Dialog showing payment status
  └── InvoicePaymentSection.tsx # Handles invoice-specific payment logic
```

## Key Components

### 1. PaymentSelection
The main component for payment method selection that:
- Handles both Swish and invoice payments
- Manages form state and validation
- Coordinates between different payment methods
- Provides a unified interface for payment processing

### 2. SwishPaymentSection
Handles all Swish-specific payment logic:
- Manages phone number validation
- Creates and monitors Swish payments
- Exposes payment creation via ref
- Handles payment status updates

### 3. InvoicePaymentSection
Handles all invoice-specific payment logic:
- Manages address validation
- Creates and stores invoice PDFs
- Generates invoice numbers
- Handles invoice status updates
- Exposes payment creation via ref
- Integrates with PDF generation service

### 4. useSwishPaymentStatus
Custom hook for managing Swish payment status:
- Handles polling and status updates
- Manages payment dialog state
- Handles success/failure redirects

## Payment Flow

### 1. Payment Creation
```typescript
// In SwishPaymentSection
const handleCreatePayment = async (): Promise<boolean> => {
  // Validate phone number
  // Create payment via SwishPaymentService
  // Show payment dialog
  // Start status polling
};

// In InvoicePaymentSection
const handleCreatePayment = async (): Promise<boolean> => {
  // Validate address
  // Generate invoice number
  // Create invoice PDF
  // Store PDF in storage
  // Create booking with invoice details
};
```

### 2. Status Monitoring
```typescript
// In useSwishPaymentStatus
useEffect(() => {
  // Poll status every 2 seconds
  // Update dialog state
  // Handle success/failure
}, [paymentReference]);
```

### 3. Payment Completion
- Swish:
  - User approves in Swish app
  - Status updates via polling
  - Redirect to confirmation on success
- Invoice:
  - PDF generated and stored
  - Booking created with invoice details
  - Email sent with invoice PDF
  - Redirect to confirmation

## API Endpoints

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

// Create Invoice payment
POST /api/invoice/create
Body: {
  payment_method: "invoice";
  product_type: "course";
  product_id: string;
  amount: number;
  quantity: number;
  user_info: UserInfo;
  invoice_details: {
    address: string;
    postalCode: string;
    city: string;
    reference?: string;
  };
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

// Get invoice PDF
GET /api/invoice/[id]
Response: {
  success: boolean;
  data: {
    pdf: string; // Base64 encoded PDF
  };
}
```

## Environment Variables
```bash
# Swish Configuration
NEXT_PUBLIC_SWISH_TEST_MODE=true|false
SWISH_TEST_API_URL=https://mss.cpc.getswish.net/swish-cpcapi/api/v1
SWISH_TEST_PAYEE_ALIAS=1234679304
SWISH_TEST_CERT_PATH=certs/swish/test/Swish_Merchant_TestCertificate_1234679304.pem
SWISH_TEST_KEY_PATH=certs/swish/test/Swish_Merchant_TestCertificate_1234679304.key
SWISH_TEST_CA_PATH=certs/swish/test/Swish_TLS_RootCA.pem

# Invoice Configuration
NEXT_PUBLIC_INVOICE_PDF_STORAGE_PATH=invoices
NEXT_PUBLIC_INVOICE_NUMBER_PREFIX=SC
```

## Database Schema
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

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    course_id UUID NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    number_of_participants INTEGER NOT NULL,
    booking_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_status TEXT NOT NULL DEFAULT 'CREATED',
    message TEXT,
    invoice_number TEXT,
    invoice_address TEXT,
    invoice_postal_code TEXT,
    invoice_city TEXT,
    invoice_reference TEXT,
    payment_method TEXT NOT NULL,
    booking_reference TEXT NOT NULL,
    unit_price INTEGER,
    total_price INTEGER,
    currency TEXT NOT NULL DEFAULT 'SEK'
);
```

## Recent Changes
1. **Component Refactoring**
   - Extracted Swish payment logic to dedicated components
   - Extracted Invoice payment logic to dedicated components
   - Implemented ref-based communication
   - Improved error handling and validation

2. **Code Organization**
   - Separated concerns between components
   - Created custom hook for payment status
   - Improved type safety
   - Added PDF generation service

3. **Payment Flow**
   - Streamlined payment creation process
   - Enhanced status monitoring
   - Better error handling and user feedback
   - Added invoice PDF generation and storage

## Test Environment
- Uses Swish MSS (Merchant Swish Simulator)
- Test phone numbers:
  - `0739000001`: Returns PAID
  - `0739000002`: Returns DECLINED
  - `0739000003`: Returns ERROR
- Invoice testing:
  - PDF generation in test environment
  - Storage in test bucket
  - Email sending disabled

## Security Considerations
1. **Certificate Handling**
   - Certificates stored in `/certs/swish/[test|prod]`
   - Restricted file permissions (600)
   - Restricted directory permissions (700)

2. **Request Validation**
   - Idempotency key required
   - Rate limiting on endpoints
   - Signature validation for callbacks
   - PDF storage access control

## Next Steps
1. **Code Cleanup**
   - Remove unused Swish code from PaymentSelection
   - Simplify validation logic
   - Improve error messages
   - Add invoice-specific error handling

2. **Testing**
   - Add unit tests for components
   - Add integration tests for payment flow
   - Test error scenarios
   - Add PDF generation tests

3. **Documentation**
   - Add JSDoc comments
   - Create component documentation
   - Update API documentation
   - Add invoice flow diagrams