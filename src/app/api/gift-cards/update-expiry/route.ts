import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function stockholmToday(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' }).format(new Date());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, expires_at } = body as { id?: string; expires_at?: string };

    if (!id || !expires_at) {
      return NextResponse.json(
        { error: 'Presentkort och giltighetsdatum måste anges' },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(expires_at)) {
      return NextResponse.json(
        { error: 'Giltighetsdatum måste vara ett datum' },
        { status: 400 }
      );
    }

    const expiresAtIso = `${expires_at}T12:00:00.000Z`;
    if (Number.isNaN(new Date(expiresAtIso).getTime())) {
      return NextResponse.json(
        { error: 'Ogiltigt giltighetsdatum' },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('gift_cards')
      .select('id, status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Presentkortet kunde inte hittas' },
        { status: 404 }
      );
    }

    const update: { expires_at: string; status?: string } = { expires_at: expiresAtIso };
    const reactivated = existing.status === 'expired' && expires_at >= stockholmToday();
    if (reactivated) {
      update.status = 'active';
    }

    const { data, error } = await supabaseAdmin
      .from('gift_cards')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Kunde inte uppdatera giltighetsdatum' },
        { status: 500 }
      );
    }

    if (data.status === 'used') {
      data.status = 'redeemed';
    }

    return NextResponse.json({
      message: reactivated
        ? 'Giltighetsdatum uppdaterat och presentkortet är aktivt igen'
        : 'Giltighetsdatum uppdaterat',
      data,
      reactivated,
      status: 'success'
    });
  } catch (error) {
    console.error('Error in update-expiry API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Okänt fel' },
      { status: 500 }
    );
  }
}
