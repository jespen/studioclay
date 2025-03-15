import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Wait for params to be fully resolved before using them
    const params = await Promise.resolve(context.params);
    const id = params.id;
    
    if (!id) {
      console.error('API: Missing gift card ID for print status update');
      return NextResponse.json(
        { error: 'Gift card ID is required' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { is_printed } = body;
    
    if (is_printed === undefined) {
      console.error('API: Missing is_printed field in request body');
      return NextResponse.json(
        { error: 'is_printed field is required in request body' },
        { status: 400 }
      );
    }
    
    console.log(`API: Updating gift card ${id} print status to ${is_printed}`);
    
    const { data, error } = await supabaseAdmin
      .from('gift_cards')
      .update({ is_printed })
      .eq('id', id)
      .select();
      
    if (error) {
      console.error('API: Error updating print status:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    console.log(`API: Gift card ${id} print status updated successfully`);
    
    return NextResponse.json({
      message: 'Gift card print status updated successfully',
      data: data[0],
      status: 'success'
    });
  } catch (error) {
    console.error('API: Error in print-status route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 