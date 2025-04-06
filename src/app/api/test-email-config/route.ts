import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Function to log detailed SMTP errors
function logSMTPError(error: any) {
  console.error('📧 SMTP ERROR DETAILS:');
  
  if (error && typeof error === 'object') {
    console.error(`📧 Error code: ${error.code || 'Unknown'}`);
    console.error(`📧 Server response: ${error.response || 'No response'}`);
    console.error(`📧 Response code: ${error.responseCode || 'No code'}`);
    console.error(`📧 Failed command: ${error.command || 'Unknown command'}`);
    console.error(`📧 Error number: ${error.errno || 'Unknown'}`);
    console.error(`📧 System call: ${error.syscall || 'Unknown'}`);
    console.error(`📧 Hostname: ${error.hostname || 'Unknown'}`);
    console.error(`📧 Port: ${error.port || 'Unknown'}`);
    console.error(`📧 Auth user: ${error.source?.options?.auth?.user || 'Unknown'}`);
    console.error(`📧 Auth method: ${error.source?.options?.auth?.method || 'Unknown'}`);
    console.error(`📧 Stack trace: ${error.stack || 'No stack trace'}`);
  } else {
    console.error(`📧 Unknown error type: ${error}`);
  }
}

export async function GET() {
  console.log('=== EMAIL CONFIG TEST ENDPOINT CALLED ===');
  console.log('Environment:', process.env.NODE_ENV || 'unknown');
  console.log('Vercel environment:', process.env.VERCEL_ENV || 'unknown');
  
  // Create a detailed result object that will be returned
  const result: {
    success: boolean;
    environment: string;
    emailConfig: {
      host?: string;
      port?: number | string;
      secure?: boolean | string;
      user?: string;
      pass_set?: boolean;
      pass_length?: number;
    };
    testResults: {
      ethereal?: {success: boolean; message: string; previewUrl?: string};
      office365?: {success: boolean; message: string; details?: any};
    };
    error?: string;
    message: string;
  } = {
    success: false,
    environment: process.env.NODE_ENV || 'unknown',
    emailConfig: {
      host: process.env.EMAIL_SMTP_HOST || 'smtp.office365.com',
      port: process.env.EMAIL_SMTP_PORT || '587',
      secure: process.env.EMAIL_SMTP_SECURE === 'true',
      user: process.env.EMAIL_USER || 'eva@studioclay.se',
      pass_set: !!process.env.EMAIL_PASS,
      pass_length: process.env.EMAIL_PASS?.length || 0
    },
    testResults: {},
    message: ''
  };
  
  console.log('Starting email configuration test...');
  
  try {
    // Test 1: Create a test account on Ethereal
    if (process.env.NODE_ENV !== 'production' && process.env.VERCEL_ENV !== 'production') {
      console.log('Testing Ethereal email service connection...');
      try {
        const testAccount = await nodemailer.createTestAccount();
        
        console.log('Successfully created Ethereal test account:', testAccount.user);
        
        // Try to send a test email with Ethereal
        const etherealTransport = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        
        // Verify SMTP connection configuration
        console.log('Verifying Ethereal SMTP connection...');
        await etherealTransport.verify();
        console.log('Ethereal SMTP connection verified successfully!');
        
        // Send a test email
        const info = await etherealTransport.sendMail({
          from: testAccount.user,
          to: testAccount.user,
          subject: 'Test Email from Studio Clay',
          text: 'This is a test email from the Studio Clay application.',
          html: '<b>This is a test email from the Studio Clay application.</b>'
        });
        
        console.log('Ethereal test email sent successfully!');
        console.log('Message ID:', info.messageId);
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('Preview URL:', previewUrl);
        
        result.testResults.ethereal = {
          success: true,
          message: 'Ethereal test email sent successfully',
          previewUrl
        };
      } catch (etherealError) {
        console.error('Error testing Ethereal email service:', etherealError);
        result.testResults.ethereal = {
          success: false,
          message: etherealError instanceof Error ? etherealError.message : 'Unknown Ethereal error'
        };
      }
    }
    
    // Test 2: Office 365 Connection
    console.log('Testing Office 365 email service connection...');
    
    // Get Office 365 settings from environment variables
    const host = process.env.EMAIL_SMTP_HOST || 'smtp.office365.com';
    const port = parseInt(process.env.EMAIL_SMTP_PORT || '587');
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const secure = process.env.EMAIL_SMTP_SECURE === 'true';
    
    if (!user || !pass) {
      console.error('Missing email credentials. Check your environment variables.');
      result.testResults.office365 = {
        success: false,
        message: 'Missing email credentials (user or password)'
      };
      result.message = 'Office 365 test failed: missing credentials';
      return NextResponse.json(result);
    }
    
    try {
      console.log('Creating Office 365 SMTP transport...');
      console.log('Settings:', { 
        host, 
        port, 
        secure, 
        user,
        pass: pass ? '[SET]' : '[NOT SET]'
      });
      
      const office365Transport = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass
        },
        tls: {
          // Microsoft recommends TLS 1.2
          minVersion: 'TLSv1.2',
          // Trust any certificate since Office 365 uses valid certs
          rejectUnauthorized: true
        },
        debug: true,
        logger: true // Enable built-in logger
      });
      
      // Try with a 10 second timeout to avoid Vercel hanging
      const verifyPromise = office365Transport.verify();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('SMTP verification timed out after 10 seconds')), 10000);
      });
      
      console.log('Verifying Office 365 SMTP connection (with 10s timeout)...');
      await Promise.race([verifyPromise, timeoutPromise]);
      
      console.log('Office 365 SMTP connection verified successfully!');
      
      result.testResults.office365 = {
        success: true,
        message: 'Office 365 SMTP connection verified successfully'
      };
      
      result.success = true;
      result.message = 'Email configuration testing completed successfully';
    } catch (office365Error) {
      console.error('Error testing Office 365 email service:', office365Error);
      logSMTPError(office365Error);
      
      result.testResults.office365 = {
        success: false,
        message: office365Error instanceof Error ? office365Error.message : 'Unknown Office 365 error',
        details: office365Error instanceof Error ? {
          name: office365Error.name,
          code: (office365Error as any).code,
          command: (office365Error as any).command,
          response: (office365Error as any).response
        } : office365Error
      };
      
      result.message = 'Office 365 test failed';
    }
    
    // Overall result
    result.success = result.testResults.office365?.success || false;
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Unhandled error in email test endpoint:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in email test endpoint',
      emailConfig: result.emailConfig,
      environment: result.environment,
      message: 'Email configuration test failed with an unhandled error'
    });
  }
} 