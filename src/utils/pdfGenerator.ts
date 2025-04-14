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
  paymentReference: string;
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
}

// Specifik data för presentkorts-PDF
interface GiftCardPdfOptions extends BasePdfGenerationOptions {
  giftCardData: GiftCardData;
  storeToBucket?: boolean;
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
  const { requestId, userInfo, invoiceDetails, invoiceNumber, productType, productId, amount, productDetails } = options;
  
  logInfo(`Starting invoice PDF generation`, { requestId, invoiceNumber, productType });
  
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
 * Genererar PDF för presentkort och lagrar den 
 */
export async function generateAndStoreGiftCardPdf(options: GiftCardPdfOptions): Promise<PdfGenerationResult> {
  const { requestId, giftCardData, storeToBucket = true } = options;
  
  logInfo(`Starting gift card PDF generation`, { 
    requestId, 
    giftCardCode: giftCardData.code 
  });
  
  try {
    // 1. Generera PDF
    const pdfBlob = await generateGiftCardPDF(giftCardData);
    
    if (!pdfBlob) {
      throw new Error('Gift card PDF generation failed with null result');
    }
    
    logInfo(`Successfully generated gift card PDF`, {
      requestId,
      pdfSizeBytes: pdfBlob.size,
      giftCardCode: giftCardData.code
    });
    
    // 2. Lagra PDF om det begärs
    if (storeToBucket) {
      const storageResult = await storePdfToBucket(
        pdfBlob, 
        'giftcards', 
        giftCardData.code.replace(/[^a-zA-Z0-9-]/g, '_'), 
        requestId
      );
      
      if (!storageResult.success) {
        return storageResult;
      }
      
      return {
        success: true,
        pdfBlob,
        storagePath: storageResult.storagePath,
        publicUrl: storageResult.publicUrl
      };
    }
    
    // Om vi inte behöver lagra, returnera bara PDF-blob
    return {
      success: true,
      pdfBlob
    };
    
  } catch (error) {
    logError(`Error in gift card PDF generation process`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
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
    const safeFileName = `${fileName.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
    
    logDebug(`Attempting to upload PDF to storage`, {
      requestId,
      bucketName,
      fileName: safeFileName,
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
      path: uploadData.path
    });
    
    const { data: urlData } = await supabase
      .storage
      .from(bucketName)
      .getPublicUrl(safeFileName);
    
    if (!urlData || !urlData.publicUrl) {
      logWarning(`Could not get public URL for uploaded PDF`, {
        requestId,
        path: uploadData.path,
        bucketName
      });
    } else {
      logDebug(`Generated public URL for PDF`, {
        requestId,
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