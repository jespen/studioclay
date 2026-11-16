import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { generateGiftCardPDF } from '@/utils/giftCardPDF';

async function regenerateStoredPdf(card: {
  code?: string | null;
  payment_reference?: string | null;
  amount: number;
  recipient_name?: string | null;
  recipient_email?: string | null;
  message?: string | null;
  sender_name?: string | null;
  sender_email?: string | null;
  sender_phone?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
}) {
  const rawName = card.payment_reference || card.code;
  if (!rawName || !card.code) return false;

  const pdfBlob = await generateGiftCardPDF({
    code: card.code,
    payment_reference: card.payment_reference || undefined,
    amount: card.amount,
    recipientName: card.recipient_name || undefined,
    recipientEmail: card.recipient_email || undefined,
    message: card.message || undefined,
    senderName: card.sender_name || undefined,
    senderEmail: card.sender_email || undefined,
    senderPhone: card.sender_phone || undefined,
    createdAt: card.created_at ? new Date(card.created_at) : undefined,
    expiresAt: card.expires_at ? new Date(card.expires_at) : undefined,
  });
  if (!pdfBlob) return false;

  const fileName = `${rawName.replace(/[^a-zA-Z0-9-_.]/g, '_')}.pdf`;
  const buffer = Buffer.from(await pdfBlob.arrayBuffer());
  const { error } = await supabaseAdmin.storage.from('giftcards').upload(fileName, buffer, {
    contentType: 'application/pdf',
    upsert: true,
  });
  return !error;
}

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

    let pdfUpdated = false;
    try {
      pdfUpdated = await regenerateStoredPdf(data);
    } catch (pdfError) {
      console.error('Could not regenerate gift card PDF after expiry change:', pdfError);
    }

    return NextResponse.json({
      message: reactivated
        ? 'Giltighetsdatum uppdaterat och presentkortet är aktivt igen'
        : pdfUpdated
          ? 'Giltighetsdatum uppdaterat och presentkortet är omskapat'
          : 'Giltighetsdatum uppdaterat. Presentkortet kunde inte skapas om automatiskt.',
      data,
      reactivated,
      pdfUpdated,
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
