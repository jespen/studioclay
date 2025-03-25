import { SwishRequestData, SwishApiResponse, SwishValidationError, SwishApiError, SwishCertificateError, SwishError } from './types';
import { SwishConfig } from './config';
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
   * Gets the current payee alias (Swish number).
   * 
   * @returns {string} The merchant's Swish number
   */
  public getPayeeAlias(): string {
    return this.config.payeeAlias;
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
   * Makes a request to the Swish API with proper certificates.
   * Handles HTTPS communication and error responses.
   * 
   * @param data - The data to send to the Swish API
   * @returns {Promise<{success: boolean, data?: any, error?: string}>} The API response
   * @throws {SwishApiError} If the API request fails
   */
  private async makeSwishRequest(data: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const url = this.config.getEndpointUrl('createPayment');

      logDebug('Certificate paths:', {
        certPath: path.resolve(process.cwd(), this.config.certPath),
        keyPath: path.resolve(process.cwd(), this.config.keyPath),
        caPath: path.resolve(process.cwd(), this.config.caPath)
      });

      const agent = new https.Agent({
        cert: fs.readFileSync(path.resolve(process.cwd(), this.config.certPath)),
        key: fs.readFileSync(path.resolve(process.cwd(), this.config.keyPath)),
        ca: fs.readFileSync(path.resolve(process.cwd(), this.config.caPath)),
        minVersion: 'TLSv1.2'
      });

      const response = await fetch(url, {
        method: 'POST',
        agent,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.status === 201) {
        const location = response.headers.get('location');
        if (!location) {
          throw new SwishApiError('No Location header in response');
        }
        const reference = location.split('/').pop();
        return { success: true, data: { reference } };
      }

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
   * Creates a Swish payment request.
   * Formats the request data and sends it to the Swish API.
   * 
   * @param data - The payment request data
   * @returns {Promise<SwishApiResponse>} The API response
   */
  public async createPayment(data: SwishRequestData): Promise<SwishApiResponse> {
    try {
      logDebug('Creating Swish payment with data:', data);

      const result = await this.makeSwishRequest(data);

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
} 