'use client';

import { useState, useEffect } from 'react';
import { TextField, Button, Box, Paper, Typography, CircularProgress, Grid } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import Image from 'next/image';
import emailjs from '@emailjs/browser';
import { emailConfig } from '../config/email';

/*
 * EmailJS Setup Instructions:
 * 1. Create an account at https://www.emailjs.com/
 * 2. Create a new Email Service (e.g., Gmail, Outlook, or other)
 * 3. Create a new Email Template with the variables:
 *    - to_email (recipient's email - evabjorkhtc@gmail.com)
 *    - from_name (sender's name)
 *    - from_email (sender's email)
 *    - message (message content)
 * 4. Get your EmailJS credentials and update them in src/config/email.ts:
 *    - Public Key: From Account > API Keys
 *    - Service ID: From Email Services > [Your Service] > Service ID
 *    - Template ID: From Email Templates > [Your Template] > Template ID
 */

const Kontakt = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Initialize EmailJS with your public key (only needed for older versions)
  useEffect(() => {
    emailjs.init(emailConfig.publicKey);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    // Check if EmailJS credentials are properly configured
    if (emailConfig.publicKey === "YOUR_PUBLIC_KEY" || 
        emailConfig.serviceId === "YOUR_SERVICE_ID" || 
        emailConfig.templateId === "YOUR_TEMPLATE_ID") {
      
      setIsSubmitting(false);
      setError('EmailJS-konfigurationen är inte korrekt inställd. Vänligen kontrollera src/config/email.ts-filen.');
      console.error('EmailJS configuration error: EmailJS credentials are not properly set in src/config/email.ts');
      return;
    }
    
    // Create template parameters - make sure these match EXACTLY what's in your EmailJS template
    // Including multiple property name patterns to handle different EmailJS template configurations
    const templateParams = {
      // For the recipient
      to_email: emailConfig.recipientEmail,
      to_name: 'Studio Clay',
      toEmail: emailConfig.recipientEmail,
      recipient: emailConfig.recipientEmail,
      
      // For the sender's name
      from_name: formData.name,
      fromName: formData.name,
      name: formData.name,
      sender_name: formData.name,
      
      // For the sender's email
      from_email: formData.email,
      fromEmail: formData.email,
      email: formData.email,
      sender_email: formData.email,
      reply_to: formData.email,
      
      // For the message
      message: formData.message,
      content: formData.message,
      body: formData.message,
      
      // Additional context
      subject: 'Nytt meddelande från Studio Clay webbformulär'
    };
    
    // Log the parameters being sent for debugging
    console.log('Sending email with params:', templateParams);
    
    // Using the recommended method from EmailJS documentation
    emailjs.send(
      emailConfig.serviceId,
      emailConfig.templateId,
      templateParams,
      {
        publicKey: emailConfig.publicKey,
      }
    )
      .then((response) => {
        console.log('Email sent successfully:', response);
        setIsSubmitting(false);
        setSubmitted(true);
        setFormData({ name: '', email: '', message: '' });
        
        // Reset success message after 5 seconds
        setTimeout(() => {
          setSubmitted(false);
        }, 5000);
      })
      .catch((err) => {
        console.error('Email sending failed:', err);
        setIsSubmitting(false);
        
        // Safely access error message or convert error to string
        const errorMessage = err && typeof err === 'object' ? 
          (err.message || err.text || JSON.stringify(err)) : 
          String(err);
        
        console.log('Error message:', errorMessage);
        
        // Provide more specific error messages based on common issues
        if (errorMessage.includes('service_id')) {
          setError('Fel service ID. Kontrollera ditt EmailJS service ID i config/email.ts.');
        } else if (errorMessage.includes('template_id')) {
          setError('Fel template ID. Kontrollera ditt EmailJS template ID i config/email.ts.');
        } else if (errorMessage.includes('public_key')) {
          setError('Fel public key. Kontrollera din EmailJS public key i config/email.ts.');
        } else if (errorMessage.includes('network')) {
          setError('Nätverksfel. Kontrollera din internetanslutning och försök igen.');
        } else {
          setError('Det gick inte att skicka meddelandet. Kontrollera att din EmailJS-mall har variablerna: to_email, from_name, from_email, message.');
        }
      });
  };

  return (
    <section className="py-16 md:py-24 pb-48" id="kontakt">
      <div className="container-custom mb-12">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Kontakta Oss</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Redo att starta ditt nästa projekt? Kontakta oss idag för en konsultation.
          </p>
        </div>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{ 
              position: 'relative', 
              width: '90%', 
              height: { xs: '250px', md: '420px' },
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: 3,
              mb: { xs: 4, md: 8 }
            }}>
              <Image 
                src="/pictures/471904659_17904629667091314_3509545999734555197_n_18299326909224234.jpg"
                alt="Studio Clay" 
                layout="fill"
                objectFit="cover"
                priority
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ maxWidth: '90%', mx: 'auto' }}>
              <Typography variant="h5" component="h3" sx={{ fontWeight: 600, mb: 3 }}>
                Skicka ett Meddelande
              </Typography>
              
              {submitted ? (
                <Paper 
                  elevation={2} 
                  sx={{ 
                    padding: 3, 
                    textAlign: 'center',
                    backgroundColor: 'rgba(84, 114, 100, 0.08)',
                    borderRadius: 2,
                    mb: 8
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
                    Tack!
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Ditt meddelande har skickats. Vi återkommer till dig så snart som möjligt.
                  </Typography>
                </Paper>
              ) : (
                <Paper elevation={2} sx={{ p: 3, borderRadius: 2, mb: 8 }}>
                  <Box component="form" onSubmit={handleSubmit} sx={{ '& .MuiTextField-root': { mb: 2.5 } }}>
                    {error && (
                      <Typography color="error" sx={{ mb: 2 }}>
                        {error}
                      </Typography>
                    )}
                    <TextField
                      fullWidth
                      required
                      id="name"
                      name="name"
                      label="Ditt Namn"
                      value={formData.name}
                      onChange={handleChange}
                      variant="outlined"
                      size="small"
                    />
                    
                    <TextField
                      fullWidth
                      required
                      id="email"
                      name="email"
                      label="Din E-post"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      variant="outlined"
                      size="small"
                    />
                    
                    <TextField
                      fullWidth
                      required
                      id="message"
                      name="message"
                      label="Ditt Meddelande"
                      value={formData.message}
                      onChange={handleChange}
                      multiline
                      rows={4}
                      variant="outlined"
                      size="small"
                    />
                    
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      size="medium"
                      disabled={isSubmitting}
                      startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
                      sx={{ 
                        mt: 2, 
                        py: 1.25,
                        bgcolor: '#547264', 
                        '&:hover': {
                          bgcolor: '#3f5a4b'
                        }
                      }}
                    >
                      {isSubmitting ? 'Skickar...' : 'Skicka Meddelande'}
                    </Button>
                  </Box>
                </Paper>
              )}
            </Box>
          </Grid>
        </Grid>
      </div>
    </section>
  );
};

export default Kontakt; 