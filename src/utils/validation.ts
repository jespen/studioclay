/**
 * Validation utilities for flow data validation
 * These functions ensure data integrity throughout the checkout flow
 */

import { FlowType, GenericStep } from '@/components/common/BookingStepper';
import { FlowStateData } from '@/components/common/FlowStepWrapper';
import { PaymentMethod, ProductType, normalizeProductData, normalizeUserData } from '@/types/productData';

/**
 * Interface for detailed validation result
 */
interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  errors: string[];
}

/**
 * Validates product details based on product type
 */
export function validateProductData(itemDetails: any, flowType: FlowType): ValidationResult {
  const result: ValidationResult = {
    isValid: false,
    missingFields: [],
    errors: []
  };

  if (!itemDetails) {
    result.missingFields.push('product_details');
    result.errors.push('Produktinformation saknas');
    return result;
  }

  // Convert flowType to ProductType
  let productType: ProductType;
  switch (flowType) {
    case FlowType.COURSE_BOOKING:
      productType = ProductType.COURSE;
      break;
    case FlowType.GIFT_CARD:
      productType = ProductType.GIFT_CARD;
      break;
    case FlowType.ART_PURCHASE:
      productType = ProductType.ART_PRODUCT;
      break;
    default:
      productType = ProductType.COURSE;
  }

  // Validate based on product type
  switch (productType) {
    case ProductType.COURSE:
      if (!itemDetails.id) {
        result.missingFields.push('course_id');
        result.errors.push('Kurs-ID saknas');
      }
      if (!itemDetails.title) {
        result.missingFields.push('course_title');
        result.errors.push('Kurstitel saknas');
      }
      if (!itemDetails.price && itemDetails.price !== 0) {
        result.missingFields.push('course_price');
        result.errors.push('Kurspris saknas');
      }
      break;

    case ProductType.GIFT_CARD:
      if (!itemDetails.amount && itemDetails.amount !== 0) {
        result.missingFields.push('gift_card_amount');
        result.errors.push('Presentkortsbelopp saknas');
      }
      if (flowType === FlowType.GIFT_CARD && !itemDetails.recipientName) {
        result.missingFields.push('recipient_name');
        result.errors.push('Mottagarens namn saknas');
      }
      break;

    case ProductType.ART_PRODUCT:
      if (!itemDetails.id) {
        result.missingFields.push('product_id');
        result.errors.push('Produkt-ID saknas');
      }
      if (!itemDetails.title) {
        result.missingFields.push('product_title');
        result.errors.push('Produkttitel saknas');
      }
      if (!itemDetails.price && itemDetails.price !== 0) {
        result.missingFields.push('product_price');
        result.errors.push('Produktpris saknas');
      }
      break;
  }

  result.isValid = result.missingFields.length === 0;
  return result;
}

/**
 * Validates user information
 */
export function validateUserData(userInfo: any): ValidationResult {
  const result: ValidationResult = {
    isValid: false,
    missingFields: [],
    errors: []
  };

  if (!userInfo) {
    result.missingFields.push('user_info');
    result.errors.push('Användarinformation saknas');
    return result;
  }

  if (!userInfo.firstName) {
    result.missingFields.push('first_name');
    result.errors.push('Förnamn saknas');
  }

  if (!userInfo.lastName) {
    result.missingFields.push('last_name');
    result.errors.push('Efternamn saknas');
  }

  if (!userInfo.email) {
    result.missingFields.push('email');
    result.errors.push('E-postadress saknas');
  } else if (!/\S+@\S+\.\S+/.test(userInfo.email)) {
    result.errors.push('E-postadressen är ogiltig');
  }

  if (!userInfo.phone) {
    result.missingFields.push('phone');
    result.errors.push('Telefonnummer saknas');
  }

  result.isValid = result.missingFields.length === 0;
  return result;
}

/**
 * Validates payment information
 */
export function validatePaymentInfo(paymentInfo: any): ValidationResult {
  const result: ValidationResult = {
    isValid: false,
    missingFields: [],
    errors: []
  };

  if (!paymentInfo) {
    result.missingFields.push('payment_info');
    result.errors.push('Betalningsinformation saknas');
    return result;
  }

  if (!paymentInfo.method && !paymentInfo.payment_method) {
    result.missingFields.push('payment_method');
    result.errors.push('Betalningsmetod saknas');
  }

  if (!paymentInfo.status) {
    result.missingFields.push('payment_status');
    result.errors.push('Betalningsstatus saknas');
  }

  if (!paymentInfo.reference && !paymentInfo.payment_reference) {
    result.missingFields.push('payment_reference');
    result.errors.push('Betalningsreferens saknas');
  }

  result.isValid = result.missingFields.length === 0;
  return result;
}

/**
 * Validates invoice details for invoice payment method
 */
export function validateInvoiceDetails(invoiceDetails: any): ValidationResult {
  const result: ValidationResult = {
    isValid: false,
    missingFields: [],
    errors: []
  };

  if (!invoiceDetails) {
    result.missingFields.push('invoice_details');
    result.errors.push('Faktureringsinformation saknas');
    return result;
  }

  if (!invoiceDetails.address) {
    result.missingFields.push('invoice_address');
    result.errors.push('Faktureringsadress saknas');
  }

  if (!invoiceDetails.postalCode) {
    result.missingFields.push('invoice_postal_code');
    result.errors.push('Postnummer saknas');
  }

  if (!invoiceDetails.city) {
    result.missingFields.push('invoice_city');
    result.errors.push('Ort saknas');
  }

  result.isValid = result.missingFields.length === 0;
  return result;
}

/**
 * Primary validation function for flow data based on current step
 */
export function validateFlowData(
  data: FlowStateData,
  step: GenericStep,
  options?: { isStrict?: boolean; detailedResult?: boolean }
): ValidationResult | boolean {
  const result: ValidationResult = {
    isValid: true,
    missingFields: [],
    errors: []
  };
  
  const isStrict = options?.isStrict ?? true;

  // Always validate itemDetails for any step
  if (step >= GenericStep.ITEM_SELECTION) {
    const productValidation = validateProductData(data.itemDetails, data.flowType);
    if (!productValidation.isValid) {
      result.isValid = false;
      result.missingFields.push(...productValidation.missingFields);
      result.errors.push(...productValidation.errors);
      
      if (isStrict) {
        // Log validation errors for debugging
        console.warn('Product validation failed:', productValidation);
        return options?.detailedResult ? result : false;
      }
    }
  }

  // Validate user info for steps that require it
  if (step >= GenericStep.USER_INFO) {
    const userValidation = validateUserData(data.userInfo);
    if (!userValidation.isValid) {
      result.isValid = false;
      result.missingFields.push(...userValidation.missingFields);
      result.errors.push(...userValidation.errors);
      
      if (isStrict) {
        console.warn('User validation failed:', userValidation);
        return options?.detailedResult ? result : false;
      }
    }
  }

  // Validate payment info for steps that require it
  if (step >= GenericStep.PAYMENT) {
    // Payment validation is only required for confirmation step
    if (step === GenericStep.CONFIRMATION) {
      const paymentValidation = validatePaymentInfo(data.paymentInfo);
      if (!paymentValidation.isValid) {
        result.isValid = false;
        result.missingFields.push(...paymentValidation.missingFields);
        result.errors.push(...paymentValidation.errors);
        
        if (isStrict) {
          console.warn('Payment validation failed:', paymentValidation);
          return options?.detailedResult ? result : false;
        }
      }
    }
  }

  // Return detailed result or boolean based on options
  return options?.detailedResult ? result : result.isValid;
}

/**
 * Compatibility function for FlowStepWrapper
 * This allows using the new validation system with the existing wrapper
 */
export function createFlowValidatorFunction(
  step: GenericStep,
  options?: { isStrict?: boolean }
): (data: FlowStateData) => boolean {
  return (data: FlowStateData) => {
    // Log validation attempt for debugging
    console.log(`Validating data for step ${step}, flow ${data.flowType}:`, {
      hasItemDetails: Boolean(data.itemDetails),
      hasUserInfo: Boolean(data.userInfo),
      hasPaymentInfo: Boolean(data.paymentInfo)
    });
    
    return validateFlowData(data, step, options) as boolean;
  };
} 