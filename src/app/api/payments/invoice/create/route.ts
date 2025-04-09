import { NextResponse } from 'next/server';
import { normalizeUserData, normalizeProductData, ProductType, getProductType } from '@/types/productData';

export async function POST(request: Request) {
  console.log('=== /api/payments/invoice/create POST handler called ===');
  console.log('Forwarding request to /api/invoice/create');
  
  try {
    // Clone the request to forward it
    const originalData = await request.json();
    console.log('Original request data:', JSON.stringify(originalData));
    console.log('Original request data keys:', Object.keys(originalData));
    console.log('Invoice details exist?', !!originalData.invoiceDetails);
    console.log('Snake case invoice_details exist?', !!originalData.invoice_details);
    
    // Normalize user data from various sources
    const normalizedUserData = normalizeUserData(originalData.user || originalData.userInfo || {});
    
    // Determine product type and normalize data
    let productType = getProductType(originalData);
    console.log(`Detected product type: ${productType}`);
    
    // Map product types to expected values for the legacy API
    let mappedProductType;
    switch (productType) {
      case ProductType.ART_PRODUCT:
        mappedProductType = 'art_product';
        break;
      case ProductType.COURSE:
        mappedProductType = 'course';
        break;
      case ProductType.GIFT_CARD:
        mappedProductType = 'gift_card';
        break;
      default:
        mappedProductType = originalData.productType || 'course';
        break;
    }
    
    console.log(`Mapped product type from '${originalData.productType}' to '${mappedProductType}'`);
    
    // Create a new object with only the fields needed by invoice/create
    // This avoids conflicts from original field names
    const transformedData: any = {
      courseId: originalData.productId,
      userInfo: normalizedUserData,
      paymentDetails: {
        method: 'invoice',
        invoiceDetails: originalData.invoiceDetails || originalData.invoice_details || {}
      },
      amount: originalData.amount,
      product_type: mappedProductType  // Use the mapped product type
    };
    
    // Validate that userInfo is present
    if (!transformedData.userInfo || !transformedData.userInfo.firstName) {
      console.error('User info is missing or invalid in the request');
      console.log('Available fields:', Object.keys(originalData));
      console.log('Normalized user data:', JSON.stringify(normalizedUserData));
      return NextResponse.json(
        { success: false, error: 'Missing or invalid user information' },
        { status: 400 }
      );
    }
    
    // Handle gift card specific data
    if (mappedProductType === 'gift_card') {
      // Get gift card details either from the request or attempt to get from flowData
      let giftCardDetails = originalData.itemDetails;
      
      // If we don't have gift card details in the request, check if flowData contains it
      if (!giftCardDetails && originalData.flowData?.itemDetails) {
        giftCardDetails = originalData.flowData.itemDetails;
      }
      
      if (giftCardDetails) {
        transformedData.itemDetails = {
          type: giftCardDetails.type || 'digital',
          recipientName: giftCardDetails.recipientName || '',
          recipientEmail: giftCardDetails.recipientEmail || '',
          message: giftCardDetails.message || '',
          amount: giftCardDetails.amount || originalData.amount
        };
        
        // Ensure amount is set correctly from gift card details if needed
        if (giftCardDetails.amount && (!transformedData.amount || transformedData.amount === 0)) {
          transformedData.amount = typeof giftCardDetails.amount === 'string' 
            ? parseFloat(giftCardDetails.amount) 
            : giftCardDetails.amount;
          
          console.log(`Updated amount from gift card details: ${transformedData.amount}`);
        }
      } else {
        console.warn('No gift card details found in request or flowData');
      }
    }
    
    // Add debugging to confirm the data structure
    console.log('Transformed request data:', JSON.stringify(transformedData));
    console.log('courseId:', transformedData.courseId);
    console.log('product_type:', transformedData.product_type);
    console.log('userInfo:', JSON.stringify(transformedData.userInfo));
    console.log('paymentDetails:', JSON.stringify(transformedData.paymentDetails));
    if (transformedData.itemDetails) {
      console.log('itemDetails:', JSON.stringify(transformedData.itemDetails));
    }
    
    // Forward the request to the existing invoice creation endpoint
    const forwardResponse = await fetch(new URL('/api/invoice/create', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transformedData),
    });
    
    if (!forwardResponse.ok) {
      console.error(`Error from invoice/create: ${forwardResponse.status}`);
      let errorText;
      try {
        const errorData = await forwardResponse.json();
        errorText = JSON.stringify(errorData);
      } catch (e) {
        errorText = await forwardResponse.text().catch(() => 'Could not read error response');
      }
      console.error(`Response body: ${errorText}`);
      
      return NextResponse.json(
        { success: false, error: 'Failed to create invoice' }, 
        { status: forwardResponse.status }
      );
    }
    
    // Get the response data
    const responseData = await forwardResponse.json();
    console.log('Forward response status:', forwardResponse.status);
    console.log('Forward response:', JSON.stringify(responseData));
    
    // Return the same response
    return NextResponse.json(responseData, { status: forwardResponse.status });
  } catch (error) {
    console.error('Error forwarding invoice request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process invoice request' }, 
      { status: 500 }
    );
  }
} 