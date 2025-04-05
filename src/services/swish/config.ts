import { z } from 'zod';

/**
 * Schema for validating Swish-related environment variables.
 * Ensures all required variables are present and correctly formatted.
 */
const SwishEnvSchema = z.object({
  /** Whether to use Swish test environment (MSS) */
  NEXT_PUBLIC_SWISH_TEST_MODE: z.string().transform(val => val === 'true'),
  /** Swish number for the merchant in test environment */
  SWISH_TEST_PAYEE_ALIAS: z.string(),
  /** Path to the Swish certificate file in test environment */
  SWISH_TEST_CERT_PATH: z.string(),
  /** Path to the Swish private key file in test environment */
  SWISH_TEST_KEY_PATH: z.string(),
  /** Path to the Swish CA certificate file in test environment */
  SWISH_TEST_CA_PATH: z.string(),
  /** Base URL for the application (used for callback URLs) */
  NEXT_PUBLIC_BASE_URL: z.string().refine(
    (url) => {
      // I testläge accepterar vi både http och https
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        return url.startsWith('http://') || url.startsWith('https://');
      }
      // I produktionsläge kräver vi https
      return url.startsWith('https://');
    },
    { message: "BASE_URL must start with 'https://' in production mode" }
  ),
  /** Swish number for the merchant in production environment */
  SWISH_PROD_PAYEE_ALIAS: z.string().optional(),
  /** Path to the Swish certificate file in production environment */
  SWISH_PROD_CERT_PATH: z.string().optional(),
  /** Path to the Swish private key file in production environment */
  SWISH_PROD_KEY_PATH: z.string().optional(),
  /** Path to the Swish CA certificate file in production environment */
  SWISH_PROD_CA_PATH: z.string().optional(),
});

/**
 * Available Swish API endpoints.
 * These are the standard endpoints used for payment operations.
 */
export const SWISH_ENDPOINTS = {
  /** Endpoint for creating new payment requests */
  createPayment: '/swish-cpcapi/api/v1/paymentrequests',
  /** Endpoint for retrieving payment status */
  getPayment: '/swish-cpcapi/api/v1/paymentrequests',
  /** Endpoint for canceling payment requests */
  cancelPayment: '/swish-cpcapi/api/v1/paymentrequests/cancel'
} as const;

/**
 * Base URLs for Swish API environments.
 * These are the official URLs for both test and production environments.
 */
export const SWISH_BASE_URLS = {
  /** URL for Swish Merchant Swish Simulator (MSS) */
  test: 'https://mss.cpc.getswish.net',
  /** URL for Swish production environment */
  prod: 'https://cpc.getswish.net'
} as const;

/**
 * Configuration class for Swish payment integration.
 * Handles environment-specific settings and provides access to Swish API configuration.
 * 
 * @example
 * ```typescript
 * const config = SwishConfig.getInstance();
 * const apiUrl = config.apiUrl;
 * const payeeAlias = config.payeeAlias;
 * ```
 */
export class SwishConfig {
  private static instance: SwishConfig;
  private readonly isTestMode: boolean;
  private readonly env: z.infer<typeof SwishEnvSchema>;

  /**
   * Private constructor to enforce singleton pattern.
   * Validates environment variables on instantiation.
   * 
   * @throws {Error} If environment variables are invalid or missing
   */
  private constructor() {
    try {
      this.env = SwishEnvSchema.parse(process.env);
      this.isTestMode = this.env.NEXT_PUBLIC_SWISH_TEST_MODE;
    } catch (error) {
      console.error('Failed to validate Swish environment variables:', error);
      throw new Error('Invalid Swish configuration');
    }
  }

  /**
   * Gets the singleton instance of SwishConfig.
   * Creates a new instance if one doesn't exist.
   * 
   * @returns {SwishConfig} The singleton instance
   */
  public static getInstance(): SwishConfig {
    if (!SwishConfig.instance) {
      SwishConfig.instance = new SwishConfig();
    }
    return SwishConfig.instance;
  }

  /**
   * Gets the base URL for Swish API based on environment.
   * 
   * @returns {string} The base URL for the current environment
   */
  public get apiUrl(): string {
    return this.isTestMode ? SWISH_BASE_URLS.test : SWISH_BASE_URLS.prod;
  }

  /**
   * Gets the payee alias (Swish number) for the current environment.
   * 
   * @returns {string} The merchant's Swish number
   */
  public get payeeAlias(): string {
    return this.isTestMode 
      ? this.env.SWISH_TEST_PAYEE_ALIAS 
      : this.env.SWISH_PROD_PAYEE_ALIAS || this.env.SWISH_TEST_PAYEE_ALIAS;
  }

  /**
   * Gets the path to the Swish certificate file.
   * 
   * @returns {string} Path to the certificate file
   */
  public get certPath(): string {
    return this.isTestMode 
      ? this.env.SWISH_TEST_CERT_PATH 
      : this.env.SWISH_PROD_CERT_PATH || this.env.SWISH_TEST_CERT_PATH;
  }

  /**
   * Gets the path to the Swish private key file.
   * 
   * @returns {string} Path to the private key file
   */
  public get keyPath(): string {
    return this.isTestMode 
      ? this.env.SWISH_TEST_KEY_PATH 
      : this.env.SWISH_PROD_KEY_PATH || this.env.SWISH_TEST_KEY_PATH;
  }

  /**
   * Gets the path to the Swish CA certificate file.
   * 
   * @returns {string} Path to the CA certificate file
   */
  public get caPath(): string {
    return this.isTestMode 
      ? this.env.SWISH_TEST_CA_PATH 
      : this.env.SWISH_PROD_CA_PATH || this.env.SWISH_TEST_CA_PATH;
  }

  /**
   * Checks if the current environment is test mode.
   * 
   * @returns {boolean} True if in test mode, false otherwise
   */
  public get isTest(): boolean {
    return this.isTestMode;
  }

  /**
   * Gets the full URL for a specific Swish API endpoint.
   * 
   * @param endpoint - The endpoint key from SWISH_ENDPOINTS
   * @returns {string} The complete URL for the endpoint
   */
  public getEndpointUrl(endpoint: keyof typeof SWISH_ENDPOINTS): string {
    const url = `${this.apiUrl}${SWISH_ENDPOINTS[endpoint]}`;
    console.log(`Swish API URL: ${url} (isTestMode: ${this.isTestMode})`);
    return url;
  }
} 