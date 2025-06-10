/**
 * PaymentService - Ett konsekvent gränssnitt för alla betalningsrelaterade funktioner
 * 
 * Denna klass ger ett centraliserat sätt att hantera betalningar oavsett betalningsmetod 
 * eller produkttyp, vilket garanterar enhetlig datahantering, validering och felhantering.
 */

import { createServerSupabaseClient } from '@/utils/supabase';
import { z } from 'zod';
import { createLogContext, logError, logInfo, LogContext, logWarning } from './logging';
import { SwishConfig } from '@/lib/swish/SwishConfig';
import { SwishErrorCode } from '@/lib/swish/SwishErrorCode';
import { getStepUrl } from '@/utils/flowNavigation';
import { FlowType, GenericStep } from '@/components/common/BookingStepper';

// Produkt- och betalningstyper
export enum ProductType {
  COURSE = 'course',
  GIFT_CARD = 'gift_card',
  ART_PRODUCT = 'art_product'
}

export enum PaymentMethod {
  SWISH = 'swish',
  INVOICE = 'invoice'
}

// Basschema för användarinformation
const UserInfoSchema = z.object({
  firstName: z.string().min(1, "Förnamn är obligatoriskt"),
  lastName: z.string().min(1, "Efternamn är obligatoriskt"),
  email: z.string().email("Giltig e-postadress krävs"),
  phone: z.string().optional(),
});

// Validering för fakturadetaljer
const InvoiceDetailsSchema = z.object({
  personalNumber: z.string().min(10, "Personnummer krävs (10 siffror)"),
  address: z.string().min(1, "Adress är obligatorisk"),
  postalCode: z.string().min(5, "Postnummer är obligatoriskt"),
  city: z.string().min(1, "Stad är obligatorisk"),
  reference: z.string().optional(),
});

// Betalningsinformation som gemensamt basschema
const PaymentInfoSchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod),
  productType: z.nativeEnum(ProductType),
  productId: z.string().or(z.number()),
  amount: z.number().positive("Beloppet måste vara större än 0"),
  quantity: z.number().int().positive().default(1),
  userInfo: UserInfoSchema,
  invoiceDetails: InvoiceDetailsSchema.optional(),
});

// Typer baserade på schemat
export type UserInfo = z.infer<typeof UserInfoSchema>;
export type InvoiceDetails = z.infer<typeof InvoiceDetailsSchema>;
export type PaymentInfo = z.infer<typeof PaymentInfoSchema>;

// Svarstyper
export interface PaymentResponse {
  success: boolean;
  message: string;
  reference?: string;
  redirectUrl?: string;
  errorCode?: string;
  data?: any;
}

export class PaymentService {
  private context: LogContext;
  private supabase: any;

  constructor() {
    this.context = createLogContext('payment_service');
    this.supabase = createServerSupabaseClient();
  }

  /**
   * Validera betalningsinformation och skapa betalning baserat på metod
   */
  async createPayment(paymentData: any): Promise<PaymentResponse> {
    const logContext = { ...this.context, operation: 'create_payment' };
    
    try {
      // Validera indata
      const validationResult = PaymentInfoSchema.safeParse(paymentData);
      
      if (!validationResult.success) {
        const errorMessage = "Ogiltig betalningsinformation";
        logWarning(errorMessage, logContext, validationResult.error);
        return {
          success: false,
          message: errorMessage,
          errorCode: 'VALIDATION_ERROR',
          data: validationResult.error.format()
        };
      }
      
      const validatedData = validationResult.data;
      
      // Uppdatera loggkontext med betalningsdetaljer
      logContext.paymentMethod = validatedData.paymentMethod;
      logContext.productType = validatedData.productType;
      
      // Kontrollera idempotens för att undvika dubbla betalningar
      const existingPayment = await this.checkExistingPayment(validatedData);
      if (existingPayment) {
        return {
          success: true,
          message: 'Betalning redan registrerad',
          reference: existingPayment.reference,
          data: existingPayment
        };
      }
      
      // Skapa betalning baserat på metod
      if (validatedData.paymentMethod === PaymentMethod.SWISH) {
        return await this.createSwishPayment(validatedData, logContext);
      } else if (validatedData.paymentMethod === PaymentMethod.INVOICE) {
        return await this.createInvoicePayment(validatedData, logContext);
      } else {
        const errorMessage = `Betalningsmetod ${validatedData.paymentMethod} stöds inte`;
        logWarning(errorMessage, logContext);
        return {
          success: false,
          message: errorMessage,
          errorCode: 'UNSUPPORTED_PAYMENT_METHOD'
        };
      }
    } catch (error) {
      logError('Ett oväntat fel inträffade vid betalningsbehandling', logContext, error);
      return {
        success: false,
        message: 'Ett oväntat fel inträffade',
        errorCode: 'UNKNOWN_ERROR',
        data: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Kontrollera om det redan finns en betalning med samma detaljer
   */
  private async checkExistingPayment(paymentInfo: PaymentInfo): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('payments')
        .select('*')
        .eq('product_id', paymentInfo.productId)
        .eq('product_type', paymentInfo.productType)
        .eq('payment_method', paymentInfo.paymentMethod)
        .eq('email', paymentInfo.userInfo.email)
        .eq('status', 'COMPLETED')
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
   * Skapa en Swish-betalning
   */
  private async createSwishPayment(paymentInfo: PaymentInfo, logContext: LogContext): Promise<PaymentResponse> {
    try {
      // Generera unik referens
      const reference = this.generatePaymentReference();
      logContext.reference = reference;
      
      logInfo('Skapar Swish-betalning', logContext, { 
        productId: paymentInfo.productId,
        amount: paymentInfo.amount
      });
      
      // Skapa betalningsregistrering i databasen
      await this.recordPaymentIntent({
        reference,
        productId: paymentInfo.productId,
        productType: paymentInfo.productType,
        paymentMethod: PaymentMethod.SWISH,
        amount: paymentInfo.amount,
        status: 'PENDING',
        userInfo: paymentInfo.userInfo
      });
      
      // Förbered API-anrop till Swish
      const swishConfig = SwishConfig.getInstance();
      const apiUrl = swishConfig.getPaymentRequestUrl();
      
      // Konstruera Swish-betalningsanrop enligt deras API-specifikation
      const swishRequestData = {
        payeePaymentReference: reference,
        callbackUrl: swishConfig.getCallbackUrl(),
        payeeAlias: swishConfig.getMerchantSwishNumber(),
        amount: paymentInfo.amount.toString(),
        currency: 'SEK',
        message: this.getProductDescription(paymentInfo),
        phoneNumber: paymentInfo.userInfo.phone
      };
      
      // Här skulle API-anropet till Swish ske...
      // Detta är en förenklad implementering för demonstration
      
      // Simulera ett lyckat svar
      return {
        success: true,
        message: 'Swish-betalning skapad',
        reference,
        redirectUrl: `https://example.com/payment/swish/${reference}`
      };
    } catch (error) {
      logError('Kunde inte skapa Swish-betalning', logContext, error);
      
      let errorCode = 'UNKNOWN_ERROR';
      if (error instanceof Error) {
        if (error.message.includes('certificate')) {
          errorCode = SwishErrorCode.CERTIFICATE_ERROR;
        } else if (error.message.includes('validation')) {
          errorCode = SwishErrorCode.VALIDATION_ERROR;
        }
      }
      
      return {
        success: false,
        message: 'Kunde inte skapa Swish-betalning',
        errorCode,
        data: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Skapa en fakturabelating
   */
  private async createInvoicePayment(paymentInfo: PaymentInfo, logContext: LogContext): Promise<PaymentResponse> {
    try {
      // Kontrollera att fakturainformation finns
      if (!paymentInfo.invoiceDetails) {
        const errorMessage = 'Fakturainformation saknas';
        logWarning(errorMessage, logContext);
        return {
          success: false,
          message: errorMessage,
          errorCode: 'VALIDATION_ERROR'
        };
      }
      
      // Generera unik referens
      const reference = this.generatePaymentReference();
      logContext.reference = reference;
      
      logInfo('Skapar fakturabetalning', logContext, { 
        productId: paymentInfo.productId,
        amount: paymentInfo.amount
      });
      
      // Skapa betalningsregistrering i databasen
      await this.recordPaymentIntent({
        reference,
        productId: paymentInfo.productId,
        productType: paymentInfo.productType,
        paymentMethod: PaymentMethod.INVOICE,
        amount: paymentInfo.amount,
        status: 'COMPLETED', // Fakturor markeras som slutförda direkt
        userInfo: paymentInfo.userInfo,
        invoiceDetails: paymentInfo.invoiceDetails
      });
      
      // Här skulle eventuellt ett anrop till ett faktureringssystem ske

      return {
        success: true,
        message: 'Fakturabetalning skapad',
        reference,
        redirectUrl: this.getRedirectUrl(paymentInfo.productType, reference)
      };
    } catch (error) {
      logError('Kunde inte skapa fakturabetalning', logContext, error);
      return {
        success: false,
        message: 'Kunde inte skapa fakturabetalning',
        errorCode: 'UNKNOWN_ERROR',
        data: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Registrera en betalningsavsikt i databasen
   */
  private async recordPaymentIntent(data: any): Promise<void> {
    const { error } = await this.supabase.from('payments').insert({
      reference: data.reference,
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
    return `PAY-${timestamp}${random}`;
  }

  /**
   * Hämta produktbeskrivning baserat på produkttyp
   */
  private getProductDescription(paymentInfo: PaymentInfo): string {
    switch (paymentInfo.productType) {
      case ProductType.COURSE:
        return `Kursavgift (ID: ${paymentInfo.productId})`;
      case ProductType.GIFT_CARD:
        return `Presentkort ${paymentInfo.amount} kr`;
      case ProductType.ART_PRODUCT:
        return `Konstprodukt (ID: ${paymentInfo.productId})`;
      default:
        return `Betalning ${paymentInfo.amount} kr`;
    }
  }

  /**
   * Hämta rätt omdirigerings-URL baserat på produkttyp
   */
  private getRedirectUrl(productType: ProductType, reference: string): string {
    // Convert ProductType to FlowType for consistency
    let flowType: FlowType;
    let baseUrl: string;
    
    switch (productType) {
      case ProductType.COURSE:
        flowType = FlowType.COURSE_BOOKING;
        // For courses, we need the course ID to build the correct URL
        // Since we don't have it here, we'll fall back to a generic path
        baseUrl = '/book-course';
        break;
      case ProductType.GIFT_CARD:
        flowType = FlowType.GIFT_CARD;
        baseUrl = getStepUrl(FlowType.GIFT_CARD, GenericStep.CONFIRMATION);
        break;
      case ProductType.ART_PRODUCT:
        flowType = FlowType.ART_PURCHASE;
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
} 