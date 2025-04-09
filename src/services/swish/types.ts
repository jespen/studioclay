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
 * Response type for Swish API requests.
 * Used to standardize responses from various Swish operations.
 */
export interface SwishApiResponse {
  /** Whether the API request was successful */
  success: boolean;
  /** Data returned from the API if successful */
  data?: {
    /** Payment reference ID */
    reference: string;
    /** Payment status (CREATED, PAID, DECLINED, ERROR) */
    status?: PaymentStatus;
    /** Payment amount */
    amount?: number;
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
 * Swish payment statuses
 */
export const SwishStatus = {
  CREATED: 'CREATED',
  PAID: 'PAID',
  DECLINED: 'DECLINED',
  ERROR: 'ERROR',
} as const;

export type SwishStatus = typeof SwishStatus[keyof typeof SwishStatus];

/**
 * Base Swish error class
 */
export class SwishError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'SwishError';
  }
}

/**
 * Swish validation error
 */
export class SwishValidationError extends SwishError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'SwishValidationError';
  }
}

/**
 * Swish API error
 */
export class SwishApiError extends SwishError {
  constructor(message: string, public readonly status?: number, details?: any) {
    super(message, 'API_ERROR', details);
    this.name = 'SwishApiError';
  }
}

/**
 * Swish certificate error
 */
export class SwishCertificateError extends SwishError {
  constructor(message: string) {
    super(message, 'CERTIFICATE_ERROR');
    this.name = 'SwishCertificateError';
  }
}

/**
 * Schema for creating a Swish payment
 */
export const CreateSwishPaymentSchema = z.object({
  amount: z.number().positive(),
  phoneNumber: z.string().regex(/^0[0-9]{8,9}$/),
  paymentReference: z.string(),
  message: z.string().max(50).optional(),
  metadata: z.record(z.unknown()).optional()
});

export type CreateSwishPaymentDTO = z.infer<typeof CreateSwishPaymentSchema>;

/**
 * Schema for Swish callback data
 */
export const SwishCallbackSchema = z.object({
  id: z.string(),
  payeePaymentReference: z.string(),
  paymentReference: z.string(),
  callbackUrl: z.string().url(),
  payerAlias: z.string(),
  payeeAlias: z.string(),
  amount: z.string(),
  currency: z.string(),
  message: z.string().optional(),
  status: z.enum(['PAID', 'DECLINED', 'ERROR']),
  dateCreated: z.string(),
  datePaid: z.string().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional()
});

export type SwishCallbackData = z.infer<typeof SwishCallbackSchema>;

/**
 * Schema for Swish transaction
 */
export const SwishTransactionSchema = z.object({
  id: z.string().uuid(),
  paymentId: z.string().uuid(),
  swishPaymentId: z.string(),
  swishStatus: z.enum(['CREATED', 'PAID', 'DECLINED', 'ERROR']),
  amount: z.number(),
  phoneNumber: z.string(),
  callbackUrl: z.string().url(),
  createdAt: z.date(),
  updatedAt: z.date(),
  callbackReceivedAt: z.date().optional(),
  callbackData: z.record(z.unknown()).optional(),
  errorMessage: z.string().optional()
});

export type SwishTransaction = z.infer<typeof SwishTransactionSchema>;

/**
 * Schema for async job
 */
export const AsyncJobSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
  payload: z.record(z.unknown()),
  retries: z.number().int().min(0),
  maxRetries: z.number().int().min(0),
  createdAt: z.date(),
  updatedAt: z.date(),
  nextRetryAt: z.date().optional(),
  errorMessage: z.string().optional(),
  result: z.record(z.unknown()).optional()
});

export type AsyncJob = z.infer<typeof AsyncJobSchema>;

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

// Import central definitions
import { 
  PaymentStatus as CentralPaymentStatus, 
  PAYMENT_STATUSES 
} from '@/constants/statusCodes';

// Re-export for backward compatibility
export type PaymentStatus = CentralPaymentStatus;

// Payment status values as a constant object - for backward compatibility
export const PAYMENT_STATUS = PAYMENT_STATUSES; 