import React from 'react';
import {
  Box,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import Image from 'next/image';
import { FormTextField } from '../common/FormField';

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

  return (
    <Box sx={{ ml: 4, mt: 2 }}>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Vi kommer skicka en betalningsförfrågan till följande telefonnummer:
      </Typography>
      <FormTextField
        name="swishPhone"
        label="Telefonnummer för Swish"
        fullWidth
        value={phoneNumber}
        onChange={(e) => onPhoneNumberChange(e.target.value)}
        error={Boolean(error)}
        helperText={error || "T.ex. 0701234567 eller 070123456"}
        disabled={disabled}
        InputProps={{
          startAdornment: (
            <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
          ),
        }}
        sx={{ maxWidth: '300px' }}
      />
      <Box sx={{ mt: 2, height: 30, width: 100, position: 'relative' }}>
        <Image
          src={swishLogoSrc}
          alt="Swish"
          fill
          style={{ objectFit: 'contain' }}
        />
      </Box>
      <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
        Betalning sker efter att bokningen har bekräftats.
      </Typography>
    </Box>
  );
};

export default SwishPaymentForm; 