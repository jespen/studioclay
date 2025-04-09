# Swish Testing Guide

## Prerequisites

### Swish Test Environment Setup

1. **Environment Variables Configuration**
   - Set `NEXT_PUBLIC_SWISH_TEST_MODE=true` in your environment
   - Ensure `SWISH_TEST_PAYEE_ALIAS` is set (standard test number: 1231181189)
   - Verify certificate paths are correctly configured:
     - `SWISH_TEST_CERT_PATH`
     - `SWISH_TEST_KEY_PATH`
     - `SWISH_TEST_CA_PATH`

2. **Swish Test App Installation**
   - Install "Swish Handel Test" app from:
     - [iOS App Store](https://apps.apple.com/se/app/swish-handel-test/id1464046646)
     - [Google Play Store](https://play.google.com/store/apps/details?id=se.bankgirot.swish.testmerchant)

3. **Test BankID Setup**
   - Install [Test BankID app](https://www.bankid.com/en/utvecklare/test)
   - Use test personal number: 121212-1212
   - Test code for authentication: 123456

4. **Test Phone Numbers**
   - Standard test numbers: 1231181189 (merchant) and 4671234567 (customer)
   - You can use your own phone number formatted as 46XXXXXXXXX (replace leading 0 with 46)

## Pre-Test Verification

1. **Environment Check**
   - Use the debug endpoint `/api/payments/swish/quicktest` to verify all settings
   - Confirm callback URL is correctly configured to `https://yourdomain.com/api/payments/swish/callback`
   - For local testing, ensure your localhost is exposed via a service like ngrok

2. **Certificate Verification**
   - Ensure test certificates are in place
   - Check file permissions (files should be readable by the application)

## Test Scenarios

### 1. Basic Payment Flow Test

1. Access the test endpoint: `/api/payments/swish/testflow?phone=46XXXXXXXXX&amount=1`
2. Open the Swish Handel Test app on your phone
3. You should see a payment request for 1 SEK
4. Approve the payment
5. Test BankID will open for authentication
6. Complete the authentication with code 123456
7. The payment should be successful, and a callback will be sent to your server

### 2. Payment Cancellation Test

1. Initiate a payment as above
2. Before approving in the Swish app, cancel it via: `/api/payments/swish/debug/cancel-test?id=PAYMENT_ID`
3. Verify the payment status shows as canceled

### 3. Error Handling Test

1. Test with an invalid phone number: `/api/payments/swish/testflow?phone=invalid`
2. Verify the system handles the error gracefully
3. Check error logs for proper error recording

### 4. Timeout Test

1. Initiate a payment but don't respond in the Swish app
2. Wait for the payment request to time out (typically 15 minutes)
3. Verify the system updates the payment status correctly

### 5. Callback Handling Test

1. Simulate different callbacks using: `/api/payments/swish/debug?status=PAID|ERROR|CANCELLED`
2. Verify the system processes each callback type correctly

## Debugging

- All API responses include detailed environment information
- Check transaction IDs and references for tracing payments
- Monitor the callback handling in logs
- For certificate issues, verify file paths and permissions

## Production Deployment Checklist

Before switching to production:

1. Set `NEXT_PUBLIC_SWISH_TEST_MODE=false`
2. Configure production certificates and Swish number
3. Remove all test endpoints:
   - `/api/payments/swish/testflow`
   - `/api/payments/swish/debug`
   - `/api/payments/swish/debug/cancel-test`
   - `/api/payments/swish/quicktest`
4. Update callback URL to production domain
5. Conduct a final test with minimal amount in production

## Testing Inside Studio Clay Application

### Swish Flow in Booking Process

1. **Course Booking Flow**
   - Select any course in the course catalog
   - Progress through the booking form
   - On the payment selection screen, choose "Swish"
   - Complete the form with test phone number (46XXXXXXXXX)
   - Submit the payment
   - Open the Swish Handel Test app to approve

2. **Gift Card Purchase Flow**
   - Navigate to the gift card purchase page
   - Select desired amount
   - Choose "Swish" as payment method
   - Enter test phone number
   - Submit and approve in the test app

3. **Art Purchase Flow**
   - Select any artwork from the gallery
   - Add to cart and proceed to checkout
   - Select "Swish" payment method
   - Complete with test information
   - Approve in the test app

### Invoice Flow

1. **Course Booking with Invoice**
   - Select a course and proceed to payment
   - Choose "Invoice" as payment method
   - Complete the form with test personal details
   - Verify that an invoice is correctly generated
   - Check your email for the invoice (if email integration is enabled)

2. **Other Product Types with Invoice**
   - Test invoice payment for gift cards and art purchases
   - Confirm consistent behavior across all product types
   - Verify invoice numbers are generated sequentially

### Common Test Scenarios

- **Cancellation**: Test cancelling a payment halfway through the process
- **Navigation**: Test browser back button during payment flow
- **Multiple Items**: Test purchasing multiple items in a single transaction
- **Amount Verification**: Ensure correct amounts are shown in the Swish app
- **Error Messages**: Verify user-friendly error messages appear for failed payments

## Troubleshooting and Error Codes

### Common Swish Errors

| Error Type | Description | Possible Solutions |
|------------|-------------|-------------------|
| `VALIDATION_ERROR` | Invalid input data sent to Swish API | Check phone number format, amount, or message format |
| `API_ERROR` | Error from Swish API endpoint | Check API status, verify certificates are valid |
| `CERTIFICATE_ERROR` | Issues with Swish certificates | Verify certificate paths and permissions |
| `DATABASE_ERROR` | Error storing or retrieving transaction data | Check database connection and logs |
| `NOT_FOUND` | Transaction ID not found | Verify payment reference is correct |
| `UNKNOWN_ERROR` | Unspecified error | Check server logs for more details |

### Debugging Tips

1. **Check Server Logs**: All Swish API calls are logged with request IDs.
   - Each log entry includes a UUID that can be used to trace a request through the system.
   - Example log pattern: `[requestId] Processing Swish callback`

2. **Verify HTTP Status Codes**:
   - `201 Created`: Successful payment request creation
   - `200 OK`: Successful GET operations
   - Other status codes indicate specific errors from the Swish API

3. **Database Error Logs**:
   - Check the `error_logs` table in Supabase for detailed error information
   - Each entry includes:
     - `request_id`: UUID for the request
     - `error_type`: Type of operation (e.g., `swish_create`, `swish_callback`)
     - `error_message`: Human-readable error description
     - `error_stack`: Stack trace for debugging
     - `request_data`: The data that was being processed
     - `processing_time`: How long the operation took before failing

4. **Certificate Issues**:
   - If you see `CERTIFICATE_ERROR`, check that:
     - File paths are correct in environment variables
     - Files have correct permissions
     - Certificate passwords are correct (if applicable)
     - Certificates are not expired

5. **Network Issues**:
   - The Swish test environment requires outbound internet access
   - For callback testing, your server must be accessible from the internet

### Common Test Failures

1. **Phone Number Format**:
   - Always use the format `46XXXXXXXXX` (starts with country code without +)
   - Test numbers like `4671234567` or `1231181189` should be used

2. **Timeout Issues**:
   - The default timeout is 30 seconds for a user to approve in the Swish app
   - Extend this for testing if needed

3. **BankID Problems**:
   - Ensure Test BankID is installed
   - Use test personal number `121212-1212`
   - Clear cached BankID data if experiencing issues

## Error Codes and Response Handling

### Swish Error Codes In Detail

| Error Code | Description | Troubleshooting Steps |
|------------|-------------|----------------------|
| `VALIDATION_ERROR` | Invalid input parameters sent to the Swish API | Check phone number format (should be 46XXXXXXXXX, not +46XXXXXXXXX), ensure amount is positive and within limits (1-999999 SEK), verify message length doesn't exceed 50 characters |
| `API_ERROR` | Error from Swish API endpoint with HTTP status code | Check Swish API status at [Swish Status Page](https://www.getswish.se/driftstatus/), verify request format matches Swish API specifications, inspect HTTP status code (422: validation error, 403: authentication failed, 404: resource not found) |
| `CERTIFICATE_ERROR` | Issues with Swish certificates | Verify certificates are in the correct format (.p12 for test, .pem for production), check certificate passwords, ensure certificate paths in environment variables are absolute or correctly resolved |
| `DATABASE_ERROR` | Error storing or retrieving transaction data | Check database connection, verify Supabase is accessible, ensure tables `swish_transactions` and `payments` have correct schema |
| `NOT_FOUND` | Transaction ID not found | Verify payment reference is correct, check if the transaction was created successfully, ensure you're using the correct environment (test vs production) |
| `UNKNOWN_ERROR` | Unspecified error | Check server logs for the specific request ID, inspect error details object for more information |

### Response Format

All Swish API responses in the system follow this structure:

```json
{
  "success": true/false,
  "data": {
    "reference": "AB12CD34EF56", // Swish payment ID
    "status": "CREATED" | "PAID" | "DECLINED" | "ERROR",
    "amount": 100 // Amount in SEK
  },
  "error": "Error message if success is false"
}
```

### Common HTTP Status Codes

| HTTP Code | Meaning | Action |
|-----------|---------|--------|
| 201 | Successfully created payment request | No action needed, payment is initiated |
| 200 | Successfully retrieved information | No action needed |
| 400 | Bad request | Check request format and parameters |
| 401/403 | Authentication error | Check certificate validity |
| 404 | Resource not found | Verify payment ID exists |
| 422 | Validation error | Check request parameters |
| 500 | Server error | Swish service issue, try again later |

### Logging and Debugging

Every Swish operation generates a unique request ID that is logged throughout the process. When troubleshooting:

1. Identify the request ID from the logs (UUID format)
2. Search all logs for this ID to trace the complete request lifecycle
3. Check both success and error logs for this ID

Example debug log format:
```
[9b1dfa52-d3e5-42da-8c90-8fa49d340cb3] Processing Swish callback { paymentReference: 'ABC123', status: 'PAID' }
```

Example error log format:
```
[9b1dfa52-d3e5-42da-8c90-8fa49d340cb3] Error processing Swish callback: SwishValidationError: Invalid phone number format
```

For database errors, check the `error_logs` table with the same request ID. 