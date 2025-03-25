import { z } from 'zod';
import { logDebug } from './logging';

interface SwishPaymentRequest {
  payeePaymentReference: string;
  callbackUrl: string;
  payeeAlias: string;
  amount: string;
  currency: string;
  message: string;
  payerAlias: string;
}

// Schema för validering av Swish-betalningsdata
const SwishPaymentSchema = z.object({
  payeePaymentReference: z.string()
    .max(35)
    .regex(/^[a-zA-Z0-9-]+$/, 'Payment reference must be alphanumeric with hyphens'),
  callbackUrl: z.string().url(),
  payeeAlias: z.string(),
  amount: z.string(),
  currency: z.string(),
  message: z.string().max(50),
  payerAlias: z.string()
});

type SwishPaymentData = z.infer<typeof SwishPaymentSchema>;

/**
 * Validates and formats a Swish payment request
 */
export async function createSwishPayment(data: SwishPaymentData): Promise<SwishPaymentData> {
  try {
    // Clean and format phone number
    let payerAlias = data.payerAlias.replace(/[^0-9]/g, ''); // Remove all non-digits
    
    // Handle different formats
    if (payerAlias.startsWith('0')) {
      // Convert from 0XX... to 46XX...
      payerAlias = '46' + payerAlias.substring(1);
    } else if (payerAlias.startsWith('46')) {
      // Already in correct format
    } else {
      throw new Error('Invalid phone number format. Must start with 0 or 46');
    }

    // Ensure it's the correct length (11-12 digits: 46XXXXXXXXX or 46XXXXXXXXXX)
    if (payerAlias.length < 11 || payerAlias.length > 12) {
      throw new Error('Invalid phone number length. Must be 11-12 digits including country code');
    }

    const paymentData = {
      ...data,
      payerAlias
    };

    logDebug('Formatted payment data:', paymentData);

    // Validate the payment data
    return SwishPaymentSchema.parse(paymentData);
  } catch (error) {
    logDebug('Error in createSwishPayment:', error);
    throw error;
  }
} 