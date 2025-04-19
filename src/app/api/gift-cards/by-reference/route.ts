import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase';
import { logDebug, logError, logInfo } from '@/lib/logging';
import { v4 as uuidv4 } from 'uuid';

export const GET = async (req: NextRequest) => {
  const requestId = uuidv4();
  
  // Get the payment reference from the query string
  const searchParams = req.nextUrl.searchParams;
  const paymentReference = searchParams.get('reference');
  
  if (!paymentReference) {
    return NextResponse.json({
      success: false,
      message: 'Missing payment reference'
    }, { status: 400 });
  }
  
  logInfo(`Fetching gift card by payment reference`, {
    requestId,
    paymentReference
  });
  
  try {
    const supabase = createServerSupabaseClient();
    
    // Query the gift_cards table for the payment reference
    const { data: giftCard, error } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('payment_reference', paymentReference)
      .single();
    
    if (error) {
      logError(`Error fetching gift card by payment reference`, {
        requestId,
        paymentReference,
        error
      });
      
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch gift card data',
        error: error.message
      }, { status: 500 });
    }
    
    if (!giftCard) {
      logInfo(`Gift card not found for payment reference`, {
        requestId,
        paymentReference
      });
      
      return NextResponse.json({
        success: false,
        message: 'Gift card not found'
      }, { status: 404 });
    }
    
    logInfo(`Successfully fetched gift card by payment reference`, {
      requestId,
      paymentReference,
      giftCardId: giftCard.id,
      hasCode: !!giftCard.code
    });
    
    return NextResponse.json({
      success: true,
      data: giftCard
    });
  } catch (error) {
    logError(`Unexpected error fetching gift card by payment reference`, {
      requestId,
      paymentReference,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json({
      success: false,
      message: 'Unexpected error fetching gift card data'
    }, { status: 500 });
  }
}; 