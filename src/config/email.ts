/*
 * EmailJS Configuration
 * 
 * To make the contact form work, you need to:
 * 
 * 1. Sign up at https://www.emailjs.com/ (they have a free tier)
 * 
 * 2. Create an Email Service:
 *    - Go to "Email Services" and click "Add New Service"
 *    - Select your email provider (Gmail, Outlook, etc.)
 *    - Connect your email account following their instructions
 *    - Copy the "Service ID" once created (looks like "service_abc123")
 * 
 * 3. Create an Email Template:
 *    - Go to "Email Templates" and click "Create New Template"
 *    - Design your email template using these variables:
 *      {{to_email}} - The recipient email
 *      {{from_name}} - The sender's name
 *      {{from_email}} - The sender's email
 *      {{message}} - The message content
 *    - Copy the "Template ID" once created (looks like "template_xyz789")
 * 
 * 4. Get your Public Key:
 *    - Go to Account > API Keys
 *    - Copy your "Public Key" (looks like "AbCdEfGh123456789")
 * 
 * 5. Replace the placeholder values below with your actual credentials
 *    - For example, change YOUR_PUBLIC_KEY to your actual public key like "AbCdEfGh123456789"
 */

// EmailJS configuration
export const emailConfig = {
  // Replace with your EmailJS public key from Account > API Keys
  // Example: publicKey: "AbCdEfGh123456789",
  publicKey: "7HcrFccRoJQDSWva3",
  
  // Replace with your EmailJS service ID from Email Services > [Your Service]
  // Example: serviceId: "service_abc123",
  serviceId: "service_w9z50hz",
  
  // Replace with your EmailJS template ID from Email Templates > [Your Template]
  // Example: templateId: "template_xyz789",
  templateId: "template_jfc0wcs",
  
  // The recipient email address - already set correctly
  recipientEmail: "eva@studioclay.se"
}; 