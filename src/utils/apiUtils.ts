import { NextResponse } from 'next/server';

// Standard error response format
interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

// Standard success response format
interface ApiSuccess<T> {
  success: true;
  data: T;
}

type ApiResponse<T> = ApiError | ApiSuccess<T>;

// Error codes
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  EMAIL_ERROR: 'EMAIL_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const;

// HTTP Status codes mapping
const statusCodes: Record<string, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  DATABASE_ERROR: 500,
  PAYMENT_ERROR: 500,
  EMAIL_ERROR: 500,
  INTERNAL_ERROR: 500
};

// Logging utility
export function logOperation(operation: string, details?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${operation}`);
  if (details) {
    console.log('Details:', JSON.stringify(details, null, 2));
  }
}

// Error logging utility
export function logError(error: any, context: string, details?: any) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Error in ${context}:`);
  console.error(error);
  if (details) {
    console.error('Additional details:', JSON.stringify(details, null, 2));
  }
}

// Create standardized error response
export function createErrorResponse(
  message: string,
  code: keyof typeof ErrorCodes,
  details?: any
): NextResponse {
  const error: ApiError = {
    success: false,
    error: message,
    code: ErrorCodes[code],
    ...(details && { details })
  };
  
  return NextResponse.json(error, { status: statusCodes[code] });
}

// Create standardized success response
export function createSuccessResponse<T>(data: T): NextResponse {
  const response: ApiSuccess<T> = {
    success: true,
    data
  };
  
  return NextResponse.json(response);
}

// Database error handler
export function handleDatabaseError(error: any, context: string): NextResponse {
  logError(error, `Database error in ${context}`);
  return createErrorResponse(
    'A database error occurred',
    'DATABASE_ERROR',
    { context }
  );
}

// Payment error handler
export function handlePaymentError(error: any, context: string): NextResponse {
  logError(error, `Payment error in ${context}`);
  return createErrorResponse(
    'A payment processing error occurred',
    'PAYMENT_ERROR',
    { context }
  );
}

// Validation error handler
export function handleValidationError(message: string, details?: any): NextResponse {
  logError(new Error(message), 'Validation error', details);
  return createErrorResponse(message, 'VALIDATION_ERROR', details);
}

// Email error handler
export function handleEmailError(error: any, context: string): NextResponse {
  logError(error, `Email error in ${context}`);
  return createErrorResponse(
    'Failed to send email',
    'EMAIL_ERROR',
    { context }
  );
} 