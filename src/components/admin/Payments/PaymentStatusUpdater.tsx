'use client';

import React from 'react';
import { FormControl, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { PaymentStatus } from '@/types/booking';

interface PaymentStatusUpdaterProps {
  status: PaymentStatus;
  onChange: (status: PaymentStatus) => void;
}

export default function PaymentStatusUpdater({ status, onChange }: PaymentStatusUpdaterProps) {
  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value as PaymentStatus);
  };

  return (
    <FormControl size="small" sx={{ minWidth: 120 }}>
      <Select
        value={status}
        onChange={handleChange}
        size="small"
      >
        <MenuItem value="CREATED">Skapad</MenuItem>
        <MenuItem value="PAID">Betald</MenuItem>
        <MenuItem value="DECLINED">Nekad</MenuItem>
        <MenuItem value="ERROR">Fel</MenuItem>
      </Select>
    </FormControl>
  );
} 