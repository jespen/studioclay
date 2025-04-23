import React from 'react';
import {
  Box,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
// import PhoneIcon from '@mui/icons-material/Phone';
// import Image from 'next/image';
import { FormTextField } from '../common/FormField';
// import { isValidSwishPhoneNumber } from '@/utils/swish/phoneNumberFormatter';

interface SwishPaymentFormProps {
  phoneNumber: string;
  onPhoneNumberChange: (phone: string) => void;
  error?: string;
  disabled?: boolean;
}

const SwishPaymentForm: React.FC<SwishPaymentFormProps> = ({
  phoneNumber,
  onPhoneNumberChange,
  error,
  disabled = false,
}) => {
  const theme = useTheme();
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  
  // Get the appropriate Swish logo based on theme
  const swishLogoSrc = prefersDarkMode 
    ? '/Swish Logo Secondary Dark-BG SVG.svg'
    : '/Swish Logo Secondary Light-BG SVG.svg';

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onPhoneNumberChange(value);
  };

  return (
    <Box sx={{ ml: 4, mt: 2 }}>

      <Typography variant="body2" sx={{ mb: 1 }}>
        Swish som betalsätt kommer inom kort. Använd faktura metoden för att betala för tillfället.
        {/* Vi kommer skicka en betalningsförfrågan till följande telefonnummer: */}
      </Typography>
      {/* <FormTextField
        name="phoneNumber"
        label="Mobilnummer *"
        fullWidth
        value={phoneNumber}
        onChange={handlePhoneChange}
        error={error}
        disabled={disabled}
        placeholder="0700000000"
        helperText="Ange ett svenskt mobilnummer som är kopplat till Swish"
        required
      /> */}


      {/* <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
        Betalning sker efter att bokningen har bekräftats.
      </Typography> */}
    </Box>
  );
};

export default SwishPaymentForm; 