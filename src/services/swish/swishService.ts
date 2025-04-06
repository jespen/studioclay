import { SwishRequestData, SwishApiResponse, SwishValidationError, SwishApiError, SwishCertificateError, SwishError } from './types';
import { SwishConfig } from './config';
import { formatSwishPhoneNumber } from '@/utils/swish/phoneNumberFormatter';
import fs from 'fs';
import path from 'path';
import https from 'https';
import fetch from 'node-fetch';
import { logDebug, logError } from '@/lib/logging';

/**
 * Service class for handling Swish payment operations.
 * Provides methods for creating payments and formatting phone numbers.
 * 
 * @example
 * ```typescript
 * const swishService = SwishService.getInstance();
 * const result = await swishService.createPayment(paymentData);
 * ```
 */
export class SwishService {
  private static instance: SwishService;
  private readonly config: SwishConfig;

  /**
   * Private constructor to enforce singleton pattern.
   * Initializes configuration and validates environment.
   * 
   * @throws {SwishCertificateError} If certificate files are missing
   */
  private constructor() {
    this.config = SwishConfig.getInstance();
    this.validateEnvironment();
  }

  /**
   * Validates that all required certificate files exist.
   * 
   * @throws {SwishCertificateError} If any certificate file is missing
   */
  private validateEnvironment(): void {
    const files = [
      { path: this.config.certPath, name: 'certificate' },
      { path: this.config.keyPath, name: 'private key' },
      { path: this.config.caPath, name: 'CA certificate' }
    ];

    for (const { path: filePath, name } of files) {
      if (!fs.existsSync(path.resolve(process.cwd(), filePath))) {
        throw new SwishCertificateError(`Missing ${name} file at ${filePath}`);
      }
    }
  }

  /**
   * Gets the singleton instance of SwishService.
   * Creates a new instance if one doesn't exist.
   * 
   * @returns {SwishService} The singleton instance
   */
  public static getInstance(): SwishService {
    if (!SwishService.instance) {
      SwishService.instance = new SwishService();
    }
    return SwishService.instance;
  }

  /**
   * Gets the payee alias (Swish number).
   * 
   * @returns {string} The merchant's Swish number
   */
  public getPayeeAlias(): string {
    return this.config.payeeAlias;
  }

  /**
   * Gets the path to the Swish certificate file.
   * 
   * @returns {string} Path to the certificate file
   */
  public getCertPath(): string {
    return this.config.certPath;
  }

  /**
   * Gets the path to the Swish private key file.
   * 
   * @returns {string} Path to the private key file
   */
  public getKeyPath(): string {
    return this.config.keyPath;
  }

  /**
   * Gets the path to the Swish CA certificate file.
   * 
   * @returns {string} Path to the CA certificate file
   */
  public getCaPath(): string {
    return this.config.caPath;
  }

  /**
   * Checks if the current environment is test mode.
   * 
   * @returns {boolean} True if in test mode, false otherwise
   */
  public isTestMode(): boolean {
    return this.config.isTest;
  }

  /**
   * Formats a phone number for Swish API.
   * Converts Swedish phone numbers to the format required by Swish.
   * Example: "0739000001" -> "46739000001"
   * 
   * @param phone - The phone number to format
   * @returns {string} The formatted phone number
   * @throws {SwishValidationError} If the phone number is invalid
   */
  public formatPhoneNumber(phone: string): string {
    return formatSwishPhoneNumber(phone);
  }

  /**
   * Makes a request to the Swish API with proper certificates.
   * Handles HTTPS communication and error responses.
   * 
   * @param options - The options for the API request (can be data object or request options)
   * @returns {Promise<{success: boolean, data?: any, error?: string}>} The API response
   * @throws {SwishApiError} If the API request fails
   */
  private async makeSwishRequest(options: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const isStatusRequest = options.isStatusCheck === true;
      const requestMethod = options.method || 'POST';
      
      // För status requests använder vi den URL som skickats in
      const url = isStatusRequest ? options.url : this.config.getEndpointUrl('createPayment');
      const isTestMode = this.config.isTest;
      
      logDebug('Swish API request:', {
        url,
        method: requestMethod,
        isStatusRequest
      });

      logDebug('Swish config info:', {
        isTestMode,
        apiUrl: this.config.apiUrl,
        payeeAlias: this.config.payeeAlias
      });

      // Resolve absolute paths for certificate files
      const certPath = path.resolve(process.cwd(), this.config.certPath);
      const keyPath = path.resolve(process.cwd(), this.config.keyPath);
      const caPath = path.resolve(process.cwd(), this.config.caPath);
      
      logDebug('Certificate paths:', {
        certPath,
        keyPath,
        caPath
      });

      // Verify that certificate files exist
      const certExists = fs.existsSync(certPath);
      const keyExists = fs.existsSync(keyPath);
      const caExists = fs.existsSync(caPath);
      
      logDebug('Certificate files existence check:', {
        certExists,
        keyExists,
        caExists
      });

      if (!certExists || !keyExists || !caExists) {
        const missingFiles = [];
        if (!certExists) missingFiles.push('certificate');
        if (!keyExists) missingFiles.push('key');
        if (!caExists) missingFiles.push('CA certificate');
        
        throw new SwishCertificateError(`Missing ${missingFiles.join(', ')} file(s)`);
      }

      try {
        // Read certificate files to verify they're readable
        const certContent = fs.readFileSync(certPath, 'utf8');
        const keyContent = fs.readFileSync(keyPath, 'utf8');
        const caContent = fs.readFileSync(caPath, 'utf8');
        
        logDebug('Certificate files read successfully', {
          certLength: certContent.length,
          keyLength: keyContent.length,
          caLength: caContent.length,
          certStartsWith: certContent.substring(0, 50),
          keyStartsWith: keyContent.substring(0, 50),
          caStartsWith: caContent.substring(0, 50)
        });
      } catch (readError: any) {
        logError('Error reading certificate files', readError);
        throw new SwishCertificateError(`Error reading certificate files: ${readError.message}`);
      }

      // Konfigurera HTTPS-agenten med certifikat
      const agentOptions: https.AgentOptions = {
        // Klientcertifikat för att identifiera oss mot Swish
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
        
        // För att verifiera Swish-serverns certifikat behöver vi CA-certifikat
        // I test-miljö använder vi vårt egna CA-certifikat
        // I produktionsmiljö inaktiverar vi validering eftersom Swish använder ett annat CA
        rejectUnauthorized: isTestMode,
        
        // I test-miljö lägger vi till Swish CA till vår trust-store
        ca: isTestMode ? fs.readFileSync(caPath) : undefined,
        
        // Eventuellt lösenord för certifikatet
        passphrase: this.config.certPassword,
        
        // Tvinga TLS 1.2 eller högre
        minVersion: 'TLSv1.2'
      };

      // Lägg till extradiagnostik för felsökning
      logDebug('Creating HTTPS agent with options:', {
        hasCert: !!agentOptions.cert,
        hasKey: !!agentOptions.key,
        hasCa: !!agentOptions.ca,
        rejectUnauthorized: agentOptions.rejectUnauthorized,
        hasPassphrase: !!agentOptions.passphrase
      });
      
      const agent = new https.Agent(agentOptions);

      // Prepare fetch options
      const fetchOptions: any = {
        method: requestMethod,
        agent,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };
      
      // Add body only for POST requests
      if (requestMethod === 'POST' && !isStatusRequest) {
        // Redact sensitive information for logging
        const logData = { ...options };
        if (logData.payerAlias) {
          logData.payerAlias = logData.payerAlias.substring(0, 4) + '****' + logData.payerAlias.slice(-2);
        }
        
        logDebug('Sending request to Swish API with data:', { url, ...logData });
        fetchOptions.body = JSON.stringify(options);
      } else {
        logDebug('Sending request to Swish API:', { url, method: requestMethod });
      }

      const response = await fetch(url, fetchOptions);

      logDebug('Swish API response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers)
      });

      // Handle status check response
      if (isStatusRequest) {
        try {
          const responseData = await response.json();
          logDebug('Status check response:', responseData);
          
          if (response.ok) {
            return { success: true, data: responseData };
          } else {
            return { 
              success: false, 
              error: `Swish API error: ${response.status} ${response.statusText}`,
              data: responseData
            };
          }
        } catch (parseError) {
          logError('Error parsing status response:', parseError);
          return { 
            success: false, 
            error: 'Failed to parse status response' 
          };
        }
      }
      
      // Handle payment creation response
      if (response.status === 201) {
        const location = response.headers.get('location');
        if (!location) {
          throw new SwishApiError('No Location header in response');
        }
        const reference = location.split('/').pop();
        logDebug('Successfully created payment request:', { reference, location });
        return { success: true, data: { reference } };
      }

      const responseText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(responseText);
        logDebug('Parsed Swish error response:', errorData);
      } catch {
        errorData = responseText;
        logDebug('Unparsed Swish error response:', responseText);
      }

      logError('Swish API error response:', {
        status: response.status,
        statusText: response.statusText,
        data: errorData
      });

      throw new SwishApiError(`Swish API error: ${response.status} ${response.statusText}`, response.status);
    } catch (error) {
      logError('Error in makeSwishRequest:', error);
      if (error instanceof SwishError) {
        throw error;
      }
      throw new SwishApiError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Creates a Swish payment request.
   * Formats the request data and sends it to the Swish API.
   * 
   * @param data - The payment request data
   * @returns {Promise<SwishApiResponse>} The API response
   */
  public async createPayment(data: SwishRequestData): Promise<SwishApiResponse> {
    try {
      logDebug('Creating Swish payment with data:', {
        ...data,
        payerAlias: data.payerAlias ? `${data.payerAlias.substring(0, 4)}****${data.payerAlias.slice(-2)}` : undefined
      });

      // Verify the data format before sending
      logDebug('Payment request validation check:', {
        hasPayeePaymentReference: !!data.payeePaymentReference,
        payeePaymentReferenceLength: data.payeePaymentReference?.length,
        hasCallbackUrl: !!data.callbackUrl,
        callbackUrl: data.callbackUrl,
        hasPayeeAlias: !!data.payeeAlias,
        payeeAlias: data.payeeAlias,
        hasAmount: !!data.amount,
        amount: data.amount,
        hasCurrency: !!data.currency,
        currency: data.currency,
        hasMessage: !!data.message,
        messageLength: data.message?.length,
        hasPayerAlias: !!data.payerAlias,
        payerAliasFormat: data.payerAlias?.startsWith('46')
      });

      const result = await this.makeSwishRequest(data);

      logDebug('Swish payment result:', result);

      return {
        success: true,
        data: {
          reference: result.data?.reference
        }
      };
    } catch (error) {
      logError('Error in createPayment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Gets the status of a Swish payment.
   * 
   * @param paymentReference - The Swish payment reference (ID) to check
   * @returns {Promise<SwishApiResponse>} The API response with payment status
   */
  public async getPaymentStatus(paymentReference: string): Promise<SwishApiResponse> {
    try {
      logDebug(`Getting payment status for Swish reference: ${paymentReference}`);
      
      if (!paymentReference) {
        throw new Error('Payment reference is required');
      }

      // Construct the URL for the payment status endpoint
      const url = this.config.getEndpointUrl('paymentStatus').replace('{id}', paymentReference);
      
      logDebug('Fetching payment status from URL:', url);

      // Make the request using the same mechanism as createPayment
      const result = await this.makeSwishRequest({
        method: 'GET',
        url,
        isStatusCheck: true
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Unknown error from Swish API',
          data: result.data
        };
      }

      // Extract status information
      return {
        success: true,
        data: {
          reference: paymentReference,
          status: result.data?.status,
          amount: result.data?.amount ? parseFloat(result.data.amount) : undefined
        }
      };
    } catch (error) {
      logError('Error in getPaymentStatus:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Cancels a Swish payment request
   * @param paymentReference The payment reference (e.g. SC-123456-789)
   */
  async cancelPayment(paymentReference: string): Promise<void> {
    try {
      // First, get the payment details from our database
      const response = await fetch(`/api/payments/status/${paymentReference}`);
      if (!response.ok) {
        throw new Error(`Failed to get payment details: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success || !data.data?.payment?.swish_payment_id) {
        throw new Error('Could not find Swish payment ID');
      }

      const swishPaymentId = data.data.payment.swish_payment_id;
      const isTestMode = process.env.NEXT_PUBLIC_SWISH_TEST_MODE === 'true';
      const baseUrl = isTestMode 
        ? (process.env.SWISH_TEST_API_URL || 'https://mss.cpc.getswish.net/swish-cpcapi/api/v1')
        : (process.env.SWISH_PROD_API_URL || 'https://cpc.getswish.net/swish-cpcapi/api/v1');

      const url = `${baseUrl}/paymentrequests/${swishPaymentId}`;

      logDebug('Cancelling Swish payment:', {
        paymentReference,
        swishPaymentId,
        url
      });

      const agent = this.getHttpsAgent();
      const cancelResponse = await fetch(url, {
        method: 'PATCH',
        agent,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'cancelled' })
      });

      if (!cancelResponse.ok) {
        throw new Error(`Failed to cancel payment: ${cancelResponse.status} ${cancelResponse.statusText}`);
      }

      logDebug('Successfully cancelled Swish payment:', {
        paymentReference,
        swishPaymentId
      });
    } catch (error) {
      logError('Error cancelling Swish payment:', error);
      throw error;
    }
  }

  private getHttpsAgent(): https.Agent {
    try {
      const resolvedCertPath = path.resolve(process.cwd(), this.config.certPath);
      const resolvedKeyPath = path.resolve(process.cwd(), this.config.keyPath);
      const resolvedCaPath = path.resolve(process.cwd(), this.config.caPath);

      if (!fs.existsSync(resolvedCertPath) || !fs.existsSync(resolvedKeyPath) || !fs.existsSync(resolvedCaPath)) {
        throw new Error('Missing required certificate files');
      }

      return new https.Agent({
        cert: fs.readFileSync(resolvedCertPath),
        key: fs.readFileSync(resolvedKeyPath),
        ca: fs.readFileSync(resolvedCaPath),
        minVersion: 'TLSv1.2'
      });
    } catch (error) {
      logError('Error creating HTTPS agent:', error);
      throw error;
    }
  }
} 