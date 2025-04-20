/**
 * Konfigurationshantering för Swish-betalningar
 * 
 * Denna fil innehåller all konfiguration för Swish-integration,
 * inklusive miljöinställningar, URL:er och hjälpfunktioner
 * för att säkerställa korrekt konfiguration.
 */

// API slutpunkter för Swish
export const SWISH_ENDPOINTS = {
  /** API för att skapa betalningar */
  createPayment: '/swish-cpcapi/api/v1/paymentrequests',
  /** API för att se status på betalningar */
  paymentStatus: '/swish-cpcapi/api/v1/paymentrequests/{id}',
  /** API för att avbryta betalningar */
  cancelPayment: '/swish-cpcapi/api/v1/paymentrequests/{id}/cancel'
};

// Bas-URL:er för Swish API
export const SWISH_BASE_URLS = {
  /** Test-miljö (MSS) */
  test: 'https://mss.cpc.getswish.net',
  /** Produktions-miljö */
  prod: 'https://cpc.getswish.net'
};

/**
 * Konfiguration för Swish-betalningar
 * 
 * Hanterar miljöspecifika inställningar och ger tillgång till
 * Swish API-konfiguration som bas-URL, certifikatvägar och endpoint-URL:er
 * baserat på aktuell miljö.
 */
export class SwishConfig {
  private static instance: SwishConfig;
  private readonly isTestMode: boolean;
  
  /**
   * Singleton-konstruktor
   */
  private constructor() {
    this.isTestMode = process.env.NEXT_PUBLIC_SWISH_TEST_MODE === 'true';
    
    // Verifiera att vi har de nödvändiga miljövariablerna
    this.validateEnvironment();
  }
  
  /**
   * Validera att alla nödvändiga miljövariabler finns
   */
  private validateEnvironment(): void {
    // Lista över nödvändiga miljövariabler baserat på miljöläge
    const requiredVars = this.isTestMode
      ? [
          'SWISH_TEST_PAYEE_ALIAS',
          'SWISH_TEST_CERT_PATH',
          'SWISH_TEST_KEY_PATH',
          'SWISH_TEST_CA_PATH'
        ]
      : [
          'SWISH_PROD_PAYEE_ALIAS',
          'SWISH_PROD_CERT_PATH',
          'SWISH_PROD_KEY_PATH',
          'SWISH_PROD_CA_PATH'
        ];

    // Kontrollera att alla nödvändiga variabler finns
    const missingVars = requiredVars.filter(v => !process.env[v]);
    
    if (missingVars.length > 0) {
      throw new Error(`Saknad Swish-konfiguration: ${missingVars.join(', ')}`);
    }
  }
  
  /**
   * Hämta singleton-instansen av SwishConfig.
   * Skapar en ny instans om ingen redan finns.
   */
  public static getInstance(): SwishConfig {
    if (!SwishConfig.instance) {
      SwishConfig.instance = new SwishConfig();
    }
    return SwishConfig.instance;
  }
  
  /**
   * Hämta bas-URL för Swish API baserat på miljö
   */
  public getBaseUrl(): string {
    return this.isTestMode ? SWISH_BASE_URLS.test : SWISH_BASE_URLS.prod;
  }
  
  /**
   * Hämta URL för att skapa betalningar
   */
  public getPaymentRequestUrl(): string {
    return `${this.getBaseUrl()}${SWISH_ENDPOINTS.createPayment}`;
  }
  
  /**
   * Hämta URL för att kontrollera betalningstatus
   */
  public getPaymentStatusUrl(paymentId: string): string {
    return `${this.getBaseUrl()}${SWISH_ENDPOINTS.paymentStatus.replace('{id}', paymentId)}`;
  }
  
  /**
   * Hämta URL för att avbryta betalningar
   */
  public getCancelPaymentUrl(paymentId: string): string {
    return `${this.getBaseUrl()}${SWISH_ENDPOINTS.cancelPayment.replace('{id}', paymentId)}`;
  }

  /**
   * Hämta callback-URL för Swish
   */
  public getCallbackUrl(): string {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const secureUrl = baseUrl.replace('http://', 'https://');
    
    // I produktion, säkerställ att vi använder korrekt domän format
    if (process.env.NODE_ENV === 'production' && secureUrl.includes('www.studioclay.se')) {
      return secureUrl.replace('www.studioclay.se', 'studioclay.se') + '/api/payments/swish/callback';
    }
    
    return `${secureUrl}/api/payments/swish/callback`;
  }
  
  /**
   * Hämta handlares Swish-nummer
   */
  public getMerchantSwishNumber(): string {
    return this.isTestMode
      ? process.env.SWISH_TEST_PAYEE_ALIAS || '1231181189'
      : process.env.SWISH_PROD_PAYEE_ALIAS || '1232296374';
  }
  
  /**
   * Hämta sökväg till certifikatfil
   */
  public getCertificatePath(): string {
    return this.isTestMode
      ? process.env.SWISH_TEST_CERT_PATH!
      : process.env.SWISH_PROD_CERT_PATH!;
  }
  
  /**
   * Hämta sökväg till nyckelfil
   */
  public getKeyPath(): string {
    return this.isTestMode
      ? process.env.SWISH_TEST_KEY_PATH!
      : process.env.SWISH_PROD_KEY_PATH!;
  }
  
  /**
   * Hämta sökväg till CA-certifikatfil
   */
  public getCAPath(): string {
    return this.isTestMode
      ? process.env.SWISH_TEST_CA_PATH!
      : process.env.SWISH_PROD_CA_PATH!;
  }
  
  /**
   * Hämta lösenord för certifikat (om tillgängligt)
   */
  public getCertificatePassword(): string | undefined {
    return this.isTestMode
      ? process.env.SWISH_TEST_CERT_PASSWORD
      : process.env.SWISH_PROD_CERT_PASSWORD;
  }
  
  /**
   * Kontrollera om vi är i testläge
   */
  public isTest(): boolean {
    return this.isTestMode;
  }
} 