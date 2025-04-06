import { z } from 'zod';

/**
 * Schema for validating Swish-related environment variables.
 * Ensures all required variables are present and correctly formatted.
 */
const SwishEnvSchema = z.object({
  /** Whether to use Swish test environment (MSS) */
  NEXT_PUBLIC_SWISH_TEST_MODE: z.string().transform(val => val === 'true'),
  /** Swish number for the merchant in test environment */
  SWISH_TEST_PAYEE_ALIAS: z.string().optional(),
  /** Path to the Swish certificate file in test environment */
  SWISH_TEST_CERT_PATH: z.string().optional(),
  /** Path to the Swish private key file in test environment */
  SWISH_TEST_KEY_PATH: z.string().optional(),
  /** Path to the Swish CA certificate file in test environment */
  SWISH_TEST_CA_PATH: z.string().optional(),
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
}).refine(
  // Säkerställ att vi har rätt certifikat för valt miljöläge
  (data) => {
    if (data.NEXT_PUBLIC_SWISH_TEST_MODE) {
      // I testläge måste vi ha test-certifikat
      return !!data.SWISH_TEST_PAYEE_ALIAS && 
             !!data.SWISH_TEST_CERT_PATH && 
             !!data.SWISH_TEST_KEY_PATH && 
             !!data.SWISH_TEST_CA_PATH;
    } else {
      // I produktionsläge måste vi ha produktions-certifikat
      return !!data.SWISH_PROD_PAYEE_ALIAS && 
             !!data.SWISH_PROD_CERT_PATH && 
             !!data.SWISH_PROD_KEY_PATH && 
             !!data.SWISH_PROD_CA_PATH;
    }
  },
  {
    message: "Missing required certificates for the selected environment mode",
    path: ["certificates"]
  }
);

/**
 * Available Swish API endpoints.
 * These are the standard endpoints used for payment operations.
 */
export const SWISH_ENDPOINTS = {
  /** Endpoint for creating new payment requests */
  createPayment: '/swish-cpcapi/api/v1/paymentrequests',
  /** Endpoint for retrieving payment status */
  getPayment: '/swish-cpcapi/api/v1/paymentrequests',
  /** Endpoint for checking payment status (alias for getPayment) */
  paymentStatus: '/swish-cpcapi/api/v1/paymentrequests/{id}',
  /** Endpoint for canceling payment requests */
  cancelPayment: '/swish-cpcapi/api/v1/paymentrequests'
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
  
  // Använd en egen typdefinition som tillåter undefined
  private readonly env: {
    NEXT_PUBLIC_SWISH_TEST_MODE: boolean;
    SWISH_TEST_PAYEE_ALIAS?: string;
    SWISH_TEST_CERT_PATH?: string;
    SWISH_TEST_KEY_PATH?: string;
    SWISH_TEST_CA_PATH?: string;
    NEXT_PUBLIC_BASE_URL: string;
    SWISH_PROD_PAYEE_ALIAS?: string;
    SWISH_PROD_CERT_PATH?: string;
    SWISH_PROD_KEY_PATH?: string;
    SWISH_PROD_CA_PATH?: string;
  };

  /**
   * Private constructor to enforce singleton pattern.
   * Validates environment variables on instantiation.
   * 
   * @throws {Error} If environment variables are invalid or missing
   */
  private constructor() {
    try {
      // Försök validera miljövariablerna
      this.env = SwishEnvSchema.parse(process.env);
      this.isTestMode = this.env.NEXT_PUBLIC_SWISH_TEST_MODE;
    } catch (error) {
      // Mer detaljerad felloggning
      console.error('Failed to validate Swish environment variables:', error);
      
      // Logga vilka variabler som orsakar problem
      if (error instanceof z.ZodError) {
        const missingFields = error.errors.map(err => err.path.join('.'));
        console.error('Missing or invalid Swish configuration fields:', missingFields);
        
        // Logga alla relevanta miljövariabler (utan innehåll) för felsökning
        console.error('Current environment variable keys:', {
          NEXT_PUBLIC_SWISH_TEST_MODE: !!process.env.NEXT_PUBLIC_SWISH_TEST_MODE,
          SWISH_TEST_PAYEE_ALIAS: !!process.env.SWISH_TEST_PAYEE_ALIAS, 
          SWISH_TEST_CERT_PATH: !!process.env.SWISH_TEST_CERT_PATH,
          SWISH_TEST_KEY_PATH: !!process.env.SWISH_TEST_KEY_PATH,
          SWISH_TEST_CA_PATH: !!process.env.SWISH_TEST_CA_PATH,
          NEXT_PUBLIC_BASE_URL: !!process.env.NEXT_PUBLIC_BASE_URL,
          SWISH_PROD_PAYEE_ALIAS: !!process.env.SWISH_PROD_PAYEE_ALIAS,
          SWISH_PROD_CERT_PATH: !!process.env.SWISH_PROD_CERT_PATH,
          SWISH_PROD_KEY_PATH: !!process.env.SWISH_PROD_KEY_PATH,
          SWISH_PROD_CA_PATH: !!process.env.SWISH_PROD_CA_PATH
        });
      }
      
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
   * Gets the Swish number (payee alias) based on the environment.
   * 
   * @returns {string} The payee alias for the current environment
   */
  public get payeeAlias(): string {
    // I testläge använder vi test-nummer
    if (this.isTestMode) {
      if (!this.env.SWISH_TEST_PAYEE_ALIAS) {
        throw new Error('Missing SWISH_TEST_PAYEE_ALIAS environment variable');
      }
      return this.env.SWISH_TEST_PAYEE_ALIAS;
    }
    
    // I produktionsläge använder vi produktions-nummer
    if (!this.env.SWISH_PROD_PAYEE_ALIAS) {
      throw new Error('Missing SWISH_PROD_PAYEE_ALIAS environment variable');
    }
    return this.env.SWISH_PROD_PAYEE_ALIAS;
  }

  /**
   * Gets the path to the Swish certificate file.
   * 
   * @returns {string} Path to the certificate file
   */
  public get certPath(): string {
    // För test-läge, kräv SWISH_TEST_CERT_PATH
    if (this.isTestMode) {
      if (!this.env.SWISH_TEST_CERT_PATH) {
        throw new Error('Missing SWISH_TEST_CERT_PATH environment variable');
      }
      return this.env.SWISH_TEST_CERT_PATH;
    }
    
    // För produktions-läge, kräv SWISH_PROD_CERT_PATH
    if (!this.env.SWISH_PROD_CERT_PATH) {
      throw new Error('Missing SWISH_PROD_CERT_PATH environment variable');
    }
    return this.env.SWISH_PROD_CERT_PATH;
  }

  /**
   * Gets the path to the Swish private key file.
   * 
   * @returns {string} Path to the private key file
   */
  public get keyPath(): string {
    // För test-läge, kräv SWISH_TEST_KEY_PATH
    if (this.isTestMode) {
      if (!this.env.SWISH_TEST_KEY_PATH) {
        throw new Error('Missing SWISH_TEST_KEY_PATH environment variable');
      }
      return this.env.SWISH_TEST_KEY_PATH;
    }
    
    // För produktions-läge, kräv SWISH_PROD_KEY_PATH
    if (!this.env.SWISH_PROD_KEY_PATH) {
      throw new Error('Missing SWISH_PROD_KEY_PATH environment variable');
    }
    return this.env.SWISH_PROD_KEY_PATH;
  }

  /**
   * Gets the path to the Swish CA certificate file.
   * 
   * @returns {string} Path to the CA certificate file
   */
  public get caPath(): string {
    // För test-läge, kräv SWISH_TEST_CA_PATH
    if (this.isTestMode) {
      if (!this.env.SWISH_TEST_CA_PATH) {
        throw new Error('Missing SWISH_TEST_CA_PATH environment variable');
      }
      return this.env.SWISH_TEST_CA_PATH;
    }
    
    // För produktions-läge, kräv SWISH_PROD_CA_PATH
    if (!this.env.SWISH_PROD_CA_PATH) {
      throw new Error('Missing SWISH_PROD_CA_PATH environment variable');
    }
    return this.env.SWISH_PROD_CA_PATH;
  }

  /**
   * Gets the certificate password if available.
   * 
   * @returns {string|undefined} The certificate password or undefined if not set
   */
  public get certPassword(): string | undefined {
    return this.isTestMode 
      ? process.env.SWISH_TEST_CERT_PASSWORD 
      : process.env.SWISH_PROD_CERT_PASSWORD;
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