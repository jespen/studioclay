/**
 * DEPRECATED - DENNA FIL ANVÄNDS INTE LÄNGRE
 * 
 * Denna komponent har ersatts av nyare implementationer i enlighet med betalningsrefaktoriseringen.
 * Behåller tills vidare för referens, men kan tas bort.
 * 
 * Om du ser detta och applikationen fortfarande fungerar korrekt, 
 * är det säkert att ta bort denna fil.
 */

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Box, Alert, TextField, Grid, Stack, Typography } from '@mui/material';
import { UserInfo, InvoiceDetails } from '@/types/booking';
import { PAYMENT_METHODS, PAYMENT_STATUSES, PRODUCT_TYPES, ProductType, getValidProductType } from '@/constants/statusCodes';
import { createInvoicePayment } from '@/services/invoice/invoiceService';
import { InvoicePaymentRequest } from '@/types/paymentTypes';

// Export the ref interface for importing in other components
export interface InvoicePaymentSectionRef {
  validateForm: () => boolean;
  getInvoiceDetails: () => InvoiceDetails;
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

// Create the component
const InvoicePaymentSection = forwardRef<InvoicePaymentSectionRef, InvoicePaymentSectionProps>(
  ({ userInfo, courseId, amount, product_type = PRODUCT_TYPES.COURSE, onPaymentComplete, onValidationError }, ref) => {
    const [address, setAddress] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [city, setCity] = useState('');
    const [reference, setReference] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [invoiceFormError, setInvoiceFormError] = useState<string | null>(null);
    
    // Säkerställ att produkt-typen är giltig
    const validProductType = getValidProductType(product_type);
    
    console.log('[InvoicePaymentSection] Initializing with:', {
      productType: validProductType,
      productId: courseId,
      amount
    });

    // Autofill address fields from userInfo if present
    useEffect(() => {
      if (userInfo) {
        if (userInfo.address) setAddress(userInfo.address);
        if (userInfo.postalCode) setPostalCode(userInfo.postalCode);
        if (userInfo.city) setCity(userInfo.city);
      }
    }, [userInfo]);

    useImperativeHandle(ref, () => ({
      validateForm,
      getInvoiceDetails: () => ({
        address,
        postalCode,
        city,
        reference
      }),
      submitInvoicePayment: handleSubmit
    }));

    const validateForm = (): boolean => {
      // Clear previous errors
      setInvoiceFormError(null);
      
      if (!address.trim()) {
        const error = 'Adress är obligatoriskt';
        setInvoiceFormError(error);
        if (onValidationError) onValidationError(error);
        return false;
      }
      
      if (!postalCode.trim()) {
        const error = 'Postnummer är obligatoriskt';
        setInvoiceFormError(error);
        if (onValidationError) onValidationError(error);
        return false;
      }
      
      if (!city.trim()) {
        const error = 'Ort är obligatoriskt';
        setInvoiceFormError(error);
        if (onValidationError) onValidationError(error);
        return false;
      }
      
      return true;
    };

    const handleSubmit = async (): Promise<boolean> => {
      console.log('[InvoicePaymentSection] Submitting invoice payment');
      
      if (!validateForm()) {
        return false;
      }

      setIsSubmitting(true);

      try {
        // Construct the request data for the service call
        const requestData: Omit<InvoicePaymentRequest, 'idempotency_key'> = {
          payment_method: PAYMENT_METHODS.INVOICE,
          amount: amount,
          product_id: courseId,
          product_type: validProductType,
          userInfo: {
            ...userInfo,
            // Bara inkludera numberOfParticipants för kursbokningar
            ...(validProductType === PRODUCT_TYPES.COURSE && userInfo.numberOfParticipants && {
              numberOfParticipants: userInfo.numberOfParticipants
            })
          },
          invoiceDetails: {
            address: address.trim(),
            postalCode: postalCode.trim(),
            city: city.trim(),
            reference: reference || ''
          }
        };

        // Add extra debug logging to check values
        console.log('[InvoicePaymentSection] Invoice details values:', {
          address: address.trim(),
          postalCode: postalCode.trim(),
          city: city.trim(),
          hasEmptyValues: !address.trim() || !postalCode.trim() || !city.trim()
        });
        
        // Use invoice service to make the API call
        const responseData = await createInvoicePayment(requestData);
        
        console.log('[InvoicePaymentSection] Response data:', JSON.stringify(responseData, null, 2));
        
        // Call the success callback with response data
        if (onPaymentComplete) {
          onPaymentComplete(responseData);
        }
        
        setIsSubmitting(false);
        return true;
      } catch (error) {
        console.error('[InvoicePaymentSection] Error:', error);
        setInvoiceFormError(error instanceof Error ? error.message : 'Ett fel uppstod');
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
              error={!address && !!invoiceFormError}
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
              error={!postalCode && !!invoiceFormError}
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
              error={!city && !!invoiceFormError}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Referens (frivilligt)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={isSubmitting}
              placeholder="t.ex. ert ordernummer"
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

// Export the component as default AND named export
export { InvoicePaymentSection };
export default InvoicePaymentSection; 