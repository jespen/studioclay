import React from 'react';
import { Box, TextField, Grid } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import MarkunreadMailboxIcon from '@mui/icons-material/MarkunreadMailbox';
import DescriptionIcon from '@mui/icons-material/Description';

interface InvoicePaymentFormProps {
  address: string;
  postalCode: string;
  city: string;
  reference: string;
  onAddressChange: (value: string) => void;
  onPostalCodeChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onReferenceChange: (value: string) => void;
  disabled?: boolean;
  errors?: {
    address?: string;
    postalCode?: string;
    city?: string;
    reference?: string;
  };
}

const InvoicePaymentForm: React.FC<InvoicePaymentFormProps> = ({
  address,
  postalCode,
  city,
  reference,
  onAddressChange,
  onPostalCodeChange,
  onCityChange,
  onReferenceChange,
  disabled = false,
  errors = {},
}) => {
  return (
    <Box sx={{ mt: 2, ml: 4 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Adress *"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            error={!!errors.address}
            helperText={errors.address}
            disabled={disabled}
            InputProps={{
              startAdornment: (
                <HomeIcon sx={{ mr: 1, color: 'text.secondary' }} />
              ),
            }}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Postnummer *"
            value={postalCode}
            onChange={(e) => onPostalCodeChange(e.target.value)}
            error={!!errors.postalCode}
            helperText={errors.postalCode}
            disabled={disabled}
            InputProps={{
              startAdornment: (
                <MarkunreadMailboxIcon sx={{ mr: 1, color: 'text.secondary' }} />
              ),
            }}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Stad *"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            error={!!errors.city}
            helperText={errors.city}
            disabled={disabled}
            InputProps={{
              startAdornment: (
                <LocationCityIcon sx={{ mr: 1, color: 'text.secondary' }} />
              ),
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Fakturareferens (valfritt)"
            value={reference}
            onChange={(e) => onReferenceChange(e.target.value)}
            error={!!errors.reference}
            helperText={errors.reference}
            disabled={disabled}
            InputProps={{
              startAdornment: (
                <DescriptionIcon sx={{ mr: 1, color: 'text.secondary' }} />
              ),
            }}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default InvoicePaymentForm; 