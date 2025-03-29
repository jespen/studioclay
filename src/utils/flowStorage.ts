import { FlowType } from '@/components/common/BookingStepper';

// Storage keys with proper prefixes to avoid collisions
const STORAGE_KEYS = {
  FLOW_TYPE: 'flow_type',
  ITEM_ID: 'item_id',
  ITEM_DETAILS: 'item_details',
  USER_INFO: 'user_info',
  PAYMENT_INFO: 'payment_info',
};

/**
 * Sets the current flow type in localStorage
 */
export const setFlowType = (flowType: FlowType): void => {
  localStorage.setItem(STORAGE_KEYS.FLOW_TYPE, flowType);
};

/**
 * Gets the current flow type from localStorage
 */
export const getFlowType = (): FlowType | null => {
  const flowType = localStorage.getItem(STORAGE_KEYS.FLOW_TYPE);
  return flowType as FlowType || null;
};

/**
 * Sets the selected item ID for the current flow
 */
export const setItemId = (itemId: string): void => {
  localStorage.setItem(STORAGE_KEYS.ITEM_ID, itemId);
};

/**
 * Gets the selected item ID for the current flow
 */
export const getItemId = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.ITEM_ID);
};

/**
 * Sets the details for the selected item
 */
export const setItemDetails = <T>(details: T): void => {
  localStorage.setItem(STORAGE_KEYS.ITEM_DETAILS, JSON.stringify(details));
};

/**
 * Gets the details for the selected item
 */
export const getItemDetails = <T>(): T | null => {
  const detailsString = localStorage.getItem(STORAGE_KEYS.ITEM_DETAILS);
  if (!detailsString) return null;
  
  try {
    return JSON.parse(detailsString) as T;
  } catch (error) {
    console.error('Error parsing item details from localStorage:', error);
    return null;
  }
};

/**
 * Sets the user information for the flow
 */
export const setUserInfo = <T>(userInfo: T): void => {
  localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
};

/**
 * Gets the user information for the flow
 */
export const getUserInfo = <T>(): T | null => {
  const userInfoString = localStorage.getItem(STORAGE_KEYS.USER_INFO);
  if (!userInfoString) return null;
  
  try {
    return JSON.parse(userInfoString) as T;
  } catch (error) {
    console.error('Error parsing user info from localStorage:', error);
    return null;
  }
};

/**
 * Sets the payment information for the flow
 */
export const setPaymentInfo = <T>(paymentInfo: T): void => {
  localStorage.setItem(STORAGE_KEYS.PAYMENT_INFO, JSON.stringify(paymentInfo));
};

/**
 * Gets the payment information for the flow
 */
export const getPaymentInfo = <T>(): T | null => {
  const paymentInfoString = localStorage.getItem(STORAGE_KEYS.PAYMENT_INFO);
  if (!paymentInfoString) return null;
  
  try {
    return JSON.parse(paymentInfoString) as T;
  } catch (error) {
    console.error('Error parsing payment info from localStorage:', error);
    return null;
  }
};

/**
 * Clears all flow-related data from localStorage
 */
export const clearFlowData = (): void => {
  localStorage.removeItem(STORAGE_KEYS.FLOW_TYPE);
  localStorage.removeItem(STORAGE_KEYS.ITEM_ID);
  localStorage.removeItem(STORAGE_KEYS.ITEM_DETAILS);
  localStorage.removeItem(STORAGE_KEYS.USER_INFO);
  localStorage.removeItem(STORAGE_KEYS.PAYMENT_INFO);
};

/**
 * Gets all flow data as a single object
 */
export const getAllFlowData = (): Record<string, any> => {
  return {
    flowType: getFlowType(),
    itemId: getItemId(),
    itemDetails: getItemDetails(),
    userInfo: getUserInfo(),
    paymentInfo: getPaymentInfo(),
  };
}; 