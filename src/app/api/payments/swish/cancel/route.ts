import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { PaymentStatus } from '@/types/payment';
import { z } from 'zod';

const CancelPaymentSchema = z.object({
  paymentReference: z.string(),
});

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const body = await request.json();
    
    // Validate request body
    const { paymentReference } = CancelPaymentSchema.parse(body);

    // Update payment status in database
    const { error: updateError } = await supabase
      .from('payments')
      .update({ 
        status: PaymentStatus.DECLINED,
        metadata: {
          cancelled_at: new Date().toISOString(),
          cancelled_by: 'user'
        }
      })
      .eq('payment_reference', paymentReference);

    if (updateError) {
      console.error('Error updating payment status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payment status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in cancel payment endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 