/**
 * Reference Generator Utilities
 * 
 * Detta bibliotek innehåller funktioner för att generera olika typer av unika referenser
 * som används i betalnings- och bokningsflöden. Alla funktioner är deterministiska och
 * följer specificerade format för att säkerställa spårbarhet och konsistens.
 * 
 * VIKTIGT: Ändra inte formaten på dessa funktioner utan att uppdatera hela systemet,
 * inklusive frontend, valideringslogik och rapportgenerering.
 */

import { v4 as uuidv4 } from 'uuid';
import { ReferenceFormat } from '@/types/paymentTypes';

/**
 * Validerar att ett referensnummer följer korrekt format
 * @param reference Referensnummer att validera
 * @param format Format som referensen ska följa
 * @returns true om referensnumret är giltigt, annars false
 */
export function isValidReference(reference: string, format: ReferenceFormat): boolean {
  switch (format) {
    case ReferenceFormat.PAYMENT:
      return /^SC-\d{8}-[A-Z0-9]{6}$/.test(reference);
    case ReferenceFormat.INVOICE:
      return /^INV-\d{4}-[A-Z0-9]{4}$/.test(reference);
    case ReferenceFormat.ORDER:
      return /^ORD-\d{8}-[A-Z0-9]{6}$/.test(reference);
    case ReferenceFormat.BOOKING:
      return /^BK-\d{8}-[A-Z0-9]{6}$/.test(reference);
    case ReferenceFormat.GIFT_CARD:
      return /^GC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(reference);
    default:
      return false;
  }
}

/**
 * Genererar ett unikt betalningsreferensnummer i formatet: SC-YYYYMMDD-XXXXXX
 * där XXXXXX är en slumpmässig 6-tecken sträng
 * @returns Unikt betalningsreferensnummer
 */
export function generatePaymentReference(): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const randomStr = uuidv4().substring(0, 6).toUpperCase();
  return `SC-${dateStr}-${randomStr}`;
}

/**
 * Genererar ett unikt fakturanummer i formatet: INV-YYMM-XXXX
 * där XXXX är en slumpmässig 4-tecken sträng
 * @returns Unikt fakturanummer
 */
export function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().substring(2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const randomStr = uuidv4().substring(0, 4).toUpperCase();
  return `INV-${year}${month}-${randomStr}`;
}

/**
 * Genererar ett unikt orderreferensnummer i formatet: ORD-YYYYMMDD-XXXXXX
 * där XXXXXX är en slumpmässig 6-tecken sträng
 * @returns Unikt orderreferensnummer
 */
export function generateOrderReference(): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const randomStr = uuidv4().substring(0, 6).toUpperCase();
  return `ORD-${dateStr}-${randomStr}`;
}

/**
 * Genererar ett unikt bokningsreferensnummer i formatet: BK-YYYYMMDD-XXXXXX
 * där XXXXXX är en slumpmässig 6-tecken sträng
 * @returns Unikt bokningsreferensnummer
 */
export function generateBookingReference(): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const randomStr = uuidv4().substring(0, 6).toUpperCase();
  return `BK-${dateStr}-${randomStr}`;
}

/**
 * Genererar en unik presentkortskod i formatet: GC-XXXX-XXXX-XXXX
 * där XXXX är slumpmässiga 4-tecken strängar
 * @returns Unik presentkortskod
 */
export function generateGiftCardCode(): string {
  const parts = [];
  for (let i = 0; i < 3; i++) {
    parts.push(uuidv4().substring(0, 4).toUpperCase());
  }
  return `GC-${parts.join('-')}`;
}

/**
 * Extraherar datumkomponenten från ett referensnummer (om möjligt)
 * @param reference Referensnummer att extrahera datum från
 * @returns Datum i formatet YYYYMMDD eller null om det inte går att extrahera
 */
export function extractDateFromReference(reference: string): string | null {
  // SC-20220315-ABCDEF eller ORD-20220315-ABCDEF eller BK-20220315-ABCDEF
  const match = reference.match(/^(?:SC|ORD|BK)-(\d{8})-[A-Z0-9]+$/);
  if (match) {
    return match[1];
  }
  return null;
}

/**
 * Skapar ett komplett uppsättning av referenser för en ny betalning
 * @returns Objekt med alla nödvändiga referenser
 */
export function generatePaymentReferences(): {
  paymentReference: string;
  invoiceNumber: string;
  orderReference: string;
} {
  return {
    paymentReference: generatePaymentReference(),
    invoiceNumber: generateInvoiceNumber(),
    orderReference: generateOrderReference()
  };
}