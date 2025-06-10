/**
 * InvoiceService - Dedikerad tjänst för hantering av fakturabetalningar
 * 
 * Denna klass ger ett enhetligt gränssnitt för alla fakturarelaterade operationer,
 * separerat från andra betalningstyper (t.ex. Swish) för att uppnå "segregation of duty".
 */

import { createServerSupabaseClient } from '@/utils/supabase';
import { v4 as uuidv4 } from 'uuid';
import { 
  createLogContext, 
  logDebug, 
  logError, 
  logInfo, 
  LogContext, 
  logWarning 
} from '../logging';
import { 
  PAYMENT_METHODS, 
  PAYMENT_STATUSES, 
  PRODUCT_TYPES, 
  getValidProductType,
  ProductType
} from '@/constants/statusCodes';
import { UserInfo } from '@/types/booking';
import { getStepUrl } from '@/utils/flowNavigation';
import { FlowType, GenericStep } from '@/components/common/BookingStepper';

// Typer specifika för fakturabetalningar
export interface InvoiceDetails {
  address: string;
  postalCode: string;
  city: string;
  reference?: string;
  personalNumber?: string;
}

export interface InvoicePaymentRequest {
  payment_method: string;
  amount: number;
  product_id: string;
  product_type: string;
  userInfo: UserInfo;
  invoiceDetails: InvoiceDetails;
  idempotency_key?: string;
}

export interface InvoicePaymentResponse {
  success: boolean;
  reference?: string;
  invoiceNumber?: string;
  redirectUrl?: string;
  message: string;
  error?: string;
  errorCode?: string;
  data?: any;
}

/**
 * InvoiceService hanterar alla fakturabetalningar i systemet
 */
export class InvoiceService {
  private static instance: InvoiceService;
  private readonly context: LogContext;
  private readonly supabase: any;

  private constructor() {
    this.context = createLogContext('invoice_service');
    this.supabase = createServerSupabaseClient();
  }

  /**
   * Hämta singleton-instansen av InvoiceService
   */
  public static getInstance(): InvoiceService {
    if (!InvoiceService.instance) {
      InvoiceService.instance = new InvoiceService();
    }
    return InvoiceService.instance;
  }

  /**
   * Skapa en ny fakturabetalning
   */
  public async createInvoicePayment(data: InvoicePaymentRequest): Promise<InvoicePaymentResponse> {
    const logContext = { 
      ...this.context, 
      operation: 'create_invoice',
      productType: data.product_type,
      productId: data.product_id
    };
    
    logInfo('Skapar fakturabetalning', logContext, {
      amount: data.amount,
      email: data.userInfo.email
    });
    
    try {
      // Validera indata
      this.validateInvoiceData(data);
      
      // Kontrollera idempotens om en idempotency_key har angivits
      if (data.idempotency_key) {
        const existingPayment = await this.checkExistingPayment(data.idempotency_key);
        if (existingPayment) {
          logInfo('Hittade befintlig betalning med samma idempotency_key', logContext, {
            reference: existingPayment.reference
          });
          
          return {
            success: true,
            reference: existingPayment.reference,
            invoiceNumber: existingPayment.invoice_number,
            redirectUrl: this.getRedirectUrl(data.product_type, existingPayment.reference),
            message: 'Betalning redan registrerad'
          };
        }
      }
      
      // Generera unik betalningsreferens och fakturanummer
      const reference = this.generatePaymentReference();
      const invoiceNumber = this.generateInvoiceNumber();
      
      // Uppdatera logkontext med betalningsreferens
      logContext.reference = reference;
      
      // Skapa betalningsregistrering i databasen
      await this.recordPaymentIntent({
        reference,
        invoiceNumber,
        productId: data.product_id,
        productType: data.product_type,
        paymentMethod: PAYMENT_METHODS.INVOICE,
        amount: data.amount,
        status: PAYMENT_STATUSES.PAID, // Fakturor markeras som betalda direkt för enklare flöde
        userInfo: data.userInfo,
        invoiceDetails: data.invoiceDetails,
        idempotencyKey: data.idempotency_key
      });
      
      // I en riktig implementation skulle vi här skicka fakturan via e-post
      // await this.sendInvoiceEmail(data.userInfo, data.invoiceDetails, data.product_type, data.product_id, invoiceNumber);
      
      // Logga framgångsrik fakturaskapande
      logInfo('Fakturabetalning skapad', logContext, {
        invoiceNumber,
        reference
      });
      
      // Returnera framgångsrikt svar
      return {
        success: true,
        reference,
        invoiceNumber,
        redirectUrl: this.getRedirectUrl(data.product_type, reference),
        message: 'Fakturabetalning skapad'
      };
      
    } catch (error) {
      // Logga fel
      logError('Fel vid skapande av fakturabetalning', logContext, error);
      
      // Returnera felsvar
      return {
        success: false,
        message: 'Kunde inte skapa fakturabetalning',
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'INVOICE_ERROR'
      };
    }
  }

  /**
   * Validera fakturadata
   */
  private validateInvoiceData(data: InvoicePaymentRequest): void {
    // Kontrollera betalningsmetod
    if (data.payment_method !== PAYMENT_METHODS.INVOICE) {
      throw new Error('Ogiltig betalningsmetod för fakturabetalning');
    }
    
    // Kontrollera att fakturainformation finns
    if (!data.invoiceDetails) {
      throw new Error('Fakturainformation saknas');
    }
    
    // Validera nödvändiga fält i fakturainformation
    const { address, postalCode, city } = data.invoiceDetails;
    if (!address || !postalCode || !city) {
      throw new Error('Ofullständig fakturainformation');
    }
    
    // Validera belopp
    if (!data.amount || data.amount <= 0) {
      throw new Error('Ogiltigt belopp');
    }
    
    // Validera användarinformation
    if (!data.userInfo || !data.userInfo.firstName || !data.userInfo.lastName || !data.userInfo.email) {
      throw new Error('Ofullständig användarinformation');
    }
  }

  /**
   * Kontrollera om det redan finns en betalning med samma idempotency_key
   */
  private async checkExistingPayment(idempotencyKey: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('payments')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        logWarning('Fel vid kontroll av befintlig betalning', this.context, error);
        return null;
      }
      
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      logError('Kunde inte kontrollera befintlig betalning', this.context, error);
      return null;
    }
  }

  /**
   * Registrera en betalningsavsikt i databasen
   */
  private async recordPaymentIntent(data: any): Promise<void> {
    const { error } = await this.supabase.from('payments').insert({
      reference: data.reference,
      invoice_number: data.invoiceNumber,
      product_id: data.productId,
      product_type: data.productType,
      payment_method: data.paymentMethod,
      amount: data.amount,
      status: data.status,
      first_name: data.userInfo.firstName,
      last_name: data.userInfo.lastName,
      email: data.userInfo.email,
      phone: data.userInfo.phone,
      invoice_details: data.invoiceDetails || null,
      idempotency_key: data.idempotencyKey || null,
      created_at: new Date().toISOString()
    });
    
    if (error) {
      throw new Error(`Kunde inte registrera betalning: ${error.message}`);
    }
  }

  /**
   * Generera en unik betalningsreferens
   */
  private generatePaymentReference(): string {
    const date = new Date();
    const timestamp = date.getTime().toString().slice(-6);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${timestamp}${random}`;
  }

  /**
   * Generera ett unikt fakturanummer
   */
  private generateInvoiceNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${year}${month}-${random}`;
  }

  /**
   * Hämta rätt omdirigerings-URL baserat på produkttyp
   */
  private getRedirectUrl(productType: string, reference: string): string {
    // Använd validerad produkttyp
    const validProductType = getValidProductType(productType);
    
    // Convert to FlowType for consistency  
    let baseUrl: string;
    
    switch (validProductType) {
      case PRODUCT_TYPES.COURSE:
        // For courses, we need the course ID to build the correct URL
        // Since we don't have it here, we'll fall back to a generic path
        baseUrl = '/book-course';
        break;
      case PRODUCT_TYPES.GIFT_CARD:
        baseUrl = getStepUrl(FlowType.GIFT_CARD, GenericStep.CONFIRMATION);
        break;
      case PRODUCT_TYPES.ART_PRODUCT:
        // For products, we need the product ID to build the correct URL
        // Since we don't have it here, we'll fall back to a generic path
        baseUrl = '/shop';
        break;
      default:
        baseUrl = '/payment/confirmation';
        break;
    }
    
    // Add reference as query parameter for additional context
    const hasQuery = baseUrl.includes('?');
    const separator = hasQuery ? '&' : '?';
    return `${baseUrl}${separator}reference=${reference}`;
  }

  /**
   * Skicka faktura via e-post (implementeras senare)
   */
  /*
  private async sendInvoiceEmail(
    userInfo: UserInfo, 
    invoiceDetails: InvoiceDetails, 
    productType: string, 
    productId: string, 
    invoiceNumber: string
  ): Promise<void> {
    // Implementeras senare med riktig e-postfunktionalitet
    logInfo('Skulle skicka faktura', {
      operation: 'send_invoice_email',
      email: userInfo.email,
      invoiceNumber
    });
  }
  */
} 