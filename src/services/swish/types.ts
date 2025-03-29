import { z } from 'zod';

/**
 * Schema for validating Swish payment request data.
 * Ensures all required fields are present and correctly formatted.
 */
export const SwishRequestSchema = z.object({
  /** The Swish number to send the payment request to */
  phone_number: z.string(),
  /** Must be "swish" for Swish payments */
  payment_method: z.literal('swish'),
  /** Type of product being purchased */
  product_type: z.enum(['course', 'gift_card', 'shop_item']),
  /** Unique identifier for the product */
  product_id: z.string(),
  /** Amount in SEK */
  amount: z.number().positive(),
  /** Quantity of items */
  quantity: z.number().positive(),
  /** Information about the user making the payment */
  user_info: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    phone: z.string(),
    numberOfParticipants: z.string()
  })
});

/**
 * Type definition for Swish payment request data.
 * Derived from the SwishRequestSchema.
 */
export interface SwishRequestData {
  payeePaymentReference: string;
  callbackUrl: string;
  payeeAlias: string;
  amount: string;
  currency: string;
  message: string;
  payerAlias: string;
}

/**
 * Response type for Swish API calls.
 * Represents the standard response format from Swish endpoints.
 */
export interface SwishApiResponse {
  /** Whether the API call was successful */
  success: boolean;
  /** Response data if successful */
  data?: {
    /** Payment reference for tracking */
    reference: string;
  };
  /** Error message if unsuccessful */
  error?: string;
}

/**
 * Response type for Swish payment status checks.
 * Contains detailed information about the payment status.
 */
export interface SwishPaymentResponse {
  /** Whether the status check was successful */
  success: boolean;
  /** Payment status data if successful */
  data?: {
    /** Payment reference */
    reference: string;
    /** Current payment status */
    status: 'CREATED' | 'PAID' | 'ERROR' | 'DECLINED';
    /** Payment amount */
    amount: number;
  };
  /** Error message if unsuccessful */
  error?: string;
}

/**
 * Custom error class for Swish validation errors.
 * Used when payment request data fails validation.
 */
export class SwishValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SwishValidationError';
  }
}

/**
 * Custom error class for Swish API errors.
 * Used when the Swish API returns an error response.
 */
export class SwishApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'SwishApiError';
  }
}

/**
 * Custom error class for Swish certificate errors.
 * Used when there are issues with SSL certificates.
 */
export class SwishCertificateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SwishCertificateError';
  }
}

/**
 * Base class for all Swish-related errors.
 * Used for type checking and error handling.
 */
export class SwishError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SwishError';
  }
}

// Swish payment request data structure
export interface SwishPaymentData {
  phone_number: string;
  payment_method: "swish";
  product_type: "course" | "gift_card";
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

// Payment status values as a constant object
export const PAYMENT_STATUS = {
  CREATED: 'CREATED',
  PAID: 'PAID',
  ERROR: 'ERROR',
  DECLINED: 'DECLINED'
} as const; 