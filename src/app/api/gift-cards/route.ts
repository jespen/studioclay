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
        query = query.eq('status', 'used');
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

    // Process the data to ensure all cards have a code and map database status to frontend status
    const processedData = (data || []).map(card => {
      // Handle missing code
      let processedCard = card;
      if (!card.code) {
        console.warn(`API: Card ${card.id} missing code field, generating fallback`);
        processedCard = {
          ...card,
          code: `GC-${card.id.substring(0, 8)}`
        };
      }
      
      // Map database status back to frontend status
      return {
        ...processedCard,
        status: processedCard.status === 'used' ? 'redeemed' : processedCard.status
      };
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

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Gift card ID is required' },
        { status: 400 }
      );
    }

    console.log(`API: Deleting gift card with ID: ${id}`);

    // First, check if the gift card exists
    const { data: existingCard, error: fetchError } = await supabaseAdmin
      .from('gift_cards')
      .select('id, code, status, is_paid')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('API: Error fetching gift card for deletion:', fetchError);
      return NextResponse.json(
        { error: 'Gift card not found' },
        { status: 404 }
      );
    }

    if (!existingCard) {
      return NextResponse.json(
        { error: 'Gift card not found' },
        { status: 404 }
      );
    }

    // Check if the gift card has been used/redeemed - we might want to prevent deletion in some cases
    if (existingCard.status === 'used' || existingCard.status === 'redeemed') {
      console.warn(`API: Attempting to delete a redeemed gift card: ${id}`);
      // Note: We could add additional validation here if needed
    }

    // Delete the gift card from the database
    const { error: deleteError } = await supabaseAdmin
      .from('gift_cards')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('API: Error deleting gift card:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete gift card' },
        { status: 500 }
      );
    }

    console.log(`API: Successfully deleted gift card ${id} (code: ${existingCard.code})`);

    return NextResponse.json({
      success: true,
      message: `Gift card ${existingCard.code} has been deleted`,
      deletedCard: {
        id: existingCard.id,
        code: existingCard.code
      }
    });

  } catch (error) {
    console.error('API: Unexpected error deleting gift card:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}