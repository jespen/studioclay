// Test script för invoice creation felsökning
const testData = {
  "userInfo": {
    "firstName": "Test",
    "lastName": "User", 
    "email": "test@example.com",
    "phoneNumber": "0701234567"
  },
  "invoiceDetails": {
    "address": "Testgatan 1",
    "postalCode": "12345",
    "city": "Stockholm",
    "reference": ""
  },
  "productType": "art_product",
  "productId": "aaedf4b8-509c-4153-9bb0-b886dd749d8d",
  "amount": 600,
  "paymentMethod": "invoice"
};

console.log("Test payload for debugging:", JSON.stringify(testData, null, 2));

// To use with curl:
console.log("\nCurl command:");
console.log(`curl -X POST "https://studioclay.se/api/payments/invoice/create" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(testData)}'`); 