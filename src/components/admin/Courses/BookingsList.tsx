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
  Tab,
  Alert
} from '@mui/material';
import { Check as CheckIcon, Close as CloseIcon, Edit as EditIcon, Delete as DeleteIcon, Receipt as ReceiptIcon } from '@mui/icons-material';
import { styled } from '@mui/system';
import type { Booking, PaymentStatus, ExtendedBooking } from '@/types/booking';
import PaymentStatusBadge from '../Payments/PaymentStatusBadge';
import PaymentStatusUpdater from '../Payments/PaymentStatusUpdater';

// Styled components
const StyledTableContainer = styled(TableContainer)({
  marginTop: '1rem',
  maxHeight: '60vh',
  overflowY: 'auto',
  '& .MuiTableCell-root': {
    padding: '8px 4px', // Reduce horizontal padding in cells
  },
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

export default function BookingsList({ 
  courseId, 
  bookings, 
  loading, 
  error, 
  onBookingUpdate,
  title = "Bokningar",
  participantInfo 
}: BookingsListProps) {
  const primaryColor = '#547264';
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [bookingToEdit, setBookingToEdit] = useState<ExtendedBooking | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<ExtendedBooking>>({});
  
  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<ExtendedBooking | null>(null);

  // Invoice PDF dialog state
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoicePdf, setInvoicePdf] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

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
      payment_status: booking.payment_status,
      payment_method: booking.payment_method,
      booking_reference: booking.booking_reference,
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
  const handlePaymentStatusChange = async (newStatus: PaymentStatus, bookingId: string): Promise<void> => {
    // Update the local state first
    const updatedBookings = bookings.map(booking => 
      booking.id === bookingId 
        ? { ...booking, payment_status: newStatus }
        : booking
    );
  };

  // Handle opening the invoice PDF dialog
  const handleInvoiceClick = async (booking: ExtendedBooking) => {
    if (booking.payment_method !== 'invoice') return;
    
    setInvoiceDialogOpen(true);
    setInvoiceLoading(true);
    setInvoiceError(null);
    setInvoicePdf(null);
    
    try {
      const response = await fetch(`/api/invoice/${booking.id}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load invoice');
      }
      
      setInvoicePdf(data.pdf);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      setInvoiceError('Could not load the invoice PDF. Please try again later.');
    } finally {
      setInvoiceLoading(false);
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
              <StyledTableCell>Metod</StyledTableCell>
              <StyledTableCell>Referens</StyledTableCell>
              <StyledTableCell>Datum</StyledTableCell>
              <StyledTableCell>Meddelande</StyledTableCell>
              <StyledTableCell>Åtgärder</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bookings.map((booking) => (
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
                  <PaymentStatusBadge
                    bookingId={booking.id}
                    status={booking.payment_status}
                    onStatusChange={handlePaymentStatusChange}
                  />
                </TableCell>
                <TableCell>
                  {booking.payment_method === 'invoice' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <span>Faktura</span>
                      {booking.invoice_number && (
                        <Tooltip title="Visa faktura">
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={() => handleInvoiceClick(booking)}
                            sx={{ ml: 1 }}
                          >
                            <ReceiptIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  ) : booking.payment_method === 'swish' ? 'Swish' : 
                   booking.payment_method || '–'}
                </TableCell>
                <TableCell>
                  <Tooltip title="Bokningsreferens" arrow>
                    <span>{booking.booking_reference || '–'}</span>
                  </Tooltip>
                </TableCell>
                <TableCell>{new Date(booking.created_at).toLocaleDateString('sv-SE')}</TableCell>
                <TableCell>{booking.message ? booking.message.slice(0, 30) + (booking.message.length > 30 ? '...' : '') : '–'}</TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleEditClick(booking)}
                    disabled={booking.status === 'cancelled'}
                    sx={{ color: 'action.active' }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  {booking.status !== 'cancelled' && (
                    <IconButton
                      size="small"
                      onClick={() => handleCancelClick(booking)}
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </StyledTableContainer>

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
                  <MenuItem value="CREATED">Ej betald</MenuItem>
                  <MenuItem value="PAID">Betald</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Betalningsmetod</InputLabel>
                <Select
                  value={editFormData.payment_method || 'invoice'}
                  label="Betalningsmetod"
                  onChange={(e) => handleEditFormChange('payment_method', e.target.value)}
                >
                  <MenuItem value="invoice">Faktura</MenuItem>
                  <MenuItem value="swish">Swish</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Bokningsreferens"
                value={editFormData.booking_reference || ''}
                onChange={(e) => handleEditFormChange('booking_reference', e.target.value)}
              />
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

      {/* Invoice PDF Dialog */}
      <Dialog
        open={invoiceDialogOpen}
        onClose={() => setInvoiceDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Faktura
        </DialogTitle>
        <DialogContent>
          {invoiceLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : invoiceError ? (
            <Alert severity="error">
              {invoiceError}
            </Alert>
          ) : invoicePdf ? (
            <Box sx={{ height: '70vh', width: '100%' }}>
              <iframe
                src={`data:application/pdf;base64,${invoicePdf}`}
                width="100%"
                height="100%"
                style={{ border: 'none' }}
                title="Invoice PDF"
              />
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoiceDialogOpen(false)}>Stäng</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
} 