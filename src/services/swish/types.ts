// Swish payment request data structure
export interface SwishPaymentData {
  phone_number: string;
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

// Response structure from our Swish API endpoints
export interface SwishApiResponse {
  success: boolean;
  data?: {
    reference: string;
  };
  error?: string;
}

// Data structure for making requests to Swish API
export interface SwishRequestData {
  payeePaymentReference: string;
  callbackUrl: string;
  payeeAlias: string;
  amount: string;
  currency: string;
  message: string;
  payerAlias: string;
}

// Swish callback data structure (from Swish API)
export interface SwishCallbackData {
  payeePaymentReference: string;  // Our payment reference
  paymentReference: string;       // Swish payment reference
  status: 'PAID' | 'DECLINED' | 'ERROR';
  amount: string;
  currency: string;
  timestamp: string;
  errorCode?: string;
  errorMessage?: string;
}

// Payment status values that are actually used
export type PaymentStatus = 
  | 'CREATED'   // Initial state when payment is created
  | 'PAID'      // Payment confirmed by Swish
  | 'ERROR'     // Payment failed
  | 'DECLINED'; // Payment declined by user or Swish 