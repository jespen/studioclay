/**
 * Simple logging utility for debugging and error tracking
 */

import { createServerSupabaseClient } from '@/utils/supabase';
import { v4 as uuidv4 } from 'uuid';

interface LogEntry {
  level: 'debug' | 'info' | 'error';
  message: string;
  data?: any;
  timestamp: string;
  request_id?: string;
}

/**
 * Log debug information
 * @param message The log message
 * @param data Optional data to include
 */
export async function logDebug(message: string, data?: any): Promise<void> {
  const entry: LogEntry = {
    level: 'debug',
    message,
    data,
    timestamp: new Date().toISOString(),
    request_id: uuidv4().substring(0, 8)
  };

  console.log(`[DEBUG] ${entry.message}`, entry.data || '');

  try {
    const supabase = createServerSupabaseClient();
    await supabase.from('logs').insert(entry);
  } catch (error) {
    console.error('Failed to save debug log to database:', error);
  }
}

/**
 * Log informational messages
 * @param message The log message
 * @param data Optional data to include
 */
export async function logInfo(message: string, data?: any): Promise<void> {
  const entry: LogEntry = {
    level: 'info',
    message,
    data,
    timestamp: new Date().toISOString(),
    request_id: uuidv4().substring(0, 8)
  };

  console.log(`[INFO] ${entry.message}`, entry.data || '');

  try {
    const supabase = createServerSupabaseClient();
    await supabase.from('logs').insert(entry);
  } catch (error) {
    console.error('Failed to save info log to database:', error);
  }
}

/**
 * Log error information
 * @param message The error message
 * @param error The error object or details
 */
export async function logError(message: string, error: any): Promise<void> {
  const errorDetails = error instanceof Error
    ? { message: error.message, stack: error.stack }
    : error;

  const entry: LogEntry = {
    level: 'error',
    message,
    data: errorDetails,
    timestamp: new Date().toISOString(),
    request_id: uuidv4().substring(0, 8)
  };

  console.error(`[ERROR] ${entry.message}`, entry.data || '');

  try {
    const supabase = createServerSupabaseClient();
    await supabase.from('logs').insert(entry);
  } catch (dbError) {
    console.error('Failed to save error log to database:', dbError);
  }
} 