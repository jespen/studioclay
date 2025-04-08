import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Genererar en unik presentkortskod och verifierar att den inte redan finns i databasen.
 * Format: GC-XXXXXXXX där X är slumpmässiga alfanumeriska tecken (0-9, A-Z)
 */
export async function generateUniqueGiftCardCode(supabase: SupabaseClient): Promise<string> {
  let isUnique = false;
  let code = '';
  let attempts = 0;
  const maxAttempts = 10; // Förhindra oändlig loop
  
  while (!isUnique && attempts < maxAttempts) {
    attempts++;
    
    // Generera 8 slumpmässiga tecken (0-9, A-Z)
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    code = `GC-${random}`;
    
    // Kontrollera att koden är unik i databasen
    const { data } = await supabase
      .from('gift_cards')
      .select('code')
      .eq('code', code)
      .single();
      
    if (!data) {
      isUnique = true;
    }
  }
  
  if (!isUnique) {
    throw new Error('Could not generate a unique gift card code after multiple attempts');
  }
  
  return code;
}

/**
 * Validerar formatet på en presentkortskod
 * @param code Koden som ska valideras
 * @returns true om koden har korrekt format
 */
export function isValidGiftCardCode(code: string): boolean {
  // Format: GC-XXXXXXXX där X är alfanumeriska tecken
  const pattern = /^GC-[0-9A-Z]{8}$/;
  return pattern.test(code);
}

/**
 * Skapar data för ett nytt presentkort
 */
export function createGiftCardData({
  code,
  amount,
  type = 'digital',
  senderName,
  senderEmail,
  senderPhone = null,
  recipientName,
  recipientEmail = null,
  message = null,
  paymentReference,
  paymentStatus,
  paymentMethod,
  isPaid = false,
}: {
  code: string;
  amount: number;
  type?: 'digital' | 'physical';
  senderName: string;
  senderEmail: string;
  senderPhone?: string | null;
  recipientName: string;
  recipientEmail?: string | null;
  message?: string | null;
  paymentReference: string;
  paymentStatus: string;
  paymentMethod: 'swish' | 'invoice';
  isPaid?: boolean;
}) {
  // Skapa utgångsdatum (1 år från nu)
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  
  return {
    code,
    amount: Number(amount),
    type,
    status: 'active',
    remaining_balance: Number(amount),
    sender_name: senderName,
    sender_email: senderEmail,
    sender_phone: senderPhone,
    recipient_name: recipientName,
    recipient_email: recipientEmail,
    message,
    is_emailed: false,
    is_printed: false,
    payment_reference: paymentReference,
    payment_status: paymentStatus,
    payment_method: paymentMethod,
    is_paid: isPaid,
    expires_at: expiryDate.toISOString()
  };
} 