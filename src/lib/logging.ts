/**
 * Simple logging utility for debugging and error tracking
 */

export function logDebug(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] DEBUG: ${message}`);
  if (data !== undefined) {
    console.log(JSON.stringify(data, null, 2));
  }
}

export function logError(message: string, error?: any) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${message}`);
  if (error) {
    if (error instanceof Error) {
      console.error(error.stack);
    } else {
      console.error(JSON.stringify(error, null, 2));
    }
  }
} 