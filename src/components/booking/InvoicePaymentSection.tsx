import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Box, Alert, TextField, Grid, Stack, Typography } from '@mui/material';
import { UserInfo } from '@/utils/dataFetcher';
import { PaymentStatus, PAYMENT_STATUSES } from '@/constants/statusCodes';
import { setPaymentReference } from '@/utils/flowStorage';
import { v4 as uuidv4 } from 'uuid';

export interface InvoicePaymentSectionRef {
  validateForm: () => boolean;
  getInvoiceDetails: () => any;
  submitInvoicePayment: () => Promise<boolean>;
}

interface InvoicePaymentSectionProps {
  userInfo: UserInfo;
  courseId: string;
  amount: number;
  product_type?: string;
  onPaymentComplete?: (paymentData: any) => void;
  onValidationError?: (error: string) => void;
}

const InvoicePaymentSection = forwardRef<InvoicePaymentSectionRef, InvoicePaymentSectionProps>(
  ({ userInfo, courseId, amount, product_type = 'course', onPaymentComplete, onValidationError }, ref) => {
    const [address, setAddress] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [city, setCity] = useState('');
    const [reference, setReference] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [idempotencyKey, setIdempotencyKey] = useState('');
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(PAYMENT_STATUSES.CREATED);
    const [invoiceFormError, setInvoiceFormError] = useState<string | null>(null);
    
    console.log('[InvoicePaymentSection] Initializing with props:', {
      userInfoProvided: !!userInfo,
      courseId,
      amount,
      product_type,
      hasPaymentCompleteCallback: !!onPaymentComplete,
      hasValidationErrorCallback: !!onValidationError
    });

    // Create idempotency key if needed
    useEffect(() => {
      if (!idempotencyKey) {
        const newKey = uuidv4();
        console.log('[InvoicePaymentSection] Generated new idempotency key:', newKey);
        setIdempotencyKey(newKey);
      }
    }, [idempotencyKey]);

    useImperativeHandle(ref, () => ({
      validateForm: () => {
        console.log('[InvoicePaymentSection] Validating form');
        if (!address) {
          const error = 'Faktureringsadress är obligatorisk';
          setInvoiceFormError(error);
          if (onValidationError) onValidationError(error);
          return false;
        }
        if (!postalCode) {
          const error = 'Postnummer är obligatoriskt';
          setInvoiceFormError(error);
          if (onValidationError) onValidationError(error);
          return false;
        }
        if (!city) {
          const error = 'Ort är obligatorisk';
          setInvoiceFormError(error);
          if (onValidationError) onValidationError(error);
          return false;
        }
        
        setInvoiceFormError(null);
        return true;
      },
      getInvoiceDetails: () => {
        return {
          address,
          postalCode,
          city,
          reference
        };
      },
      submitInvoicePayment: async () => {
        return await handleInvoicePayment();
      }
    }));

    const handleInvoicePayment = async (): Promise<boolean> => {
      console.log('[InvoicePaymentSection] Starting invoice payment submission');
      setIsSubmitting(true);
      setInvoiceFormError(null);
      
      try {
        if (!userInfo) {
          throw new Error('Användarinformation saknas');
        }
        
        // Generate a unique payment reference
        const paymentRef = `${product_type.substring(0, 1)}-inv-${Date.now()}`;
        console.log('[InvoicePaymentSection] Generated payment reference:', paymentRef);
        
        // Store the reference in local storage
        setPaymentReference(paymentRef);
        
        // Create standardized invoice payment request body
        const requestBody = {
          payment_method: "invoice",
          amount,
          product_type,
          product_id: courseId,
          payment_reference: paymentRef,
          idempotency_key: idempotencyKey,
          userInfo: {
            firstName: userInfo.firstName,
            lastName: userInfo.lastName,
            email: userInfo.email,
            phone: userInfo.phone,
            numberOfParticipants: userInfo.numberOfParticipants || 1
          },
          invoiceDetails: {
            address,
            postalCode,
            city,
            reference
          }
        };

        console.log('[InvoicePaymentSection] Sending invoice payment request:', requestBody);

        // Make API call to create invoice payment
        const response = await fetch('/api/payments/invoice/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        console.log('[InvoicePaymentSection] API response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('[InvoicePaymentSection] API error response:', errorData);
          throw new Error(errorData.message || errorData.error || 'Ett fel uppstod vid fakturabetalning');
        }

        const data = await response.json();
        console.log('[InvoicePaymentSection] Invoice payment creation success:', data);
        
        // Handle successful payment
        setPaymentStatus(PAYMENT_STATUSES.PAID);
        
        // Call onPaymentComplete callback if provided
        if (onPaymentComplete) {
          console.log('[InvoicePaymentSection] Calling onPaymentComplete with data:', data);
          onPaymentComplete(data);
        } else {
          console.warn('[InvoicePaymentSection] No onPaymentComplete callback provided');
        }
        
        setIsSubmitting(false);
        return true;
      } catch (error) {
        console.error('[InvoicePaymentSection] Invoice payment error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Ett fel uppstod vid fakturabetalning';
        setInvoiceFormError(errorMessage);
        
        if (onValidationError) {
          console.log('[InvoicePaymentSection] Calling onValidationError with:', errorMessage);
          onValidationError(errorMessage);
        }
        
        setIsSubmitting(false);
        return false;
      }
    };

    return (
      <Box sx={{ mt: 2 }}>
        {invoiceFormError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {invoiceFormError}
          </Alert>
        )}
        
        <Typography variant="body2" gutterBottom>
          Ange faktureringsuppgifter:
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Faktureringsadress"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Postnummer"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Ort"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Er referens (valfri)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={isSubmitting}
            />
          </Grid>
        </Grid>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Fakturan kommer att skickas till {userInfo?.email}. Betalningsvillkor är 10 dagar.
        </Typography>
      </Box>
    );
  }
);

InvoicePaymentSection.displayName = 'InvoicePaymentSection';

export default InvoicePaymentSection; 