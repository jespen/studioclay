import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logDebug, logError } from '@/lib/logging';
import { SwishService } from '@/services/swish/swishService';
import { SwishConfig } from '@/services/swish/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define type for product test result
interface TestResult {
  success: boolean;
  payment_reference?: string;
  swish_reference?: string;
  error?: string;
  data?: any;
  details?: any;
  stack?: string;
  product_type?: string;
  product_id?: string;
  product_title?: string;
  stage?: string;
}

// Define type for test results object
interface TestResults {
  [key: string]: TestResult;
}

/**
 * Comprehensive diagnostic tool for Swish payments
 * Tests the full flow for each product type with detailed error reporting
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get('phone');
    const type = searchParams.get('type') || 'all';
    const skipValidation = searchParams.get('skip_validation') === 'true';
    
    if (!phone && !skipValidation) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: phone',
        usage: '/api/payments/swish/diagnostic?phone=07XXXXXXXX&type=art_product|gift_card|course|all&skip_validation=true|false'
      }, { status: 400 });
    }
    
    // Generate unique ID for this diagnostic run
    const diagnosticId = crypto.randomBytes(4).toString('hex');
    logDebug(`[DIAGNOSTIC ${diagnosticId}] Starting Swish diagnostic`);
    
    // Get environment variables
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://studioclay.se';
    const isTestMode = process.env.NEXT_PUBLIC_SWISH_TEST_MODE === 'true';
    const swishApiUrl = isTestMode 
      ? process.env.SWISH_TEST_API_URL 
      : process.env.SWISH_PROD_API_URL;
      
    // Check certificate files
    const certFiles = checkCertificateFiles();
    
    // Try to initialize SwishConfig (which validates environment)
    let configResult = {
      success: false,
      error: null as string | null,
      details: null as Record<string, any> | null
    };
    
    try {
      const config = SwishConfig.getInstance();
      configResult = {
        success: true,
        error: null,
        details: {
          isTestMode: config.isTest,
          apiUrl: config.apiUrl,
          payeeAlias: config.payeeAlias,
          baseUrl: baseUrl
        }
      };
    } catch (error: any) {
      configResult = {
        success: false,
        error: error.message,
        details: {
          name: error.name,
          stack: error.stack
        }
      };
    }
    
    // Try to initialize SwishService
    let serviceResult = {
      success: false,
      error: null as string | null
    };
    
    try {
      const service = SwishService.getInstance();
      serviceResult = {
        success: true,
        error: null
      };
    } catch (error: any) {
      serviceResult = {
        success: false,
        error: error.message
      };
    }
    
    // If we can't initialize the service or config and not skipping validation, stop here
    if ((!configResult.success || !serviceResult.success) && !skipValidation) {
      return NextResponse.json({
        success: false,
        diagnostic_id: diagnosticId,
        environment: {
          node_env: process.env.NODE_ENV,
          is_test_mode: isTestMode,
          base_url: baseUrl,
          swish_api_url: swishApiUrl
        },
        config: configResult,
        service: serviceResult,
        certificates: certFiles,
        recommendation: "Fix configuration issues before proceeding with payment tests."
      });
    }
    
    // If everything is set up correctly or we're skipping validation, try to make test payments
    const testResults: TestResults = {};
    
    // Determine which types to test
    const typesToTest = type === 'all' 
      ? ['art_product', 'gift_card', 'course'] 
      : [type];
    
    // Test each product type
    for (const productType of typesToTest) {
      logDebug(`[DIAGNOSTIC ${diagnosticId}] Testing ${productType} payment`);
      
      try {
        // Get appropriate test product ID based on type
        const { testProduct, error } = await getTestProduct(productType);
        
        if (error || !testProduct) {
          testResults[productType] = {
            success: false,
            error: error || `No test product found for ${productType}`,
            stage: 'product_selection'
          };
          continue;
        }
        
        // Test the payment creation
        const result = await testPaymentCreation(
          productType, 
          testProduct.id,
          testProduct.title || "Test product",
          phone || '0707111111',
          diagnosticId
        );
        
        testResults[productType] = result;
      } catch (error: any) {
        testResults[productType] = {
          success: false,
          error: error.message,
          stack: error.stack,
          stage: 'unexpected_error'
        };
      }
    }
    
    // Return comprehensive diagnostic results
    return NextResponse.json({
      success: Object.values(testResults).some((result) => result.success),
      diagnostic_id: diagnosticId,
      timestamp: new Date().toISOString(),
      environment: {
        node_env: process.env.NODE_ENV,
        is_test_mode: isTestMode,
        base_url: baseUrl,
        swish_api_url: swishApiUrl
      },
      config: configResult,
      service: serviceResult,
      certificates: certFiles,
      test_results: testResults
    });
    
  } catch (error: any) {
    logError('Unexpected error in Swish diagnostic endpoint:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

/**
 * Checks if certificate files exist and are readable
 */
function checkCertificateFiles() {
  const isTestMode = process.env.NEXT_PUBLIC_SWISH_TEST_MODE === 'true';
  
  const certPath = isTestMode ? process.env.SWISH_TEST_CERT_PATH! : process.env.SWISH_PROD_CERT_PATH!;
  const keyPath = isTestMode ? process.env.SWISH_TEST_KEY_PATH! : process.env.SWISH_PROD_KEY_PATH!;
  const caPath = isTestMode ? process.env.SWISH_TEST_CA_PATH! : process.env.SWISH_PROD_CA_PATH!;
  
  const resolvedCertPath = path.resolve(process.cwd(), certPath);
  const resolvedKeyPath = path.resolve(process.cwd(), keyPath);
  const resolvedCaPath = path.resolve(process.cwd(), caPath);
  
  const certExists = fs.existsSync(resolvedCertPath);
  const keyExists = fs.existsSync(resolvedKeyPath);
  const caExists = fs.existsSync(resolvedCaPath);
  
  // Try to read the files to check if they're accessible
  let certReadable = false;
  let keyReadable = false;
  let caReadable = false;
  
  try {
    fs.accessSync(resolvedCertPath, fs.constants.R_OK);
    certReadable = true;
  } catch (e) {}
  
  try {
    fs.accessSync(resolvedKeyPath, fs.constants.R_OK);
    keyReadable = true;
  } catch (e) {}
  
  try {
    fs.accessSync(resolvedCaPath, fs.constants.R_OK);
    caReadable = true;
  } catch (e) {}
  
  return {
    environment: isTestMode ? 'test' : 'production',
    cert: {
      path: certPath,
      resolved_path: resolvedCertPath,
      exists: certExists,
      readable: certReadable,
      size: certExists ? fs.statSync(resolvedCertPath).size : null
    },
    key: {
      path: keyPath,
      resolved_path: resolvedKeyPath,
      exists: keyExists,
      readable: keyReadable,
      size: keyExists ? fs.statSync(resolvedKeyPath).size : null
    },
    ca: {
      path: caPath,
      resolved_path: resolvedCaPath,
      exists: caExists,
      readable: caReadable,
      size: caExists ? fs.statSync(resolvedCaPath).size : null
    },
    all_exists: certExists && keyExists && caExists,
    all_readable: certReadable && keyReadable && caReadable
  };
}

/**
 * Gets a test product for the specified product type
 */
async function getTestProduct(productType: string): Promise<{ testProduct: { id: string; title: string; price?: number } | null, error: string | null }> {
  try {
    switch (productType) {
      case 'art_product':
        // Get first available art product
        const { data: products } = await supabase
          .from('products')
          .select('id, title, price')
          .eq('in_stock', true)
          .limit(1);
          
        if (products && products.length > 0) {
          return { testProduct: products[0], error: null };
        }
        return { testProduct: null, error: 'No in-stock art products found' };
        
      case 'gift_card':
        // Gift cards don't have a specific database entry, use a placeholder
        return { 
          testProduct: { 
            id: 'gift-card-test-' + Math.floor(Math.random() * 1000), 
            title: 'Presentkort', 
            price: 100 
          }, 
          error: null 
        };
        
      case 'course':
        // Get first available course
        const { data: courses } = await supabase
          .from('course_instances')
          .select('id, title, price, course_templates(title)')
          .eq('active', true)
          .limit(1);
          
        if (courses && courses.length > 0) {
          const course = courses[0];
          const courseTitle = course.title || 
                           (course.course_templates ? course.course_templates.title : null) || 
                           'Kurs';
          
          return { 
            testProduct: { 
              id: course.id, 
              title: courseTitle, 
              price: course.price || 100 
            }, 
            error: null 
          };
        }
        return { testProduct: null, error: 'No active course instances found' };
        
      default:
        return { testProduct: null, error: `Invalid product type: ${productType}` };
    }
  } catch (error: any) {
    logError(`Error getting test product for ${productType}:`, error);
    return { testProduct: null, error: error.message };
  }
}

/**
 * Tests the creation of a payment for the specified product type
 */
async function testPaymentCreation(
  productType: string, 
  productId: string,
  productTitle: string,
  phoneNumber: string,
  diagnosticId: string
): Promise<TestResult> {
  try {
    logDebug(`[DIAGNOSTIC ${diagnosticId}] Testing payment creation for ${productType} (${productId})`);
    
    // Generate payment reference
    const timestamp = new Date().getTime().toString().slice(-6);
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const paymentReference = `DIAG-${timestamp}-${randomNum}`;
    
    // Prepare payload based on type
    const userInfo = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: phoneNumber,
      numberOfParticipants: '1'
    };
    
    const amount = 1; // Use 1 SEK for testing
    
    // Create the internal payment record first
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert({
        payment_method: 'swish',
        amount: amount,
        currency: 'SEK',
        payment_reference: paymentReference,
        product_type: productType,
        product_id: productId,
        status: 'CREATED',
        user_info: userInfo,
        phone_number: phoneNumber,
        metadata: {
          diagnostic_id: diagnosticId,
          test: true,
          product_info: {
            type: productType,
            id: productId,
            title: productTitle
          }
        }
      })
      .select()
      .single();
      
    if (paymentError) {
      return {
        success: false,
        error: paymentError.message,
        details: paymentError,
        stage: 'database_insert'
      };
    }
    
    // Create payment with Swish service
    try {
      // Prepare callback URL
      let callbackUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://studioclay.se';
      
      // Ensure https
      if (callbackUrl.startsWith('http:')) {
        callbackUrl = callbackUrl.replace('http://', 'https://');
      }
      
      // Remove www in production
      if (process.env.NODE_ENV === 'production' && callbackUrl.includes('www.studioclay.se')) {
        callbackUrl = callbackUrl.replace('www.studioclay.se', 'studioclay.se');
      }
      
      // Add callback path
      callbackUrl = callbackUrl.replace(/\/$/, '') + '/api/payments/swish/callback';
      
      // Initialize SwishService
      const swishService = SwishService.getInstance();
      const formattedPhone = swishService.formatPhoneNumber(phoneNumber);
      
      // Construct Swish payment data
      const swishPaymentData = {
        payeePaymentReference: paymentReference,
        callbackUrl: callbackUrl,
        payeeAlias: swishService.getPayeeAlias(),
        amount: amount.toString(),
        currency: "SEK",
        message: `studioclay.se - ${productTitle} (test)`.substring(0, 50),
        payerAlias: formattedPhone
      };
      
      logDebug(`[DIAGNOSTIC ${diagnosticId}] Sending Swish payment data:`, {
        ...swishPaymentData,
        payerAlias: `${formattedPhone.substring(0, 4)}****${formattedPhone.slice(-2)}`
      });
      
      // Make the actual API call to Swish
      const result = await swishService.createPayment(swishPaymentData);
      
      // Update payment record with Swish result
      await supabase
        .from('payments')
        .update({
          swish_payment_id: result.success ? result.data?.reference : null,
          swish_callback_url: callbackUrl,
          status: result.success ? 'CREATED' : 'ERROR',
          metadata: {
            ...paymentData.metadata,
            swish_result: result,
            swish_request: {
              sent_at: new Date().toISOString(),
              data: {
                ...swishPaymentData,
                payerAlias: `${formattedPhone.substring(0, 4)}****${formattedPhone.slice(-2)}`
              }
            }
          }
        })
        .eq('payment_reference', paymentReference);
      
      return {
        success: result.success,
        payment_reference: paymentReference,
        swish_reference: result.data?.reference,
        error: result.error,
        data: result.data,
        product_type: productType,
        product_id: productId,
        product_title: productTitle,
        stage: 'swish_api_call'
      };
    } catch (swishError: any) {
      // Update payment status to ERROR
      await supabase
        .from('payments')
        .update({ 
          status: 'ERROR',
          metadata: {
            ...paymentData.metadata,
            error: swishError.message,
            error_stack: swishError.stack
          }
        })
        .eq('payment_reference', paymentReference);
        
      return {
        success: false,
        payment_reference: paymentReference,
        error: swishError.message,
        stack: swishError.stack,
        product_type: productType,
        product_id: productId,
        product_title: productTitle,
        stage: 'swish_service_error'
      };
    }
  } catch (error: any) {
    logError(`[DIAGNOSTIC ${diagnosticId}] Error in testPaymentCreation:`, error);
    return {
      success: false,
      error: error.message,
      stack: error.stack,
      product_type: productType,
      product_id: productId,
      product_title: productTitle,
      stage: 'unexpected_error'
    };
  }
} 