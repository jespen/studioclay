import { 
  InvoicePaymentRequest, 
  InvoicePaymentResponse,
  StandardPaymentResponse,
  PaymentErrorCode,
  PaymentReferenceData
} from '@/types/paymentTypes';
import { v4 as uuidv4 } from 'uuid';
import { UserInfo } from '@/types/booking';
import { PAYMENT_METHODS, ProductType, PRODUCT_TYPES, getValidProductType } from '@/constants/statusCodes';
import { logError, logInfo } from "@/lib/logging";

/**
 * API-sökväg för fakturaskapande
 */
const INVOICE_CREATE_ENDPOINT = '/api/payments/invoice/create';

/**
 * Adapter för att integrera frontend med den nya InvoiceService
 * 
 * Denna fil ger en backward-compatible metod för att anropa vår nya InvoiceService,
 * vilket möjliggör en gradvis övergång till den nya arkitekturen.
 */

// Modern Normalized type for invoice payment requests
export interface NormalizedInvoicePaymentRequest {
  userInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    numberOfParticipants?: string | number;
    specialRequirements?: string;
  };
  invoiceDetails: {
    address: string;
    postalCode: string;
    city: string;
    reference?: string;
  };
  productType: string;
  productId: string;
  amount: number;
  quantity?: number;
}

// Typ för att stödja det gamla användargränssnittet
interface LegacyInvoicePaymentRequest {
  payment_method?: string;
  amount: number;
  product_id: string;
  product_type: string;
  userInfo: UserInfo;
  invoiceDetails: {
    address: string;
    postalCode: string;
    city: string;
    reference?: string;
  };
}

/**
 * Skapar en fakturabetalning via API:et med nya standardiserade typer
 * @param data Betalningsdata i normaliserat format
 * @returns StandardPaymentResponse med typade data
 */
export async function createStandardizedInvoicePayment(
  data: NormalizedInvoicePaymentRequest
): Promise<StandardPaymentResponse> {
  try {
    // Generera unik idempotency key
    const idempotencyKey = uuidv4();
    const requestId = uuidv4();
    
    // Add detailed logging for participant count
    console.log("[InvoiceService] Tracking number of participants:", {
      rawNumberOfParticipants: data.userInfo.numberOfParticipants,
      typeOfValue: typeof data.userInfo.numberOfParticipants,
      parsedValue: parseInt(data.userInfo.numberOfParticipants?.toString() || '1'),
      requestId
    });
    
    logInfo("Preparing standardized invoice payment request", 
      { requestId, operation: "create_invoice" },
      {
        amount: data.amount,
        productId: data.productId,
        productType: data.productType
      }
    );

    // Skicka med explicit payment_method för tydlighet
    const response = await fetch(INVOICE_CREATE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...data,
        paymentMethod: 'invoice',
        idempotency_key: idempotencyKey
      }),
    });

    // Parsa typat standardiserat svar
    const responseData = await response.json() as StandardPaymentResponse;
    
    if (!response.ok || !responseData.success) {
      logError("Standardized invoice payment request failed", 
        { requestId, operation: "create_invoice" },
        { 
          statusCode: response.status,
          errorCode: responseData.errorCode,
          error: responseData.error
        }
      );
      
      return responseData;
    }

    logInfo("Standardized invoice payment successfully created", 
      { requestId, operation: "create_invoice" },
      {
        paymentReference: responseData.data?.paymentReference,
        invoiceNumber: responseData.data?.invoiceNumber,
        status: responseData.data?.status
      }
    );

    return responseData;
  } catch (error) {
    logError("Exception during standardized invoice payment creation", 
      { operation: "create_invoice" },
      error
    );
    
    // Returnera ett standardiserat felsvar även för klient-fel
    const errorResponse: StandardPaymentResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      errorCode: PaymentErrorCode.CLIENT_ERROR,
      data: {
        paymentReference: 'CLIENT_ERROR',
        status: 'failed'
      }
    };
    
    return errorResponse;
  }
}

/**
 * Skapar en fakturabetalning via API:et
 * @param data Betalningsdata
 * @returns APIets svar
 */
export async function createInvoicePayment(
  data: LegacyInvoicePaymentRequest | InvoicePaymentRequest
): Promise<InvoicePaymentResponse> {
  try {
    // Generate unique idempotency key if not provided
    const idempotencyKey = (data as InvoicePaymentRequest).idempotency_key || uuidv4();
    const requestId = uuidv4();
    
    // Add debug logging for invoice details
    console.log("[invoiceService] Incoming invoice data:", {
      hasInvoiceDetails: !!data.invoiceDetails,
      address: data.invoiceDetails?.address,
      postalCode: data.invoiceDetails?.postalCode,
      city: data.invoiceDetails?.city,
      invoiceDetailsEmpty: !data.invoiceDetails?.address || !data.invoiceDetails?.postalCode || !data.invoiceDetails?.city
    });
    
    logInfo("Preparing invoice payment request", 
      { requestId, operation: "create_invoice" },
      {
        amount: data.amount,
        product_id: data.product_id,
        product_type: data.product_type,
        idempotency_key: idempotencyKey
      }
    );

    // Validate product type
    if (!data.product_type) {
      logError("Missing product type in invoice payment request", 
        { requestId, operation: "create_invoice" },
        data
      );
      
      return {
        success: false,
        error: "Missing product type",
        errorCode: "INVALID_PRODUCT_TYPE"
      };
    }

    const response = await fetch(INVOICE_CREATE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...data,
        idempotency_key: idempotencyKey
      }),
    });

    // Hantera både nya och gamla svarsformat
    const responseData = await response.json();
    
    if (!response.ok) {
      logError("Invoice payment request failed", 
        { requestId, operation: "create_invoice" },
        { 
          statusCode: response.status,
          responseData 
        }
      );
      
      // Konvertera nytt svar till gammalt format
      if (responseData.data && responseData.errorCode) {
        return {
          success: false,
          error: responseData.error || "Failed to create invoice payment",
          errorCode: responseData.errorCode,
          invoice_number: responseData.data.invoiceNumber,
          payment_reference: responseData.data.paymentReference
        };
      }
      
      return {
        success: false,
        error: responseData.error || "Failed to create invoice payment",
        errorCode: responseData.errorCode || "PAYMENT_FAILED"
      };
    }

    logInfo("Invoice payment successfully created", 
      { requestId, operation: "create_invoice" },
      {
        invoice_id: responseData.invoice_id || responseData.data?.invoiceNumber,
        status: responseData.status || responseData.data?.status
      }
    );

    // Konvertera nytt API-format till gammalt om det behövs
    if (responseData.data) {
      return {
        success: true,
        invoiceNumber: responseData.data.invoiceNumber,
        invoice_number: responseData.data.invoiceNumber,
        payment_reference: responseData.data.paymentReference,
        paymentStatus: responseData.data.status,
        redirectUrl: responseData.data.redirectUrl
      };
    }

    return {
      success: true,
      ...responseData
    };
  } catch (error) {
    logError("Exception during invoice payment creation", 
      { operation: "create_invoice" },
      error
    );
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      errorCode: "SYSTEM_ERROR"
    };
  }
}

/**
 * Hämtar fakturastatus
 * @param invoiceId ID för faktura att kontrollera
 * @returns Fakturans aktuella status
 */
export async function getInvoiceStatus(
  invoiceId: string
): Promise<InvoicePaymentResponse> {
  try {
    const requestId = uuidv4();
    
    logInfo("Checking invoice status", 
      { requestId, operation: "check_invoice_status" },
      { invoiceId }
    );
    
    const response = await fetch(`/api/payments/invoice/status?id=${invoiceId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      logError("Invoice status check failed", 
        { requestId, operation: "check_invoice_status" },
        { 
          statusCode: response.status,
          responseData 
        }
      );
      
      return {
        success: false,
        error: responseData.error || "Failed to check invoice status",
        errorCode: responseData.errorCode || "STATUS_CHECK_FAILED"
      };
    }

    logInfo("Invoice status retrieved successfully", 
      { requestId, operation: "check_invoice_status" },
      {
        invoice_status: responseData.status,
        invoice_id: invoiceId
      }
    );

    return {
      success: true,
      ...responseData
    };
  } catch (error) {
    logError("Exception during invoice status check", 
      { operation: "check_invoice_status" },
      error
    );
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      errorCode: "SYSTEM_ERROR"
    };
  }
} 