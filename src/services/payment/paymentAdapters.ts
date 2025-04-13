/**
 * Payment Adapters
 * 
 * Innehåller adapter-funktioner för att koppla samman gamla och nya betalningssystem
 * samt för att standardisera dataformat mellan olika delar av systemet.
 */

import { 
  StandardPaymentResponse, 
  PaymentReferenceData,
  PaymentErrorCode
} from '@/types/paymentTypes';
import { 
  createStandardizedInvoicePayment, 
  NormalizedInvoicePaymentRequest 
} from '@/services/invoice/invoiceService';
import { UserInfo } from '@/types/booking';
import { PRODUCT_TYPES, getValidProductType } from '@/constants/statusCodes';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface för legacy-anrop från PaymentSelection
 */
export interface LegacyInvoicePaymentParams {
  userInfo: UserInfo;
  courseId: string;
  product_type?: string;
  amount: number;
  onPaymentComplete?: (data: any) => void;
  onValidationError?: (error: string) => void;
}

/**
 * Adapter som konverterar en invoice-betalning från det gamla formatet till det nya
 */
export async function adaptLegacyInvoicePayment(
  params: LegacyInvoicePaymentParams,
  invoiceDetails: {
    address: string;
    postalCode: string;
    city: string;
    reference?: string;
  }
): Promise<StandardPaymentResponse> {
  try {
    // Konvertera legacy-typer till nya standardiserade typer
    const productType = getValidProductType(params.product_type || PRODUCT_TYPES.COURSE);
    
    // Skapa standardiserad betalningsdata
    const requestData: NormalizedInvoicePaymentRequest = {
      userInfo: {
        firstName: params.userInfo.firstName,
        lastName: params.userInfo.lastName,
        email: params.userInfo.email,
        phoneNumber: params.userInfo.phone || '',
        numberOfParticipants: params.userInfo.numberOfParticipants
      },
      invoiceDetails: {
        address: invoiceDetails.address.trim(),
        postalCode: invoiceDetails.postalCode.trim(),
        city: invoiceDetails.city.trim(),
        reference: invoiceDetails.reference || ''
      },
      productType,
      productId: params.courseId,
      amount: params.amount,
      quantity: parseInt(params.userInfo.numberOfParticipants) || 1
    };

    // Anropa den nya standardiserade API-tjänsten
    const response = await createStandardizedInvoicePayment(requestData);
    
    // Om vi har en onPaymentComplete callback i legacy-formatet, anropa den med 
    // konverterad data om betalningen lyckades
    if (params.onPaymentComplete && response.success && response.data) {
      // Konvertera det nya svaret till det gamla formatet
      const legacyResponse = {
        success: true,
        payment_reference: response.data.paymentReference,
        invoice_number: response.data.invoiceNumber,
        redirectUrl: response.data.redirectUrl,
        status: response.data.status
      };
      
      params.onPaymentComplete(legacyResponse);
    }
    
    return response;
  } catch (error) {
    console.error('[paymentAdapters] Error adapting legacy invoice payment:', error);
    
    // Returnera ett standardiserat felsvar
    const errorResponse: StandardPaymentResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Ett fel uppstod',
      errorCode: PaymentErrorCode.CLIENT_ERROR,
      data: {
        paymentReference: `ERROR-${uuidv4().substring(0, 8)}`,
        status: 'failed'
      }
    };
    
    return errorResponse;
  }
} 