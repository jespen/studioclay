import { logDebug, logError } from "@/lib/logging";
import { SwishValidationError } from '@/services/swish/types';

/**
 * Formats a phone number for use with Swish API.
 * Swedish phone numbers should be formatted as:
 * - 46 followed by the phone number without leading 0
 * 
 * Example: 
 * - "0739000001" becomes "46739000001"
 * - "+46739000001" becomes "46739000001"
 * 
 * @param phoneNumber - The phone number to format
 * @returns {string} - The formatted phone number
 * @throws {SwishValidationError} If the phone number is invalid
 */
export function formatSwishPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) {
    logError('Phone number is empty or undefined');
    throw new SwishValidationError("Phone number is required");
  }

  logDebug('Formatting phone number:', { original: phoneNumber });
  
  // Remove spaces, dashes, etc.
  let cleaned = phoneNumber.replace(/\s+/g, "").replace(/-/g, "");
  
  // Remove any plus sign
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }
  
  // If it starts with a Swedish country code
  if (cleaned.startsWith("46")) {
    logDebug('Phone already has country code:', { cleaned });
    return cleaned;
  }
  
  // If it starts with a 0, replace it with the country code
  if (cleaned.startsWith("0")) {
    const formatted = "46" + cleaned.substring(1);
    logDebug('Formatted phone with country code:', { 
      original: phoneNumber,
      cleaned,
      formatted 
    });
    return formatted;
  }
  
  // If we reach here, the number doesn't match expected patterns
  logError('Invalid phone number format:', { phoneNumber, cleaned });
  throw new SwishValidationError("Invalid phone number format. Expected a Swedish phone number.");
}

/**
 * Validates a phone number for Swish.
 * Checks if the number is in a valid format for Swish payments.
 * 
 * @param phone - The phone number to validate
 * @returns {boolean} True if the phone number is valid
 */
export const isValidSwishPhoneNumber = (phone: string): boolean => {
  try {
    formatSwishPhoneNumber(phone);
    return true;
  } catch {
    return false;
  }
}; 