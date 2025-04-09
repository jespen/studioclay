/**
 * Unified data models for all product types and payment flows
 * This file defines the core data structures used throughout the application
 * to ensure consistent handling of different product types.
 */

import { PaymentStatus } from '@/constants/statusCodes';

/**
 * Product types supported by the system
 */
export enum ProductType {
  COURSE = 'course',
  GIFT_CARD = 'gift_card',
  ART_PRODUCT = 'art_product'
}

/**
 * Payment methods supported by the system
 */
export enum PaymentMethod {
  SWISH = 'swish',
  INVOICE = 'invoice'
}

/**
 * Common user information structure used across all flows
 */
export interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  numberOfParticipants?: number;
}

/**
 * Invoice details for invoice payment method
 */
export interface InvoiceData {
  address: string;
  postalCode: string;
  city: string;
  reference: string;
}

/**
 * Base product data interface - common fields for all product types
 */
export interface BaseProductData {
  id: string;
  type: ProductType;
  title: string;
  price: number;
  currency?: string;
}

/**
 * Course-specific product data
 */
export interface CourseProductData extends BaseProductData {
  type: ProductType.COURSE;
  startDate: string;
  endDate: string;
  location: string;
  maxParticipants?: number;
  currentParticipants?: number;
  description?: string;
}

/**
 * Gift card-specific product data
 */
export interface GiftCardProductData extends BaseProductData {
  type: ProductType.GIFT_CARD;
  amount: number;
  recipientName: string;
  recipientEmail: string;
  message?: string;
  expiresAt?: string;
  giftCardType?: 'digital' | 'physical';
}

/**
 * Art product-specific data
 */
export interface ArtProductData extends BaseProductData {
  type: ProductType.ART_PRODUCT;
  description?: string;
  image?: string;
  stockQuantity?: number;
  category?: string;
}

/**
 * Union type for all product types
 */
export type ProductData = CourseProductData | GiftCardProductData | ArtProductData;

/**
 * Base payment request structure
 */
export interface BasePaymentRequest {
  productData: ProductData;
  userData: UserData;
  paymentMethod: PaymentMethod;
  amount: number;
}

/**
 * Swish-specific payment request
 */
export interface SwishPaymentRequest extends BasePaymentRequest {
  paymentMethod: PaymentMethod.SWISH;
  phoneNumber: string;
}

/**
 * Invoice-specific payment request
 */
export interface InvoicePaymentRequest extends BasePaymentRequest {
  paymentMethod: PaymentMethod.INVOICE;
  invoiceData: InvoiceData;
}

/**
 * Union type for all payment requests
 */
export type PaymentRequest = SwishPaymentRequest | InvoicePaymentRequest;

/**
 * Payment response structure
 */
export interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  paymentReference?: string;
  status: PaymentStatus;
  errorMessage?: string;
}

/**
 * Helper function to determine product type from data
 */
export function getProductType(data: any): ProductType {
  if (!data) return ProductType.COURSE; // Default fallback
  
  // Check for specific properties to determine type
  if (data.amount && (data.recipientName || data.recipientEmail)) {
    return ProductType.GIFT_CARD;
  }
  
  if (data.stockQuantity !== undefined || data.category) {
    return ProductType.ART_PRODUCT;
  }
  
  if (data.startDate || data.maxParticipants !== undefined) {
    return ProductType.COURSE;
  }
  
  // Check explicit type field if present
  if (data.type) {
    if (data.type === 'gift_card' || data.type === ProductType.GIFT_CARD) {
      return ProductType.GIFT_CARD;
    }
    if (data.type === 'art_product' || data.type === ProductType.ART_PRODUCT) {
      return ProductType.ART_PRODUCT;
    }
    if (data.type === 'course' || data.type === ProductType.COURSE) {
      return ProductType.COURSE;
    }
  }
  
  // Check flow/product type mapping from legacy data
  if (data.productType) {
    if (data.productType === 'gift_card' || data.productType === 'gift_card_flow') {
      return ProductType.GIFT_CARD;
    }
    if (data.productType === 'art_product' || data.productType === 'art_purchase') {
      return ProductType.ART_PRODUCT;
    }
    if (data.productType === 'course' || data.productType === 'course_booking') {
      return ProductType.COURSE;
    }
  }
  
  return ProductType.COURSE; // Default fallback
}

/**
 * Convert any product data to the standardized ProductData format
 */
export function normalizeProductData(data: any): ProductData {
  const productType = getProductType(data);
  
  const baseData: BaseProductData = {
    id: data.id || data.productId || '',
    type: productType,
    title: data.title || '',
    price: typeof data.price === 'number' ? data.price : 
           typeof data.amount === 'number' ? data.amount : 0,
    currency: data.currency || 'SEK'
  };
  
  switch (productType) {
    case ProductType.GIFT_CARD:
      return {
        ...baseData,
        type: ProductType.GIFT_CARD,
        amount: typeof data.amount === 'number' ? data.amount : 
                typeof data.price === 'number' ? data.price : 0,
        recipientName: data.recipientName || '',
        recipientEmail: data.recipientEmail || '',
        message: data.message || '',
        expiresAt: data.expiresAt,
        giftCardType: data.giftCardType || 'digital'
      };
      
    case ProductType.ART_PRODUCT:
      return {
        ...baseData,
        type: ProductType.ART_PRODUCT,
        description: data.description || '',
        image: data.image || '',
        stockQuantity: data.stockQuantity || 0,
        category: data.category || ''
      };
      
    case ProductType.COURSE:
    default:
      return {
        ...baseData,
        type: ProductType.COURSE,
        startDate: data.startDate || data.start_date || new Date().toISOString(),
        endDate: data.endDate || data.end_date || new Date().toISOString(),
        location: data.location || 'Studio Clay',
        maxParticipants: data.maxParticipants || data.max_participants || 0,
        currentParticipants: data.currentParticipants || data.current_participants || 0,
        description: data.description || ''
      };
  }
}

/**
 * Normalize user data from various sources
 */
export function normalizeUserData(data: any): UserData {
  if (!data) return {
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  };
  
  return {
    firstName: data.firstName || data.first_name || '',
    lastName: data.lastName || data.last_name || '',
    email: data.email || '',
    phone: data.phone || data.phoneNumber || '',
    numberOfParticipants: data.numberOfParticipants ? 
      (typeof data.numberOfParticipants === 'string' ? 
       parseInt(data.numberOfParticipants, 10) : data.numberOfParticipants) : undefined
  };
}

/**
 * Create a complete payment request from data
 */
export function createPaymentRequest(data: any): PaymentRequest {
  const productData = normalizeProductData(data.productData || data.itemDetails || data);
  const userData = normalizeUserData(data.userData || data.userInfo || data.user || {});
  const paymentMethod = data.paymentMethod === 'invoice' ? 
    PaymentMethod.INVOICE : PaymentMethod.SWISH;
    
  const baseRequest: BasePaymentRequest = {
    productData,
    userData,
    paymentMethod,
    amount: productData.price || (productData.type === ProductType.GIFT_CARD ? (productData as GiftCardProductData).amount : 0)
  };
  
  if (paymentMethod === PaymentMethod.INVOICE) {
    const invoiceData = data.invoiceData || data.invoiceDetails || {};
    return {
      ...baseRequest,
      paymentMethod: PaymentMethod.INVOICE,
      invoiceData: {
        address: invoiceData.address || '',
        postalCode: invoiceData.postalCode || '',
        city: invoiceData.city || '',
        reference: invoiceData.reference || ''
      }
    };
  } else {
    return {
      ...baseRequest,
      paymentMethod: PaymentMethod.SWISH,
      phoneNumber: data.phoneNumber || data.phone || userData.phone || ''
    };
  }
} 