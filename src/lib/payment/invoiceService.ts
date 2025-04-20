import axios from "axios";
import { z } from "zod";
import { logDebug, logError, logInfo } from "@/lib/logging";

// Define types for legacy invoice payment request
export type LegacyInvoicePaymentRequest = {
  payment_method: string;
  amount: number;
  product_id: string;
  product_type: 'course' | 'gift_card' | 'art_product';
  quantity?: number;
  user_info: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  invoiceDetails: {
    address: string;
    postalCode: string;
    city: string;
    reference?: string;
  };
};

// Type for our newer format invoice payment request
export type NewInvoicePaymentRequest = {
  paymentMethod: string;
  amount: number;
  productId: string;
  productType: 'course' | 'giftCard' | 'artProduct';
  quantity?: number;
  userInfo: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  invoiceDetails: {
    address: string;
    postalCode: string;
    city: string;
    reference?: string;
  };
};

// Response type for invoice payments
export type InvoicePaymentResponse = {
  success: boolean;
  message?: string;
  error?: string;
  paymentId?: string;
  reference?: string;
  status?: string;
};

/**
 * Creates a Strapi API axios instance
 */
function createStrapiAxiosInstance() {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337/api';
  return axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Custom error class for utility errors
 */
class UtilError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UtilError';
  }
}

/**
 * Creates an invoice payment either using the legacy format or the new typed format
 */
export async function createInvoicePayment(
  data: LegacyInvoicePaymentRequest | NewInvoicePaymentRequest
): Promise<InvoicePaymentResponse> {
  const requestId = crypto.randomUUID();
  const context = { requestId, service: 'invoiceService' };
  
  logInfo('Creating invoice payment', context, { data });

  try {
    const api = createStrapiAxiosInstance();
    
    // Check if we have a product type
    if (!('product_type' in data) && !('productType' in data)) {
      logError('Missing product type in invoice payment request', context);
      throw new UtilError('Missing product type in request');
    }
    
    // Accept both legacy and new format
    const productType = 'product_type' in data ? data.product_type : 
                        'productType' in data ? data.productType : 'unknown';
    
    logDebug(`Processing invoice payment for product type: ${productType}`, context);
    
    // Make the API request
    const response = await api.post('/invoice/create', data);
    
    if (!response.data) {
      logError('Empty response from invoice API', context);
      return { 
        success: false, 
        error: 'Failed to create invoice payment: Empty response' 
      };
    }
    
    logInfo('Invoice payment created successfully', context, { responseData: response.data });
    
    return {
      success: true,
      paymentId: response.data.id || response.data.paymentId,
      reference: response.data.reference,
      status: response.data.status || 'created'
    };
  } catch (error: unknown) {
    logError('Error creating invoice payment', context, error);
    
    if (error instanceof Error) {
      return {
        success: false,
        error: `Error: ${error.message}`,
        message: error.message
      };
    }
    
    return {
      success: false,
      error: 'Unknown error occurred',
      message: 'Failed to create invoice payment'
    };
  }
}

/**
 * Gets the status of an invoice payment
 */
export async function getInvoiceStatus(paymentId: string): Promise<InvoicePaymentResponse> {
  const requestId = crypto.randomUUID();
  const context = { requestId, service: 'invoiceService' };
  
  logInfo('Getting invoice payment status', context, { paymentId });
  
  try {
    const api = createStrapiAxiosInstance();
    const response = await api.get(`/invoice/status/${paymentId}`);
    
    logInfo('Retrieved invoice status successfully', context, { status: response.data });
    
    return {
      success: true,
      status: response.data.status,
      reference: response.data.reference
    };
  } catch (error: unknown) {
    logError('Error getting invoice status', context, error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to get invoice status'
    };
  }
} 