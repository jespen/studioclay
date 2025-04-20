/**
 * SwishErrorCode - Enum för alla möjliga felkoder från Swish-tjänsten
 * 
 * Dessa koder används för konsekvent felhantering i hela applikationen
 * och för att presentera användarvänliga felmeddelanden till slutanvändare.
 */

export enum SwishErrorCode {
  /** Valideringsfel för indata i begäran */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  /** Fel vid anrop till Swish API */
  API_ERROR = 'API_ERROR',
  
  /** Problem med certifikat eller autentisering */
  CERTIFICATE_ERROR = 'CERTIFICATE_ERROR',
  
  /** Databasproblem vid lagring av transaktionsinformation */
  DATABASE_ERROR = 'DATABASE_ERROR',
  
  /** Efterfrågad transaktion kunde inte hittas */
  NOT_FOUND = 'NOT_FOUND',
  
  /** Ogiltigt telefonnummer (fel format eller ogiltigt) */
  INVALID_PHONE_NUMBER = 'INVALID_PHONE_NUMBER',
  
  /** Obekräftad betalning (ej slutförd inom timeout-period) */
  PAYMENT_TIMEOUT = 'PAYMENT_TIMEOUT',
  
  /** Avvisad betalning (användaren avvisade begäran i Swish-appen) */
  PAYMENT_DECLINED = 'PAYMENT_DECLINED',
  
  /** Betalning misslyckades (generiska fel i Swish-systemet) */
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  
  /** Ogiltigt belopp (negativt, för stort eller för litet) */
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  
  /** Okänt fel (alla ospecificerade fel) */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Associera en användarvänlig beskrivning med varje felkod
 */
export const SwishErrorMessages: Record<SwishErrorCode, string> = {
  [SwishErrorCode.VALIDATION_ERROR]: "Ogiltig betalningsinformation. Kontrollera att alla uppgifter är korrekta.",
  [SwishErrorCode.API_ERROR]: "Kunde inte ansluta till Swish. Försök igen senare.",
  [SwishErrorCode.CERTIFICATE_ERROR]: "Tekniskt fel vid anslutning till Swish. Kontakta kundtjänst.",
  [SwishErrorCode.DATABASE_ERROR]: "Kunde inte spara betalningsinformation. Försök igen.",
  [SwishErrorCode.NOT_FOUND]: "Betalningen kunde inte hittas. Kontrollera referensnummer.",
  [SwishErrorCode.INVALID_PHONE_NUMBER]: "Ogiltigt telefonnummer. Ange ett svenskt mobilnummer i format 07XXXXXXXX.",
  [SwishErrorCode.PAYMENT_TIMEOUT]: "Tidsgränsen för betalning har gått ut. Försök igen.",
  [SwishErrorCode.PAYMENT_DECLINED]: "Betalningen avvisades i Swish-appen.",
  [SwishErrorCode.PAYMENT_FAILED]: "Betalningen misslyckades. Kontrollera ditt saldo och försök igen.",
  [SwishErrorCode.INVALID_AMOUNT]: "Ogiltigt belopp för Swish-betalning.",
  [SwishErrorCode.UNKNOWN_ERROR]: "Ett okänt fel har inträffat. Försök igen senare."
}

/**
 * Hitta bästa matchande felkoden från ett felmeddelande
 * @param errorMessage Felmeddelandetext att analysera
 * @returns Matchande SwishErrorCode
 */
export function getSwishErrorCode(errorMessage: string): SwishErrorCode {
  errorMessage = errorMessage.toLowerCase();
  
  if (errorMessage.includes('validation') || errorMessage.includes('valider')) {
    return SwishErrorCode.VALIDATION_ERROR;
  }
  if (errorMessage.includes('certificate') || errorMessage.includes('certifikat')) {
    return SwishErrorCode.CERTIFICATE_ERROR;
  }
  if (errorMessage.includes('database') || errorMessage.includes('databas')) {
    return SwishErrorCode.DATABASE_ERROR;
  }
  if (errorMessage.includes('not found') || errorMessage.includes('hittas inte')) {
    return SwishErrorCode.NOT_FOUND;
  }
  if (errorMessage.includes('phone') || errorMessage.includes('telefon')) {
    return SwishErrorCode.INVALID_PHONE_NUMBER;
  }
  if (errorMessage.includes('timeout') || errorMessage.includes('tidsgräns')) {
    return SwishErrorCode.PAYMENT_TIMEOUT;
  }
  if (errorMessage.includes('declined') || errorMessage.includes('avvisad')) {
    return SwishErrorCode.PAYMENT_DECLINED;
  }
  if (errorMessage.includes('failed') || errorMessage.includes('misslyckades')) {
    return SwishErrorCode.PAYMENT_FAILED;
  }
  if (errorMessage.includes('amount') || errorMessage.includes('belopp')) {
    return SwishErrorCode.INVALID_AMOUNT;
  }
  
  return SwishErrorCode.UNKNOWN_ERROR;
} 