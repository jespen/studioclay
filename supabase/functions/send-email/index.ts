import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { renderTemplate } from './templates.ts';

const SMTP_HOSTNAME = Deno.env.get('SMTP_HOSTNAME') || 'smtp.gmail.com';
const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '587');
const SMTP_USERNAME = Deno.env.get('SMTP_USERNAME') || '';
const SMTP_PASSWORD = Deno.env.get('SMTP_PASSWORD') || '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'noreply@studioclay.se';
const EMAIL_REPLY_TO = Deno.env.get('EMAIL_REPLY_TO') || 'eva@studioclay.se';

interface EmailRequest {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, template, data } = await req.json() as EmailRequest;

    // Validate input
    if (!to || !subject || !template || !data) {
      throw new Error('Missing required fields');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new Error('Invalid email format');
    }

    // Get HTML content from template
    const html = await renderTemplate(template, data);

    // Initialize SMTP client
    const client = new SmtpClient();
    await client.connectTLS({
      hostname: SMTP_HOSTNAME,
      port: SMTP_PORT,
      username: SMTP_USERNAME,
      password: SMTP_PASSWORD,
    });

    // Send email
    await client.send({
      from: EMAIL_FROM,
      to: to,
      replyTo: EMAIL_REPLY_TO,
      subject: subject,
      content: html,
      html: html,
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error sending email:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
}); 