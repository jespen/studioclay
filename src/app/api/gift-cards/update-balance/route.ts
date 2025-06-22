import { NextRequest, NextResponse } from 'next/server';

// Import the proper supabaseAdmin instance
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, remaining_balance } = body;
    
    if (!id || remaining_balance === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: id or remaining_balance' },
        { status: 400 }
      );
    }
    
    // Validate that remaining_balance is a number
    if (isNaN(Number(remaining_balance)) || Number(remaining_balance) < 0) {
      return NextResponse.json(
        { error: 'remaining_balance must be a positive number' },
        { status: 400 }
      );
    }
    
    console.log(`API: Updating gift card ${id} remaining balance to ${remaining_balance}`);
    
    // Get the gift card to check its original amount
    const { data: giftCardData, error: fetchError } = await supabaseAdmin
      .from('gift_cards')
      .select('amount')
      .eq('id', id)
      .single();
      
    if (fetchError) {
      console.error('Error fetching gift card:', fetchError);
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }
    
    // Ensure remaining balance doesn't exceed the original amount
    if (Number(remaining_balance) > giftCardData.amount) {
      return NextResponse.json(
        { error: `Remaining balance cannot exceed the original amount of ${giftCardData.amount}` },
        { status: 400 }
      );
    }
    
    // Update the gift card
    const { data, error } = await supabaseAdmin
      .from('gift_cards')
      .update({ remaining_balance: Number(remaining_balance) })
      .eq('id', id)
      .select();
      
    if (error) {
      console.error('Error in update-balance API:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    console.log('Gift card remaining balance updated successfully:', id, remaining_balance);
    
    // If the remaining balance is 0, also update the status to 'used'
    if (Number(remaining_balance) === 0) {
      const { error: statusError } = await supabaseAdmin
        .from('gift_cards')
        .update({ status: 'used' })
        .eq('id', id);
        
      if (statusError) {
        console.error('Error updating status to used:', statusError);
        // Continue anyway since the balance update succeeded
      } else {
        console.log('Gift card status automatically updated to used');
      }
    }
    
    return NextResponse.json({
      message: 'Gift card remaining balance updated successfully',
      data: data?.[0] || null,
      status: 'success'
    });
  } catch (error) {
    console.error('Error in update-balance API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 