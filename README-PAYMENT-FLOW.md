# Payment System Documentation

## Overview
The payment system is designed as a generic solution that works across multiple product types:
- Course bookings
- Gift cards
- Shop items

## Component Structure
```
/src/
├── components/
│   └── booking/
│       ├── PaymentSelection.tsx        # Main payment coordinator
│       │
│       ├── Swish Flow/
│       │   ├── SwishPaymentSection.tsx # Swish coordinator
│       │   ├── SwishPaymentForm.tsx    # Phone number input
│       │   └── SwishPaymentDialog.tsx  # Payment status
│       │
│       └── Invoice Flow/
│           ├── InvoicePaymentSection.tsx # Invoice coordinator
│           ├── InvoicePaymentForm.tsx    # Address input
│           └── InvoicePaymentDialog.tsx  # Payment status
│
├── app/
│   └── api/
│       ├── invoice/
│       │   └── create/
│       │       └── route.ts           # Invoice creation and PDF generation
│       └── payments/
│           └── swish/
│               └── create/
│                   └── route.ts       # Swish payment creation
│
├── utils/
│   ├── invoicePDF.ts                  # PDF generation
│   └── confirmationEmail.ts           # Email service
│
└── types/
    ├── payment.ts                     # Shared payment types
    └── booking.ts                     # Booking types
```

## Component Responsibilities

### Payment Coordinator
- `PaymentSelection.tsx`
  - Handles payment method selection
  - Coordinates between payment methods
  - Manages overall payment flow
  - Provides unified interface

### Swish Flow
1. `SwishPaymentSection.tsx`
   - Coordinates Swish payment flow
   - Manages payment status
   - Handles callbacks and redirects

2. `SwishPaymentForm.tsx`
   - Phone number input and validation
   - Swish-specific form logic

3. `SwishPaymentDialog.tsx`
   - Shows payment status
   - Provides user instructions
   - Handles success/error states

### Invoice Flow
1. `InvoicePaymentSection.tsx`
   - Coordinates invoice payment flow
   - Manages invoice generation
   - Handles PDF creation

2. `InvoicePaymentForm.tsx` (To be created)
   - Address input and validation
   - Invoice-specific form logic

3. `InvoicePaymentDialog.tsx`
   - Shows invoice status
   - Provides download options
   - Handles success/error states

### API Routes
1. `/api/invoice/create`
   - Genererar fakturanummer och bokningsreferens
   - Skapar PDF-faktura
   - Sparar PDF i Supabase storage
   - Skapar bokningspost i databasen
   - Uppdaterar kursens deltagarantal
   - Skickar faktura via e-post

2. `/api/payments/swish/create`
   - Skapar Swish-betalning
   - Hanterar callbacks från Swish
   - Uppdaterar betalningsstatus

## Data Flow

### Swish Payment Flow
1. User selects Swish
2. Enters phone number (SwishPaymentForm)
3. Section creates payment (SwishPaymentService)
4. Dialog shows status
5. Redirects on completion

### Invoice Payment Flow
1. User selects Invoice
2. Enters address (InvoicePaymentForm)
3. Section generates invoice (InvoicePaymentService)
4. Creates PDF and sends email
5. Dialog shows confirmation

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

4. **Gift Card Handling**
   - Implemented proper storage of gift card fields in database:
     - `amount`: Numeric amount of the gift card
     - `recipient_name`: Name of the gift card recipient
     - `recipient_email`: Email address of the recipient
     - `message`: Personal message for the gift card
     - `invoice_reference`: Reference for invoice payments
     - `payment_reference`: Unique payment reference
   - Payment status handling:
     - For Swish payments: Status is set to `PAID` immediately upon success
     - For Invoice payments: Status is set to `CREATED` initially, changes to `PAID` when paid
   - Implemented consistent status display in confirmation page:
     - `PAID` status shows as "Genomförd"
     - `CREATED` and `pending` status shows as "Ej betald"
     - Other statuses show as "Väntar på verifiering"

5. **Storage Improvements**
   - Enhanced data storage with multiple fallback mechanisms
   - Implemented centralized `saveGiftCardDetails` function that stores data in multiple locations
   - Improved compatibility with both legacy and new storage patterns

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