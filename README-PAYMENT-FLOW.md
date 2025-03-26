# Payment Flow Implementation

## Overview
The payment system is designed as a generic solution that works across multiple product types:
- Course bookings
- Gift cards
(Future expansion possible for other product types)

## Component Structure
```
/src/
├── components/
│   ├── booking/
│   │   ├── PaymentSelection.tsx      # Generic payment selection component
│   │   ├── SwishPaymentSection.tsx   # Swish-specific payment logic
│   │   └── InvoicePaymentSection.tsx # Invoice-specific payment logic
│   └── gift-cards/
│       └── GiftCardPayment.tsx       # Gift card payment handling
├── services/
│   ├── payment/
│   │   ├── types.ts                  # Shared payment types
│   │   ├── BasePaymentHandler.ts     # Abstract payment handler
│   │   ├── CourseInvoiceHandler.ts   # Course-specific invoice handling
│   │   └── GiftCardInvoiceHandler.ts # Gift card-specific invoice handling
│   └── swish/
│       └── [existing swish files]
```

## Payment Handlers

### Common Interface
```typescript
interface CommonPaymentFields {
  payment_method: 'invoice' | 'swish';
  payment_status: 'CREATED' | 'PAID' | 'DECLINED' | 'ERROR';
  invoice_number?: string;
  invoice_address?: string;
  invoice_postal_code?: string;
  invoice_city?: string;
  invoice_reference?: string;
}

interface InvoicePaymentHandler<T extends CommonPaymentFields> {
  createPayment(data: PaymentData): Promise<T>;
  generateInvoiceNumber(): string;
  handlePaymentSuccess(item: T): Promise<void>;
  handlePaymentError(item: T): Promise<void>;
}
```

### Product-Specific Implementations
Each product type (courses, gift cards) has its own implementation of the payment handler, allowing for custom logic while maintaining a consistent interface.

## Database Structure

### Bookings Table
```sql
CREATE TABLE bookings (
  -- Existing fields
  payment_method: text,
  payment_status: text NOT NULL,
  invoice_number: text,
  invoice_address: text,
  invoice_postal_code: text,
  invoice_city: text,
  invoice_reference: text
);
```

### Gift Cards Table
```sql
CREATE TABLE gift_cards (
  -- Existing fields
  payment_method: text,
  payment_status: text,
  invoice_number: text,
  invoice_address: text,
  invoice_postal_code: text,
  invoice_city: text,
  invoice_reference: text
);
```

## Payment Flow

1. **Payment Initiation**
   - User selects product type and payment method
   - PaymentSelection component loads appropriate handler
   - Handler validates input and prepares payment

2. **Payment Processing**
   - For Swish: Create payment in payments table and handle status updates
   - For Invoice: Create record directly in product-specific table
   - Generate invoice number and handle PDF generation

3. **Completion and Confirmation**
   - Update status in appropriate table
   - Send confirmation emails
   - Redirect to confirmation page

## API Endpoints

```typescript
// Create invoice payment
POST /api/payments/invoice/create
Body: {
  productType: 'course' | 'gift_card';
  productId: string;
  amount: number;
  userInfo: UserInfo;
  paymentDetails: PaymentDetails;
}

// Check payment status
GET /api/payments/status/[reference]
Response: {
  success: boolean;
  data: {
    status: PaymentStatus;
    productType: string;
    productId: string;
    reference: string;
  }
}
```

## Recent Changes
1. **Generic Payment Handling**
   - Introduced common payment interface
   - Created product-specific handlers
   - Standardized payment status handling

2. **Code Organization**
   - Separated payment logic by product type
   - Maintained consistent interface
   - Improved type safety and validation

3. **Database Updates**
   - Standardized payment fields across tables
   - Consistent status handling
   - Improved tracking and reporting

## Next Steps
1. **Implementation**
   - Create and test handlers
   - Update PaymentSelection component
   - Implement error handling

2. **Testing**
   - Test both payment methods
   - Verify status handling
   - Test error scenarios

3. **Documentation**
   - Update API documentation
   - Document new components
   - Create usage examples
