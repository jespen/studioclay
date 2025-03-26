// Payment status enum
export enum PaymentStatus {
  CREATED = 'CREATED',
  PAID = 'PAID',
  ERROR = 'ERROR',
  DECLINED = 'DECLINED'
}

// User information structure
export interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  numberOfParticipants?: string;
}

// Basic product type definition
export type ProductType = 'course';  // Simplified as we only handle courses currently

// Payment request structure from frontend
export interface PaymentRequest {
  phone_number: string;      // Format: "0739000001"
  payment_method: "swish";   // Currently only supporting Swish
  product_type: ProductType;
  product_id: string;
  amount: number;
  quantity: number;
  user_info: UserInfo;
}

// Swish callback data structure (from Swish API)
export interface SwishCallbackData {
  payeePaymentReference: string;  // Our payment reference
  paymentReference: string;       // Swish payment reference
  status: PaymentStatus;
  amount: string;
  currency: string;
  timestamp: string;
  errorCode?: string;
  errorMessage?: string;
}

// Payment record structure (database)
export interface Payment {
  id: string;
  created_at: string;
  status: PaymentStatus;
  payment_method: 'swish';
  amount: number;
  currency: string;
  payment_reference: string;
  product_type: ProductType;
  product_id: string;
  user_info: UserInfo;
  metadata?: PaymentMetadata;
  phone_number: string;
}

// Metadata structure for payments
export interface PaymentMetadata {
  idempotency_key?: string;
  swish_reference?: string;
  [key: string]: any;
}

// Booking structure (for response data)
export interface Booking {
  id: string;
  reference: string;
  status: BookingStatus;
}

// Booking status values
export type BookingStatus = 
  | 'CONFIRMED'
  | 'CANCELLED';

export type PaymentMethod = 'swish' | 'invoice';

export interface PaymentDetails {
  method: PaymentMethod;
  invoiceDetails?: InvoiceDetails;
}

export interface InvoiceDetails {
  address: string;
  postalCode: string;
  city: string;
  reference: string;
}

export interface BaseFormErrors {
  paymentMethod?: string;
  'invoiceDetails.address'?: string;
  'invoiceDetails.postalCode'?: string;
  'invoiceDetails.city'?: string;
  invoice?: string;
}

export interface SwishFormErrors extends BaseFormErrors {
  swishPhone?: string;
}

export interface InvoiceFormErrors extends BaseFormErrors {
  'invoiceDetails.reference'?: string;
} 