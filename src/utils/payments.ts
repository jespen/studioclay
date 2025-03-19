/**
 * Generates a unique payment reference string
 * Format: SWISH-YYYYMMDD-XXXX where XXXX is a random 4-digit number
 */
export function generatePaymentReference(): string {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `SWISH-${dateStr}-${randomSuffix}`;
}

/**
 * Maps a payment status to a human-readable string
 * Uses Swish payment statuses:
 * - CREATED: Initial state
 * - PAID: Payment completed
 * - DECLINED: Payment declined/cancelled
 * - ERROR: Payment failed
 */
export function getHumanReadablePaymentStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'CREATED': 'Skapad',
    'PAID': 'Betald',
    'DECLINED': 'Avvisad',
    'ERROR': 'Fel'
  };
  
  return statusMap[status] || status;
} 