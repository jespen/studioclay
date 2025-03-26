import { SwishValidationError } from '@/services/swish/types';

/**
 * Formats a phone number for Swish API.
 * Converts Swedish phone numbers to the format required by Swish.
 * Example: "0739000001" -> "46739000001"
 * 
 * @param phone - The phone number to format
 * @returns {string} The formatted phone number
 * @throws {SwishValidationError} If the phone number is invalid
 */
export const formatSwishPhoneNumber = (phone: string): string => {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  
  if (!cleanPhone.startsWith('0') && !cleanPhone.startsWith('46')) {
    throw new SwishValidationError('Invalid phone number format. Must start with 0 or 46');
  }

  const formatted = cleanPhone.startsWith('0') ? '46' + cleanPhone.substring(1) : cleanPhone;

  if (formatted.length < 11 || formatted.length > 12) {
    throw new SwishValidationError('Invalid phone number length. Must be 11-12 digits including country code');
  }

  return formatted;
};

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