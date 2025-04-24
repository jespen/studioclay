import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { z } from 'zod';

// Dynamic API route for newsletter subscriptions
export const dynamic = 'force-dynamic';

// Define validation schema
const subscriptionSchema = z.object({
  subscriberEmail: z.string().email("Valid email is required"),
  recipientEmail: z.string().email("Valid recipient email is required"),
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const requestData = await request.json();
    
    // Validate the request data
    const validationResult = subscriptionSchema.safeParse(requestData);
    
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error);
      return NextResponse.json(
        { error: "Invalid data provided", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { subscriberEmail, recipientEmail } = validationResult.data;
    
    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.office365.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || 'eva@studioclay.se',
        pass: process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: process.env.EMAIL_REJECT_UNAUTHORIZED !== 'false'
      }
    });
    
    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'eva@studioclay.se',
      to: recipientEmail,
      subject: 'Ny prenumerant på nyhetsbrev - Studio Clay',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #547264;">Ny prenumerant på nyhetsbrev</h2>
          <p>En ny person har registrerat sig för att prenumerera på nyhetsbrevet:</p>
          <p><strong>E-postadress:</strong> ${subscriberEmail}</p>
          <p>Den här e-postadressen har lagts till i din lista av prenumeranter.</p>
          <p style="margin-top: 20px;">Med vänliga hälsningar,<br/>Studio Clay</p>
        </div>
      `,
    });
    
    // Return success response
    return NextResponse.json(
      { 
        success: true, 
        message: "Successfully subscribed to newsletter",
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error("Server error processing newsletter subscription:", error);
    return NextResponse.json(
      { error: "Server error processing newsletter subscription" },
      { status: 500 }
    );
  }
} 