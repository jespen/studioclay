/**
 * PDF Generator Module
 * 
 * Centraliserad hantering av PDF-generering för olika produkttyper.
 * Denna modul följer de arkitekturella principerna för applikationen
 * och ger en konsekvent hantering av PDF-generering och lagring.
 */

import { v4 as uuidv4 } from 'uuid';
import { createServerSupabaseClient } from '@/utils/supabase';
import { PRODUCT_TYPES, getValidProductType } from '@/constants/statusCodes';
import { logDebug, logError, logInfo, logWarning } from '@/lib/logging';
import { generateInvoicePDF } from '@/utils/invoicePDF';
import { generateGiftCardPDF, GiftCardData } from '@/utils/giftCardPDF';

// Interface för gemensamma data för alla PDF-genereringar
interface BasePdfGenerationOptions {
  requestId: string;
  paymentReference?: string;
}

// Specifik data för faktura-PDF
interface InvoicePdfOptions extends BasePdfGenerationOptions {
  userInfo: any;
  invoiceDetails: any;
  invoiceNumber: string;
  productType: string;
  productId: string;
  amount: number;
  dueDate?: string;
  productDetails?: any;
  storeToBucket?: boolean;
}

// Specifik data för presentkorts-PDF
export interface GiftCardPdfOptions extends BasePdfGenerationOptions {
  giftCardData: GiftCardData;
  storeToBucket?: boolean;
  paymentReference?: string;
}

// Resultat av PDF-generering
interface PdfGenerationResult {
  success: boolean;
  pdfBlob?: Blob;
  storagePath?: string;
  publicUrl?: string;
  error?: string;
}

/**
 * Genererar PDF för faktura
 */
export async function generateAndStoreInvoicePdf(options: InvoicePdfOptions): Promise<PdfGenerationResult> {
  const { requestId, userInfo, invoiceDetails, invoiceNumber, productType, productId, amount, productDetails, storeToBucket = true } = options;
  
  logInfo(`Starting invoice PDF generation`, { requestId, invoiceNumber, productType, storeToBucket });
  
  try {
    // 1. Förbered data för PDF-generering
    const dueDate = options.dueDate || 
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('sv-SE');
    
    logDebug(`Preparing PDF data with parameters`, {
      requestId,
      invoiceNumber,
      userEmail: userInfo?.email,
      hasProductDetails: !!productDetails
    });
    
    let pdfData: any = {
      customerInfo: userInfo,
      invoiceDetails: invoiceDetails,
      invoiceNumber: invoiceNumber,
      dueDate: dueDate
    };
    
    // Lägga till rätt produktdata baserat på produkttyp
    if (productType === PRODUCT_TYPES.COURSE) {
      pdfData.courseDetails = productDetails;
      logDebug(`Prepared course data for PDF generation`, {
        requestId,
        courseTitle: productDetails?.title || 'unknown'
      });
    } else if (productType === PRODUCT_TYPES.ART_PRODUCT) {
      pdfData.courseDetails = {
        title: productDetails?.name || 'Konstprodukt',
        description: productDetails?.description || '',
        start_date: new Date().toISOString(),
        location: 'Studio Clay, Stockholm',
        price: amount
      };
      logDebug(`Prepared art product data for PDF generation`, {
        requestId,
        productName: productDetails?.name || 'unknown'
      });
    } else if (productType === PRODUCT_TYPES.GIFT_CARD) {
      pdfData.courseDetails = {
        title: 'Presentkort',
        description: 'Presentkort för Studio Clay',
        start_date: new Date().toISOString(),
        location: 'Studio Clay, Stockholm',
        price: amount
      };
      logDebug(`Prepared gift card data for PDF generation`, {
        requestId,
        amount
      });
    }
    
    // 2. Generera PDF
    logDebug(`Calling PDF generation function`, { requestId });
    try {
      // Direkt anrop till generateInvoicePDF för att undvika potentiella problem med dynamisk import
      const { generateInvoicePDF } = await import('@/utils/invoicePDF');
      
      if (!generateInvoicePDF) {
        logError(`Failed to import generateInvoicePDF function`, { requestId });
        throw new Error('PDF generation module import failed - function not found');
      }
      
      logDebug(`Starting direct PDF generation with prepared data`, { 
        requestId,
        dataReady: !!pdfData,
        customer: userInfo ? `${userInfo.firstName} ${userInfo.lastName}` : 'unknown'
      });
      
      const pdfBlob = await generateInvoicePDF(pdfData);
      
      if (!pdfBlob) {
        logError(`PDF generation failed - returned null or undefined`, { requestId });
        throw new Error('PDF generation failed - null result returned');
      }
      
      logInfo(`Successfully generated invoice PDF`, {
        requestId,
        pdfSizeBytes: pdfBlob.size
      });
      
      // Om vi inte vill lagra PDFen, returnera bara bloben
      if (!storeToBucket) {
        logInfo(`Skipping storage, returning PDF blob directly as requested`, { requestId });
        return {
          success: true,
          pdfBlob
        };
      }
      
      // 3. Lagra PDF i Supabase-bucket
      logDebug(`Now storing PDF in bucket 'invoices'`, { 
        requestId, 
        invoiceNumber,
        blobSize: pdfBlob.size 
      });
      
      // Spara PDF i bucket
      const storageResult = await storePdfToBucket(pdfBlob, 'invoices', invoiceNumber, requestId);
      
      if (!storageResult.success) {
        return storageResult;
      }
      
      // Returnera ett resultat som inkluderar både lagringsresultat och PDF blob
      return {
        success: true,
        pdfBlob, // Inkludera PDF blob för att kunna bifogas i e-post
        storagePath: storageResult.storagePath,
        publicUrl: storageResult.publicUrl
      };
    } catch (pdfGenError) {
      // Detaljerad loggning av fel vid PDF-generering
      const errorIsError = pdfGenError instanceof Error;
      logError(`Error in PDF generation step`, {
        requestId,
        error: errorIsError ? pdfGenError.message : 'Unknown PDF generation error',
        stack: errorIsError ? pdfGenError.stack : undefined,
        details: errorIsError ? undefined : JSON.stringify(pdfGenError)
      });
      
      if (errorIsError && pdfGenError.message.includes('jsPDF')) {
        logError(`jsPDF error detected. This could be due to SSR issues`, { 
          requestId,
          suggestion: 'Make sure jsPDF is properly imported for server environment'
        });
      }
      
      throw pdfGenError;
    }
    
  } catch (error) {
    logError(`Error in invoice PDF generation process`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error generating invoice PDF'
    };
  }
}

/**
 * Genererar en PDF för ett presentkort och lagrar det i en bucket (om storeToBucket=true)
 */
export async function generateAndStoreGiftCardPdf(options: GiftCardPdfOptions): Promise<PdfGenerationResult> {
  const { requestId, giftCardData, storeToBucket = true, paymentReference } = options;
  
  try {
    // Debug input data before processing
    logInfo(`🔍 GIFT CARD PDF GENERATOR - INPUT DATA:`, {
      requestId,
      giftCardData: {
        code: giftCardData.code || '[MISSING]',
        payment_reference: giftCardData.payment_reference || '[MISSING]',
        amount: giftCardData.amount,
        recipientName: giftCardData.recipientName || '[MISSING]',
        recipientEmail: giftCardData.recipientEmail || '[MISSING]',
        senderName: giftCardData.senderName || '[MISSING]',
      },
      optionsPaymentReference: paymentReference || '[MISSING]',
      storeToBucket
    });
    
    // Ensure the gift card has a code or payment reference
    if (!giftCardData.code && !giftCardData.payment_reference && !paymentReference) {
      logError(`❌ Cannot generate gift card PDF: Missing both code and payment reference`, { 
        requestId,
        giftCardData,
        optionsPaymentReference: paymentReference
      });
      return {
        success: false,
        error: 'Gift card is missing both code and payment reference'
      };
    }
    
    // Pass the payment reference to the gift card data if provided
    if (paymentReference && !giftCardData.payment_reference) {
      logInfo(`📝 Setting payment_reference from paymentReference parameter`, {
        requestId,
        paymentReference,
        hadCode: !!giftCardData.code
      });
      giftCardData.payment_reference = paymentReference;
    }
    
    // Debug data before passing to PDF generator
    logInfo(`🧩 GIFT CARD PDF GENERATION - ABOUT TO CALL GENERATOR`, { 
      requestId, 
      hasCode: !!giftCardData.code,
      hasPaymentReference: !!giftCardData.payment_reference,
      amount: giftCardData.amount,
      payment_reference: giftCardData.payment_reference || paymentReference || '[NONE]',
      code: giftCardData.code || '[NONE]',
      finalReferenceToBeUsed: giftCardData.payment_reference || paymentReference || giftCardData.code || '[NONE]'
    });
    
    // Generate the PDF
    const pdfBlob = await generateGiftCardPDF(giftCardData);
    
    if (!pdfBlob) {
      logError(`❌ Failed to generate gift card PDF, empty blob returned`, { 
        requestId,
        giftCardDataSent: {
          code: giftCardData.code || '[MISSING]',
          payment_reference: giftCardData.payment_reference || '[MISSING]',
          amount: giftCardData.amount
        }
      });
      return {
        success: false,
        error: 'Empty blob returned from PDF generation'
      };
    }
    
    logInfo(`✅ PDF generated successfully`, { 
      requestId, 
      blobSize: pdfBlob.size,
      blobType: pdfBlob.type
    });
    
    // If we don't want to store the PDF, just return it
    if (!storeToBucket) {
      logInfo(`🔄 Skipping storage, returning PDF blob directly`, { requestId });
      return {
        success: true,
        pdfBlob
      };
    }
    
    // Use payment_reference or code as the filename
    const fileName = giftCardData.payment_reference || paymentReference || giftCardData.code || `giftcard-${Date.now()}`;
    
    logInfo(`💾 Storing PDF with filename based on payment reference or code`, {
      fileName,
    });
    
    // Ensure filename has .pdf extension and is URL safe
    const safeFileName = fileName.toLowerCase().endsWith('.pdf') 
      ? `${fileName.replace(/[^a-zA-Z0-9-_.]/g, '_')}` 
      : `${fileName.replace(/[^a-zA-Z0-9-_.]/g, '_')}.pdf`;
    
    logInfo(`📄 Using safe filename for bucket storage`, {
      originalFileName: fileName,
      safeFileName,
    });
    
    // Store the PDF in the bucket
    return await storePdfToBucket(
      pdfBlob, 
      'giftcards', 
      safeFileName,
      requestId
    );
  } catch (error) {
    logError(`❌ Exception generating gift card PDF`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      giftCardData: {
        hasCode: !!giftCardData.code,
        hasPaymentReference: !!giftCardData.payment_reference,
        amount: giftCardData.amount,
        recipientName: !!giftCardData.recipientName
      }
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error generating gift card PDF'
    };
  }
}

/**
 * Lagrar en PDF i en Supabase Storage bucket
 */
async function storePdfToBucket(
  pdfBlob: Blob, 
  bucketName: string, 
  fileName: string, 
  requestId: string
): Promise<PdfGenerationResult> {
  try {
    const supabase = createServerSupabaseClient();
    
    logDebug(`Preparing to store PDF in bucket`, { 
      requestId,
      bucketName,
      fileName,
      blobSize: pdfBlob.size 
    });
    
    // Kontrollera om bucket finns
    logDebug(`Checking if bucket '${bucketName}' exists`, { requestId });
    const { data: buckets, error: bucketError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketError) {
      logError(`Failed to list buckets`, {
        requestId,
        error: bucketError.message,
        details: bucketError
      });
      throw new Error(`Error listing buckets: ${bucketError.message}`);
    }
    
    // Se till att bucketen finns
    const bucketExists = buckets.some(b => b.name === bucketName);
    
    if (!bucketExists) {
      logError(`Bucket '${bucketName}' doesn't exist, needs to be created first`, { 
        requestId,
        availableBuckets: buckets.map(b => b.name) 
      });
      throw new Error(`Storage bucket '${bucketName}' doesn't exist`);
    } else {
      logDebug(`Confirmed bucket '${bucketName}' exists`, { requestId });
    }
    
    // Konvertera PDF blob till ArrayBuffer för uppladdning
    logDebug(`Converting PDF blob to Uint8Array for upload`, { requestId });
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const pdfUint8Array = new Uint8Array(arrayBuffer);
    
    // Generera filnamn med tidsstämpel för att förhindra konflikter
    // Ensure the filename has the .pdf extension
    const safeFileName = fileName.toLowerCase().endsWith('.pdf') 
      ? `${fileName.replace(/[^a-zA-Z0-9-_.]/g, '_')}` 
      : `${fileName.replace(/[^a-zA-Z0-9-_.]/g, '_')}.pdf`;
    
    logDebug(`Attempting to upload PDF to storage`, {
      requestId,
      bucketName,
      originalFileName: fileName,
      safeFileName,
      fileSize: pdfUint8Array.length
    });
    
    // Ladda upp till storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(safeFileName, pdfUint8Array, {
        contentType: 'application/pdf',
        upsert: true
      });
    
    if (uploadError) {
      logError(`Failed to upload PDF to storage`, {
        requestId,
        error: uploadError.message,
        details: uploadError,
        bucketName,
        fileName: safeFileName
      });
      throw new Error(`Error uploading PDF: ${uploadError.message}`);
    }
    
    logInfo(`Successfully uploaded PDF to storage`, {
      requestId,
      path: uploadData.path,
      bucketName
    });
    
    // Hämta publik URL
    logDebug(`Getting public URL for uploaded PDF`, {
      requestId,
      bucketName,
      path: uploadData.path,
      safeFileName
    });
    
    // Use the exact path returned from the upload response
    const storagePath = uploadData.path || safeFileName;
    
    const { data: urlData } = await supabase
      .storage
      .from(bucketName)
      .getPublicUrl(storagePath);
    
    if (!urlData || !urlData.publicUrl) {
      logWarning(`Could not get public URL for uploaded PDF`, {
        requestId,
        path: storagePath,
        bucketName
      });
    } else {
      logDebug(`Generated public URL for PDF`, {
        requestId,
        url: urlData.publicUrl,
        hasUrl: !!urlData.publicUrl
      });
    }
    
    return {
      success: true,
      storagePath: uploadData.path,
      publicUrl: urlData?.publicUrl,
      pdfBlob: pdfBlob
    };
    
  } catch (error) {
    logError(`Exception during PDF storage`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      bucketName,
      fileName
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error storing PDF'
    };
  }
} 