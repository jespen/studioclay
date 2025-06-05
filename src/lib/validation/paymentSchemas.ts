/**
 * PaymentSchemas.ts
 * 
 * Detta är centrala valideringsschemat för all betalningsdata.
 * ALL betalningsdata måste valideras genom dessa scheman innan de kan processas.
 */

import { z } from 'zod';
import { 
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PRODUCT_TYPES,
  type PaymentMethod,
  type PaymentStatus,
  type ProductType,
  isValidPaymentMethod,
  isValidProductType
} from '@/constants/statusCodes';
import { logDebug } from "@/lib/logging";

/**
 * User information schema
 */
export const UserInfoSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  numberOfParticipants: z.union([z.string(), z.number()]).optional(), // Optional för shop/presentkort
  specialRequirements: z.string().optional()
});

export type UserInfo = z.infer<typeof UserInfoSchema>;

/**
 * Invoice details schema
 */
export const InvoiceDetailsSchema = z.object({
  address: z.string().min(1, "Address is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  city: z.string().min(1, "City is required"),
  reference: z.string().optional()
});

export type InvoiceDetails = z.infer<typeof InvoiceDetailsSchema>;

/**
 * Gift card details schema
 */
export const GiftCardDetailsSchema = z.object({
  recipientEmail: z.union([
    z.string().email("Recipient email must be valid"),
    z.literal(""),
    z.null()
  ]).optional(),
  recipientName: z.string().min(1, "Recipient name is required"),
  message: z.string().optional()
});

export type GiftCardDetails = z.infer<typeof GiftCardDetailsSchema>;

/**
 * Base payment request schema - common fields for all payment types
 */
export const BasePaymentRequestSchema = z.object({
  paymentMethod: z.enum([PAYMENT_METHODS.SWISH, PAYMENT_METHODS.INVOICE] as const),
  productId: z.string().min(1, "Product ID is required"),
  productType: z.enum([PRODUCT_TYPES.COURSE, PRODUCT_TYPES.GIFT_CARD, PRODUCT_TYPES.ART_PRODUCT] as const),
  amount: z.number().min(1, "Amount must be greater than 0"),
  quantity: z.number().optional().default(1),
  userInfo: UserInfoSchema
});

/**
 * Schema for invoice payment requests
 */
export const InvoicePaymentRequestSchema = BasePaymentRequestSchema.extend({
  paymentMethod: z.literal(PAYMENT_METHODS.INVOICE),
  invoiceDetails: InvoiceDetailsSchema
});

export type InvoicePaymentRequest = z.infer<typeof InvoicePaymentRequestSchema>;

/**
 * Schema for Swish payment requests
 */
export const SwishPaymentRequestSchema = BasePaymentRequestSchema.extend({
  paymentMethod: z.literal(PAYMENT_METHODS.SWISH)
});

export type SwishPaymentRequest = z.infer<typeof SwishPaymentRequestSchema>;

/**
 * Schema for gift card payment requests (can be either Swish or invoice)
 */
export const GiftCardPaymentRequestSchema = z.discriminatedUnion("paymentMethod", [
  InvoicePaymentRequestSchema.extend({
    productType: z.literal(PRODUCT_TYPES.GIFT_CARD),
    giftCardDetails: GiftCardDetailsSchema
  }),
  SwishPaymentRequestSchema.extend({
    productType: z.literal(PRODUCT_TYPES.GIFT_CARD),
    giftCardDetails: GiftCardDetailsSchema
  })
]);

export type GiftCardPaymentRequest = z.infer<typeof GiftCardPaymentRequestSchema>;

/**
 * Payment request schema - union of all payment types
 */
export const PaymentRequestSchema = z.discriminatedUnion("paymentMethod", [
  InvoicePaymentRequestSchema,
  SwishPaymentRequestSchema
]);

export type PaymentRequest = z.infer<typeof PaymentRequestSchema>;

/**
 * Validation result interface for consistent error handling
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
}

/**
 * Validates a payment request based on the product type and payment method
 * @returns ValidationResult with success status, validated data, and any errors
 */
export function validatePaymentRequest(data: unknown, expectedMethod?: string): ValidationResult<PaymentRequest> {
  try {
    // First, parse with the base schema to get common fields
    const baseFields = BasePaymentRequestSchema.safeParse(data);
    
    if (!baseFields.success) {
      return {
        success: false,
        errors: baseFields.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      };
    }
    
    // Check if the payment method matches what we expect
    if (expectedMethod && baseFields.data.paymentMethod !== expectedMethod) {
      return {
        success: false,
        errors: [`Expected payment method ${expectedMethod}, but got ${baseFields.data.paymentMethod}`]
      };
    }
    
    // Now validate with the specific schema based on payment method
    let validatedData: PaymentRequest;
    
    if (baseFields.data.paymentMethod === PAYMENT_METHODS.INVOICE) {
      const result = InvoicePaymentRequestSchema.safeParse(data);
      if (!result.success) {
        return {
          success: false,
          errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        };
      }
      validatedData = result.data;
    } else if (baseFields.data.paymentMethod === PAYMENT_METHODS.SWISH) {
      const result = SwishPaymentRequestSchema.safeParse(data);
      if (!result.success) {
        return {
          success: false,
          errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        };
      }
      validatedData = result.data;
    } else {
      return {
        success: false,
        errors: [`Unsupported payment method: ${(data as any)?.paymentMethod}`]
      };
    }
    
    // If this is a gift card, validate gift card details
    if (validatedData.productType === PRODUCT_TYPES.GIFT_CARD) {
      const giftCardDetails = (data as any)?.giftCardDetails;
      if (!giftCardDetails) {
        return {
          success: false,
          errors: ["Gift card details are required for gift card payments"]
        };
      }
      
      const giftCardResult = GiftCardDetailsSchema.safeParse(giftCardDetails);
      if (!giftCardResult.success) {
        return {
          success: false,
          errors: giftCardResult.error.errors.map(err => `giftCardDetails.${err.path.join('.')}: ${err.message}`)
        };
      }
      
      // Add the gift card details to the validated data
      (validatedData as any).giftCardDetails = giftCardResult.data;
    }
    
    logDebug("Payment request validated successfully", { data: validatedData });
    return {
      success: true,
      data: validatedData,
      errors: []
    };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown validation error']
    };
  }
}

/**
 * Maps between legacy and new product type formats
 */
export function mapProductType(productType: string): ProductType {
  switch (productType.toLowerCase()) {
    case "course":
    case "course_booking":
      return PRODUCT_TYPES.COURSE;
    case "gift_card":
    case "giftcard":
      return PRODUCT_TYPES.GIFT_CARD;
    case "art_product":
    case "artproduct":
      return PRODUCT_TYPES.ART_PRODUCT;
    default:
      throw new Error(`Unknown product type: ${productType}`);
  }
} 