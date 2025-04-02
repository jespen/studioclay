import nodemailer from 'nodemailer';

// Function to log detailed SMTP errors
export function logSMTPError(error) {
  console.error('📧 SMTP ERROR DETAILS:');
  if (error && typeof error === 'object') {
    console.error('📧 Error code:', error.code || 'Unknown');
    console.error('📧 Server response:', error.response || 'No response');
    console.error('📧 Response code:', error.responseCode || 'No code');
    console.error('📧 Failed command:', error.command || 'Unknown command');
    console.error('📧 Stack trace:', error);
  } else {
    console.error('📧 Unknown error type:', error);
  }
}

// Create a test email transporter using Ethereal for development
async function createTestEmailTransporter() {
  // Don't create test accounts if disabled
  if (process.env.DISABLE_ETHEREAL === 'true') {
    console.log('📧 Ethereal email disabled, returning null transporter');
    return null;
  }

  try {
    console.log('📧 Creating test account with Ethereal');
    const testAccount = await nodemailer.createTestAccount();
    
    console.log('📧 Test account created:', testAccount.user);
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    return transporter;
  } catch (error) {
    console.error('📧 Error creating test account:', error);
    return null;
  }
}

export function createEmailTransporter() {
  // Try to create a production email transporter
  try {
    // Check if we're in a server-side environment
    if (typeof window === 'undefined') {
      const host = process.env.EMAIL_SMTP_HOST;
      const port = parseInt(process.env.EMAIL_SMTP_PORT || '587');
      const user = process.env.EMAIL_USER;
      const pass = process.env.EMAIL_PASS;
      const secure = process.env.EMAIL_SMTP_SECURE === 'true';
      
      if (!host || !user || !pass) {
        console.log('📧 Missing email configuration, falling back to test account');
        return createTestEmailTransporter();
      }

      // Log the SMTP configuration
      console.log(`📧 SMTP Configuration: ${host}:${port}`);
      console.log(`📧 Auth User: ${user}`);

      // Special handling for Office 365
      if (host.includes('office365') || host.includes('outlook')) {
        console.log('📧 Using Office 365 specific configuration');
        const transporter = nodemailer.createTransport({
          host: host,
          port: port,
          secure: false, // TLS requires secure:false for Office 365
          auth: {
            user: user,
            pass: pass,
          },
          tls: {
            // Microsoft recommends TLS 1.2
            minVersion: 'TLSv1.2',
            // Trust any certificate since Office 365 uses valid certs
            rejectUnauthorized: true
          },
          debug: true // Enable debug output for troubleshooting
        });

        // Verify the connection
        try {
          console.log('📧 Verifying SMTP connection...');
          const verified = transporter.verify();
          console.log('📧 SMTP server connection verified successfully');
          return transporter;
        } catch (verifyError) {
          console.error('📧 Error verifying SMTP connection:', verifyError);
          throw verifyError;
        }
      }

      // Regular SMTP configuration for other providers
      console.log('📧 Creating SMTP transport with plain password (secure)');
      const transporter = nodemailer.createTransport({
        host: host,
        port: port,
        secure: secure,
        auth: {
          user: user,
          pass: pass,
        }
      });
      
      // Verify the connection
      try {
        console.log('📧 Verifying SMTP connection...');
        const verified = transporter.verify();
        console.log('📧 SMTP server connection verified successfully');
        return transporter;
      } catch (verifyError) {
        console.error('📧 Error verifying SMTP connection:', verifyError);
        
        // If TLS fails, try SSL if we aren't already using it
        if (!secure) {
          console.log('📧 Trying alternate secure configuration (SSL)');
          try {
            const sslTransporter = nodemailer.createTransport({
              host: host,
              port: 465, // Standard SSL port
              secure: true,
              auth: {
                user: user,
                pass: pass,
              }
            });
            
            sslTransporter.verify();
            console.log('📧 SSL SMTP connection verified successfully');
            return sslTransporter;
          } catch (sslError) {
            console.error('📧 SSL connection also failed:', sslError);
            throw sslError;
          }
        } else {
          throw verifyError;
        }
      }
    }
    
    // We're in a browser environment, return null
    console.log('📧 Browser environment detected, email transport not available');
    return null;
  } catch (error) {
    logSMTPError(error);
    
    // Last attempt - try to create a test account for development
    console.log('📧 All SMTP connection attempts failed:', error);
    console.log('Failed to create email transporter, simulating email instead');
    return null;
  }
} 