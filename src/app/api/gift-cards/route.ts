import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const filter = url.searchParams.get('filter');
    
    console.log('API: Fetching gift cards with filter:', filter);
    
    // Create a base query
    let query = supabaseAdmin
      .from('gift_cards')
      .select('id, code, amount, type, status, remaining_balance, sender_name, sender_email, recipient_name, recipient_email, message, is_emailed, is_printed, is_paid, created_at, expires_at, invoice_number');

    // Apply filters based on the query parameter
    if (filter) {
      if (filter === 'active') {
        query = query.eq('status', 'active');
      } else if (filter === 'redeemed') {
        query = query.eq('status', 'redeemed');
      } else if (filter === 'expired') {
        query = query.eq('status', 'expired');
      } else if (filter === 'cancelled') {
        query = query.eq('status', 'cancelled');
      } else if (filter === 'digital') {
        query = query.eq('type', 'digital');
      } else if (filter === 'physical') {
        query = query.eq('type', 'physical');
      } else if (filter === 'PAID') {
        query = query.eq('payment_status', true);
      } else if (filter === 'CREATED') {
        query = query.eq('payment_status', false);
      }
    }

    // Always sort by most recent first
    query = query.order('created_at', { ascending: false });

    // Execute the query
    const { data, error } = await query;

    if (error) {
      console.error('API: Error fetching gift cards:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Process the data to ensure all cards have a code
    const processedData = (data || []).map(card => {
      if (!card.code) {
        console.warn(`API: Card ${card.id} missing code field, generating fallback`);
        return {
          ...card,
          code: `GC-${card.id.substring(0, 8)}`
        };
      }
      return card;
    });

    console.log('API: Successfully fetched gift cards count:', processedData.length);
    
    return NextResponse.json({
      giftCards: processedData,
      count: processedData.length,
      status: 'success'
    });
  } catch (error) {
    console.error('API: Unexpected error in gift-cards route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error fetching gift cards' },
      { status: 500 }
    );
  }
} 