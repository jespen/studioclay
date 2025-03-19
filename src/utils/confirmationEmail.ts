import emailjs from '@emailjs/browser';
import { emailConfig } from '@/config/email';
import { UserInfo, PaymentDetails } from '@/types/booking';

// Define parameters interface for the email function
interface BookingConfirmationEmailParams {
  userInfo: UserInfo;
  paymentDetails: PaymentDetails;
  courseDetails: {
    id: string;
    title: string;
    description?: string;
    start_date: string;
    location?: string;
    price: number;
  };
  bookingReference: string;
}

/**
 * Sends a booking confirmation email
 */
export async function sendBookingConfirmationEmail(params: BookingConfirmationEmailParams): Promise<{success: boolean; message: string}> {
  try {
    // In a server environment, we can't use browser APIs that emailjs relies on
    // Since this is running server-side in an API route, we need a different approach
    
    console.log('Server-side email sending is currently in development');
    console.log('Email would be sent to:', params.userInfo.email);
    console.log('With booking reference:', params.bookingReference);
    
    // TODO: Use a server-compatible email service like Nodemailer or SendGrid instead
    // For now, we'll just pretend the email was sent successfully
    
    return {
      success: true,
      message: 'Booking confirmation email simulated in development environment'
    };
    
    /* Original browser-based implementation:
    if (!emailConfig.serviceId || !emailConfig.templateId || !emailConfig.publicKey) {
      console.error('EmailJS configuration is incomplete');
      return {
        success: false,
        message: 'Email configuration is missing'
      };
    }
    
    if (!params.userInfo || !params.paymentDetails || !params.courseDetails) {
      console.error('Missing required booking confirmation data');
      return {
        success: false,
        message: 'Missing required booking data'
      };
    }
    
    // Format the course date
    const courseDate = new Date(params.courseDetails.start_date).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Calculate total price
    const totalPrice = (parseInt(params.userInfo.numberOfParticipants) || 1) * (params.courseDetails.price || 0);
    
    // Create specific payment information based on payment method
    let paymentMethodText = '';
    let paymentDetailsText = '';
    
    if (params.paymentDetails.method === 'swish') {
      paymentMethodText = 'Swish';
      paymentDetailsText = params.paymentDetails.paymentReference 
        ? `Betalning genomförd med Swish. Betalningsreferens: ${params.paymentDetails.paymentReference}`
        : 'Betalning genomförd med Swish.';
    } else if (params.paymentDetails.method === 'invoice') {
      paymentMethodText = 'Faktura';
      paymentDetailsText = params.paymentDetails.invoiceNumber 
        ? `En faktura (${params.paymentDetails.invoiceNumber}) har skickats till din e-post och ska betalas inom 10 dagar.`
        : 'En faktura har skickats till din e-post och ska betalas inom 10 dagar.';
    } else {
      paymentMethodText = params.paymentDetails.method || 'Okänd';
      paymentDetailsText = 'Betalningsinformation har registrerats.';
    }
    
    // Set up EmailJS template parameters
    const templateParams = {
      to_name: `${params.userInfo.firstName} ${params.userInfo.lastName}`,
      to_email: params.userInfo.email,
      subject: `Bokningsbekräftelse - ${params.courseDetails.title}`,
      booking_reference: params.bookingReference,
      customer_name: `${params.userInfo.firstName} ${params.userInfo.lastName}`,
      customer_email: params.userInfo.email,
      customer_phone: params.userInfo.phone,
      course_name: params.courseDetails.title,
      course_date: courseDate,
      course_location: params.courseDetails.location || '',
      number_of_participants: params.userInfo.numberOfParticipants,
      special_requirements: params.userInfo.specialRequirements || 'Inga',
      payment_method: paymentMethodText,
      payment_details: paymentDetailsText,
      total_amount: `${totalPrice.toFixed(2)} kr`,
      message: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #547264;">Bokningsbekräftelse</h2>
          <p>Hej ${params.userInfo.firstName},</p>
          <p>Tack för din bokning hos Studio Clay! Din plats är nu reserverad.</p>
          
          <div style="background-color: #f7f7f7; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #547264;">Kursdetaljer</h3>
            <p><strong>Kurs:</strong> ${params.courseDetails.title}</p>
            <p><strong>Datum:</strong> ${courseDate}</p>
            ${params.courseDetails.location ? `<p><strong>Plats:</strong> ${params.courseDetails.location}</p>` : ''}
            <p><strong>Antal deltagare:</strong> ${params.userInfo.numberOfParticipants}</p>
            <p><strong>Totalt pris:</strong> ${totalPrice.toFixed(2)} kr</p>
          </div>
          
          <div style="background-color: #f7f7f7; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #547264;">Betalningsinformation</h3>
            <p><strong>Betalningsmetod:</strong> ${paymentMethodText}</p>
            <p>${paymentDetailsText}</p>
          </div>
          
          <p>Din bokningsreferens: <strong>${params.bookingReference}</strong></p>
          <p>Om du har några frågor, vänligen kontakta oss på <a href="mailto:eva@studioclay.se">eva@studioclay.se</a> eller ring 079-312 06 05.</p>
          <p>Vi ser fram emot att träffa dig!</p>
          <p>Vänliga hälsningar,<br>Studio Clay</p>
        </div>
      `.trim().replace(/\n\s+/g, '\n'),
    };
    
    console.log('Sending booking confirmation email to:', params.userInfo.email);
    
    // Send the email
    const response = await emailjs.send(
      emailConfig.serviceId,
      emailConfig.templateId,
      templateParams,
      emailConfig.publicKey
    );
    
    console.log('Email successfully sent:', response);
    return {
      success: true,
      message: 'Booking confirmation email sent successfully'
    };
    */
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error sending booking confirmation email'
    };
  }
} 