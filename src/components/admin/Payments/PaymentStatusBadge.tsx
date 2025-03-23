'use client';

import React, { useState } from 'react';
import { Chip } from '@mui/material';
import { PaymentStatus } from '@/types/booking';

interface PaymentStatusBadgeProps {
  bookingId: string;
  status: PaymentStatus;
  onStatusChange: (status: PaymentStatus, bookingId: string) => void;
}

/**
 * A component for displaying payment status as a colored badge
 * It loads the status from the payments table via the booking ID
 */
export default function PaymentStatusBadge({
  bookingId,
  status: initialStatus,
  onStatusChange
}: PaymentStatusBadgeProps) {
  const [localStatus, setLocalStatus] = useState<PaymentStatus>(initialStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusColor = (status: PaymentStatus) => {
    return status === 'PAID' ? 'success' : 'warning';
  };

  const getStatusLabel = (status: PaymentStatus) => {
    return status === 'PAID' ? 'Betald' : 'Ej betald';
  };

  const handleClick = async () => {
    const newStatus = localStatus === 'PAID' ? 'CREATED' : 'PAID';
    
    // Optimistically update the UI
    setIsUpdating(true);
    setLocalStatus(newStatus);

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
        // Revert on error
        setLocalStatus(localStatus);
        throw new Error('Failed to update payment status');
      }

      // Notify parent of the change, but don't trigger a full reload
      onStatusChange(newStatus, bookingId);
    } catch (error) {
      console.error('Error updating payment status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Chip
      label={getStatusLabel(localStatus)}
      color={getStatusColor(localStatus)}
      size="small"
      onClick={handleClick}
      disabled={isUpdating}
      sx={{
        transition: 'all 0.2s ease-in-out',
        cursor: 'pointer',
        '&:hover': {
          opacity: 0.8
        }
      }}
    />
  );
} 