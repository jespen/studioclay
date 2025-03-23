import React from 'react';
import {
  Paper,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import BookingsList from './BookingsList';
import type { ExtendedBooking } from '@/types/booking';

interface BookingsTableProps {
  title: string;
  bookings: ExtendedBooking[];
  loading: boolean;
  error: string | null;
  status: 'confirmed' | 'pending' | 'cancelled';
  onBookingUpdate: () => void;
  participantInfo?: string;
}

export default function BookingsTable({
  title,
  bookings,
  loading,
  error,
  status,
  onBookingUpdate,
  participantInfo
}: BookingsTableProps) {
  const primaryColor = '#547264';

  if (loading) {
    return (
      <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2, mt: 4, p: 3, textAlign: 'center' }}>
        <CircularProgress size={24} sx={{ color: primaryColor }} />
        <Typography sx={{ mt: 1 }}>Laddar bokningar...</Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2, mt: 4, p: 3 }}>
        <Typography color="error">Error: {error}</Typography>
      </Paper>
    );
  }

  const filteredBookings = bookings.filter(booking => booking.status === status);

  if (!filteredBookings.length) {
    return (
      <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2, mt: 4 }}>
        <Box sx={{ bgcolor: primaryColor, color: 'white', px: 3, py: 2 }}>
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          <Typography>Inga bokningar hittades.</Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <BookingsList
      bookings={filteredBookings}
      loading={loading}
      error={error}
      onBookingUpdate={onBookingUpdate}
      title={title}
      participantInfo={participantInfo}
    />
  );
} 