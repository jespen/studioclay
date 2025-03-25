import { SwishRequestData, SwishApiResponse, SwishValidationError, SwishApiError, SwishCertificateError, SwishError } from './types';
import fs from 'fs';
import path from 'path';
import https from 'https';
import fetch from 'node-fetch';
import { logDebug, logError } from '@/lib/logging';

export class SwishService {
  private static instance: SwishService;
  private readonly baseUrl: string;
  private readonly payeeAlias: string;
  private readonly certPath: string;
  private readonly keyPath: string;
  private readonly caPath: string;

  private constructor() {
    const isTestMode = process.env.NEXT_PUBLIC_SWISH_TEST_MODE === 'true';
    this.baseUrl = isTestMode 
      ? 'https://mss.cpc.getswish.net'
      : 'https://cpc.getswish.net';
    this.payeeAlias = isTestMode 
      ? process.env.SWISH_TEST_PAYEE_ALIAS!
      : process.env.SWISH_PROD_PAYEE_ALIAS!;
    this.certPath = isTestMode 
      ? process.env.SWISH_TEST_CERT_PATH!
      : process.env.SWISH_PROD_CERT_PATH!;
    this.keyPath = isTestMode 
      ? process.env.SWISH_TEST_KEY_PATH!
      : process.env.SWISH_PROD_KEY_PATH!;
    this.caPath = isTestMode 
      ? process.env.SWISH_TEST_CA_PATH!
      : process.env.SWISH_PROD_CERT_PATH!;

    // Validate environment variables
    this.validateEnvironment();
  }

  private validateEnvironment(): void {
    const requiredVars = [
      { name: 'payeeAlias', value: this.payeeAlias },
      { name: 'certPath', value: this.certPath },
      { name: 'keyPath', value: this.keyPath },
      { name: 'caPath', value: this.caPath }
    ];

    for (const { name, value } of requiredVars) {
      if (!value) {
        throw new SwishValidationError(`Missing required environment variable for ${name}`);
      }
    }

    // Validate certificate files exist
    const files = [
      { path: this.certPath, name: 'certificate' },
      { path: this.keyPath, name: 'private key' },
      { path: this.caPath, name: 'CA certificate' }
    ];

    for (const { path: filePath, name } of files) {
      if (!fs.existsSync(path.resolve(process.cwd(), filePath))) {
        throw new SwishCertificateError(`Missing ${name} file at ${filePath}`);
      }
    }
  }

  public static getInstance(): SwishService {
    if (!SwishService.instance) {
      SwishService.instance = new SwishService();
    }
    return SwishService.instance;
  }

  /**
   * Gets the current payee alias (Swish number)
   */
  public getPayeeAlias(): string {
    return this.payeeAlias;
  }

  /**
   * Formats a phone number for Swish API
   * Converts Swedish phone numbers to the format required by Swish
   * Example: "0739000001" -> "46739000001"
   * @throws {SwishValidationError} If the phone number is invalid
   */
  public formatPhoneNumber(phone: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    
    if (!cleanPhone.startsWith('0') && !cleanPhone.startsWith('46')) {
      throw new SwishValidationError('Invalid phone number format. Must start with 0 or 46');
    }

    const formatted = cleanPhone.startsWith('0') ? '46' + cleanPhone.substring(1) : cleanPhone;

    if (formatted.length < 11 || formatted.length > 12) {
      throw new SwishValidationError('Invalid phone number length. Must be 11-12 digits including country code');
    }

    return formatted;
  }

  /**
   * Makes a request to the Swish API with proper certificates
   */
  private async makeSwishRequest(data: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const endpoint = '/swish-cpcapi/api/v1/paymentrequests';
      const url = `${this.baseUrl}${endpoint}`;

      // Log certificate paths and check if they exist
      logDebug('Certificate paths:', {
        certPath: path.resolve(process.cwd(), this.certPath),
        keyPath: path.resolve(process.cwd(), this.keyPath),
        caPath: path.resolve(process.cwd(), this.caPath)
      });

      // Create HTTPS agent with certificates
      const agent = new https.Agent({
        cert: fs.readFileSync(path.resolve(process.cwd(), this.certPath)),
        key: fs.readFileSync(path.resolve(process.cwd(), this.keyPath)),
        ca: fs.readFileSync(path.resolve(process.cwd(), this.caPath)),
        minVersion: 'TLSv1.2'
      });

      // Make the request using node-fetch
      const response = await fetch(url, {
        method: 'POST',
        agent,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });

      // Handle response
      if (response.status === 201) {
        const location = response.headers.get('location');
        if (!location) {
          throw new SwishApiError('No Location header in response');
        }
        const reference = location.split('/').pop();
        return { success: true, data: { reference } };
      }

      // If not 201, try to get error details
      const responseText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = responseText;
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
   * Creates a Swish payment request
   */
  public async createPayment(data: SwishRequestData): Promise<SwishApiResponse> {
    try {
      logDebug('Creating Swish payment with data:', data);

      // Make request to Swish API
      const result = await this.makeSwishRequest(data);

      return {
        success: true,
        data: {
          reference: data.payeePaymentReference
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
} 