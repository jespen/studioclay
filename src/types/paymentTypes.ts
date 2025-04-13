import { UserInfo, InvoiceDetails } from './booking';
import { ProductType, PaymentMethod, PaymentStatus } from '@/constants/statusCodes';

/**
 * Base payment request interface
 */
export interface BasePaymentRequest {
  payment_method: PaymentMethod;
  amount: number;
  product_id: string;
  product_type: ProductType;
  idempotency_key: string;
  userInfo: UserInfo;
}

/**
 * Invoice payment request
 */
export interface InvoicePaymentRequest extends BasePaymentRequest {
  payment_method: 'invoice';
  invoiceDetails: InvoiceDetails;
}

/**
 * Swish payment request
 */
export interface SwishPaymentRequest extends BasePaymentRequest {
  payment_method: 'swish';
  phone_number: string;
}

/**
 * Union type for all payment requests
 */
export type PaymentRequest = InvoicePaymentRequest | SwishPaymentRequest;

/**
 * Base payment response
 */
export interface BasePaymentResponse {
  success: boolean;
  error?: string;
  invoiceNumber?: string;
  bookingReference?: string;
  id?: string;
  paymentStatus?: PaymentStatus;
}

/**
 * Response for invoice payment operations
 */
export interface InvoicePaymentResponse extends BasePaymentResponse {
  message?: string;
  errorCode?: string;
  invoice_id?: string;
  invoice_status?: string;
  invoice_number?: string;
  payment_reference?: string;
  redirectUrl?: string;
}

/**
 * Swish-specific payment response
 */
export interface SwishPaymentResponse extends BasePaymentResponse {
  swishPaymentId?: string;
  swishCallbackUrl?: string;
  payment_request_token?: string;
  qr_code?: string;
}

/**
 * Art order database record
 */
export interface ArtOrderRecord {
  product_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  payment_method: PaymentMethod;
  order_reference: string;
  invoice_number?: string;
  unit_price: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  metadata: {
    user_info: UserInfo;
    invoice_details?: InvoiceDetails;
  };
}

/**
 * Gift card database record
 */
export interface GiftCardRecord {
  code: string;
  amount: number;
  status: 'active' | 'used' | 'expired';
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  invoice_number?: string;
  order_reference: string;
  metadata: {
    user_info: UserInfo;
    invoice_details?: InvoiceDetails;
  };
}

/**
 * Course booking database record
 */
export interface CourseBookingRecord {
  course_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  participants: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: 'pending' | 'confirmed' | 'cancelled';
  booking_reference: string;
  invoice_number?: string;
  invoice_details?: {
    address: string;
    postal_code: string;
    city: string;
    reference: string;
  };
}

/**
 * Standardized error codes for payment API responses
 */
export enum PaymentErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PAYMENT_CREATION_FAILED = 'PAYMENT_CREATION_FAILED',
  INVOICE_CREATION_FAILED = 'INVOICE_CREATION_FAILED',
  PAYMENT_PROCESSING_FAILED = 'PAYMENT_PROCESSING_FAILED',
  PAYMENT_STATUS_ERROR = 'PAYMENT_STATUS_ERROR',
  REFERENCE_GENERATION_ERROR = 'REFERENCE_GENERATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CLIENT_ERROR = 'CLIENT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Payment reference formats by type
 */
export enum ReferenceFormat {
  PAYMENT = 'SC-YYYYMMDD-XXXXXX',  // SC-20240523-A1B2C3
  INVOICE = 'INV-YYMM-XXXX',       // INV-2405-A1B2
  ORDER = 'ORD-YYYYMMDD-XXXXXX',   // ORD-20240523-A1B2C3
  BOOKING = 'BK-YYYYMMDD-XXXXXX',  // BK-20240523-A1B2C3
  GIFT_CARD = 'GC-XXXX-XXXX-XXXX'  // GC-A1B2-C3D4-E5F6
}

/**
 * Common interface for all payment references
 */
export interface PaymentReferenceData {
  paymentReference: string;
  invoiceNumber?: string;
  orderReference?: string;
  bookingReference?: string;
  giftCardCode?: string;
  status?: string;
  redirectUrl?: string;
}

/**
 * Standardized API response for all payment endpoints
 */
export interface StandardPaymentResponse {
  success: boolean;
  message?: string;
  error?: string;
  errorCode?: PaymentErrorCode | string;
  data?: PaymentReferenceData;
}

/**
 * Helper utility for creating standardized payment responses
 */
export const createPaymentResponse = {
  success: (data: PaymentReferenceData): StandardPaymentResponse => ({
    success: true,
    data
  }),
  
  error: (error: string, errorCode: PaymentErrorCode, paymentReference: string): StandardPaymentResponse => ({
    success: false,
    error,
    errorCode,
    data: {
      paymentReference,
      status: 'failed'
    }
  }),
  
  validation: (error: string, paymentReference: string): StandardPaymentResponse => ({
    success: false,
    error,
    errorCode: PaymentErrorCode.VALIDATION_ERROR,
    data: {
      paymentReference,
      status: 'failed'
    }
  })
}; 