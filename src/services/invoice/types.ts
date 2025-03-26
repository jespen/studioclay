import { PaymentStatus } from '@/services/swish/types';

export type InvoiceStatus = PaymentStatus;

export const INVOICE_STATUS = {
  CREATED: 'CREATED',
  PAID: 'PAID',
  DECLINED: 'DECLINED',
  ERROR: 'ERROR'
} as const;

export class InvoiceValidationError extends Error {
  type: 'validation' = 'validation';
  field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = 'InvoiceValidationError';
    this.field = field;
  }
}

export class InvoiceApiError extends Error {
  type: 'api' = 'api';
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'InvoiceApiError';
    this.status = status;
  }
}

export class InvoicePDFError extends Error {
  type: 'pdf' = 'pdf';

  constructor(message: string) {
    super(message);
    this.name = 'InvoicePDFError';
  }
}

export class InvoiceError extends Error {
  type: 'invoice' = 'invoice';

  constructor(message: string) {
    super(message);
    this.name = 'InvoiceError';
  }
}

export interface InvoiceDetails {
  address: string;
  postalCode: string;
  city: string;
  reference?: string;
}

export interface InvoicePaymentResponse {
  success: boolean;
  reference: string | null;
  error?: string;
}

export interface InvoiceValidationResult {
  isValid: boolean;
  errors: {
    address?: string;
    postalCode?: string;
    city?: string;
  };
}

export interface InvoiceRequestData {
  user_info: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    numberOfParticipants: string;
    specialRequirements?: string;
  };
  invoiceDetails: InvoiceDetails;
}

export interface InvoiceApiResponse {
  success: boolean;
  data?: {
    reference: string;
    invoiceNumber: string;
  };
  error?: string;
}

export interface InvoiceStatusResponse {
  success: boolean;
  data?: {
    reference: string;
    status: InvoiceStatus;
    amount: number;
    dueDate: string;
  };
  error?: string;
} 