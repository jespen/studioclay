export const SWISH_CONFIG = {
  // Test Environment URLs
  TEST_ENDPOINT: 'https://mss.cpc.getswish.net/swish-cpcapi/api/v2/paymentrequests',
  PRODUCTION_ENDPOINT: 'https://cpc.getswish.net/swish-cpcapi/api/v2/paymentrequests',
  
  // Test merchant details
  TEST_MERCHANT_NUMBER: '1234679304', // Example test merchant number
  
  // Test phone numbers that always work in simulator
  TEST_PHONE_NUMBERS: {
    PAID: '467462000000', // Will always result in PAID
    DECLINED: '467462000001', // Will always result in DECLINED
    ERROR: '467462000002', // Will always result in ERROR
  }
};

// In development, we'll use these test responses to simulate Swish behavior
export const simulateSwishResponse = (phoneNumber: string) => {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  
  // Simulate different responses based on the phone number
  switch (cleanPhone) {
    case SWISH_CONFIG.TEST_PHONE_NUMBERS.PAID:
      return { status: 'PAID' };
    case SWISH_CONFIG.TEST_PHONE_NUMBERS.DECLINED:
      return { status: 'DECLINED' };
    case SWISH_CONFIG.TEST_PHONE_NUMBERS.ERROR:
      return { status: 'ERROR' };
    default:
      // For any other number in development, simulate PAID after a delay
      return { status: 'PAID' };
  }
}; 