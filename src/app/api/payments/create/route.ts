import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Schema för validering av betalningsdata
const PaymentSchema = z.object({
  user_info: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1)
  }),
  product_type: z.enum(['course', 'gift_card', 'shop_item']),
  product_id: z.string().uuid(),
  amount: z.number().positive(),
  quantity: z.number().positive(),
  payment_method: z.enum(['swish', 'invoice'])
});

// Hjälpfunktion för att kontrollera idempotency
async function checkIdempotency(idempotencyKey: string) {
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('*')
    .eq('metadata->idempotency_key', idempotencyKey)
    .single();

  return existingPayment;
}

export async function POST(request: Request) {
  try {
    // Extrahera idempotency key från headers
    const idempotencyKey = request.headers.get('idempotency-key');
    console.log('Idempotency key:', idempotencyKey);
    
    if (!idempotencyKey) {
      return NextResponse.json(
        { success: false, error: 'Idempotency key is required' },
        { status: 400 }
      );
    }

    // Kontrollera om betalningen redan existerar
    const existingPayment = await checkIdempotency(idempotencyKey);
    if (existingPayment) {
      console.log('Found existing payment for idempotency key:', idempotencyKey);
      return NextResponse.json({
        success: true,
        data: {
          reference: existingPayment.payment_reference,
          payment: existingPayment
        }
      });
    }

    // Validera request body
    const body = await request.json();
    console.log('Request body:', body);
    
    const validatedData = PaymentSchema.parse(body);
    console.log('Validated data:', validatedData);

    // Skapa betalningsreferens
    const paymentReference = crypto.randomUUID();
    console.log('Generated payment reference:', paymentReference);

    // Skapa betalningspost i databasen
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        payment_reference: paymentReference,
        status: 'CREATED',
        payment_method: validatedData.payment_method,
        amount: validatedData.amount,
        currency: 'SEK',
        product_type: validatedData.product_type,
        product_id: validatedData.product_id,
        user_info: validatedData.user_info,
        metadata: {
          idempotency_key: idempotencyKey,
          created_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Payment creation error:', paymentError);
      throw new Error(`Failed to create payment: ${paymentError.message}`);
    }

    // Skapa svaret
    const response = {
      success: true,
      data: {
        reference: paymentReference,
        payment: payment
      }
    };

    console.log('Returning success response');
    return NextResponse.json(response);
  } catch (error) {
    console.error('Payment creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create payment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 