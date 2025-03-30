/**
 * dataStorage.ts
 * Centraliserad datahantering för localStorage, sessionStorage
 * och annan klientdatapersistens.
 */

import { FlowType } from '@/components/common/BookingStepper';

/**
 * Enum som definierar kategorier för datalagring
 * Används för att gruppera relaterade lagringsnycklar
 */
export enum DataCategory {
  FLOW = 'flow',        // Checkout flow data
  SYSTEM = 'system',    // Systeminställningar (t.ex. konstruktionsbanner)
  AUTH = 'auth',        // Autentiseringsrelaterad data
  UI = 'ui'             // UI-preferenser
}

/**
 * Alla lagringsnycklar som används i applikationen
 * Organiserade efter kategori för bättre struktur
 */
export const STORAGE_KEYS = {
  [DataCategory.FLOW]: {
    FLOW_TYPE: 'flow_type',
    ITEM_ID: 'item_id',
    ITEM_DETAILS: 'item_details',
    USER_INFO: 'user_info',
    PAYMENT_INFO: 'payment_info',
    GIFT_CARD_DETAILS: 'gift_card_details',
    PAYMENT_REFERENCE: 'payment_reference',
    BOOKING_REFERENCE: 'booking_reference',
    
    // Äldre nycklar för bakåtkompatibilitet
    LEGACY_USER_INFO: 'userInfo',
    LEGACY_COURSE_DETAIL: 'courseDetail',
    LEGACY_PAYMENT_DETAILS: 'paymentDetails',
    LEGACY_PAYMENT_INFO: 'paymentInfo',
    LEGACY_PAYMENT_REFERENCE: 'currentPaymentReference',
    LEGACY_GIFT_CARD_DETAILS: 'giftCardDetails',
    LEGACY_BOOKING_REFERENCE: 'bookingReference',
    LEGACY_GIFT_CARD_AMOUNT: 'giftCardAmount',
    LEGACY_GIFT_CARD_TYPE: 'giftCardType',
  },
  
  [DataCategory.SYSTEM]: {
    REDIRECT_ATTEMPTS: 'redirectAttempts',
    CONSTRUCTION_BANNER: 'constructionBannerDismissed'
  },
  
  // Ytterligare kategorier kan läggas till här
};

/**
 * Hjälpfunktion för att hämta en nyckel från en kategori
 */
const getCategoryKey = (category: DataCategory, key: string): string => {
  // @ts-ignore - ignorera typfel då vi använder dynamisk åtkomst
  return STORAGE_KEYS[category][key];
};

/**
 * Generisk funktion för att spara data i localStorage
 */
export const setStorageItem = <T>(category: DataCategory, key: string, value: T): void => {
  const storageKey = getCategoryKey(category, key);
  localStorage.setItem(storageKey, JSON.stringify(value));
};

/**
 * Generisk funktion för att hämta data från localStorage
 */
export const getStorageItem = <T>(category: DataCategory, key: string, defaultValue: T | null = null): T | null => {
  const storageKey = getCategoryKey(category, key);
  try {
    const item = localStorage.getItem(storageKey);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error getting storage item ${category}/${key}:`, error);
    return defaultValue;
  }
};

/**
 * Funktion för att radera data från en specifik kategori
 */
export const clearCategoryData = (category: DataCategory): void => {
  // @ts-ignore - ignorera typfel då vi använder dynamisk åtkomst
  Object.values(STORAGE_KEYS[category]).forEach(key => {
    localStorage.removeItem(key as string);
    // Om nyckeln också kan finnas i sessionStorage
    if (category === DataCategory.FLOW) {
      sessionStorage.removeItem(key as string);
    }
  });
};

/**
 * Funktion för att radera all data
 */
export const clearAllData = (): void => {
  Object.values(DataCategory).forEach(category => {
    clearCategoryData(category as DataCategory);
  });
};

// === FLOW-SPECIFIKA FUNKTIONER ===

/**
 * Sätt aktuell flödestyp
 */
export const setFlowType = (flowType: FlowType): void => {
  localStorage.setItem(STORAGE_KEYS[DataCategory.FLOW].FLOW_TYPE, flowType);
};

/**
 * Hämta aktuell flödestyp
 */
export const getFlowType = (): FlowType | null => {
  const flowType = localStorage.getItem(STORAGE_KEYS[DataCategory.FLOW].FLOW_TYPE);
  return flowType as FlowType || null;
};

/**
 * Sätt valt objekt-ID för aktuellt flöde
 */
export const setItemId = (itemId: string): void => {
  localStorage.setItem(STORAGE_KEYS[DataCategory.FLOW].ITEM_ID, itemId);
};

/**
 * Hämta valt objekt-ID för aktuellt flöde
 */
export const getItemId = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS[DataCategory.FLOW].ITEM_ID);
};

/**
 * Sätt detaljer för valt objekt
 */
export const setItemDetails = <T>(details: T): void => {
  localStorage.setItem(STORAGE_KEYS[DataCategory.FLOW].ITEM_DETAILS, JSON.stringify(details));
  
  // För bakåtkompatibilitet (om det är en kurs)
  if (details && typeof details === 'object' && 'id' in details) {
    localStorage.setItem(STORAGE_KEYS[DataCategory.FLOW].LEGACY_COURSE_DETAIL, JSON.stringify(details));
  }
};

/**
 * Hämta detaljer för valt objekt
 */
export const getItemDetails = <T>(): T | null => {
  const detailsString = localStorage.getItem(STORAGE_KEYS[DataCategory.FLOW].ITEM_DETAILS);
  if (!detailsString) {
    // Försök med äldre format för bakåtkompatibilitet
    const legacyDetails = localStorage.getItem(STORAGE_KEYS[DataCategory.FLOW].LEGACY_COURSE_DETAIL);
    if (legacyDetails) {
      try {
        const parsedDetails = JSON.parse(legacyDetails);
        // Spara i nytt format för framtida användning
        setItemDetails(parsedDetails);
        return parsedDetails as T;
      } catch (error) {
        console.error('Error parsing legacy item details:', error);
      }
    }
    return null;
  }
  
  try {
    return JSON.parse(detailsString) as T;
  } catch (error) {
    console.error('Error parsing item details from localStorage:', error);
    return null;
  }
};

/**
 * Sätt användarinformation för flödet
 */
export const setUserInfo = <T>(userInfo: T): void => {
  localStorage.setItem(STORAGE_KEYS[DataCategory.FLOW].USER_INFO, JSON.stringify(userInfo));
  
  // För bakåtkompatibilitet
  localStorage.setItem(STORAGE_KEYS[DataCategory.FLOW].LEGACY_USER_INFO, JSON.stringify(userInfo));
};

/**
 * Hämta användarinformation för flödet
 */
export const getUserInfo = <T>(): T | null => {
  const userInfoString = localStorage.getItem(STORAGE_KEYS[DataCategory.FLOW].USER_INFO);
  if (!userInfoString) {
    // Försök med äldre format för bakåtkompatibilitet
    const legacyUserInfo = localStorage.getItem(STORAGE_KEYS[DataCategory.FLOW].LEGACY_USER_INFO);
    if (legacyUserInfo) {
      try {
        const parsedUserInfo = JSON.parse(legacyUserInfo);
        // Spara i nytt format för framtida användning
        setUserInfo(parsedUserInfo);
        return parsedUserInfo as T;
      } catch (error) {
        console.error('Error parsing legacy user info:', error);
      }
    }
    return null;
  }
  
  try {
    return JSON.parse(userInfoString) as T;
  } catch (error) {
    console.error('Error parsing user info from localStorage:', error);
    return null;
  }
};

/**
 * Sätt betalningsinformation för flödet
 */
export const setPaymentInfo = <T>(paymentInfo: T): void => {
  localStorage.setItem(STORAGE_KEYS[DataCategory.FLOW].PAYMENT_INFO, JSON.stringify(paymentInfo));
  
  // För bakåtkompatibilitet
  localStorage.setItem(STORAGE_KEYS[DataCategory.FLOW].LEGACY_PAYMENT_INFO, JSON.stringify(paymentInfo));
};

/**
 * Hämta betalningsinformation för flödet
 */
export const getPaymentInfo = <T>(): T | null => {
  const paymentInfoString = localStorage.getItem(STORAGE_KEYS[DataCategory.FLOW].PAYMENT_INFO);
  if (!paymentInfoString) {
    // Försök med äldre format för bakåtkompatibilitet
    const legacyPaymentInfo = localStorage.getItem(STORAGE_KEYS[DataCategory.FLOW].LEGACY_PAYMENT_INFO);
    if (legacyPaymentInfo) {
      try {
        const parsedPaymentInfo = JSON.parse(legacyPaymentInfo);
        // Spara i nytt format för framtida användning
        setPaymentInfo(parsedPaymentInfo);
        return parsedPaymentInfo as T;
      } catch (error) {
        console.error('Error parsing legacy payment info:', error);
      }
    }
    
    // Försök med ännu äldre format
    const legacyPaymentDetails = localStorage.getItem(STORAGE_KEYS[DataCategory.FLOW].LEGACY_PAYMENT_DETAILS);
    if (legacyPaymentDetails) {
      try {
        const details = JSON.parse(legacyPaymentDetails);
        const paymentInfo = {
          status: details.paymentStatus || 'completed',
          amount: details.amount || 0,
          payment_method: details.method || 'unknown',
          payment_date: details.paymentDate || new Date().toISOString(),
          reference: details.paymentReference || ''
        };
        
        // Spara i nytt format för framtida användning
        setPaymentInfo(paymentInfo);
        return paymentInfo as unknown as T;
      } catch (error) {
        console.error('Error parsing legacy payment details:', error);
      }
    }
    
    return null;
  }
  
  try {
    return JSON.parse(paymentInfoString) as T;
  } catch (error) {
    console.error('Error parsing payment info from localStorage:', error);
    return null;
  }
};

/**
 * Sätt presentkortsdetaljer för flödet
 */
export const setGiftCardDetails = <T>(details: T): void => {
  localStorage.setItem(STORAGE_KEYS[DataCategory.FLOW].GIFT_CARD_DETAILS, JSON.stringify(details));
  
  // För bakåtkompatibilitet
  localStorage.setItem(STORAGE_KEYS[DataCategory.FLOW].LEGACY_GIFT_CARD_DETAILS, JSON.stringify(details));
};

/**
 * Hämta presentkortsdetaljer för flödet
 */
export const getGiftCardDetails = <T>(): T | null => {
  const detailsString = localStorage.getItem(STORAGE_KEYS[DataCategory.FLOW].GIFT_CARD_DETAILS);
  if (!detailsString) {
    // För bakåtkompatibilitet: Kontrollera gammal nyckel
    const legacyDetails = localStorage.getItem(STORAGE_KEYS[DataCategory.FLOW].LEGACY_GIFT_CARD_DETAILS);
    if (legacyDetails) {
      try {
        const parsedDetails = JSON.parse(legacyDetails);
        // Spara i nytt format för framtida användning
        setGiftCardDetails(parsedDetails);
        return parsedDetails as T;
      } catch (error) {
        console.error('Error parsing legacy gift card details:', error);
      }
    }
    
    // Kontrollera även sessionStorage
    const sessionDetails = sessionStorage.getItem(STORAGE_KEYS[DataCategory.FLOW].LEGACY_GIFT_CARD_DETAILS);
    if (sessionDetails) {
      try {
        const parsedDetails = JSON.parse(sessionDetails);
        // Spara i nytt format för framtida användning
        setGiftCardDetails(parsedDetails);
        return parsedDetails as T;
      } catch (error) {
        console.error('Error parsing session gift card details:', error);
      }
    }
    
    return null;
  }
  
  try {
    return JSON.parse(detailsString) as T;
  } catch (error) {
    console.error('Error parsing gift card details from localStorage:', error);
    return null;
  }
};

/**
 * Sätt betalningsreferens för aktuell betalning
 */
export const setPaymentReference = (reference: string): void => {
  localStorage.setItem(STORAGE_KEYS[DataCategory.FLOW].PAYMENT_REFERENCE, reference);
  
  // För bakåtkompatibilitet
  if (reference) {
    localStorage.setItem(STORAGE_KEYS[DataCategory.FLOW].LEGACY_PAYMENT_REFERENCE, reference);
  } else {
    // Om vi rensar, ta även bort äldre nyckel
    localStorage.removeItem(STORAGE_KEYS[DataCategory.FLOW].LEGACY_PAYMENT_REFERENCE);
  }
};

/**
 * Hämta betalningsreferens för aktuell betalning
 */
export const getPaymentReference = (): string | null => {
  const reference = localStorage.getItem(STORAGE_KEYS[DataCategory.FLOW].PAYMENT_REFERENCE);
  if (!reference) {
    // För bakåtkompatibilitet: Kontrollera gammal nyckel
    const legacyReference = localStorage.getItem(STORAGE_KEYS[DataCategory.FLOW].LEGACY_PAYMENT_REFERENCE);
    if (legacyReference) {
      // Spara i nytt format för framtida användning
      setPaymentReference(legacyReference);
      return legacyReference;
    }
  }
  return reference;
};

/**
 * Sätt bokningsreferens för aktuell bokning
 */
export const setBookingReference = (reference: string): void => {
  localStorage.setItem(STORAGE_KEYS[DataCategory.FLOW].BOOKING_REFERENCE, reference);
  
  // För bakåtkompatibilitet
  if (reference) {
    localStorage.setItem(STORAGE_KEYS[DataCategory.FLOW].LEGACY_BOOKING_REFERENCE, reference);
  } else {
    // Om vi rensar, ta även bort äldre nyckel
    localStorage.removeItem(STORAGE_KEYS[DataCategory.FLOW].LEGACY_BOOKING_REFERENCE);
  }
};

/**
 * Hämta bokningsreferens för aktuell bokning
 */
export const getBookingReference = (): string | null => {
  const reference = localStorage.getItem(STORAGE_KEYS[DataCategory.FLOW].BOOKING_REFERENCE);
  if (!reference) {
    // För bakåtkompatibilitet: Kontrollera gammal nyckel
    const legacyReference = localStorage.getItem(STORAGE_KEYS[DataCategory.FLOW].LEGACY_BOOKING_REFERENCE);
    if (legacyReference) {
      // Spara i nytt format för framtida användning
      setBookingReference(legacyReference);
      return legacyReference;
    }
  }
  return reference;
};

/**
 * Rensa all flödesrelaterad data från localStorage och sessionStorage
 */
export const clearFlowData = (): void => {
  clearCategoryData(DataCategory.FLOW);
};

/**
 * Äldre funktion för bakåtkompatibilitet
 * Alias för clearFlowData()
 */
export const cleanupCheckoutFlow = (): void => {
  clearFlowData();
};

/**
 * Hämta all flödesdata som ett objekt
 */
export const getAllFlowData = (): Record<string, any> => {
  return {
    flowType: getFlowType(),
    itemId: getItemId(),
    itemDetails: getItemDetails(),
    userInfo: getUserInfo(),
    paymentInfo: getPaymentInfo(),
    giftCardDetails: getGiftCardDetails(),
    paymentReference: getPaymentReference(),
    bookingReference: getBookingReference(),
  };
}; 