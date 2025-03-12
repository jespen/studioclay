'use client';

import { useState } from 'react';
import { TextField, Button } from '@mui/material';
import styles from '@/styles/NewsletterBanner.module.css';

const NewsletterBanner = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically handle the newsletter subscription
    // For now, we'll just show a success message
    setSubscribed(true);
    setEmail('');
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
                size="small"
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
                sx={{
                  backgroundColor: '#547264',
                  '&:hover': {
                    backgroundColor: '#456254',
                  }
                }}
              >
                Prenumerera
              </Button>
            </form>
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