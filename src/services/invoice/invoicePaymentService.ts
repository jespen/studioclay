import { v4 as uuidv4 } from 'uuid';
import { 
  InvoiceStatus, 
  INVOICE_STATUS,
  InvoiceRequestData,
  InvoiceApiResponse,
  InvoiceStatusResponse,
  InvoiceValidationError,
  InvoiceApiError,
  InvoicePDFError,
  InvoiceError
} from './types';

export class InvoicePaymentService {
  private static instance: InvoicePaymentService;

  private constructor() {}

  public static getInstance(): InvoicePaymentService {
    if (!InvoicePaymentService.instance) {
      InvoicePaymentService.instance = new InvoicePaymentService();
    }
    return InvoicePaymentService.instance;
  }

  // Create an invoice payment request
  public async createInvoicePayment(
    productId: string,
    amount: number,
    quantity: number,
    userInfo: InvoiceRequestData['user_info'],
    invoiceDetails: InvoiceRequestData['invoiceDetails']
  ): Promise<InvoiceApiResponse> {
    try {
      console.log('[InvoicePaymentService] Creating invoice payment request:', {
        productId,
        amount,
        quantity,
        userInfo: {
          ...userInfo,
          email: userInfo.email // Logga email för felsökning
        },
        invoiceDetails
      });
      
      // Generate a unique idempotency key
      const idempotencyKey = uuidv4();
      console.log('[InvoicePaymentService] Generated idempotency key:', idempotencyKey);
      
      // Prepare data in the format expected by the API
      const requestData = {
        courseId: productId,
        userInfo: {
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          email: userInfo.email,
          phone: userInfo.phone,
          numberOfParticipants: userInfo.numberOfParticipants,
          specialRequirements: userInfo.specialRequirements
        },
        paymentDetails: {
          method: 'invoice',
          invoiceDetails: {
            address: invoiceDetails.address,
            postalCode: invoiceDetails.postalCode,
            city: invoiceDetails.city,
            reference: invoiceDetails.reference
          }
        }
      };

      console.log('[InvoicePaymentService] Sending request data:', requestData);
      
      const response = await fetch('/api/invoice/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(requestData),
      });

      console.log('[InvoicePaymentService] API Response status:', response.status);
      const result = await response.json();
      console.log('[InvoicePaymentService] API Response data:', result);

      if (!result.success) {
        console.error('[InvoicePaymentService] API returned error:', result.error);
        throw new InvoiceApiError(result.error || 'Failed to create invoice');
      }

      // Extract reference and invoice number from the response
      const reference = result.bookingReference;
      const invoiceNumber = result.invoiceNumber;
      
      if (!reference || !invoiceNumber) {
        console.error('[InvoicePaymentService] Missing reference or invoice number:', { reference, invoiceNumber });
        throw new InvoiceApiError('No reference or invoice number received');
      }

      console.log('[InvoicePaymentService] Successfully created invoice:', { reference, invoiceNumber });

      // Store in localStorage for persistence
      localStorage.setItem('currentInvoiceReference', reference);
      localStorage.setItem('currentInvoiceNumber', invoiceNumber);
      localStorage.setItem('currentInvoiceIdempotencyKey', idempotencyKey);
      
      return { 
        success: true, 
        data: { 
          reference,
          invoiceNumber
        }
      };
    } catch (error) {
      console.error('[InvoicePaymentService] Error in invoice creation:', {
        error,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      
      if (error instanceof InvoiceApiError) {
        throw error;
      }
      throw new InvoiceError('Failed to create invoice');
    }
  }

  // Check invoice status
  public async checkInvoiceStatus(reference: string): Promise<InvoiceStatusResponse> {
    console.log('[InvoicePaymentService] Checking invoice status for reference:', reference);
    
    if (!reference || reference === 'undefined' || reference === 'null') {
      console.error('[InvoicePaymentService] Invalid invoice reference:', reference);
      throw new InvoiceValidationError('Invalid invoice reference');
    }
    
    try {
      console.log(`[InvoicePaymentService] Fetching status for invoice: ${reference}`);
      const response = await fetch(`/api/invoice/status/${reference}`);
      console.log('[InvoicePaymentService] Status API Response status:', response.status);
      
      const data = await response.json();
      console.log('[InvoicePaymentService] Status API Response data:', data);
      
      if (!data.success) {
        console.error('[InvoicePaymentService] Status API reported error:', data);
        throw new InvoiceApiError(data.error || 'Failed to check invoice status');
      }
      
      if (data.data?.reference) {
        console.log('[InvoicePaymentService] Invoice reference received:', data.data.reference);
        localStorage.setItem('invoiceReference', data.data.reference);
      }
      
      const status = data.data?.status as InvoiceStatus;
      console.log(`[InvoicePaymentService] Invoice status: ${status}`);
      
      if (!status) {
        console.error('[InvoicePaymentService] No invoice status found in response');
        throw new InvoiceApiError('No status found in response');
      }
      
      return {
        success: true,
        data: {
          reference: data.data.reference,
          status: data.data.status,
          amount: data.data.amount,
          dueDate: data.data.dueDate
        }
      };
    } catch (error) {
      console.error('[InvoicePaymentService] Error checking invoice status:', {
        error,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      
      if (error instanceof InvoiceApiError || error instanceof InvoiceValidationError) {
        throw error;
      }
      throw new InvoiceError('Failed to check invoice status');
    }
  }

  // Get invoice PDF
  public async getInvoicePDF(invoiceNumber: string): Promise<Blob> {
    try {
      console.log(`[InvoicePaymentService] Fetching PDF for invoice: ${invoiceNumber}`);
      const response = await fetch(`/api/invoice/pdf/${invoiceNumber}`);
      console.log('[InvoicePaymentService] PDF API Response status:', response.status);
      
      if (!response.ok) {
        console.error('[InvoicePaymentService] PDF API returned error:', {
          status: response.status,
          statusText: response.statusText
        });
        throw new InvoiceApiError('Failed to fetch invoice PDF', response.status);
      }
      
      const blob = await response.blob();
      console.log('[InvoicePaymentService] Successfully fetched PDF, size:', blob.size);
      return blob;
    } catch (error) {
      console.error('[InvoicePaymentService] Error fetching invoice PDF:', {
        error,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      
      if (error instanceof InvoiceApiError) {
        throw error;
      }
      throw new InvoicePDFError('Failed to fetch invoice PDF');
    }
  }
} 