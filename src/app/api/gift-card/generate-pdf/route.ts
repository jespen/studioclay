import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { generateGiftCardPDF, GiftCardData } from '@/utils/giftCardPDF';

export async function POST(request: NextRequest) {
  console.log('API-PDF-1: Received request to generate gift card PDF');
  
  try {
    // Debug incoming request headers
    console.log('API-PDF-2: Request headers:', Object.fromEntries(request.headers.entries()));

    // Get gift card ID from request body
    const body = await request.json();
    console.log('API-PDF-3: Request body RAW:', JSON.stringify(body));
    
    const { id } = body;
    console.log('API-PDF-4: Request body parsed:', body);
    console.log('API-PDF-5: Gift card ID extracted:', id);
    
    // Also check URL parameters in case ID is passed that way
    const url = new URL(request.url);
    console.log('API-PDF-6: URL:', url.toString());
    const urlParams = new URLSearchParams(url.search);
    console.log('API-PDF-7: URL parameters:', Object.fromEntries(urlParams.entries()));

    if (!id) {
      console.error('API-PDF-ERROR-1: Missing gift card ID in request');
      return NextResponse.json(
        { success: false, error: 'Missing gift card ID' },
        { status: 400 }
      );
    }

    console.log(`API-PDF-8: Generating PDF for gift card with ID: ${id}`);

    // Fetch gift card data from database
    console.log('API-PDF-9: Fetching gift card data from database');
    const { data: giftCard, error: fetchError } = await supabaseAdmin
      .from('gift_cards')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !giftCard) {
      console.error('API-PDF-ERROR-2: Error fetching gift card:', fetchError);
      return NextResponse.json(
        { success: false, error: fetchError?.message || 'Gift card not found' },
        { status: fetchError ? 500 : 404 }
      );
    }

    console.log('API-PDF-10: Gift card data fetched successfully:', giftCard);

    // Set up bucket name
    const bucketName = 'giftcards';
    
    // Generate a constant filename based on the payment reference (without timestamp)
    const fileName = `gift-card-${giftCard.payment_reference}.pdf`;
    const filePath = fileName;
    console.log('API-PDF-11: File path for expected PDF:', filePath);

    // Check if the PDF already exists in storage
    console.log('API-PDF-12: Checking if PDF already exists in storage');
    const { data: existingFile } = await supabaseAdmin
      .storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    // If we can get a public URL AND we can verify the file exists, use it
    if (existingFile) {
      try {
        // Try to check if file actually exists by doing a HEAD request
        const checkExists = await fetch(existingFile.publicUrl, { method: 'HEAD' });
        if (checkExists.ok) {
          console.log('API-PDF-13: PDF already exists, returning existing URL:', existingFile.publicUrl);
          
          // Get the PDF content for returning to the client
          const { data: fileData, error: fileError } = await supabaseAdmin
            .storage
            .from(bucketName)
            .download(filePath);
            
          if (fileError) {
            console.error('API-PDF-ERROR-3: Error downloading existing PDF:', fileError);
            // Continue with generating a new PDF if we can't download existing one
          } else {
            // Convert file to base64 for the response
            const pdfBuffer = Buffer.from(await fileData.arrayBuffer());
            console.log('API-PDF-14: Successfully retrieved existing PDF, size:', pdfBuffer.length);
            
            // Return the existing PDF
            return NextResponse.json({
              success: true,
              pdfUrl: existingFile.publicUrl,
              pdf: pdfBuffer.toString('base64'),
              isExisting: true
            });
          }
        }
      } catch (error) {
        console.log('API-PDF-15: Error checking existing file, will generate new PDF:', error);
        // Continue with generating a new PDF
      }
    }

    // If we got here, either the file doesn't exist or we couldn't verify it
    console.log('API-PDF-16: Need to generate new PDF');

    // Prepare data for PDF generation
    const giftCardData: GiftCardData = {
      code: giftCard.code,
      amount: giftCard.amount,
      recipientName: giftCard.recipient_name,
      recipientEmail: giftCard.recipient_email,
      message: giftCard.message,
      senderName: giftCard.sender_name,
      senderEmail: giftCard.sender_email,
      senderPhone: giftCard.sender_phone,
      createdAt: giftCard.created_at,
      expiresAt: giftCard.expires_at
    };

    console.log('API-PDF-17: Prepared gift card data for PDF generation:', giftCardData);

    // Generate PDF
    console.log('API-PDF-18: Generating PDF...');
    const pdfBlob = await generateGiftCardPDF(giftCardData);
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
    console.log('API-PDF-19: PDF generated successfully, size:', pdfBuffer.length, 'bytes');

    // Check if 'giftcards' bucket exists
    console.log('API-PDF-20: Checking if giftcards bucket exists');
    const { data: buckets, error: bucketError } = await supabaseAdmin
      .storage
      .listBuckets();
    
    if (bucketError) {
      console.error('API-PDF-ERROR-4: Error listing buckets:', bucketError);
      return NextResponse.json(
        { success: false, error: `Error listing buckets: ${bucketError.message}` },
        { status: 500 }
      );
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    console.log('API-PDF-21: Available buckets:', buckets.map(b => b.name));
    console.log(`API-PDF-22: ${bucketName} bucket exists:`, bucketExists);
    
    if (!bucketExists) {
      console.log(`API-PDF-23: Creating ${bucketName} bucket`);
      try {
        const { data: newBucket, error: createError } = await supabaseAdmin
          .storage
          .createBucket(bucketName, {
            public: true, // Make files publicly accessible
            fileSizeLimit: 5242880, // 5MB limit
          });
          
        if (createError) {
          console.error(`API-PDF-ERROR-5: Error creating ${bucketName} bucket:`, createError);
          return NextResponse.json(
            { success: false, error: `Error creating ${bucketName} bucket: ${createError.message}` },
            { status: 500 }
          );
        }
        
        console.log(`API-PDF-24: ${bucketName} bucket created successfully:`, newBucket);
      } catch (createError) {
        console.error('API-PDF-ERROR-6: Unexpected error creating bucket:', createError);
        return NextResponse.json(
          { success: false, error: `Unexpected error creating bucket: ${createError instanceof Error ? createError.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    // Save PDF to Supabase storage in the 'giftcards' bucket
    console.log('API-PDF-25: Uploading PDF to Supabase storage...');
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from(bucketName)
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true // This will overwrite if it exists
      });

    if (uploadError) {
      console.error('API-PDF-ERROR-7: Error uploading gift card PDF:', uploadError);
      return NextResponse.json(
        { success: false, error: uploadError.message },
        { status: 500 }
      );
    }

    console.log('API-PDF-26: PDF uploaded successfully:', uploadData);

    // Get the public URL of the PDF
    const { data: urlData } = await supabaseAdmin
      .storage
      .from(bucketName)
      .getPublicUrl(filePath);

    const pdfUrl = urlData.publicUrl;
    console.log('API-PDF-27: PDF public URL:', pdfUrl);

    // Return the PDF URL and base64-encoded PDF
    console.log('API-PDF-28: Sending successful response with PDF URL and base64 data');
    return NextResponse.json({
      success: true,
      pdfUrl,
      pdf: pdfBuffer.toString('base64'),
      isExisting: false
    });
  } catch (error) {
    console.error('API-PDF-ERROR-8: Unhandled error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error generating gift card PDF' 
      },
      { status: 500 }
    );
  }
} 