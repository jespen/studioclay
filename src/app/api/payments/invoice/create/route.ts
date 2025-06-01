import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase';
import { logDebug, logError, logInfo, logWarning } from '@/lib/logging';
import { v4 as uuidv4 } from 'uuid';
import { 
  validatePaymentRequest, 
  mapProductType 
} from "@/lib/validation/paymentSchemas";
import { 
  PRODUCT_TYPES, 
  PAYMENT_METHODS, 
  PAYMENT_STATUSES, 
  BOOKING_STATUSES,
  getValidProductType
} from "@/constants/statusCodes";
import { 
  InvoicePaymentRequest, 
  StandardPaymentResponse,
  PaymentErrorCode,
  PaymentReferenceData,
  createPaymentResponse
} from '@/types/paymentTypes';
import { 
  normalizePaymentRequest, 
  getFieldWithFallback,
  ensureBothFieldFormats
} from '@/lib/validation/paymentFieldNormalizer';
import { 
  generatePaymentReference,
  generateInvoiceNumber,
  generateOrderReference,
  generatePaymentReferences
} from '@/utils/referenceGenerators';
import { generateAndStoreInvoicePdf, generateAndStoreGiftCardPdf } from '@/utils/pdfGenerator';
import type { GiftCardData as GiftCardPdfData } from '@/utils/giftCardPDF';
import { convertObjectToSnakeCase } from '@/utils/caseConverter';
import { createBackgroundJob, JobType } from '@/lib/jobQueue';

// Utöka UserInfo interface för att inkludera presentkortsfält
interface ExtendedUserInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneNumber: string;
  address?: string;
  postalCode?: string;
  city?: string;
  numberOfParticipants?: string | number;
  // Presentkortspecifika fält
  recipientName?: string; 
  recipientEmail?: string;
  message?: string;
}

// Define the InvoiceProcessingArgs interface near the top of the file
interface InvoiceProcessingArgs {
  userInfo: ExtendedUserInfo;
  productInfo: any;
  invoiceDetails: any;
  productType: string;
  productId: string;
  amount: number;
  paymentReference: string;
  invoiceNumber: string;
  giftCardDetails?: {
    recipientName?: string;
    recipientEmail?: string;
    message?: string;
  };
}

// Interface for invoice details structure
interface InvoiceDetails {
  address: string;
  postalCode: string;
  city: string;
  reference?: string;
  [key: string]: any; // Tillåt ytterligare properties
}

// Lägg till tydliga typer för kurs-datamodellerna
interface CourseInstance {
  id: string;
  title: string;
  description: string | null;
  rich_description: string | null;
  price: number;
  start_date: string;
  max_participants?: number;
  current_participants?: number;
  status?: string;
  image_url?: string;
}

interface CourseDetails {
  id: string;
  title: string;
  description: string;
  start_date: string;
  price: number;
  location?: string;
}

// Placeholder for the sendEmailWithInvoice function if it doesn't exist
async function sendEmailWithInvoice(emailData: any): Promise<{success: boolean, message?: string, messageId?: string}> {
  try {
    // Dynamically import the email service to avoid bundling issues
    const { sendServerInvoiceEmail } = await import('@/utils/serverEmail');
    
    // Convert blob to buffer for server-side email if needed
    let pdfBuffer: Buffer | undefined;
    if (emailData.pdfBlob) {
      const arrayBuffer = await emailData.pdfBlob.arrayBuffer();
      pdfBuffer = Buffer.from(arrayBuffer);
    }
    
    // Call the actual email service
    const result = await sendServerInvoiceEmail({
      userInfo: emailData.userInfo,
      paymentDetails: {
        amount: emailData.amount || 0,
        method: 'invoice',
        paymentReference: emailData.paymentReference,
        invoiceNumber: emailData.invoiceNumber
      },
      courseDetails: emailData.courseDetails,
      invoiceNumber: emailData.invoiceNumber,
      pdfBuffer,
      isGiftCard: emailData.productType === 'gift_card',
      isProduct: emailData.productType === 'art_product'
    });
    
    return result;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error during email sending'
    };
  }
}

// Uppdatera funktionen för att inkludera presentkorts-PDF-generering
async function generateInvoiceAndSendEmail(
  { userInfo, productInfo, invoiceDetails, productType, productId, amount, paymentReference, invoiceNumber }: InvoiceProcessingArgs,
  requestId: string
): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient();
    
    logInfo(`Starting invoice email generation`, { 
      requestId, 
      invoiceNumber,
      productType
    });
    
    // Hämta nödvändiga produktdetaljer
    let courseDetails = null;
    let artOrderDetails = null;
    let giftCardDetails: Partial<GiftCardPdfData> | null = null;
    let giftCardDatabaseId: string | null = null; // Separat variabel för databasID
    
    try {
      if (productType === 'course') {
        // För kursbokningar: Hämta kursdetaljer
        const { data: course, error: courseError } = await supabase
          .from('course_instances')
          .select('id, title, description, start_date, location, price')
          .eq('id', productId)
          .single();
          
        if (courseError) {
          logError(`Failed to get course details`, {
            requestId,
            error: courseError
          });
          throw new Error(`Could not fetch course details: ${courseError.message}`);
        }
        
        logDebug(`Retrieved course details`, {
          requestId,
          courseTitle: course.title,
          courseDate: course.start_date
        });
        
        courseDetails = course;
      } else if (productType === 'art_product') {
        // För art product: Get product details
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('name, description, price, image_urls')
          .eq('id', productId)
          .single();
        
        if (productError) {
          logError(`Failed to get art product details`, {
            requestId,
            error: productError
          });
          throw new Error(`Could not fetch art product details: ${productError.message}`);
        }
        
        logDebug(`Retrieved art product details`, {
          requestId,
          productName: productData.name,
          hasPrice: !!productData.price
        });
        
        artOrderDetails = productData;
      } else if (productType === 'gift_card') {
        // För presentkort: Sätt detaljer
        giftCardDetails = {
          amount: amount,
          code: '', // Kommer fyllas i senare
          recipientName: '',
          senderName: ''
        };
        
        logDebug(`Using gift card amount for details`, {
          requestId,
          amount
        });
        
        // Försök hämta eller skapa presentkort
        const { data: giftCard, error: giftCardError } = await supabase
          .from('gift_cards')
          .select('*')
          .eq('payment_reference', paymentReference)
          .maybeSingle();
          
        if (giftCardError) {
          logError(`Failed to get gift card details`, {
            requestId,
            error: giftCardError
          });
        } else if (giftCard) {
          // Om presentkortet redan finns
          logInfo(`Found existing gift card for payment`, {
            requestId,
            giftCardId: giftCard.id,
            giftCardCode: giftCard.code
          });
          
          // Spara databasID separat
          giftCardDatabaseId = giftCard.id;
          
          // Uppdatera giftCardDetails med presentkortsdata för PDF
          giftCardDetails = {
            code: giftCard.code,
            payment_reference: paymentReference,
            amount: giftCard.amount,
            recipientName: giftCard.recipient_name,
            recipientEmail: giftCard.recipient_email,
            message: giftCard.message,
            senderName: `${userInfo.firstName} ${userInfo.lastName}`,
            senderEmail: userInfo.email,
            senderPhone: userInfo.phoneNumber || '',
            createdAt: typeof giftCard.created_at === 'string' ? new Date(giftCard.created_at) : giftCard.created_at || new Date(),
            expiresAt: typeof giftCard.expires_at === 'string' ? new Date(giftCard.expires_at) : giftCard.expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          };
        } else {
          // Om vi behöver skapa ett nytt presentkort
          logInfo(`Creating new gift card for payment`, {
            requestId,
            paymentReference
          });
          
          // Hämta gift card details från argumenten
          logInfo(`Gift card details from args`, {
            requestId,
            hasGiftCardDetails: !!giftCardDetails
          });
          
          // Generera en unik presentkortskod
          const giftCardCode = `GC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
          
          // Skapa utgångsdatum (1 år)
          const expiryDate = new Date();
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          
          // Skapa presentkort i databasen, använd gift card details om tillgängligt
          const { data: newGiftCard, error: createError } = await supabase
            .from('gift_cards')
            .insert({
              code: giftCardCode,
              amount: amount,
              remaining_balance: amount,
              status: 'active',
              type: 'digital',
              sender_name: `${userInfo.firstName} ${userInfo.lastName}`,
              sender_email: userInfo.email,
              sender_phone: userInfo.phoneNumber || '',
              recipient_name: giftCardDetails?.recipientName || userInfo.recipientName || `${userInfo.firstName} ${userInfo.lastName}`,
              recipient_email: giftCardDetails?.recipientEmail || userInfo.recipientEmail || userInfo.email,
              message: giftCardDetails?.message || userInfo.message || null,
              is_paid: false, // Fakturor börjar som obetalda
              payment_reference: paymentReference,
              invoice_number: invoiceNumber,
              payment_method: 'invoice',
              payment_status: 'CREATED',
              created_at: new Date().toISOString(),
              expires_at: expiryDate.toISOString()
            })
            .select()
            .single();
            
          if (createError) {
            logError(`Failed to create gift card`, {
              requestId,
              error: createError
            });
          } else {
            logInfo(`Successfully created gift card`, {
              requestId,
              giftCardId: newGiftCard.id,
              paymentReference: paymentReference
            });
            
            // Spara databasID separat
            giftCardDatabaseId = newGiftCard.id;
            
            // Uppdatera giftCardDetails med det nyligen skapade presentkortet
            giftCardDetails = {
              code: newGiftCard.code,
              payment_reference: paymentReference,
              amount: newGiftCard.amount,
              recipientName: newGiftCard.recipient_name,
              recipientEmail: newGiftCard.recipient_email,
              message: newGiftCard.message,
              senderName: newGiftCard.sender_name,
              senderEmail: newGiftCard.sender_email,
              senderPhone: newGiftCard.sender_phone,
              createdAt: typeof newGiftCard.created_at === 'string' ? new Date(newGiftCard.created_at) : newGiftCard.created_at || new Date(),
              expiresAt: typeof newGiftCard.expires_at === 'string' ? new Date(newGiftCard.expires_at) : newGiftCard.expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            };
          }
        }
      }
    } catch (detailsError) {
      logError(`Error in product details retrieval`, {
        requestId,
        error: detailsError instanceof Error ? detailsError.message : 'Unknown error',
        productType,
        productId
      });
      return false;
    }
    
    // 2. Generera faktura-PDF
    try {
      // Generera och lagra faktura-PDF
      logDebug(`[DEBUG PHONE] About to call generateAndStoreInvoicePdf`, {
        requestId,
        userInfoPhone: userInfo.phone,
        userInfoPhoneNumber: userInfo.phoneNumber,
        userInfoFirstName: userInfo.firstName,
        userInfoEmail: userInfo.email
      });
      
      const invoicePdfResult = await generateAndStoreInvoicePdf({
        requestId,
        paymentReference,
        userInfo,
        invoiceDetails,
        invoiceNumber,
        productType,
        productId,
        amount,
        productDetails: courseDetails || artOrderDetails || { title: 'Presentkort', price: amount }
      });
      
      if (!invoicePdfResult.success) {
        logError(`Failed to generate invoice PDF`, {
          requestId,
          error: invoicePdfResult.error
        });
        return false;
      }
      
      // Om detta är ett presentkortsköp, generera även presentkorts-PDF
      let giftCardPdfUrl = null;
      if (productType === 'gift_card' && giftCardDetails && giftCardDetails.code) {
        logInfo(`Generating gift card PDF for invoice payment`, {
          requestId,
          paymentReference: paymentReference
        });
        
        // Make sure the completeGiftCardData is converted to snake_case for database storage
        const completeGiftCardData: GiftCardPdfData = {
          code: giftCardDetails.code || `GC-${Date.now()}`, // Behåll för bakåtkompatibilitet
          payment_reference: paymentReference, // Använd payment_reference som huvudidentifierare
          amount: giftCardDetails.amount || amount,
          recipientName: giftCardDetails.recipientName || 'Presentkortsmottagare',
          senderName: giftCardDetails.senderName || `${userInfo.firstName} ${userInfo.lastName}`,
          message: giftCardDetails.message || '',
          senderEmail: giftCardDetails.senderEmail || userInfo.email,
          senderPhone: giftCardDetails.senderPhone || userInfo.phoneNumber || '',
          recipientEmail: giftCardDetails.recipientEmail || '',
          createdAt: typeof giftCardDetails.createdAt === 'string' ? new Date(giftCardDetails.createdAt) : giftCardDetails.createdAt || new Date(),
          expiresAt: typeof giftCardDetails.expiresAt === 'string' ? new Date(giftCardDetails.expiresAt) : giftCardDetails.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        };
        
        const giftCardPdfResult = await generateAndStoreGiftCardPdf({
          requestId,
          paymentReference,
          giftCardData: completeGiftCardData
        });
        
        if (!giftCardPdfResult.success) {
          logWarning(`Failed to generate gift card PDF, continuing with invoice only`, {
            requestId,
            error: giftCardPdfResult.error
          });
        } else {
          giftCardPdfUrl = giftCardPdfResult.publicUrl;
          
          // Uppdatera gift_card-tabellen med PDF-länken
          if (giftCardDatabaseId && giftCardPdfUrl) {
            const { error: updateError } = await supabase
              .from('gift_cards')
              .update({
                pdf_url: giftCardPdfUrl,
                pdf_generated: true,
                updated_at: new Date()
              })
              .eq('id', giftCardDatabaseId);
              
            if (updateError) {
              logWarning(`Failed to update gift card with PDF URL`, {
                requestId,
                error: updateError
              });
            }
          }
        }
      }
      
      // 4. Skicka e-post med faktura-PDF (och presentkorts-PDF om det finns)
      logDebug(`Preparing to send invoice email`, { 
        requestId,
        recipient: userInfo.email,
        includesGiftCard: productType === 'gift_card'
      });
      
      // Här skickar vi epost med fakturan
      // TODO: Utöka detta för att inkludera både faktura och presentkort i samma epost
      const serverEmailModule = await import('@/utils/serverEmail');
      
      let emailData: any = {
        userInfo,
        invoiceNumber,
        paymentReference,
        productType,
        pdfBlob: invoicePdfResult.pdfBlob,
        giftCardPdfUrl // Lägger till presentkorts-PDF URL om det finns
      };
      
      if (productType === 'course') {
        emailData.courseDetails = courseDetails;
      } else if (productType === 'art_product') {
        emailData.artProduct = artOrderDetails;
      } else if (productType === 'gift_card') {
        emailData.giftCardDetails = giftCardDetails;
      }
      
      // Anropa e-posttjänsten
      logDebug(`Calling email service`, { requestId });
      
      // Prepare the email data in the format expected by sendServerInvoiceEmail
      const emailParams = {
        userInfo: {
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          email: userInfo.email,
          phone: userInfo.phoneNumber || '',  // Ensure phone is a string, not undefined
          numberOfParticipants: String(userInfo.numberOfParticipants || 1)  // Convert to string
        },
        paymentDetails: {
          method: 'invoice',
          status: 'pending',
          invoiceNumber,
          amount
        },
        courseDetails: productType === 'course' && courseDetails
          ? {
              id: courseDetails.id,
              title: courseDetails.title,
              description: courseDetails.description || '',
              start_date: courseDetails.start_date,
              location: courseDetails.location || '',
              price: courseDetails.price
            }
          : {
              id: productId,
              title: productType === 'gift_card' 
                ? 'Presentkort' 
                : (artOrderDetails?.name || 'Produkt'),
              description: artOrderDetails?.description || '',
              start_date: new Date().toISOString(),
              location: 'Studio Clay, Stockholm',
              price: amount
            },
        invoiceNumber,
        pdfBuffer: invoicePdfResult.pdfBlob ? Buffer.from(await invoicePdfResult.pdfBlob.arrayBuffer()) : undefined,
        isGiftCard: productType === 'gift_card',
        giftCardCode: giftCardDetails?.code || giftCardDetails?.payment_reference,
        giftCardPdfBuffer: undefined  // We don't have the buffer here
      };
      
      const emailResult = await serverEmailModule.sendServerInvoiceEmail(emailParams);
      
      if (!emailResult.success) {
        logError(`Failed to send invoice email`, {
          requestId,
          error: emailResult.message
        });
        return false;
      }
      
      logInfo(`Successfully sent invoice email`, {
        requestId,
        recipient: userInfo.email,
        messageId: emailResult.message || 'unknown',
        includesGiftCard: productType === 'gift_card' && !!giftCardPdfUrl
      });
      
      // 5. Uppdatera payment-tabellen för att markera email som skickat
      try {
        const { error: updateEmailError } = await supabase
          .from('payments')
          .update({
            email_sent_at: new Date().toISOString(),
            updated_at: new Date()
          })
          .eq('payment_reference', paymentReference);
          
        if (updateEmailError) {
          logWarning(`Failed to update payment with email status`, {
            requestId,
            error: updateEmailError
          });
        } else {
          logInfo(`Updated payment record with email status`, {
            requestId,
            paymentReference
          });
        }
      } catch (updateError) {
        logWarning(`Exception when updating payment email status`, {
          requestId,
          error: updateError instanceof Error ? updateError.message : 'Unknown error'
        });
      }
      
      return true;
    } catch (pdfError) {
      logError(`Error in PDF generation process`, {
        requestId,
        error: pdfError instanceof Error ? pdfError.message : 'Unknown error',
        stack: pdfError instanceof Error ? pdfError.stack : undefined
      });
      return false;
    }
  } catch (error) {
    logError(`Error in invoice generation and email process`, {
      requestId,
      paymentReference,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return false;
  }
}

// Typer för produkt-specifika data
interface ArtOrderData {
  id: string;
  order_reference: string;
  [key: string]: any;
}

interface GiftCardData {
  id: string;
  code: string;
  [key: string]: any;
}

interface BookingData {
  id: string;
  booking_reference: string;
  [key: string]: any;
}

// Union-typ för produkt-specifika data
type ProductSpecificData = ArtOrderData | GiftCardData | BookingData | null;

/**
 * Typ för validerad betalningsdata för fakturabetalningar.
 * Används för att tydliggöra strukturen efter validering.
 */
interface ValidatedInvoicePaymentData {
  userInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    numberOfParticipants?: string | number;
    [key: string]: any; // Tillåt ytterligare properties
  };
  invoiceDetails: InvoiceDetails;
  productType: string; // Kan inte begränsa till literal types på grund av validering
  productId: string;
  amount: number;
  paymentMethod: string;
  quantity?: number;
  // Lägg till för flexibel statushantering  
  payment_status?: string;
  status?: string;
  // Tillåt både camelCase och snake_case versioner
  [key: string]: any;
}

// Uppdatera hasProperty-funktionen och använd den i validatedData-tilldelningen
const hasProperty = <T, K extends string>(obj: T, prop: K): obj is T & Record<K, unknown> => {
  return obj !== null && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, prop);
};

// Type guard for invoice details
const isInvoiceDetails = (obj: unknown): obj is InvoiceDetails => {
  if (typeof obj !== 'object' || obj === null) return false;
  const details = obj as Record<string, unknown>;
  return (
    typeof details.address === 'string' &&
    typeof details.postalCode === 'string' &&
    typeof details.city === 'string' &&
    (details.reference === undefined || typeof details.reference === 'string')
  );
};

// Skapa en tillfällig interface som matchar det validatedData faktiskt har
interface NormalizedInvoicePaymentData {
  userInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    numberOfParticipants?: string | number;
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
  paymentMethod: string;
  quantity?: number;
  // Lägg till dessa fält för flexibel hantering
  payment_status?: string;
  status?: string;
}

// Funktion för att få rätt redirect-URL baserat på produkttyp
function getRedirectUrl(productType: string, reference: string): string {
  // Använd validerad produkttyp
  const validProductType = mapProductType(productType);
  
  switch (validProductType) {
    case PRODUCT_TYPES.COURSE:
      return `/booking/confirmation?reference=${reference}`;
    case PRODUCT_TYPES.GIFT_CARD:
      return `/gift-card/confirmation?reference=${reference}`;
    case PRODUCT_TYPES.ART_PRODUCT:
      return `/art/confirmation?reference=${reference}`;
    default:
      return `/payment/confirmation/${reference}`;
  }
}

export const POST = async (req: Request) => {
  const startTime = Date.now();
  const requestId = uuidv4();
  
  logInfo(`Invoice payment request started`, { requestId });
  
  try {
    // Parse the request body
    const rawData = await req.json();
    
    // Add detailed logging for userInfo and participants at the beginning
    console.log(`[Invoice API] Beginning of request - userInfo:`, {
      requestId,
      userInfo: rawData.userInfo ? {
        ...rawData.userInfo,
        numberOfParticipants: rawData.userInfo.numberOfParticipants,
        numberOfParticipantsType: typeof rawData.userInfo.numberOfParticipants
      } : 'No userInfo provided'
    });
    
    // Normalize payment request to handle both camelCase and snake_case
    const normalizedData = normalizePaymentRequest(rawData);
    logDebug(`[STEG 1.1] Normalized request data`, { requestId });

    try {
      // Validate the request data
      const validationResult = validatePaymentRequest(normalizedData, 'invoice');
      
      if (!validationResult.success) {
        logError(`[STEG 1.2] Validation failed for invoice payment request`, { 
          requestId, 
          errors: validationResult.errors 
        });
        
        // Generera ett betalningsreferensnummer även vid fel för spårbarhet
        const paymentReference = generatePaymentReference();
        
        return NextResponse.json(
          createPaymentResponse.validation(
            validationResult.errors.join(', '), 
            paymentReference
          ),
          { status: 400 }
        );
      }
      
      // Extract validated data
      const validatedData = validationResult.data!;
      
      // Säkerställ att vi har en faktureringsbetalning
      if (validatedData.paymentMethod !== PAYMENT_METHODS.INVOICE) {
        logError(`[STEG 1.2.1] Fel betalningsmetod för faktura-endpoint`, { 
          requestId, 
          expectedMethod: PAYMENT_METHODS.INVOICE,
          receivedMethod: validatedData.paymentMethod
        });
        
        const paymentReference = generatePaymentReference();
        
        return NextResponse.json(
          createPaymentResponse.validation(
            `Förväntade betalningsmetod ${PAYMENT_METHODS.INVOICE}, men fick ${validatedData.paymentMethod}`, 
            paymentReference
          ),
          { status: 400 }
        );
      }
      
      // Använd vår tillfälliga interface istället för InvoicePaymentRequest
      const invoicePaymentData = validatedData as unknown as NormalizedInvoicePaymentData;
      
      // För presentkort, hämta ut presentkortsdetaljer
      const giftCardDetails = validatedData.productType === PRODUCT_TYPES.GIFT_CARD ? 
        (validatedData as any).giftCardDetails : 
        null;
      
      // Kontrollera och validera produkttyp
      const productType = mapProductType(invoicePaymentData.productType);
      const productId = invoicePaymentData.productId;
      
      logInfo(`[STEG 1.3] Validated payment request`, { 
        requestId, 
        productType,
        productId,
        hasGiftCardDetails: !!giftCardDetails
      });
      
      // Om vi kommer hit har vi validerat datan, nu kan vi processa betalningen
      try {
        // Skapa Supabase-klient
        const supabase = createServerSupabaseClient();
        
        // Ta den ursprungliga datan för att behålla eventuell extra information
        const originalData = normalizedData;
        
        // Extrahera nödvändig information från validerad data
        const userInfoRaw = invoicePaymentData.userInfo || {};
        const invoiceDetailsRaw = invoicePaymentData.invoiceDetails || {};
        
        // Skapa ett objekt med konsistent struktur för användaren
        const userInfoObj = {
          firstName: getFieldWithFallback(userInfoRaw, ['firstName', 'first_name'], ''),
          lastName: getFieldWithFallback(userInfoRaw, ['lastName', 'last_name'], ''),
          email: getFieldWithFallback(userInfoRaw, ['email'], ''),
          phoneNumber: getFieldWithFallback(userInfoRaw, ['phoneNumber', 'phone_number', 'phone'], ''),
          // Sätt även phone för kompatibilitet med PDF-generering och emailer
          phone: getFieldWithFallback(userInfoRaw, ['phoneNumber', 'phone_number', 'phone'], ''),
          specialRequirements: getFieldWithFallback(userInfoRaw, ['specialRequirements', 'special_requirements'], ''),
          // Leta efter numberOfParticipants på flera ställen:
          // 1. Först i det normaliserade userInfo-objektet
          // 2. Sedan i originaldata från requesten
          // 3. Sedan i den validerade datastrukturen
          numberOfParticipants: getFieldWithFallback(userInfoRaw, ['numberOfParticipants', 'number_of_participants']) ||
                               getFieldWithFallback(normalizedData.userInfo || {}, ['numberOfParticipants', 'number_of_participants']) ||
                               getFieldWithFallback(invoicePaymentData.userInfo || {}, ['numberOfParticipants', 'number_of_participants'])
        };
        
        // Use type assertion for Object.keys
        if (userInfoObj.numberOfParticipants === undefined) {
          logError('Missing required field: numberOfParticipants', { 
            requestId,
            userInfoKeys: userInfoRaw ? Object.keys(userInfoRaw as Record<string, unknown>) : [],
            normalizedUserInfoKeys: normalizedData.userInfo ? Object.keys(normalizedData.userInfo as Record<string, unknown>) : [],
            rawRequestKeys: Object.keys(invoicePaymentData)
          });
          
          return NextResponse.json(
            createPaymentResponse.error(
              'Missing required field: numberOfParticipants',
              PaymentErrorCode.VALIDATION_ERROR,
              'Number of participants is required for course bookings'
            )
          );
        }
        
        // Convert to string to ensure consistent handling in later steps
        userInfoObj.numberOfParticipants = String(userInfoObj.numberOfParticipants);
        
        // Debug telefonnummer-mappning
        logDebug(`[DEBUG PHONE] User info mapping completed`, {
          requestId,
          phoneNumber: userInfoObj.phoneNumber,
          phone: userInfoObj.phone,
          originalPhoneFields: {
            phoneNumber: (userInfoRaw as any).phoneNumber,
            phone_number: (userInfoRaw as any).phone_number,
            phone: (userInfoRaw as any).phone
          }
        });
        
        // Skapa ett objekt med konsistent struktur för faktureringsuppgifter
        const invoiceDetails = {
          address: getFieldWithFallback(invoiceDetailsRaw, ['address'], ''),
          postalCode: getFieldWithFallback(invoiceDetailsRaw, ['postalCode', 'postal_code', 'zipCode', 'zip_code'], ''),
          city: getFieldWithFallback(invoiceDetailsRaw, ['city'], ''),
          reference: getFieldWithFallback(invoiceDetailsRaw, ['reference'], '')
        };
        
        logDebug(`[STEG 1.4] Extracted and normalized user and invoice details`, { 
          requestId,
          hasUserEmail: !!userInfoObj.email,
          hasInvoiceAddress: !!invoiceDetails.address
        });
        
        // Generera alla nödvändiga referensnummer på en gång
        const { paymentReference, invoiceNumber, orderReference } = generatePaymentReferences();
        
        logDebug(`[STEG 2.0] Generated references`, { 
          requestId, 
          paymentReference,
          invoiceNumber,
          orderReference
        });
        
        // Skapa datastrukturen för vad vi vill spara
        const requestData = normalizePaymentRequest({
          product_type: productType,
          product_id: productId,
          payment_method: PAYMENT_METHODS.INVOICE,
          amount: invoicePaymentData.amount,
          userInfo: userInfoObj,
          invoiceDetails
        });
        
        // Logga requestData för felsökning
        logDebug(`[STEG 2.1] Normalized request data for payment record`, { 
          requestId, 
          product_type: requestData.product_type,
          productType: requestData.productType,
          validatedProductType: getValidProductType(requestData.product_type),
          hasSnakeCase: !!requestData.product_type,
          hasCamelCase: !!requestData.productType
        });
        
        // För presentkort behöver vi ett UUID för product_id fältet i payments-tabellen
        if (productType === PRODUCT_TYPES.GIFT_CARD) {
          // Generera ett UUID för att representera denna presentkortsbeställning
          requestData.product_id = uuidv4();
          
          logDebug(`Generated UUID for gift card product_id`, {
            requestId,
            generatedUUID: requestData.product_id
          });
        }
        
        // Skapa payment-record
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .insert({
            payment_reference: paymentReference,
            amount: requestData.amount,
            payment_method: PAYMENT_METHODS.INVOICE,
            product_type: getValidProductType(requestData.product_type),
            product_id: requestData.product_id,
            user_info: convertObjectToSnakeCase(userInfoObj),
            phone_number: userInfoObj.phoneNumber,
            currency: 'SEK',
            status: PAYMENT_STATUSES.CREATED,
            metadata: convertObjectToSnakeCase({
              courseId: requestData.product_id,
              productId: requestData.product_id,
              productType: requestData.productType || requestData.product_type
            })
          })
          .select()
          .single();
        
        if (paymentError) {
          return NextResponse.json(
            createPaymentResponse.error(
              'Failed to create payment record',
              PaymentErrorCode.PAYMENT_CREATION_FAILED,
              paymentReference
            )
          );
        }
        
        // Logga framgångsrikt skapande av payment
        logInfo(`Successfully created payment record`, {
          requestId,
          payment_id: payment.id,
          payment_reference: paymentReference,
          invoice_number: invoiceNumber,
          product_type: getValidProductType(requestData.product_type)
        });
        
        // Om detta är ett presentkort, skapa en post i gift_cards-tabellen
        if (productType === PRODUCT_TYPES.GIFT_CARD) {
          try {
            // Skapa en unik presentkortskod
            const giftCardCode = `GC-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
            
            logInfo(`Creating gift card record for invoice payment`, {
              requestId,
              paymentReference,
              invoiceNumber,
              giftCardCode
            });
            
            // Hämta gift card details från validerade data
            const giftCardDetailsData = giftCardDetails || {};
            
            // Skapa utgångsdatum (1 år)
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            
            // Skapa gift_card-record
            const { data: giftCard, error: giftCardError } = await supabase
              .from('gift_cards')
              .insert({
                code: giftCardCode,
                amount: requestData.amount,
                remaining_balance: requestData.amount,
                status: 'active',
                type: 'digital',
                sender_name: `${userInfoObj.firstName} ${userInfoObj.lastName}`,
                sender_email: userInfoObj.email,
                sender_phone: userInfoObj.phoneNumber || '',
                recipient_name: giftCardDetailsData.recipientName || `${userInfoObj.firstName} ${userInfoObj.lastName}`,
                recipient_email: giftCardDetailsData.recipientEmail || userInfoObj.email,
                message: giftCardDetailsData.message || null,
                is_paid: false, // Fakturor börjar som obetalda
                payment_reference: paymentReference,
                invoice_number: invoiceNumber,
                payment_method: 'invoice',
                payment_status: 'CREATED',
                created_at: typeof giftCardDetailsData.createdAt === 'string' ? new Date(giftCardDetailsData.createdAt) : giftCardDetailsData.createdAt || new Date(),
                expires_at: typeof giftCardDetailsData.expiresAt === 'string' ? new Date(giftCardDetailsData.expiresAt) : giftCardDetailsData.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
              })
              .select()
              .single();
              
            if (giftCardError) {
              logWarning(`Failed to create gift card record, continuing`, {
                requestId,
                error: giftCardError
              });
            } else {
              logInfo(`Gift card created successfully`, {
                requestId,
                giftCardId: giftCard.id,
                paymentReference: paymentReference
              });
            }
          } catch (giftCardError) {
            logError(`Error creating gift card record`, {
              requestId,
              error: giftCardError instanceof Error ? giftCardError.message : 'Unknown error'
            });
            // Fortsätt trots fel med gift card - vi har fortfarande payment record
          }
        }
        
        // Om detta är en konstprodukt (art_product), skapa en post i art_orders
        if (productType === PRODUCT_TYPES.ART_PRODUCT) {
          try {
            // Skapa order-referens för konstprodukten
            const orderReference = `SP-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
            
            logInfo(`Creating art order record for invoice payment`, {
              requestId,
              productId,
              orderReference
            });
            
            // Skapa art_orders record
            const { data: artOrder, error: artOrderError } = await supabase
              .from('art_orders')
              .insert({
                product_id: productId,
                customer_name: `${userInfoObj.firstName} ${userInfoObj.lastName}`,
                customer_email: userInfoObj.email,
                customer_phone: userInfoObj.phoneNumber || '',
                payment_method: 'invoice',
                order_reference: orderReference,
                invoice_number: invoiceNumber,
                unit_price: requestData.amount,
                total_price: requestData.amount,
                status: 'confirmed',
                payment_status: 'CREATED',
                currency: 'SEK',
                metadata: convertObjectToSnakeCase({
                  userInfo: userInfoObj,
                  invoiceDetails: invoiceDetails,
                  paymentReference: paymentReference
                })
              })
              .select()
              .single();
              
            if (artOrderError) {
              logWarning(`Failed to create art order record, continuing`, {
                requestId,
                error: artOrderError
              });
            } else {
              logInfo(`Art order created successfully`, {
                requestId,
                artOrderId: artOrder.id,
                orderReference
              });

              // Uppdatera produktens stock om det är en konstprodukt
              try {
                logInfo(`Updating product stock for art product`, {
                  requestId,
                  productId
                });
                
                // Först hämta nuvarande stock för produkten
                const { data: productData, error: productFetchError } = await supabase
                  .from('products')
                  .select('stock_quantity, in_stock')
                  .eq('id', productId)
                  .single();
                
                if (productFetchError) {
                  logWarning(`Failed to fetch product data for stock update, continuing`, {
                    requestId,
                    error: productFetchError
                  });
                } else if (productData) {
                  // Beräkna nya värden för stock
                  const newStockQuantity = (productData.stock_quantity || 0) - 1;
                  const newInStock = newStockQuantity > 0;
                  
                  // Uppdatera produkten med nya värden
                  const { error: stockUpdateError } = await supabase
                    .from('products')
                    .update({
                      stock_quantity: newStockQuantity,
                      in_stock: newInStock,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', productId);
                  
                  if (stockUpdateError) {
                    logWarning(`Failed to update product stock, continuing`, {
                      requestId,
                      error: stockUpdateError
                    });
                  } else {
                    logInfo(`Product stock updated successfully`, {
                      requestId,
                      productId,
                      oldStock: productData.stock_quantity,
                      newStock: newStockQuantity,
                      inStock: newInStock
                    });
                  }
                }
              } catch (stockError) {
                logError(`Error updating product stock`, {
                  requestId,
                  error: stockError instanceof Error ? stockError.message : 'Unknown error'
                });
                // Fortsätt trots fel med stock-uppdatering - vi har fortfarande art order
              }
            }
          } catch (artOrderError) {
            logError(`Error creating art order record`, {
              requestId,
              error: artOrderError instanceof Error ? artOrderError.message : 'Unknown error'
            });
            // Fortsätt trots fel med art order - vi har fortfarande payment record
          }
        }
        
        // If this is a course, create a booking record and update the course participant count
        if (productType === PRODUCT_TYPES.COURSE) {
          try {
            // Create booking reference for the course
            const bookingReference = `BC-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
            
            logInfo(`Creating course booking record for invoice payment`, {
              requestId,
              courseId: productId,
              bookingReference
            });
            
            // Add detailed participant logging here
            console.log(`[Invoice API] Course booking - participant tracking:`, {
              requestId,
              rawNumberOfParticipants: userInfoObj.numberOfParticipants,
              typeOfNumberOfParticipants: typeof userInfoObj.numberOfParticipants,
              userInfoObjKeys: Object.keys(userInfoObj),
              userInfoProvided: userInfoObj
            });
            
            // First check if the course exists and get its current data
            const { data: courseData, error: courseError } = await supabase
              .from('course_instances')
              .select('current_participants, max_participants, price')
              .eq('id', productId)
              .single();
              
            if (courseError) {
              logWarning(`Failed to fetch course data for booking creation, continuing`, {
                requestId,
                error: courseError
              });
              // Continue despite error - we still have the payment record
            } else {
              // The participant value should already be guaranteed to exist and be valid
              const participantValue = userInfoObj.numberOfParticipants;
              
              // Now parse the string value to a number with extensive logging
              const parsedParticipants = parseInt(String(participantValue));
              
              // Log detailed information about the participant count
              console.log(`[Invoice API] Participant count details:`, {
                requestId,
                stringValue: participantValue,
                parsedValue: parsedParticipants,
                isNaN: isNaN(parsedParticipants)
              });
              
              // If the parsing failed or produced an invalid value, throw an error
              if (isNaN(parsedParticipants) || parsedParticipants < 1) {
                logError(`Invalid participant count value: "${participantValue}"`, {
                  requestId,
                  parsedValue: parsedParticipants
                });
                
                return NextResponse.json(
                  createPaymentResponse.error(
                    'Invalid participant count value',
                    PaymentErrorCode.VALIDATION_ERROR,
                    `The participant count must be a valid number: ${participantValue}`
                  )
                );
              }
              
              // Use the parsed value directly - we've validated it's a valid number
              const participantsToAdd = parsedParticipants;
              
              const currentParticipants = courseData.current_participants || 0;
              const maxParticipants = courseData.max_participants || 999;
              
              if (currentParticipants + participantsToAdd > maxParticipants) {
                logWarning(`Course is full, cannot add booking`, {
                  requestId,
                  courseId: productId,
                  currentParticipants,
                  maxParticipants,
                  participantsToAdd
                });
              } else {
                // Create booking record
                // Add detailed logging for booking creation with participant count
                console.log(`[Invoice API] Creating booking record with participant count:`, {
                  requestId,
                  numberOfParticipantsFromUserInfo: userInfoObj.numberOfParticipants,
                  originalStringValue: participantValue,
                  parsedValue: participantsToAdd,
                  effectiveValue: participantsToAdd,
                  typeOfNumberOfParticipants: typeof userInfoObj.numberOfParticipants
                });

                const { data: booking, error: bookingError } = await supabase
                  .from('bookings')
                  .insert({
                    course_id: productId,
                    customer_name: `${userInfoObj.firstName} ${userInfoObj.lastName}`,
                    customer_email: userInfoObj.email,
                    customer_phone: userInfoObj.phoneNumber || '',
                    number_of_participants: participantsToAdd,
                    booking_reference: bookingReference,
                    payment_reference: paymentReference,
                    invoice_number: invoiceNumber,
                    invoice_address: invoiceDetails.address,
                    invoice_postal_code: invoiceDetails.postalCode,
                    invoice_city: invoiceDetails.city,
                    invoice_reference: invoiceDetails.reference || '',
                    unit_price: courseData.price || requestData.amount,
                    total_price: (courseData.price || requestData.amount) * participantsToAdd,
                    currency: 'SEK',
                    payment_method: 'invoice',
                    // Använd payment_status från förfrågan om det finns, annars defaulta till 'CREATED' för fakturabetalningar
                    payment_status: invoicePaymentData.payment_status || 'CREATED',
                    // Använd status från förfrågan om det finns, annars defaulta till 'confirmed'
                    status: invoicePaymentData.status || 'confirmed',
                    booking_date: new Date().toISOString(),
                    message: userInfoObj.specialRequirements || ''
                  })
                  .select()
                  .single();
                  
                if (bookingError) {
                  logWarning(`Failed to create booking record, continuing`, {
                    requestId,
                    error: bookingError
                  });
                } else {
                  logInfo(`Booking created successfully`, {
                    requestId,
                    bookingId: booking.id,
                    bookingReference
                  });
                  
                  // Update course participants count
                  const newParticipantCount = currentParticipants + participantsToAdd;
                  
                  // Add detailed logging right before updating current_participants
                  console.log(`[Invoice API] Updating current_participants in database:`, {
                    requestId,
                    courseId: productId,
                    currentParticipants,
                    participantsToAdd,
                    newParticipantCount,
                    participantsSource: 'userInfoObj.numberOfParticipants'
                  });

                  const { error: updateError } = await supabase
                    .from('course_instances')
                    .update({ 
                      current_participants: newParticipantCount
                    })
                    .eq('id', productId);
                    
                  if (updateError) {
                    logWarning(`Failed to update course participant count, continuing`, {
                      requestId,
                      error: updateError
                    });
                  } else {
                    logInfo(`Course participant count updated successfully`, {
                      requestId,
                      courseId: productId,
                      oldCount: currentParticipants,
                      addedCount: participantsToAdd,
                      newCount: newParticipantCount
                    });
                  }
                  
                  // Link payment to booking
                  const { error: linkError } = await supabase
                    .from('payments')
                    .update({
                      booking_id: booking.id
                    })
                    .eq('payment_reference', paymentReference);
                    
                  if (linkError) {
                    logWarning(`Failed to link payment to booking, continuing`, {
                      requestId,
                      error: linkError
                    });
                  } else {
                    logInfo(`Payment linked to booking successfully`, {
                      requestId,
                      paymentReference,
                      bookingId: booking.id
                    });
                  }
                }
              }
            }
          } catch (bookingError) {
            logError(`Error creating booking record`, {
              requestId,
              error: bookingError instanceof Error ? bookingError.message : 'Unknown error'
            });
            // Continue despite error with booking - we still have the payment record
          }
        }
        
        // Skapa bakgrundsjobb för att generera faktura och skicka e-post
        try {
          logInfo(`Creating background job for invoice email`, {
            requestId,
            invoiceNumber,
            productType
          });
          
          const jobId = await createBackgroundJob(
            'invoice_email' as JobType,
            {
              paymentReference,
              invoiceNumber,
              productType,
              productId,
              userInfo: userInfoObj,
              invoiceDetails,
              amount: requestData.amount,
              giftCardDetails
            },
            { 
              requestId,
              delay: 100      // Liten fördröjning för att säkerställa att databasoperationer har slutförts
            }
          );
          
          if (jobId) {
            logInfo(`Created background job for invoice email`, {
              requestId,
              jobId,
              invoiceNumber
            });
          } else {
            throw new Error('Failed to create background job');
          }
        } catch (jobError) {
          logError(`Failed to create background job for invoice email`, {
            requestId,
            error: jobError instanceof Error ? jobError.message : 'Unknown error'
          });
          // Fortsätt trots fel med bakgrundsjobb - användaren får ändå ett framgångsrikt svar
        }
        
        // Success response
        const responseData: PaymentReferenceData = {
          paymentReference,
          invoiceNumber,
          status: PAYMENT_STATUSES.CREATED,
          redirectUrl: getRedirectUrl(productType, paymentReference)
        };
        
        return NextResponse.json(createPaymentResponse.success(responseData));
        
      } catch (error) {
        // Log error and return appropriate error response
        logError(`[STEG FAIL] Unhandled exception in invoice payment creation`, {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        
        const paymentReference = generatePaymentReference();
        
        return NextResponse.json(
          createPaymentResponse.error(
            'An unexpected error occurred',
            PaymentErrorCode.PAYMENT_PROCESSING_FAILED,
            paymentReference
          ),
          { status: 500 }
        );
      }
      
    } catch (validationError: any) {
      logError(`Validation error for invoice payment`, { 
        requestId, 
        error: validationError.message,
        data: normalizedData  
      });
      
      const paymentReference = generatePaymentReference();
      
      return NextResponse.json(
        createPaymentResponse.validation(
          validationError.message,
          paymentReference
        ),
        { status: 400 }
      );
    }
    
  } catch (error) {
    // Handle top-level errors
    logError(`[STEG GLOBAL-FAIL] Critical error in payment processing`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    const paymentReference = generatePaymentReference();
    
    return NextResponse.json(
      createPaymentResponse.error(
        'Failed to process payment request',
        PaymentErrorCode.UNKNOWN_ERROR,
        paymentReference
      ),
      { status: 500 }
    );
  }
};