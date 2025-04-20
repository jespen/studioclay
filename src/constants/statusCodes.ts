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

// Produkttyper
export const PRODUCT_TYPES = {
  COURSE: 'course',
  GIFT_CARD: 'gift_card',
  ART_PRODUCT: 'art_product'
} as const;

export type ProductType = typeof PRODUCT_TYPES[keyof typeof PRODUCT_TYPES];

// Betalningsmetoder
export const PAYMENT_METHODS = {
  SWISH: 'swish',
  INVOICE: 'invoice'
} as const;

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];

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
 * Validering för produkttyp
 * @param type Produkttyp som ska valideras
 * @returns true om produkttypen är giltig, false annars
 */
export function isValidProductType(type: string): type is ProductType {
  return Object.values(PRODUCT_TYPES).includes(type as any);
}

/**
 * Validering för betalningsmetod
 * @param method Betalningsmetod som ska valideras
 * @returns true om betalningsmetoden är giltig, false annars
 */
export function isValidPaymentMethod(method: string): method is PaymentMethod {
  return Object.values(PAYMENT_METHODS).includes(method as any);
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

/**
 * Säker hämtning av produkttyp - konverterar okända värden till course
 * @param type Produkttyp som ska valideras och hämtas
 * @returns Giltig produkttyp eller course som fallback
 */
export function getValidProductType(type: string | null | undefined): ProductType {
  if (!type) return PRODUCT_TYPES.COURSE;
  
  if (isValidProductType(type)) {
    return type;
  }
  
  console.warn(`Invalid product type: ${type}, using course as fallback`);
  return PRODUCT_TYPES.COURSE;
}

/**
 * Säker hämtning av betalningsmetod - konverterar okända värden till invoice
 * @param method Betalningsmetod som ska valideras och hämtas
 * @returns Giltig betalningsmetod eller invoice som fallback
 */
export function getValidPaymentMethod(method: string | null | undefined): PaymentMethod {
  if (!method) return PAYMENT_METHODS.INVOICE;
  
  if (isValidPaymentMethod(method)) {
    return method;
  }
  
  console.warn(`Invalid payment method: ${method}, using invoice as fallback`);
  return PAYMENT_METHODS.INVOICE;
} 