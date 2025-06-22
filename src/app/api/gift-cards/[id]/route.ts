import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
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