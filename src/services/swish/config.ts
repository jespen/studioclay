import { z } from 'zod';

// Environment variable schema
const SwishEnvSchema = z.object({
  NEXT_PUBLIC_SWISH_TEST_MODE: z.string().transform(val => val === 'true'),
  SWISH_TEST_PAYEE_ALIAS: z.string(),
  SWISH_TEST_CERT_PATH: z.string(),
  SWISH_TEST_KEY_PATH: z.string(),
  SWISH_TEST_CA_PATH: z.string(),
  NEXT_PUBLIC_BASE_URL: z.string().url(),
});

// API endpoints
export const SWISH_ENDPOINTS = {
  createPayment: '/swish-cpcapi/api/v1/paymentrequests',
  getPayment: '/swish-cpcapi/api/v1/paymentrequests',
  cancelPayment: '/swish-cpcapi/api/v1/paymentrequests/cancel'
} as const;

// Base URLs
export const SWISH_BASE_URLS = {
  test: 'https://mss.cpc.getswish.net',
  prod: 'https://cpc.getswish.net'
} as const;

// Configuration class
export class SwishConfig {
  private static instance: SwishConfig;
  private readonly isTestMode: boolean;
  private readonly env: z.infer<typeof SwishEnvSchema>;

  private constructor() {
    try {
      this.env = SwishEnvSchema.parse(process.env);
      this.isTestMode = this.env.NEXT_PUBLIC_SWISH_TEST_MODE;
    } catch (error) {
      console.error('Failed to validate Swish environment variables:', error);
      throw new Error('Invalid Swish configuration');
    }
  }

  public static getInstance(): SwishConfig {
    if (!SwishConfig.instance) {
      SwishConfig.instance = new SwishConfig();
    }
    return SwishConfig.instance;
  }

  // API URL based on environment
  public get apiUrl(): string {
    return this.isTestMode ? SWISH_BASE_URLS.test : SWISH_BASE_URLS.prod;
  }

  // Payee alias (Swish number) based on environment
  public get payeeAlias(): string {
    return this.env.SWISH_TEST_PAYEE_ALIAS;
  }

  // Certificate paths based on environment
  public get certPath(): string {
    return this.env.SWISH_TEST_CERT_PATH;
  }

  public get keyPath(): string {
    return this.env.SWISH_TEST_KEY_PATH;
  }

  public get caPath(): string {
    return this.env.SWISH_TEST_CA_PATH;
  }

  // Environment check
  public get isTest(): boolean {
    return this.isTestMode;
  }

  // Get full URL for an endpoint
  public getEndpointUrl(endpoint: keyof typeof SWISH_ENDPOINTS): string {
    return `${this.apiUrl}${SWISH_ENDPOINTS[endpoint]}`;
  }
} 