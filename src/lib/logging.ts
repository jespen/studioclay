/**
 * Loggningssystem för att spåra alla händelser och fel relaterade till betalningar
 * 
 * Detta system fokuserar på att tillhandahålla spårbara och detaljerade loggar
 * för alla betalningsrelaterade händelser, vilket möjliggör enkel felsökning och 
 * spårning av transaktioner genom hela systemet.
 */

import { createServerSupabaseClient } from '@/utils/supabase';
import { v4 as uuidv4 } from 'uuid';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  operation?: string;
  productType?: string;
  paymentMethod?: string;
  reference?: string;
  [key: string]: any;
}

/**
 * Skapa en ny loggkontext med ett unikt request ID
 */
export function createLogContext(operation: string, additionalContext: Partial<LogContext> = {}): LogContext {
  return {
    requestId: uuidv4(),
    operation,
    timestamp: new Date().toISOString(),
    ...additionalContext
  };
}

/**
 * Basfunktion för att logga ett meddelande med en viss nivå
 */
export function log(level: LogLevel, message: string, context?: LogContext, data?: any): void {
  const logEntry = {
    level,
    message,
    context: context || {},
    data,
    timestamp: new Date().toISOString()
  };

  // Alltid logga till konsolen
  const logPrefix = context?.requestId ? `[${context.requestId}]` : '';
  
  if (level === 'debug') {
    console.debug(`${logPrefix} ${message}`, { context, data });
  } else if (level === 'info') {
    console.info(`${logPrefix} ${message}`, { context, data });
  } else if (level === 'warn') {
    console.warn(`${logPrefix} ${message}`, { context, data });
  } else if (level === 'error') {
    console.error(`${logPrefix} ${message}`, { context, data });
  }

  // För produktionsmiljö, spara även till databasen om det är ett fel
  if (process.env.NODE_ENV === 'production' && (level === 'error' || level === 'warn')) {
    saveLogToDatabase(logEntry).catch(err => {
      console.error('Kunde inte spara logg till databas:', err);
    });
  }
}

/**
 * Logga debug-information
 */
export function logDebug(message: string, context?: LogContext, data?: any): void {
  log('debug', message, context, data);
}

/**
 * Logga normal information
 */
export function logInfo(message: string, context?: LogContext, data?: any): void {
  log('info', message, context, data);
}

/**
 * Logga varningar
 */
export function logWarning(message: string, context?: LogContext, data?: any): void {
  log('warn', message, context, data);
}

/**
 * Logga fel
 */
export function logError(message: string, context?: LogContext, error?: any): void {
  // Formatera feldata
  const errorData = formatError(error);
  
  log('error', message, context, errorData);
}

/**
 * Spara logginformation till databasen för framtida analys
 */
async function saveLogToDatabase(logEntry: any): Promise<void> {
  try {
    const supabase = createServerSupabaseClient();
    
    const { error } = await supabase
      .from('error_logs')
      .insert({
        request_id: logEntry.context?.requestId || uuidv4(),
        error_type: logEntry.context?.operation || 'unknown',
        error_message: logEntry.message,
        error_level: logEntry.level,
        error_stack: logEntry.data?.stack || null,
        request_data: {
          context: logEntry.context,
          data: logEntry.data
        },
        timestamp: new Date().toISOString()
      });
    
    if (error) {
      console.error('Fel vid sparande av logg:', error);
    }
  } catch (err) {
    console.error('Kunde inte spara logg till databas:', err);
  }
}

/**
 * Omvandla ett fel till ett format som kan loggas säkert
 */
function formatError(error: any): any {
  if (!error) return null;
  
  if (error instanceof Error) {
    // Skapa en kopia av Error-objektet för att undvika circular references
    const errorObj: Record<string, any> = {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
    };
    
    // Lägg till eventuella egna fält på Error-objektet
    Object.keys(error).forEach(key => {
      if (!['message', 'name', 'stack'].includes(key)) {
        errorObj[key] = (error as any)[key];
      }
    });
    
    return errorObj;
  }
  
  if (typeof error === 'object') {
    try {
      // Försök konvertera till ett säkert JSON-objekt
      const safeError = JSON.parse(JSON.stringify(error));
      return safeError;
    } catch {
      // Om det inte går att konvertera, returnera som sträng
      return { stringValue: String(error) };
    }
  }
  
  // Returnera som sträng om inget annat fungerar
  return { stringValue: String(error) };
} 