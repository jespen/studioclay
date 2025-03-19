// Swish API Types
export interface SwishPaymentParams {
  paymentReference: string;
  phoneNumber: string;
  amount: number;
  message: string;
  callbackUrl: string;
}

export interface SwishPaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

export interface SwishStatusResult {
  success: boolean;
  status?: SwishPaymentStatus;
  error?: string;
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