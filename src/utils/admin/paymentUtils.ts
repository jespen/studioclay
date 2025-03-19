import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { PaymentStatus } from '@/types/booking';

/**
 * Gets the payment status for a booking
 * @param bookingId The ID of the booking
 * @returns The payment status from the payments table
 */
export async function getBookingPaymentStatus(bookingId: string): Promise<PaymentStatus> {
  try {
    // Get the payment linked to this booking
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('status')
      .eq('booking_id', bookingId)
      .single();
    
    if (paymentError) {
      console.error('Error fetching payment status:', paymentError);
      return 'ERROR';
    }
    
    return (payment?.status as PaymentStatus) || 'CREATED';
  } catch (error) {
    console.error('Error in getBookingPaymentStatus:', error);
    return 'ERROR';
  }
}

/**
 * Updates the payment status for a payment
 * @param paymentId The ID of the payment
 * @param status The new status
 */
export async function updatePaymentStatus(paymentId: string, status: PaymentStatus): Promise<boolean> {
  try {
    console.log(`Updating payment ${paymentId} status to ${status}`);
    
    // Update payment status
    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .update({ status })
      .eq('id', paymentId);
      
    if (paymentError) {
      console.error('Error updating payment:', paymentError);
      return false;
    }
    
    // If payment is now PAID, update the booking status
    if (status === 'PAID') {
      // Get the booking through the payment's booking_id
      const { data: payment, error: paymentFetchError } = await supabaseAdmin
        .from('payments')
        .select('booking_id')
        .eq('id', paymentId)
        .single();
        
      if (paymentFetchError || !payment?.booking_id) {
        console.error('Error fetching payment:', paymentFetchError);
        return false;
      }
      
      // Update booking status to confirmed
      const { error: bookingError } = await supabaseAdmin
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', payment.booking_id);
        
      if (bookingError) {
        console.error('Error updating booking:', bookingError);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in updatePaymentStatus:', error);
    return false;
  }
}

/**
 * Gets all payments for a booking
 * @param bookingId The ID of the booking
 */
export async function getBookingPayments(bookingId: string) {
  try {
    // Get all payments linked to this booking
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId);
    
    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return [];
    }
    
    return payments;
  } catch (error) {
    console.error('Error in getBookingPayments:', error);
    return [];
  }
}

/**
 * Maps a legacy payment_status from bookings to the new payment status format
 * @param legacyStatus The legacy payment_status value
 * @returns The corresponding new payment status
 */
export function mapLegacyPaymentStatus(legacyStatus: string | null): PaymentStatus {
  // If no status is provided, default to CREATED
  if (!legacyStatus) return 'CREATED';
  
  const statusMap: Record<string, PaymentStatus> = {
    'paid': 'PAID',
    'unpaid': 'CREATED',
    'cancelled': 'DECLINED'
  };
  
  return statusMap[legacyStatus] || 'CREATED';
}

/**
 * Maps a payment status to a human-readable string
 * @param status The payment status
 * @returns A human-readable status string
 */
export function getHumanReadablePaymentStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'PENDING': 'Väntande',
    'CREATED': 'Skapad',
    'PAID': 'Betald',
    'DECLINED': 'Avvisad',
    'ERROR': 'Fel',
    'unknown': 'Okänd'
  };
  
  return statusMap[status] || status;
}

// Export the payment status labels for consistent use across the application
export const paymentStatusLabels: Record<PaymentStatus, string> = {
  'CREATED': 'Skapad',
  'PAID': 'Betald',
  'DECLINED': 'Avbruten',
  'ERROR': 'Fel'
}; 