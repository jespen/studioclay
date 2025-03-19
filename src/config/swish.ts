export const swishConfig = {
  // API URLs
  testApiUrl: 'https://mss.cpc.getswish.net/swish-cpcapi/api/v2',
  productionApiUrl: 'https://cpc.getswish.net/swish-cpcapi/api/v2',
  
  // Test phone numbers
  testPhoneNumbers: {
    success: '071234567',    // Returns PAID
    decline: '071234568',    // Returns DECLINED
    error: '071234569',      // Returns ERROR
  },
  
  // Endpoints
  endpoints: {
    createPayment: '/paymentrequests',
    getPayment: '/paymentrequests/{id}',
    cancelPayment: '/paymentrequests/{id}/cancel',
  },
  
  // Request timeouts (in milliseconds)
  timeouts: {
    create: 30000,    // 30 seconds
    status: 10000,    // 10 seconds
    callback: 10000,  // 10 seconds
  },
  
  // Status polling
  polling: {
    maxAttempts: 30,
    interval: 2000,   // 2 seconds
  }
}; 