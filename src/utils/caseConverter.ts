/**
 * Utility functions to convert between camelCase and snake_case
 * These help ensure consistency between API and database field names
 */

/**
 * Converts a camelCase string to snake_case
 * Example: "firstName" -> "first_name"
 */
export function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Converts a snake_case string to camelCase
 * Example: "first_name" -> "firstName"
 */
export function snakeToCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Recursively converts all keys in an object from camelCase to snake_case
 */
export function convertObjectToSnakeCase<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertObjectToSnakeCase(item));
  }

  return Object.keys(obj).reduce((acc, key) => {
    const snakeKey = camelToSnakeCase(key);
    acc[snakeKey] = convertObjectToSnakeCase(obj[key]);
    return acc;
  }, {} as Record<string, any>);
}

/**
 * Recursively converts all keys in an object from snake_case to camelCase
 */
export function convertObjectToCamelCase<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertObjectToCamelCase(item));
  }

  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = snakeToCamelCase(key);
    acc[camelKey] = convertObjectToCamelCase(obj[key]);
    return acc;
  }, {} as Record<string, any>);
} 