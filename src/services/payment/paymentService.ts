/**
 * Payment Service
 * 
 * Centralized service for handling payment operations across the application
 * This service ensures consistent handling of payment data and operations
 */

import { setPaymentInfo, setPaymentReference, getPaymentInfo } from '@/utils/dataStorage';
import { PaymentMethod, ProductType, ProductData, UserData } from '@/types/productData';
import { FlowType } from '@/components/common/BookingStepper';

interface PaymentCompletionData {
  paymentMethod: PaymentMethod | string;
  productData: ProductData | any;
  userData: UserData | any;
  paymentReference: string;
  amount?: number;
  additionalData?: any;
}

/**
 * Payment Service class for centralized payment operations
 */
export class PaymentService {
  /**
   * Complete a payment and set all required data
   */
  static completePayment(data: PaymentCompletionData): void {
    console.log('PaymentService: Completing payment', data);
    
    // Extract key data
    const method = typeof data.paymentMethod === 'string' ? data.paymentMethod : String(data.paymentMethod);
    const reference = data.paymentReference || data.additionalData?.paymentId || 'unknown';
    
    // Calculate amount based on product data
    const amount = data.amount || this.calculateAmount(data.productData);
    
    // Set payment reference
    setPaymentReference(reference);
    
    // Save standardized payment info in localStorage
    setPaymentInfo({
      status: 'PAID',
      method: method,
      reference: reference,
      amount: amount,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: data.additionalData || {}
    });
    
    console.log('PaymentService: Payment data saved successfully');
    
    // Log the current state for debugging
    this.logCurrentPaymentInfo();
  }
  
  /**
   * Calculate amount based on product data
   */
  private static calculateAmount(productData: ProductData | any): number {
    if (!productData) return 0;
    
    // If it's already normalized ProductData
    if (productData.type) {
      switch (productData.type) {
        case ProductType.GIFT_CARD:
          return productData.amount || productData.price || 0;
        default:
          return productData.price || 0;
      }
    }
    
    // Handle legacy data formats
    if (typeof productData.amount === 'number') {
      return productData.amount;
    }
    
    if (typeof productData.price === 'number') {
      return productData.price;
    }
    
    // For course with participants
    if (productData.price && productData.numberOfParticipants) {
      const price = typeof productData.price === 'string' 
        ? parseFloat(productData.price) 
        : productData.price;
        
      const participants = typeof productData.numberOfParticipants === 'string' 
        ? parseInt(productData.numberOfParticipants, 10) 
        : productData.numberOfParticipants;
        
      return price * (participants || 1);
    }
    
    return 0;
  }
  
  /**
   * Convert flow type to product type
   */
  static getProductTypeFromFlowType(flowType: FlowType): ProductType {
    switch (flowType) {
      case FlowType.COURSE_BOOKING:
        return ProductType.COURSE;
      case FlowType.GIFT_CARD:
        return ProductType.GIFT_CARD;
      case FlowType.ART_PURCHASE:
        return ProductType.ART_PRODUCT;
      default:
        return ProductType.COURSE;
    }
  }
  
  /**
   * Get correct API endpoint for payment based on method and product type
   */
  static getPaymentEndpoint(method: PaymentMethod | string, productType: ProductType | string): string {
    const paymentMethod = typeof method === 'string' ? method : String(method);
    
    if (paymentMethod === 'swish' || paymentMethod === PaymentMethod.SWISH) {
      return '/api/payments/swish/create';
    } else if (paymentMethod === 'invoice' || paymentMethod === PaymentMethod.INVOICE) {
      return '/api/payments/invoice/create';
    }
    
    throw new Error(`Unsupported payment method: ${paymentMethod}`);
  }
  
  /**
   * Log current payment info from localStorage for debugging
   */
  static logCurrentPaymentInfo(): void {
    const paymentInfo = getPaymentInfo();
    console.log('Current payment info in localStorage:', paymentInfo);
  }
} 