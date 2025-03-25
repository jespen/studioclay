import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Validerar en Swish callback request genom att verifiera signaturen
 */
export async function validateSwishRequest(headers: Headers, body: string): Promise<boolean> {
  try {
    const signature = headers.get('Swish-Signature');
    if (!signature) {
      console.error('Missing Swish-Signature header');
      return false;
    }

    // I produktion skulle vi validera mot Swish publika nyckel
    // För test-miljön accepterar vi alla callbacks
    if (process.env.NEXT_PUBLIC_SWISH_TEST_MODE === 'true') {
      return true;
    }

    // Verifiera signaturen mot Swish publika nyckel
    const publicKey = process.env.SWISH_CALLBACK_PUBLIC_KEY;
    if (!publicKey) {
      console.error('Missing Swish callback public key');
      return false;
    }

    const verifier = crypto.createVerify('SHA256');
    verifier.update(body);
    return verifier.verify(publicKey, signature, 'base64');
  } catch (error) {
    console.error('Error validating Swish request:', error);
    return false;
  }
}

/**
 * Check if an operation with the given idempotency key has already been executed
 */
export async function checkIdempotency(idempotencyKey: string): Promise<{ exists: boolean; data?: any }> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('metadata->idempotency_key', idempotencyKey)
      .single();

    if (error) {
      console.error('Error checking idempotency:', error);
      return { exists: false };
    }

    return { exists: !!data, data };
  } catch (error) {
    console.error('Error in checkIdempotency:', error);
    return { exists: false };
  }
}

/**
 * Rate limiting function that uses Supabase to track and limit API requests
 */
export async function checkRateLimit(
  ip: string,
  endpoint: string,
  limit: number = 10,
  window: number = 60
): Promise<boolean> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - window * 1000);

    // Rensa gamla poster först (äldre än 24 timmar)
    await supabase
      .from('api_requests')
      .delete()
      .lt('timestamp', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

    // Räkna anrop inom tidsfönstret
    const { count, error: countError } = await supabase
      .from('api_requests')
      .select('*', { count: 'exact' })
      .eq('ip', ip)
      .eq('endpoint', endpoint)
      .gte('timestamp', windowStart.toISOString());

    if (countError) {
      console.error('Error checking rate limit:', countError);
      return false;
    }

    // Om under gränsen, logga anropet och tillåt
    if (!count || count < limit) {
      const { error: insertError } = await supabase
        .from('api_requests')
        .insert({
          ip,
          endpoint,
          timestamp: now.toISOString()
        });

      if (insertError) {
        console.error('Error logging API request:', insertError);
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error in checkRateLimit:', error);
    return false;
  }
}

/**
 * Validerar input data mot schema
 */
export function validateInput(data: any, schema: any): boolean {
  // Här kan vi lägga till mer sofistikerad validering
  // För nu gör vi bara en basic koll
  for (const [key, required] of Object.entries(schema)) {
    if (required && !data[key]) {
      return false;
    }
  }
  return true;
}

/**
 * Saniterar input data
 */
export function sanitizeInput(data: any): any {
  // Implementera input sanitering här vid behov
  return data;
} 