/**
 * Central definition av alla statusvärden som används i applikationen.
 * VIKTIGT: Lägg inte till nya statusvärden utan diskussion och dokumentation.
 */

// Betalningsstatuskoder
export const PAYMENT_STATUSES = {
  CREATED: 'CREATED',   // Initial state when payment is created
  PAID: 'PAID',         // Payment confirmed by Swish/Invoice
  ERROR: 'ERROR',       // Payment failed
  DECLINED: 'DECLINED'  // Payment declined by user or Swish
} as const;

// Payment status type - används för typvalidering i TypeScript
export type PaymentStatus = typeof PAYMENT_STATUSES[keyof typeof PAYMENT_STATUSES];

// Bokningsstatuskoder
export const BOOKING_STATUSES = {
  PENDING: 'pending',       // Initial state when booking is created
  CONFIRMED: 'confirmed',   // Booking is confirmed
  CANCELLED: 'cancelled'    // Booking is cancelled
} as const;

export type BookingStatus = typeof BOOKING_STATUSES[keyof typeof BOOKING_STATUSES];

// Orderstatuskoder
export const ORDER_STATUSES = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  SHIPPED: 'shipped',
  CANCELLED: 'cancelled'
} as const;

export type OrderStatus = typeof ORDER_STATUSES[keyof typeof ORDER_STATUSES];

/**
 * Validering för betalningsstatus
 * @param status Statusvärde som ska valideras
 * @returns true om statusvärdet är giltigt, false annars
 */
export function isValidPaymentStatus(status: string): status is PaymentStatus {
  return Object.values(PAYMENT_STATUSES).includes(status as any);
}

/**
 * Validering för bokningsstatus
 * @param status Statusvärde som ska valideras
 * @returns true om statusvärdet är giltigt, false annars
 */
export function isValidBookingStatus(status: string): status is BookingStatus {
  return Object.values(BOOKING_STATUSES).includes(status as any);
}

/**
 * Validering för orderstatus
 * @param status Statusvärde som ska valideras
 * @returns true om statusvärdet är giltigt, false annars
 */
export function isValidOrderStatus(status: string): status is OrderStatus {
  return Object.values(ORDER_STATUSES).includes(status as any);
}

/**
 * Säker hämtning av betalningsstatus - konverterar okända värden till CREATED
 * @param status Statusvärde som ska valideras och hämtas
 * @returns Giltigt statusvärde eller CREATED som fallback
 */
export function getValidPaymentStatus(status: string | null | undefined): PaymentStatus {
  if (!status) return PAYMENT_STATUSES.CREATED;
  
  if (isValidPaymentStatus(status)) {
    return status;
  }
  
  console.warn(`Invalid payment status: ${status}, using CREATED as fallback`);
  return PAYMENT_STATUSES.CREATED;
}

/**
 * Säker hämtning av bokningsstatus - konverterar okända värden till pending
 * @param status Statusvärde som ska valideras och hämtas
 * @returns Giltigt statusvärde eller pending som fallback
 */
export function getValidBookingStatus(status: string | null | undefined): BookingStatus {
  if (!status) return BOOKING_STATUSES.PENDING;
  
  if (isValidBookingStatus(status)) {
    return status;
  }
  
  console.warn(`Invalid booking status: ${status}, using pending as fallback`);
  return BOOKING_STATUSES.PENDING;
}

/**
 * Säker hämtning av orderstatus - konverterar okända värden till pending
 * @param status Statusvärde som ska valideras och hämtas
 * @returns Giltigt statusvärde eller pending som fallback
 */
export function getValidOrderStatus(status: string | null | undefined): OrderStatus {
  if (!status) return ORDER_STATUSES.PENDING;
  
  if (isValidOrderStatus(status)) {
    return status;
  }
  
  console.warn(`Invalid order status: ${status}, using pending as fallback`);
  return ORDER_STATUSES.PENDING;
} 