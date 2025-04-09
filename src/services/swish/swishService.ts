import { 
  SwishError, 
  SwishApiError, 
  SwishValidationError,
  SwishCertificateError,
  CreateSwishPaymentDTO,
  SwishCallbackData,
  SwishTransaction,
  CreateSwishPaymentSchema,
  SwishCallbackSchema,
  SwishStatus
} from './types';
import { formatSwishPhoneNumber } from '@/utils/swish/phoneNumberFormatter';
import { logDebug, logError } from '@/lib/logging';
import { createServerSupabaseClient } from '@/utils/supabase';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

/**
 * Core service for handling Swish payments
 */
export class SwishService {
  private static instance: SwishService;
  private readonly baseUrl: string;
  private readonly payeeAlias: string;
  private readonly certPath: string;
  private readonly keyPath: string;
  private readonly caPath: string;

  private constructor() {
    this.baseUrl = process.env.SWISH_API_URL || 'https://cpc.getswish.net/swish-cpcapi/api/v1';
    this.payeeAlias = process.env.SWISH_PAYEE_ALIAS || '1232296374';
    this.certPath = process.env.SWISH_CERT_PATH!;
    this.keyPath = process.env.SWISH_KEY_PATH!;
    this.caPath = process.env.SWISH_CA_PATH!;

    this.validateEnvironment();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SwishService {
    if (!SwishService.instance) {
      SwishService.instance = new SwishService();
    }
    return SwishService.instance;
  }

  /**
   * Get the configured Swish payee alias
   */
  public getPayeeAlias(): string {
    return this.payeeAlias;
  }

  /**
   * Validate environment setup
   */
  private validateEnvironment(): void {
    const requiredEnvVars = [
      { key: 'SWISH_API_URL', value: this.baseUrl },
      { key: 'SWISH_PAYEE_ALIAS', value: this.payeeAlias },
      { key: 'SWISH_CERT_PATH', value: this.certPath },
      { key: 'SWISH_KEY_PATH', value: this.keyPath },
      { key: 'SWISH_CA_PATH', value: this.caPath }
    ];

    for (const { key, value } of requiredEnvVars) {
      if (!value) {
        throw new SwishError(`Missing required environment variable: ${key}`, 'CONFIG_ERROR');
      }
    }

    const files = [
      { path: this.certPath, name: 'certificate' },
      { path: this.keyPath, name: 'private key' },
      { path: this.caPath, name: 'CA certificate' }
    ];

    for (const { path: filePath, name } of files) {
      const resolvedPath = path.resolve(process.cwd(), filePath);
      if (!fs.existsSync(resolvedPath)) {
        throw new SwishCertificateError(`Missing ${name} file at ${resolvedPath}`);
      }
      
      try {
        fs.accessSync(resolvedPath, fs.constants.R_OK);
      } catch (error) {
        throw new SwishCertificateError(`Cannot read ${name} file at ${resolvedPath}`);
      }
    }
  }

  /**
   * Create a new Swish payment
   */
  public async createPayment(data: CreateSwishPaymentDTO): Promise<SwishTransaction> {
    const requestId = uuidv4();
    logDebug(`[${requestId}] Creating Swish payment`, {
      ...data,
      phoneNumber: `${data.phoneNumber.substring(0, 4)}****${data.phoneNumber.slice(-2)}`
    });

    try {
      // Validate input data
      const validatedData = CreateSwishPaymentSchema.parse(data);

      // Format phone number for Swish
      const formattedPhone = formatSwishPhoneNumber(validatedData.phoneNumber);

      // Get Supabase client
      const supabase = createServerSupabaseClient();

      // Create payment record first
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          payment_reference: validatedData.paymentReference,
          amount: validatedData.amount,
          status: SwishStatus.CREATED,
          payment_method: 'swish',
          metadata: validatedData.metadata
        })
        .select()
        .single();

      if (paymentError) {
        throw new SwishError('Failed to create payment record', 'DATABASE_ERROR', paymentError);
      }

      // Create Swish transaction record
      const { data: transaction, error: transactionError } = await supabase
        .from('swish_transactions')
        .insert({
          payment_id: payment.id,
          amount: validatedData.amount,
          phone_number: validatedData.phoneNumber,
          swish_status: SwishStatus.CREATED
        })
        .select()
        .single();

      if (transactionError) {
        throw new SwishError('Failed to create transaction record', 'DATABASE_ERROR', transactionError);
      }

      // Prepare Swish API request
      const swishPaymentData = {
        payeePaymentReference: validatedData.paymentReference,
        callbackUrl: this.getCallbackUrl(),
        payeeAlias: this.payeeAlias,
        amount: validatedData.amount.toString(),
        currency: "SEK",
        message: validatedData.message || 'Payment to Studio Clay',
        payerAlias: formattedPhone
      };

      // Make request to Swish API
      const result = await this.makeSwishRequest(swishPaymentData);

      if (!result.success) {
        throw new SwishApiError(result.error || 'Unknown error from Swish API');
      }

      // Update transaction with Swish payment ID
      const { error: updateError } = await supabase
        .from('swish_transactions')
        .update({
          swish_payment_id: result.data.paymentId,
          swish_callback_url: swishPaymentData.callbackUrl
        })
        .eq('id', transaction.id);

      if (updateError) {
        throw new SwishError('Failed to update transaction', 'DATABASE_ERROR', updateError);
      }

      return {
        ...transaction,
        swishPaymentId: result.data.paymentId,
        callbackUrl: swishPaymentData.callbackUrl
      };

    } catch (error) {
      logError(`[${requestId}] Error creating Swish payment:`, error);
      
      if (error instanceof SwishError) {
        throw error;
      }
      
      throw new SwishError(
        'Failed to create Swish payment',
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Handle Swish callback
   */
  public async handleCallback(callbackData: SwishCallbackData): Promise<void> {
    const requestId = uuidv4();
    logDebug(`[${requestId}] Processing Swish callback`, {
      paymentReference: callbackData.payeePaymentReference,
      status: callbackData.status
    });

    try {
      // Validate callback data
      const validatedData = SwishCallbackSchema.parse(callbackData);

      // Get Supabase client
      const supabase = createServerSupabaseClient();

      // Process callback using database function
      const { error } = await supabase.rpc('process_swish_callback', {
        p_swish_payment_id: validatedData.paymentReference,
        p_status: validatedData.status,
        p_callback_data: validatedData
      });

      if (error) {
        throw new SwishError('Failed to process callback', 'DATABASE_ERROR', error);
      }

    } catch (error) {
      logError(`[${requestId}] Error processing Swish callback:`, error);
      
      if (error instanceof SwishError) {
        throw error;
      }
      
      throw new SwishError(
        'Failed to process Swish callback',
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Get payment status
   */
  public async getStatus(swishPaymentId: string): Promise<SwishTransaction> {
    try {
      // Get Supabase client
      const supabase = createServerSupabaseClient();

      const { data: transaction, error } = await supabase
        .from('swish_transactions')
        .select('*')
        .eq('swish_payment_id', swishPaymentId)
        .single();

      if (error) {
        throw new SwishError('Failed to get transaction status', 'DATABASE_ERROR', error);
      }

      if (!transaction) {
        throw new SwishError('Transaction not found', 'NOT_FOUND');
      }

      return transaction;

    } catch (error) {
      if (error instanceof SwishError) {
        throw error;
      }
      
      throw new SwishError(
        'Failed to get transaction status',
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Cancel payment
   */
  public async cancelPayment(swishPaymentId: string): Promise<void> {
    const requestId = uuidv4();
    logDebug(`[${requestId}] Cancelling Swish payment`, { swishPaymentId });

    try {
      // Get Supabase client
      const supabase = createServerSupabaseClient();

      // Get transaction first
      const { data: transaction, error: fetchError } = await supabase
        .from('swish_transactions')
        .select('*')
        .eq('swish_payment_id', swishPaymentId)
        .single();

      if (fetchError || !transaction) {
        throw new SwishError('Transaction not found', 'NOT_FOUND');
      }

      // Make cancellation request to Swish API
      const url = `${this.baseUrl}/paymentrequests/${swishPaymentId}/cancel`;
      
      const result = await this.makeSwishRequest({
        method: 'PUT',
        url,
        isCancellation: true
      });

      if (!result.success) {
        throw new SwishApiError(result.error || 'Failed to cancel payment');
      }

      // Update transaction status
      const { error: updateError } = await supabase
        .from('swish_transactions')
        .update({
          swish_status: SwishStatus.DECLINED,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      if (updateError) {
        throw new SwishError('Failed to update transaction status', 'DATABASE_ERROR', updateError);
      }

    } catch (error) {
      logError(`[${requestId}] Error cancelling Swish payment:`, error);
      
      if (error instanceof SwishError) {
        throw error;
      }
      
      throw new SwishError(
        'Failed to cancel payment',
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Make request to Swish API
   */
  private async makeSwishRequest(options: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const agent = new https.Agent({
        cert: fs.readFileSync(path.resolve(process.cwd(), this.certPath)),
        key: fs.readFileSync(path.resolve(process.cwd(), this.keyPath)),
        ca: fs.readFileSync(path.resolve(process.cwd(), this.caPath)),
        rejectUnauthorized: true
      });

      const method = options.method || 'POST';
      const url = options.url || `${this.baseUrl}/paymentrequests`;

      const response = await fetch(url, {
        method,
        agent,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: method !== 'GET' ? JSON.stringify(options) : undefined
      });

      if (response.status === 201 || response.status === 200) {
        const location = response.headers.get('location');
        const paymentId = location?.split('/').pop();
        return { success: true, data: { paymentId } };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: `Swish API error: ${response.status} ${response.statusText}`,
        data: errorData
      };

    } catch (error) {
      logError('Error in makeSwishRequest:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get callback URL
   */
  private getCallbackUrl(): string {
    const baseUrl = process.env.BASE_URL || 'https://studioclay.se';
    return `${baseUrl}/api/payments/swish/callback`;
  }
} 