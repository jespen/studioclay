/**
 * Generates a unique booking reference in the format SC-XXX-NNNNNN
 * where XXX is a random string and NNNNNN is a timestamp
 */
export function generateBookingReference(): string {
  const timestamp = new Date().getTime().toString().slice(-6);
  const randomChars = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `SC-${randomChars}-${timestamp}`;
}

export function isSpotReservation(booking: {
  payment_method?: string | null;
  customer_name?: string | null;
  booking_reference?: string | null;
}): boolean {
  return booking.payment_method === 'reservation'
    || booking.customer_name === 'Reservation'
    || Boolean(booking.booking_reference?.startsWith('RES-'));
} 