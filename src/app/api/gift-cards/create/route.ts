import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.amount || !body.type || !body.sender_name || !body.sender_email || !body.recipient_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Generate a unique code for the gift card
    const generateUniqueCode = () => {
      // Generate a random code - in production this should be more sophisticated
      const random = Math.random().toString(36).substring(2, 10).toUpperCase();
      return `GC-${random}`;
    };
    
    // Create a complete gift card object with all required fields
    const giftCardData = {
      code: generateUniqueCode(),
      amount: Number(body.amount),
      type: body.type,
      sender_name: body.sender_name,
      sender_email: body.sender_email,
      sender_phone: body.sender_phone || null,
      recipient_name: body.recipient_name,
      recipient_email: body.recipient_email || null,
      message: body.message || null,
      invoice_address: body.invoice_address || null,
      invoice_postal_code: body.invoice_postal_code || null,
      invoice_city: body.invoice_city || null,
      payment_reference: body.payment_reference || null,
      payment_status: body.is_paid ? 'PAID' : 'CREATED',
      status: 'active',
      remaining_balance: Number(body.amount),
      is_emailed: false,
      is_printed: false,
      is_paid: body.is_paid === true ? true : false, // Handle the payment status from client
      expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString() // 1 year from now
    };
    
    console.log('Creating gift card with data:', {
      ...giftCardData,
      is_paid: giftCardData.is_paid
    });
    
    // Insert into Supabase
    const { data, error } = await supabaseAdmin
      .from('gift_cards')
      .insert([giftCardData])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating gift card:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    console.log('Gift card created successfully:', data);
    
    // Return the created gift card
    return NextResponse.json({
      message: 'Gift card created successfully',
      giftCard: data
    });
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 