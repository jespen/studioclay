import React, { useState, useEffect } from 'react';
import { Chip, Tooltip, CircularProgress, ChipProps } from '@mui/material';
import { getBookingPaymentStatus, getHumanReadablePaymentStatus, paymentStatusLabels } from '@/utils/admin/paymentUtils';
import { PaymentStatus } from '@/types/booking';

interface PaymentStatusBadgeProps extends Omit<ChipProps, 'label' | 'color'> {
  bookingId: string;
  initialStatus?: string;
  onStatusChange?: (status: string) => void;
  status: PaymentStatus;
}

/**
 * A component for displaying payment status as a colored badge
 * It loads the status from the payments table via the booking ID
 */
const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ 
  bookingId, 
  initialStatus, 
  onStatusChange,
  status,
  ...props
}) => {
  const [loading, setLoading] = useState<boolean>(!initialStatus);

  useEffect(() => {
    if (!initialStatus) {
      // Only fetch if we don't have an initial status
      const fetchStatus = async () => {
        try {
          const paymentStatus = await getBookingPaymentStatus(bookingId);
          if (onStatusChange) {
            onStatusChange(paymentStatus);
          }
        } catch (error) {
          console.error('Error fetching payment status:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchStatus();
    }
  }, [bookingId, initialStatus, onStatusChange]);

  // Update local state if initialStatus changes
  useEffect(() => {
    if (initialStatus && initialStatus !== status) {
      // This should not happen as the status is now controlled by props
    }
  }, [initialStatus, status]);

  const getStatusColor = (status: PaymentStatus): ChipProps['color'] => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'DECLINED':
        return 'warning';
      case 'ERROR':
        return 'error';
      case 'CREATED':
      default:
        return 'default';
    }
  };

  const label = loading ? 'Laddar...' : paymentStatusLabels[status];

  if (loading) {
    return (
      <Chip
        label={label}
        size="small"
        icon={<CircularProgress size={14} color="inherit" />}
        sx={{
          backgroundColor: '#f3f4f6',
          color: '#374151',
          border: '1px solid #d1d5db',
          '& .MuiChip-label': { paddingLeft: 0 }
        }}
        {...props}
      />
    );
  }

  return (
    <Tooltip title={`Betalningsstatus: ${label}`}>
      <Chip
        label={label}
        size="small"
        color={getStatusColor(status)}
        {...props}
      />
    </Tooltip>
  );
};

export default PaymentStatusBadge; 