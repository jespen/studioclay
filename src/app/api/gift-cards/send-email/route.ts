import { NextRequest, NextResponse } from 'next/server';
import { sendServerGiftCardEmail } from '@/utils/serverEmail';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    console.log('📧 API: Starting gift card email sending process');
    
    // Parse request body
    const body = await request.json();
    const { giftCardData, senderInfo, pdfBuffer } = body;
    
    // Validate required fields
    if (!giftCardData || !giftCardData.recipient_email || !giftCardData.code) {
      console.error('📧 API: Missing required gift card data for email sending');
      return NextResponse.json(
        { error: 'Missing required gift card data' },
        { status: 400 }
      );
    }
    
    // Validate sender info (required for confirmation email)
    if (!senderInfo || !senderInfo.email) {
      console.error('📧 API: Missing sender info for gift card email');
      return NextResponse.json(
        { error: 'Missing sender information' },
        { status: 400 }
      );
    }
    
    console.log(`📧 API: Sending gift card ${giftCardData.code} confirmation to ${senderInfo.email}`);
    console.log(`📧 API: Gift card amount: ${giftCardData.amount}, Recipient: ${giftCardData.recipient_name || 'Unknown'}`);
    console.log(`📧 API: PDF buffer provided: ${pdfBuffer ? 'Yes' : 'No'}, length: ${pdfBuffer?.length || 0}`);
    
    // Convert Array back to Buffer if provided
    let bufferData;
    if (pdfBuffer && Array.isArray(pdfBuffer)) {
      console.log(`📧 API: Converting PDF buffer array to Buffer, array length: ${pdfBuffer.length}`);
      bufferData = Buffer.from(pdfBuffer);
    }
    
    // Send the email
    console.log('📧 API: Calling sendServerGiftCardEmail function');
    const emailResult = await sendServerGiftCardEmail({
      giftCardData,
      senderInfo,
      pdfBuffer: bufferData
    });
    
    if (!emailResult.success) {
      console.error(`📧 API: Error sending gift card email: ${emailResult.message}`);
      return NextResponse.json(
        { error: emailResult.message },
        { status: 500 }
      );
    }
    
    console.log(`📧 API: Gift card confirmation email sent successfully to ${senderInfo.email}`);
    
    // Update gift card status in database
    if (giftCardData.id) {
      console.log(`📧 API: Updating gift card ${giftCardData.id} status to emailed=true`);
      const { error } = await supabaseAdmin
        .from('gift_cards')
        .update({ is_emailed: true })
        .eq('id', giftCardData.id);
        
      if (error) {
        console.error(`📧 API: Error updating gift card email status: ${error.message}`);
        // We don't return an error here as the email was sent successfully
      } else {
        console.log(`📧 API: Successfully updated gift card ${giftCardData.id} status`);
      }
    } else {
      console.log(`📧 API: No gift card ID provided, skipping database update`);
    }
    
    return NextResponse.json({
      message: 'Gift card confirmation email sent successfully',
      status: 'success'
    });
  } catch (error) {
    console.error(`📧 API: Error in gift-cards/send-email route: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error sending gift card email' },
      { status: 500 }
    );
  }
} 