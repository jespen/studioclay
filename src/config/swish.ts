export const swishConfig = {
  // API URLs
  testApiUrl: 'https://mss.cpc.getswish.net/swish-cpcapi/api/v2',
  productionApiUrl: 'https://cpc.getswish.net/swish-cpcapi/api/v2',
  
  // Endpoints
  endpoints: {
    createPayment: '/paymentrequests',
    getPayment: '/paymentrequests',
    cancelPayment: '/paymentrequests/cancel',
  },
  
  // Request timeouts (in milliseconds)
  timeouts: {
    create: 30000,    // 30 seconds
    status: 10000,    // 10 seconds
    callback: 10000,  // 10 seconds
  }
}; 