/**
 * Utility functions for normalizing payment request data between snake_case and camelCase formats
 */

type SnakeToCamelCase<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<SnakeToCamelCase<U>>}`
  : S;

type CamelToSnakeCase<S extends string> = S extends `${infer T}${infer U}`
  ? T extends Capitalize<T>
    ? `_${Lowercase<T>}${CamelToSnakeCase<U>}`
    : `${T}${CamelToSnakeCase<U>}`
  : S;

/**
 * Get a field value from an object with fallback to other field names
 * 
 * @param obj The object to get the field from
 * @param fieldNames Array of possible field names to check
 * @param defaultValue Optional default value if no field is found
 * @returns The value of the first matching field, or defaultValue if none found
 */
export function getFieldWithFallback<T>(
  obj: Record<string, any> | null | undefined,
  fieldNames: string | string[],
  defaultValue?: T
): T | undefined {
  if (!obj) return defaultValue;
  
  // Convert single string to array for consistent handling
  const fields = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
  
  // Try each field name in order
  for (const field of fields) {
    if (obj[field] !== undefined) {
      return obj[field] as T;
    }
  }
  
  return defaultValue;
}

/**
 * Ensure that both camelCase and snake_case versions of a field exist in an object
 * 
 * @param obj The object to modify
 * @param camelCaseField The camelCase field name
 * @param snakeCaseField The snake_case field name
 * @returns The modified object with both field names
 */
export function ensureBothFieldFormats(
  obj: Record<string, any>,
  camelCaseField: string,
  snakeCaseField: string
): Record<string, any> {
  if (!obj) return {};
  
  const result = { ...obj };
  
  // Only one field exists, copy to the other
  if (result[camelCaseField] !== undefined && result[snakeCaseField] === undefined) {
    result[snakeCaseField] = result[camelCaseField];
  } else if (result[snakeCaseField] !== undefined && result[camelCaseField] === undefined) {
    result[camelCaseField] = result[snakeCaseField];
  }
  
  return result;
}

/**
 * Convert camelCase to snake_case
 * 
 * @param str The string to convert
 * @returns The snake_case version of the string
 */
function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Convert snake_case to camelCase
 * 
 * @param str The string to convert
 * @returns The camelCase version of the string
 */
function snakeToCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Check if an object is likely using snake_case or camelCase naming
 * 
 * @param data The object to check
 * @returns 'snake' if mostly snake_case, 'camel' if mostly camelCase, undefined if can't determine
 */
export function detectDataFormat(data: Record<string, any>): 'snake' | 'camel' | undefined {
  if (!data) return undefined;
  
  const keys = Object.keys(data);
  if (keys.length === 0) return undefined;
  
  let snakeCount = 0;
  let camelCount = 0;
  
  for (const key of keys) {
    if (key.includes('_')) {
      snakeCount++;
    } else if (/[a-z][A-Z]/.test(key)) {
      camelCount++;
    }
  }
  
  if (snakeCount > camelCount) {
    return 'snake';
  } else if (camelCount > snakeCount) {
    return 'camel';
  }
  
  return undefined;
}

/**
 * Normalize field names in an object to both camelCase and snake_case
 * 
 * @param data The object to normalize
 * @returns A new object with field names in both formats
 */
export function normalizeFieldNames(data: Record<string, any>): Record<string, any> {
  if (!data) return {};
  
  const result: Record<string, any> = { ...data };
  const keys = Object.keys(data);
  
  for (const key of keys) {
    if (key.includes('_')) {
      // Convert snake_case to camelCase
      const camelKey = snakeToCamelCase(key);
      if (result[camelKey] === undefined) {
        result[camelKey] = data[key];
      }
    } else if (/[a-z][A-Z]/.test(key)) {
      // Convert camelCase to snake_case
      const snakeKey = camelToSnakeCase(key);
      if (result[snakeKey] === undefined) {
        result[snakeKey] = data[key];
      }
    }
  }
  
  return result;
}

/**
 * Normalize a payment request to handle both camelCase and snake_case properties
 * 
 * @param data The payment request data to normalize
 * @returns A normalized payment request with all fields in both formats
 */
export function normalizePaymentRequest(data: Record<string, any> | null | undefined): Record<string, any> {
  if (!data) return {};
  
  // First, normalize the top level fields
  let result = normalizeFieldNames(data);
  
  // Then, handle nested objects
  if (result.userInfo || result.user_info) {
    const userInfo = result.userInfo || result.user_info;
    const normalizedUserInfo = normalizeFieldNames(userInfo);
    result.userInfo = normalizedUserInfo;
    result.user_info = normalizedUserInfo;
  }
  
  if (result.invoiceDetails || result.invoice_details) {
    const invoiceDetails = result.invoiceDetails || result.invoice_details;
    const normalizedInvoiceDetails = normalizeFieldNames(invoiceDetails);
    result.invoiceDetails = normalizedInvoiceDetails;
    result.invoice_details = normalizedInvoiceDetails;
  }
  
  if (result.giftCardDetails || result.gift_card_details) {
    const giftCardDetails = result.giftCardDetails || result.gift_card_details;
    const normalizedGiftCardDetails = normalizeFieldNames(giftCardDetails);
    result.giftCardDetails = normalizedGiftCardDetails;
    result.gift_card_details = normalizedGiftCardDetails;
  }
  
  return result;
}
