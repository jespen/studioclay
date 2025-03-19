import React from 'react';
import { Select, MenuItem, SelectChangeEvent } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { PaymentStatus } from '@/types/booking';
import { paymentStatusLabels } from '@/utils/admin/paymentUtils';

interface PaymentStatusUpdaterProps {
  status: PaymentStatus;
  onChange: (newStatus: PaymentStatus) => void;
  disabled?: boolean;
}

const statusOptions: { value: PaymentStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'CREATED', label: paymentStatusLabels.CREATED, icon: <HourglassEmptyIcon fontSize="small" /> },
  { value: 'PAID', label: paymentStatusLabels.PAID, icon: <CheckCircleIcon fontSize="small" /> },
  { value: 'DECLINED', label: paymentStatusLabels.DECLINED, icon: <CancelIcon fontSize="small" /> },
  { value: 'ERROR', label: paymentStatusLabels.ERROR, icon: <ErrorIcon fontSize="small" /> },
];

export default function PaymentStatusUpdater({ status, onChange, disabled }: PaymentStatusUpdaterProps) {
  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value as PaymentStatus);
  };

  return (
    <Select
      value={status}
      onChange={handleChange}
      size="small"
      disabled={disabled}
      sx={{
        minWidth: 120,
        '& .MuiSelect-select': {
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }
      }}
    >
      {statusOptions.map(option => (
        <MenuItem 
          key={option.value} 
          value={option.value}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          {option.icon}
          {option.label}
        </MenuItem>
      ))}
    </Select>
  );
} 