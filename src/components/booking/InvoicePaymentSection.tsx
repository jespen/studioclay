import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Box } from '@mui/material';
import InvoicePaymentForm from './InvoicePaymentForm';
import InvoicePaymentDialog from './InvoicePaymentDialog';

export interface InvoicePaymentSectionRef {
  handleCreatePayment: () => Promise<boolean>;
}

interface InvoicePaymentSectionProps {
  userInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    numberOfParticipants: string;
  };
  courseId: string;
  amount: number;
  product_type: string;
  onPaymentComplete: (success: boolean | {
    reference: string;
    status: string;
    payment_method: string;
  }) => void;
  onValidationError?: (error: string) => void;
  disabled?: boolean;
}

const InvoicePaymentSection = forwardRef<InvoicePaymentSectionRef, InvoicePaymentSectionProps>(({
  userInfo,
  courseId,
  amount,
  product_type,
  onPaymentComplete,
  onValidationError,
  disabled = false,
}, ref) => {
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [reference, setReference] = useState('');
  const [errors, setErrors] = useState<{
    address?: string;
    postalCode?: string;
    city?: string;
    reference?: string;
  }>({});
  const [showDialog, setShowDialog] = useState(false);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [invoiceNumber, setInvoiceNumber] = useState<string>();
  const [bookingReference, setBookingReference] = useState<string>();

  const validateFields = (): boolean => {
    const newErrors: typeof errors = {};

    if (!address.trim()) {
      newErrors.address = 'Adress är obligatoriskt';
    }

    if (!postalCode.trim()) {
      newErrors.postalCode = 'Postnummer är obligatoriskt';
    } else if (!/^\d{3}\s?\d{2}$/.test(postalCode.replace(/\s/g, ''))) {
      newErrors.postalCode = 'Ange ett giltigt postnummer (5 siffror)';
    }

    if (!city.trim()) {
      newErrors.city = 'Stad är obligatoriskt';
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      onValidationError?.(Object.values(newErrors)[0]);
      return false;
    }

    return true;
  };

  const handleCreatePayment = async (): Promise<boolean> => {
    if (!validateFields()) {
      console.log('InvoicePaymentSection: Field validation failed');
      return false;
    }

    try {
      console.log('InvoicePaymentSection: Starting payment creation process');
      setShowDialog(true);
      setStatus('loading');

      // Check if this is a gift card payment
      const isGiftCard = courseId === 'gift-card';
      console.log('InvoicePaymentSection: Is gift card payment:', isGiftCard);
      
      // If this is a gift card, get the item details from localStorage
      let itemDetails = null;
      if (isGiftCard) {
        try {
          console.log('InvoicePaymentSection: Attempting to get gift card details');
          // Try to get gift card details using both storage helpers
          const giftCardDetails = await import('@/utils/flowStorage').then(module => 
            module.getGiftCardDetails()
          );
          
          if (giftCardDetails) {
            itemDetails = giftCardDetails;
            console.log('INVOICE-1: Using gift card details from flowStorage:', JSON.stringify(itemDetails));
          } else {
            // Fallback to general item details
            console.log('InvoicePaymentSection: Gift card details not found, trying general item details');
            const generalItemDetails = await import('@/utils/flowStorage').then(module => 
              module.getItemDetails()
            );
            
            if (generalItemDetails) {
              itemDetails = generalItemDetails;
              console.log('INVOICE-2: Using item details from flowStorage:', JSON.stringify(itemDetails));
            } else {
              // Last resort: try legacy localStorage directly
              console.log('InvoicePaymentSection: No item details in flowStorage, trying localStorage directly');
              const storedItemDetails = localStorage.getItem('itemDetails');
              if (storedItemDetails) {
                try {
                  itemDetails = JSON.parse(storedItemDetails);
                  console.log('INVOICE-3: Using item details from direct localStorage:', JSON.stringify(itemDetails));
                } catch (parseError) {
                  console.error('InvoicePaymentSection: Error parsing item details from localStorage:', parseError);
                }
              } else {
                console.log('InvoicePaymentSection: No item details found in any storage');
              }
            }
          }
        } catch (e) {
          console.error('InvoicePaymentSection: Error getting gift card details:', e);
        }
      }

      console.log('InvoicePaymentSection: Preparing payment request data');
      const requestData = {
        courseId,
        userInfo,
        paymentDetails: {
          method: 'invoice',
          invoiceDetails: {
            address,
            postalCode: postalCode.replace(/\s/g, ''),
            city,
            reference: reference.trim() || undefined,
          }
        },
        amount,
        product_type,
        numberOfParticipants: parseInt(userInfo.numberOfParticipants) || 1,
        itemDetails, // Include item details for gift cards
      };
      
      console.log('InvoicePaymentSection: Payment request data:', JSON.stringify({
        ...requestData,
        userInfo: {
          ...requestData.userInfo,
          email: requestData.userInfo.email ? '***@***.***' : undefined,
          phone: requestData.userInfo.phone ? '***' : undefined
        }
      }));

      console.log('InvoicePaymentSection: Sending request to /api/invoice/create');
      const response = await fetch('/api/invoice/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      console.log('InvoicePaymentSection: Response status:', response.status);

      let data;
      try {
        const responseText = await response.text();
        console.log('InvoicePaymentSection: Raw response:', responseText);
        
        try {
          data = JSON.parse(responseText);
          console.log('InvoicePaymentSection: Parsed response data:', data);
        } catch (parseError) {
          console.error('InvoicePaymentSection: Error parsing response JSON:', parseError);
          throw new Error(`Failed to parse response: ${responseText}`);
        }
      } catch (textError) {
        console.error('InvoicePaymentSection: Error getting response text:', textError);
        throw new Error('Failed to read response');
      }

      if (!data.success) {
        console.error('InvoicePaymentSection: API returned error:', data.error);
        throw new Error(data.error || 'Failed to create invoice');
      }

      console.log('InvoicePaymentSection: Payment creation successful:', data);
      setInvoiceNumber(data.invoiceNumber);
      setBookingReference(data.bookingReference);
      setStatus('success');
      setShowDialog(false);
      
      // If this is a gift card purchase and we have a giftCardId in the response,
      // update the gift card details in flowStorage with the new ID
      if (isGiftCard && (data.giftCardId || data.id)) {
        const cardId = data.giftCardId || data.id;
        console.log('INVOICE-4: Gift card created with ID:', cardId);
        
        try {
          // Import the storage helper functions
          const { setGiftCardDetails, getGiftCardDetails, setItemDetails, getItemDetails } = await import('@/utils/flowStorage');
          
          // Update gift card details
          const currentGiftCardDetails = getGiftCardDetails();
          if (currentGiftCardDetails) {
            // Add the ID to the existing details
            const updatedGiftCardDetails = {
              ...currentGiftCardDetails,
              id: cardId,
              code: data.giftCardCode // Save code if available
            };
            
            console.log('INVOICE-5: Updating gift card details with ID:', JSON.stringify(updatedGiftCardDetails));
            setGiftCardDetails(updatedGiftCardDetails);
          }
          
          // ALSO update itemDetails since that's what GiftCardConfirmation might be using
          const currentItemDetails = getItemDetails();
          if (currentItemDetails) {
            const updatedItemDetails = {
              ...currentItemDetails,
              id: cardId,
              code: data.giftCardCode
            };
            console.log('INVOICE-6: Updating item details with ID:', JSON.stringify(updatedItemDetails));
            setItemDetails(updatedItemDetails);
          }
          
          // Ensure localStorage has the values (as a fallback)
          try {
            localStorage.setItem('giftCardId', cardId);
            console.log('INVOICE-7: Set direct localStorage giftCardId:', cardId);
            if (data.giftCardCode) {
              localStorage.setItem('giftCardCode', data.giftCardCode);
              console.log('INVOICE-8: Set direct localStorage giftCardCode:', data.giftCardCode);
            }
          } catch (e) {
            console.error('INVOICE-ERROR-1: Error setting localStorage values:', e);
          }
        } catch (e) {
          console.error('INVOICE-ERROR-2: Error updating gift card details with ID:', e);
        }
      }
      
      // Return the reference with the proper status
      console.log('INVOICE-9: Payment success handler called with data:', {
        reference: data.invoiceNumber || data.bookingReference,
        status: 'CREATED',
        payment_method: 'invoice'
      });
      console.log('INVOICE-10: Saving payment info with status:', 'CREATED');

      onPaymentComplete({
        reference: data.invoiceNumber || data.bookingReference,
        status: 'CREATED',
        payment_method: 'invoice'
      });
      
      return true;
    } catch (error) {
      console.error('InvoicePaymentSection: Error creating invoice:', error);
      setStatus('error');
      onValidationError?.('Det gick inte att skapa fakturan. Försök igen senare.');
      return false;
    }
  };

  useImperativeHandle(ref, () => ({
    handleCreatePayment
  }));

  const handleCloseDialog = () => {
    if (status === 'success') {
      setShowDialog(false);
      onPaymentComplete(true);
    } else if (status === 'error') {
      setShowDialog(false);
    }
  };

  return (
    <Box>
      <InvoicePaymentForm
        address={address}
        postalCode={postalCode}
        city={city}
        reference={reference}
        onAddressChange={setAddress}
        onPostalCodeChange={setPostalCode}
        onCityChange={setCity}
        onReferenceChange={setReference}
        errors={errors}
        disabled={disabled}
      />
      
      <InvoicePaymentDialog
        open={showDialog}
        onClose={handleCloseDialog}
        status={status}
        invoiceNumber={invoiceNumber}
        bookingReference={bookingReference}
      />
    </Box>
  );
});

InvoicePaymentSection.displayName = 'InvoicePaymentSection';

export default InvoicePaymentSection; 