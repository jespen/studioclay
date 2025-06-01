import { NextRequest, NextResponse } from 'next/server';
import { sendAdminPurchaseNotification } from '@/utils/serverEmail';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing admin notification functionality...');
    
    // Test data for admin notification
    const testData = {
      productType: 'course' as const,
      productTitle: 'Test-kurs - Admin Notifiering',
      customerName: 'Test Kund',
      customerEmail: 'test@example.com',
      amount: 1500,
      paymentMethod: 'invoice' as const,
      paymentReference: `TEST-${Date.now()}`,
      invoiceNumber: `INV-TEST-${Math.floor(Math.random() * 1000)}`,
      additionalInfo: 'Detta är ett test av admin-notifieringssystemet'
    };
    
    console.log('Sending test admin notification with data:', {
      productType: testData.productType,
      productTitle: testData.productTitle,
      customerName: testData.customerName,
      amount: testData.amount,
      paymentMethod: testData.paymentMethod
    });
    
    const result = await sendAdminPurchaseNotification(testData);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Admin notification test completed successfully',
        data: {
          sent: true,
          testData,
          result: result.message
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Admin notification test failed',
        error: result.message,
        testData
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error testing admin notification:', error);
    return NextResponse.json({
      success: false,
      message: 'Exception occurred during admin notification test',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Allow testing with custom data
    const body = await request.json();
    
    const testData = {
      productType: body.productType || 'gift_card',
      productTitle: body.productTitle || 'Test Presentkort',
      customerName: body.customerName || 'Test Användare',
      customerEmail: body.customerEmail || 'test@studioclay.se',
      amount: body.amount || 500,
      paymentMethod: body.paymentMethod || 'swish',
      paymentReference: body.paymentReference || `TEST-${Date.now()}`,
      invoiceNumber: body.invoiceNumber,
      additionalInfo: body.additionalInfo || 'Test via POST endpoint'
    };
    
    console.log('Testing admin notification with custom data:', testData);
    
    const result = await sendAdminPurchaseNotification(testData);
    
    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Admin notification sent successfully' : 'Admin notification failed',
      data: {
        testData,
        result: result.message
      }
    }, { status: result.success ? 200 : 500 });
    
  } catch (error) {
    console.error('Error in POST admin notification test:', error);
    return NextResponse.json({
      success: false,
      message: 'Exception occurred during POST admin notification test',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 