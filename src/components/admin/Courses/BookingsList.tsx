import React, { useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Box,
  Typography,
  Link,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  SelectChangeEvent,
  Tabs,
  Tab
} from '@mui/material';
import { Check as CheckIcon, Close as CloseIcon, Edit as EditIcon } from '@mui/icons-material';
import { styled } from '@mui/system';
import type { Booking, PaymentStatus } from '@/types/booking';
import PaymentStatusBadge from '../Payments/PaymentStatusBadge';
import PaymentStatusUpdater from '../Payments/PaymentStatusUpdater';

interface ExtendedBooking extends Omit<Booking, 'course' | 'payments'> {
  course: {
    id: string;
    title: string;
    description: string;
    price: number;
    duration: number;
    capacity: number;
  };
  payments?: Array<{
    id: string;
    status: PaymentStatus;
    payment_reference: string;
    payment_method: string;
  }>;
  message?: string;
}

// Styled components
const StyledTableContainer = styled(TableContainer)({
  marginTop: '1rem',
  maxHeight: '60vh',
  overflowY: 'auto',
});

const StyledTableCell = styled(TableCell)({
  fontWeight: 'bold',
});

interface BookingsListProps {
  courseId?: string;
  bookings: ExtendedBooking[];
  loading: boolean;
  error: string | null;
  onBookingUpdate: () => void;
  title?: string;
  participantInfo?: string;
}

type StatusFilter = 'all' | 'active' | 'cancelled';

export default function BookingsList({ 
  courseId, 
  bookings, 
  loading, 
  error, 
  onBookingUpdate,
  title = "Bokningar",
  participantInfo 
}: BookingsListProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [bookingToEdit, setBookingToEdit] = useState<ExtendedBooking | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<ExtendedBooking>>({});
  
  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<ExtendedBooking | null>(null);
  
  // Primary color from globals.css
  const primaryColor = '#547264';

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleStatusFilterChange = (event: React.SyntheticEvent, newValue: StatusFilter) => {
    setStatusFilter(newValue);
    setPage(0);
  };

  // Handle opening the cancel confirmation dialog
  const handleCancelClick = (booking: ExtendedBooking) => {
    setBookingToCancel(booking);
    setCancelDialogOpen(true);
  };

  // Handle cancel confirmation
  const handleCancelConfirm = async () => {
    if (!bookingToCancel) return;
    
    try {
      const response = await fetch(`/api/bookings/${bookingToCancel.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel booking');
      }
      
      // Close the dialog
      setCancelDialogOpen(false);
      setBookingToCancel(null);
      
      // Show success message
      alert('Bokningen har avbokats');
      
      // Notify parent component
      onBookingUpdate();
    } catch (err) {
      console.error('Error cancelling booking:', err);
      alert(`Kunde inte avboka bokningen: ${err instanceof Error ? err.message : 'Okänt fel'}`);
    }
  };

  // Handle opening the edit dialog
  const handleEditClick = (booking: ExtendedBooking) => {
    setBookingToEdit(booking);
    setEditFormData({
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      customer_phone: booking.customer_phone,
      number_of_participants: booking.number_of_participants,
      status: booking.status,
      payment_status: booking.payments?.[0]?.status || 'CREATED',
      message: booking.message
    });
    setEditDialogOpen(true);
  };

  // Handle edit form changes
  const handleEditFormChange = (field: keyof ExtendedBooking, value: any) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle edit save
  const handleEditSave = async () => {
    if (!bookingToEdit) return;
    
    try {
      const response = await fetch(`/api/bookings/${bookingToEdit.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update booking');
      }
      
      // Close the dialog and reset state
      setEditDialogOpen(false);
      setBookingToEdit(null);
      setEditFormData({});
      
      // Show success message
      alert('Bokningen har uppdaterats');
      
      // Notify parent component
      onBookingUpdate();
    } catch (err) {
      console.error('Error updating booking:', err);
      alert(`Kunde inte uppdatera bokningen: ${err instanceof Error ? err.message : 'Okänt fel'}`);
    }
  };

  // Handle payment status change
  const handlePaymentStatusChange = async (status: string): Promise<void> => {
    try {
      const paymentId = bookingToEdit?.payments?.[0]?.id;
      if (!paymentId || !bookingToEdit) return;

      const response = await fetch('/api/admin/payments/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentId, status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update payment status');
      }

      onBookingUpdate();
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <Chip
            size="small"
            label="Bekräftad"
            color="success"
            icon={<CheckIcon fontSize="small" />}
          />
        );
      case 'pending':
        return (
          <Chip
            size="small"
            label="Väntande"
            color="warning"
          />
        );
      case 'cancelled':
        return (
          <Chip
            size="small"
            label="Avbokad"
            color="error"
            icon={<CloseIcon fontSize="small" />}
          />
        );
      case 'completed':
        return (
          <Chip
            size="small"
            label="Genomförd"
            color="info"
            icon={<CheckIcon fontSize="small" />}
          />
        );
      default:
        return (
          <Chip
            size="small"
            label={status || "Okänd"}
            color="default"
          />
        );
    }
  };

  // Filter bookings based on status filter
  const filteredBookings = bookings.filter(booking => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return booking.status !== 'cancelled';
    return booking.status === 'cancelled';
  });

  // Calculate pagination
  const paginatedBookings = filteredBookings.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const emptyRows = rowsPerPage - Math.min(rowsPerPage, filteredBookings.length - page * rowsPerPage);

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

  if (!bookings.length) {
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
    <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2, mt: 4 }}>
      <Box sx={{ 
        bgcolor: primaryColor, 
        color: 'white', 
        px: 3, 
        py: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        {participantInfo && (
          <Typography variant="subtitle1">
            {participantInfo}
          </Typography>
        )}
      </Box>

      {/* Status Filter Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
        <Tabs value={statusFilter} onChange={handleStatusFilterChange} aria-label="booking status tabs">
          <Tab label="Alla" value="all" />
          <Tab label="Aktiva" value="active" />
          <Tab label="Avbokade" value="cancelled" />
        </Tabs>
      </Box>

      <StyledTableContainer>
        <Table stickyHeader aria-label="bookings table">
          <TableHead>
            <TableRow>
              <StyledTableCell>Namn</StyledTableCell>
              <StyledTableCell>E-post</StyledTableCell>
              <StyledTableCell>Telefon</StyledTableCell>
              <StyledTableCell>Antal</StyledTableCell>
              <StyledTableCell>Status</StyledTableCell>
              <StyledTableCell>Betalning</StyledTableCell>
              <StyledTableCell>Datum</StyledTableCell>
              <StyledTableCell>Meddelande</StyledTableCell>
              <StyledTableCell>Åtgärder</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedBookings.map((booking) => (
              <TableRow 
                key={booking.id}
                sx={booking.status === 'cancelled' ? { opacity: 0.6 } : {}}
              >
                <TableCell>{booking.customer_name}</TableCell>
                <TableCell>{booking.customer_email}</TableCell>
                <TableCell>{booking.customer_phone || '–'}</TableCell>
                <TableCell>{booking.number_of_participants}</TableCell>
                <TableCell>{getStatusChip(booking.status)}</TableCell>
                <TableCell>
                  {booking.payments && booking.payments.length > 0 ? (
                    <PaymentStatusUpdater
                      status={booking.payments[0].status}
                      onChange={handlePaymentStatusChange}
                    />
                  ) : (
                    <PaymentStatusBadge
                      bookingId={booking.id}
                      status={booking.payments?.[0]?.status || 'CREATED'}
                      initialStatus={booking.payments?.[0]?.status}
                      onStatusChange={handlePaymentStatusChange}
                    />
                  )}
                </TableCell>
                <TableCell>{new Date(booking.created_at).toLocaleDateString('sv-SE')}</TableCell>
                <TableCell>{booking.message ? booking.message.slice(0, 30) + (booking.message.length > 30 ? '...' : '') : '–'}</TableCell>
                <TableCell>
                  <Button
                    startIcon={<EditIcon />}
                    size="small"
                    onClick={() => handleEditClick(booking)}
                    sx={{ mr: 1 }}
                    disabled={booking.status === 'cancelled'}
                  >
                    Ändra
                  </Button>
                  {booking.status !== 'cancelled' && (
                    <Button
                      startIcon={<CloseIcon />}
                      size="small"
                      color="error"
                      onClick={() => handleCancelClick(booking)}
                    >
                      Avboka
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {emptyRows > 0 && (
              <TableRow style={{ height: 53 * emptyRows }}>
                <TableCell colSpan={9} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </StyledTableContainer>

      <TablePagination
        component="div"
        count={filteredBookings.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25]}
        labelRowsPerPage="Rader per sida:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} av ${count}`}
      />

      {/* Edit Booking Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Redigera bokning</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Kundens namn"
                value={editFormData.customer_name || ''}
                onChange={(e) => handleEditFormChange('customer_name', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="E-post"
                value={editFormData.customer_email || ''}
                onChange={(e) => handleEditFormChange('customer_email', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Telefon"
                value={editFormData.customer_phone || ''}
                onChange={(e) => handleEditFormChange('customer_phone', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Antal deltagare"
                value={editFormData.number_of_participants || 1}
                onChange={(e) => handleEditFormChange('number_of_participants', parseInt(e.target.value, 10))}
                InputProps={{ inputProps: { min: 1 } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editFormData.status || 'pending'}
                  label="Status"
                  onChange={(e) => handleEditFormChange('status', e.target.value)}
                >
                  <MenuItem value="pending">Väntande</MenuItem>
                  <MenuItem value="confirmed">Bekräftad</MenuItem>
                  <MenuItem value="cancelled">Avbokad</MenuItem>
                  <MenuItem value="completed">Genomförd</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Betalningsstatus</InputLabel>
                <Select
                  value={editFormData.payment_status || 'CREATED'}
                  label="Betalningsstatus"
                  onChange={(e) => handleEditFormChange('payment_status', e.target.value)}
                >
                  <MenuItem value="CREATED">Skapad</MenuItem>
                  <MenuItem value="PAID">Betald</MenuItem>
                  <MenuItem value="DECLINED">Nekad</MenuItem>
                  <MenuItem value="ERROR">Fel</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Meddelande"
                value={editFormData.message || ''}
                onChange={(e) => handleEditFormChange('message', e.target.value)}
                multiline
                rows={4}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Avbryt</Button>
          <Button onClick={handleEditSave} variant="contained" style={{ backgroundColor: primaryColor }}>
            Spara ändringar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
      >
        <DialogTitle>Bekräfta avbokning</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Är du säker på att du vill avboka bokningen för {bookingToCancel?.customer_name}?
            Bokningen kommer att markeras som avbokad.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>Avbryt</Button>
          <Button onClick={handleCancelConfirm} color="error" autoFocus>
            Avboka
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
} 