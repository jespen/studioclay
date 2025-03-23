'use client';

import React from 'react';
import { Chip } from '@mui/material';
import { PaymentStatus } from '@/types/booking';

interface PaymentStatusBadgeProps {
  bookingId: string;
  status: PaymentStatus;
  initialStatus?: PaymentStatus;
  onStatusChange?: (status: PaymentStatus) => void;
}

/**
 * A component for displaying payment status as a colored badge
 * It loads the status from the payments table via the booking ID
 */
export default function PaymentStatusBadge({
  bookingId,
  status,
  initialStatus,
  onStatusChange
}: PaymentStatusBadgeProps) {
  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'CREATED':
        return 'warning';
      case 'DECLINED':
      case 'ERROR':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: PaymentStatus) => {
    switch (status) {
      case 'PAID':
        return 'Betald';
      case 'CREATED':
        return 'Skapad';
      case 'DECLINED':
        return 'Nekad';
      case 'ERROR':
        return 'Fel';
      default:
        return status;
    }
  };

  const handleStatusChange = async (newStatus: PaymentStatus) => {
    try {
      const response = await fetch('/api/admin/payments/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          bookingId,
          status: newStatus 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update payment status');
      }

      onStatusChange?.(newStatus);
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  return (
    <Chip
      label={getStatusLabel(status)}
      color={getStatusColor(status)}
      size="small"
      onClick={() => handleStatusChange(status)}
    />
  );
} 