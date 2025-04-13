import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Box, Alert, TextField, Grid, Typography } from '@mui/material';
import { UserInfo } from '@/types/booking';
import { 
  PAYMENT_METHODS, 
  PRODUCT_TYPES, 
  getValidProductType 
} from '@/constants/statusCodes';
import { 
  createStandardizedInvoicePayment, 
  NormalizedInvoicePaymentRequest 
} from '@/services/invoice/invoiceService';
import { 
  PaymentErrorCode, 
  PaymentReferenceData,
  StandardPaymentResponse 
} from '@/types/paymentTypes';

/**
 * Interface för externa referenser till komponenten (ref)
 */
export interface InvoicePaymentSectionRef {
  validateForm: () => boolean;
  getInvoiceDetails: () => InvoiceDetails;
  submitInvoicePayment: () => Promise<boolean>;
}

/**
 * Interface för faktureringsdetaljer
 */
export interface InvoiceDetails {
  address: string;
  postalCode: string;
  city: string;
  reference?: string;
}

/**
 * Props för InvoicePaymentSection
 */
export interface InvoicePaymentSectionProps {
  /** Användarinformation för fakturering */
  userInfo: UserInfo;
  /** Produkt/kurs/artikel ID som faktureras */
  productId: string;
  /** Produkttyp (course, gift_card, art_product) */
  productType?: string;
  /** Belopp att fakturera */
  amount: number;
  /** Antal produkter (defaultar till 1) */
  quantity?: number;
  /** Callback när betalningen är slutförd */
  onPaymentComplete?: (paymentData: PaymentReferenceData) => void;
  /** Callback vid valideringsfel */
  onValidationError?: (error: string) => void;
  /** Callback vid API-fel */
  onPaymentError?: (error: Error, errorCode?: string) => void;
}

/**
 * Modern, typstark faktureringskomponent för att hantera fakturabetalningar
 */
const InvoicePaymentSection = forwardRef<InvoicePaymentSectionRef, InvoicePaymentSectionProps>(
  ({ 
    userInfo, 
    productId, 
    productType = PRODUCT_TYPES.COURSE, 
    amount,
    quantity = 1,
    onPaymentComplete, 
    onValidationError,
    onPaymentError
  }, ref) => {
    // Form state
    const [address, setAddress] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [city, setCity] = useState('');
    const [reference, setReference] = useState('');
    
    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [invoiceFormError, setInvoiceFormError] = useState<string | null>(null);
    
    // Validera produkttyp
    const validProductType = getValidProductType(productType);
    
    console.log('[InvoicePaymentSection] Initializing with:', {
      productType: validProductType,
      productId,
      amount
    });

    // Autofyll adressuppgifter från userInfo om tillgängligt
    useEffect(() => {
      if (userInfo) {
        if (userInfo.address) setAddress(userInfo.address);
        if (userInfo.postalCode) setPostalCode(userInfo.postalCode);
        if (userInfo.city) setCity(userInfo.city);
      }
    }, [userInfo]);

    // Exponera funktioner via ref
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

    /**
     * Validera formuläret innan det skickas
     */
    const validateForm = (): boolean => {
      // Rensa tidigare fel
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

    /**
     * Skicka fakturabetalningen
     */
    const handleSubmit = async (): Promise<boolean> => {
      console.log('[InvoicePaymentSection] Submitting invoice payment');
      
      if (!validateForm()) {
        return false;
      }

      setIsSubmitting(true);

      try {
        // Skapa strukturerad betalningsdata
        const requestData: NormalizedInvoicePaymentRequest = {
          userInfo: {
            firstName: userInfo.firstName,
            lastName: userInfo.lastName,
            email: userInfo.email,
            phoneNumber: userInfo.phone,
            numberOfParticipants: userInfo.numberOfParticipants
          },
          invoiceDetails: {
            address: address.trim(),
            postalCode: postalCode.trim(),
            city: city.trim(),
            reference: reference || ''
          },
          productType: validProductType,
          productId,
          amount,
          quantity
        };

        // Loggning för felsökning
        console.log('[InvoicePaymentSection] Request data:', {
          productId,
          productType: validProductType,
          amount,
          invoiceAddress: address.trim(),
          invoicePostalCode: postalCode.trim(),
          invoiceCity: city.trim(),
        });
        
        // Använd vår nya standardiserade API-tjänst
        const response: StandardPaymentResponse = await createStandardizedInvoicePayment(requestData);
        
        console.log('[InvoicePaymentSection] Response:', response);
        
        // Hantera misslyckad betalning
        if (!response.success) {
          const errorMessage = response.error || 'Ett fel uppstod vid betalningen';
          setInvoiceFormError(errorMessage);
          
          if (onPaymentError) {
            onPaymentError(new Error(errorMessage), response.errorCode);
          }
          
          setIsSubmitting(false);
          return false;
        }
        
        // Hantera framgångsrik betalning
        if (onPaymentComplete && response.data) {
          onPaymentComplete(response.data);
        }
        
        setIsSubmitting(false);
        return true;
      } catch (error) {
        console.error('[InvoicePaymentSection] Error:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Ett fel uppstod';
        setInvoiceFormError(errorMessage);
        
        if (onPaymentError) {
          onPaymentError(error instanceof Error ? error : new Error(errorMessage));
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
          Fakturan kommer att skickas till {userInfo?.email}. Betalningsvillkor är 14 dagar.
        </Typography>
      </Box>
    );
  }
);

// Namnge komponenten för bättre debugging
InvoicePaymentSection.displayName = 'InvoicePaymentSection';

export default InvoicePaymentSection; 