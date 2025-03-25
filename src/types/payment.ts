// Swish API Types
export interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  numberOfParticipants?: string;
  specialRequirements?: string;
}

export interface SwishPaymentParams {
  userInfo: UserInfo;
  courseId: string;
  amount: number;
  phoneNumber: string;
}

export interface SwishPaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

export interface SwishStatusResult {
  success: boolean;
  status: string;
  error?: string;
  bookingReference?: string;
}

export type ProductType = 'course' | 'gift_card' | 'shop_item';

export interface PaymentCreateRequest {
  user_info: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  product_type: ProductType;
  product_id: string;
  amount: number;
  quantity: number;
  payment_method: 'swish' | 'invoice';
}

// Swish payment statuses (exactly as provided by Swish)
export type SwishPaymentStatus = 
  | 'CREATED'   // Initial state
  | 'PAID'      // Payment completed successfully
  | 'DECLINED'  // Payment declined by payer or Swish
  | 'ERROR';    // Technical error

// Swish callback data structure
export interface SwishCallbackData {
  payeePaymentReference: string;
  status: SwishPaymentStatus;
  amount: string;
  currency: string;
  message?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface Payment {
  id: string;
  created_at: string;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  amount: number;
  currency: string;
  payment_reference: string;
  product_type: ProductType;
  product_id: string;
  user_info: UserInfo;
  metadata?: PaymentMetadata;
  bookings?: Booking[];
}

export interface PaymentMetadata {
  swish_id?: string;
  swish_status?: SwishStatus;
  idempotency_key?: string;
  quantity?: number;
  [key: string]: any;
}

export interface Booking {
  id: string;
  reference: string;
  status: BookingStatus;
}

export type PaymentStatus = 
  | 'CREATED'
  | 'PENDING'
  | 'PAID'
  | 'DECLINED'
  | 'ERROR'
  | 'CANCELLED'
  | 'REFUNDED';

export type SwishStatus =
  | 'CREATED'
  | 'PAID'
  | 'DECLINED'
  | 'ERROR'
  | 'CANCELLED';

export type PaymentMethod = 'swish' | 'invoice';

export type BookingStatus = 
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'; 