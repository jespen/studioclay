'use client';

import { useState } from 'react';
import { TextField, Button, CircularProgress } from '@mui/material';
import styles from '@/styles/NewsletterBanner.module.css';

const NewsletterBanner = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Send email data to Eva's email address
      const response = await fetch('/api/newsletter-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          subscriberEmail: email,
          recipientEmail: 'eva@studioclay.se'
        }),
      });
      
      if (response.ok) {
        setSubscribed(true);
        setEmail('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Något gick fel. Försök igen senare.');
        console.error('Failed to subscribe to newsletter', errorData);
      }
    } catch (error) {
      setError('Något gick fel. Försök igen senare.');
      console.error('Error subscribing to newsletter:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.banner}>
      <div className={styles.container}>
        {!subscribed ? (
          <>
            <h3 className={styles.title}>
              <span className={styles.highlight}>Prenumerera</span>
              <span className={styles.regularText}> på vårt nyhetsbrev</span>
            </h3>
            <p className={styles.description}>
              Få uppdateringar om nya kurser och evenemang direkt i din inkorg
            </p>
            <form onSubmit={handleSubmit} className={styles.form}>
              <TextField
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Din e-postadress"
                type="email"
                required
                disabled={loading}
                size="small"
                error={!!error}
                helperText={error}
                sx={{
                  width: '340px',
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                    borderRadius: '4px',
                  }
                }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{
                  backgroundColor: '#547264',
                  '&:hover': {
                    backgroundColor: '#456254',
                  }
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Prenumerera'}
              </Button>
            </form>
            {error && (
              <p className={styles.error}>{error}</p>
            )}
          </>
        ) : (
          <div className={styles.success}>
            <p>Tack för din prenumeration! 🎉</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsletterBanner; 