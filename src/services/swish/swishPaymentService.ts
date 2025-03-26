import { v4 as uuidv4 } from 'uuid';
import { PaymentStatus, PAYMENT_STATUS } from './types';

interface SwishPaymentRequest {
  phone_number: string;
  payment_method: 'swish';
  product_type: 'course';
  product_id: string;
  amount: number;
  quantity: number;
  user_info: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    numberOfParticipants: string;
  };
}

interface SwishPaymentResponse {
  success: boolean;
  reference: string | null;
}

export class SwishPaymentService {
  private static instance: SwishPaymentService;

  private constructor() {}

  public static getInstance(): SwishPaymentService {
    if (!SwishPaymentService.instance) {
      SwishPaymentService.instance = new SwishPaymentService();
    }
    return SwishPaymentService.instance;
  }

  // Format phone number for Swish API
  public formatSwishPhone(phone: string): string {
    // Remove any spaces, dashes or other characters
    const cleanPhone = phone.replace(/[- ]/g, '');
    // Remove leading 0 and add 46 prefix
    return '46' + cleanPhone.substring(1);
  }

  // Create a Swish payment request
  public async createSwishPayment(
    phoneNumber: string,
    productId: string,
    amount: number,
    quantity: number,
    userInfo: SwishPaymentRequest['user_info']
  ): Promise<SwishPaymentResponse> {
    try {
      const formattedPhone = this.formatSwishPhone(phoneNumber);
      console.log('Creating Swish payment with formatted phone number:', formattedPhone);
      
      // Generate a unique idempotency key
      const idempotencyKey = uuidv4();
      
      const response = await fetch('/api/payments/swish/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          phone_number: formattedPhone,
          payment_method: 'swish',
          product_type: 'course',
          product_id: productId,
          amount,
          quantity,
          user_info: userInfo
        }),
      });

      const result = await response.json();
      console.log('Payment API response:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create payment');
      }

      // Extract reference from the nested data structure
      const reference = result.data?.reference;
      
      if (!reference) {
        throw new Error('No payment reference received');
      }

      // Store in localStorage for persistence
      localStorage.setItem('currentPaymentReference', reference);
      localStorage.setItem('currentPaymentIdempotencyKey', idempotencyKey);
      
      return { success: true, reference };
    } catch (error) {
      console.error('Error in payment creation:', error);
      return { success: false, reference: null };
    }
  }

  // Check payment status
  public async checkPaymentStatus(reference: string): Promise<PaymentStatus> {
    console.log('checkPaymentStatus called with reference:', reference);
    
    if (!reference || reference === 'undefined' || reference === 'null') {
      console.error('No valid payment reference available to check status');
      return PAYMENT_STATUS.ERROR;
    }
    
    try {
      console.log(`Checking status for payment: ${reference}`);
      const response = await fetch(`/api/payments/status/${reference}`);
      const data = await response.json();
      
      console.log('Status check response:', data);
      
      if (!data.success) {
        console.error('Status API reported error:', data);
        return PAYMENT_STATUS.ERROR;
      }
      
      if (data.data?.booking?.reference) {
        console.log('Booking reference received:', data.data.booking.reference);
        localStorage.setItem('bookingReference', data.data.booking.reference);
      }
      
      const status = data.data?.payment?.status as string;
      console.log(`Payment status: ${status}`);
      
      if (!status) {
        console.error('No payment status found in response');
        return PAYMENT_STATUS.ERROR;
      }
      
      switch (status.toUpperCase()) {
        case 'PAID':
          return PAYMENT_STATUS.PAID;
        case 'DECLINED':
          return PAYMENT_STATUS.DECLINED;
        case 'ERROR':
          return PAYMENT_STATUS.ERROR;
        case 'CREATED':
          return PAYMENT_STATUS.CREATED;
        default:
          return PAYMENT_STATUS.CREATED;
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      return PAYMENT_STATUS.ERROR;
    }
  }
} 