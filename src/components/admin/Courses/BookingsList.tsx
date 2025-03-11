import React, { useState, useEffect } from 'react';
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
  SelectChangeEvent
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  number_of_participants: number;
  booking_date: string;
  status: 'waiting' | 'confirmed' | 'cancelled';
  payment_status: 'paid' | 'unpaid';
  message: string | null;
}

interface BookingsListProps {
  courseId: string;
  onBookingUpdate?: () => void;
}

export default function BookingsList({ courseId, onBookingUpdate }: BookingsListProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [bookingToEdit, setBookingToEdit] = useState<Booking | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Booking>>({});
  
  // Primary color from globals.css
  const primaryColor = '#547264';

  useEffect(() => {
    fetchBookings();
  }, [courseId]);
  
  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/courses/${courseId}/bookings`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch bookings');
      }
      
      const data = await response.json();
      setBookings(data.bookings || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError(err instanceof Error ? err.message : 'Could not load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle opening the delete confirmation dialog
  const handleDeleteClick = (booking: Booking) => {
    setBookingToDelete(booking);
    setDeleteDialogOpen(true);
  };

  // Handle confirming the deletion
  const handleDeleteConfirm = async () => {
    if (!bookingToDelete) return;
    
    try {
      const response = await fetch(`/api/bookings/${bookingToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete booking');
      }
      
      // Remove the booking from the state
      setBookings(bookings.filter(booking => booking.id !== bookingToDelete.id));
      
      // Close the dialog
      setDeleteDialogOpen(false);
      setBookingToDelete(null);
      
      // Show success message
      alert('Bokningen har tagits bort');
      
      // Notify parent component if needed
      if (onBookingUpdate) onBookingUpdate();
    } catch (err) {
      console.error('Error deleting booking:', err);
      alert(`Kunde inte ta bort bokningen: ${err instanceof Error ? err.message : 'Okänt fel'}`);
    }
  };

  // Handle opening the edit dialog
  const handleEditClick = (booking: Booking) => {
    setBookingToEdit(booking);
    setEditFormData({
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      customer_phone: booking.customer_phone,
      number_of_participants: booking.number_of_participants,
      status: booking.status,
      payment_status: booking.payment_status,
      message: booking.message
    });
    setEditDialogOpen(true);
  };

  // Handle text field input changes
  const handleTextFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: value
    });
  };

  // Handle select field changes
  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: value
    });
  };

  // Handle saving the edited booking
  const handleEditSave = async () => {
    if (!bookingToEdit) return;
    
    try {
      const response = await fetch(`/api/bookings/${bookingToEdit.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update booking');
      }
      
      // Update the booking in the state
      const updatedData = await response.json();
      setBookings(bookings.map(booking => 
        booking.id === bookingToEdit.id ? { ...booking, ...updatedData.booking } : booking
      ));
      
      // Close the dialog
      setEditDialogOpen(false);
      setBookingToEdit(null);
      
      // Show success message
      alert('Bokningen har uppdaterats');
      
      // Notify parent component if needed
      if (onBookingUpdate) onBookingUpdate();
    } catch (err) {
      console.error('Error updating booking:', err);
      alert(`Kunde inte uppdatera bokningen: ${err instanceof Error ? err.message : 'Okänt fel'}`);
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <Chip
            icon={<CheckCircleIcon />}
            label="Bekräftad"
            color="success"
            size="small"
          />
        );
      case 'waiting':
        return (
          <Chip
            icon={<PendingIcon />}
            label="Väntande"
            color="warning"
            size="small"
          />
        );
      case 'cancelled':
        return (
          <Chip
            icon={<CancelIcon />}
            label="Avbokad"
            color="error"
            size="small"
          />
        );
      default:
        return null;
    }
  };

  const getPaymentStatusChip = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Chip
            label="Betald"
            color="success"
            size="small"
            variant="outlined"
          />
        );
      case 'unpaid':
        return (
          <Chip
            label="Ej betald"
            color="error"
            size="small"
            variant="outlined"
          />
        );
      default:
        return null;
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
            Bokningar
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          <Typography>Inga bokningar hittades för denna kurs.</Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <>
      <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2, mt: 4 }}>
        <Box sx={{ bgcolor: primaryColor, color: 'white', px: 3, py: 2 }}>
          <Typography variant="h6" component="h2">
            Bokningar ({bookings.length})
          </Typography>
        </Box>

        <TableContainer>
          <Table sx={{ minWidth: 650 }} size="small">
            <TableHead>
              <TableRow>
                <TableCell>Namn</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Telefon</TableCell>
                <TableCell align="center">Antal</TableCell>
                <TableCell>Bokningsdatum</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Betalning</TableCell>
                <TableCell align="right">Åtgärder</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((booking) => (
                  <TableRow key={booking.id} hover>
                    <TableCell>{booking.customer_name}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {booking.customer_email}
                        <Tooltip title="Skicka email">
                          <IconButton
                            size="small"
                            href={`mailto:${booking.customer_email}`}
                            sx={{ color: primaryColor }}
                          >
                            <EmailIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {booking.customer_phone ? (
                        <Link href={`tel:${booking.customer_phone}`} underline="hover">
                          {booking.customer_phone}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell align="center">{booking.number_of_participants}</TableCell>
                    <TableCell>
                      {new Date(booking.booking_date).toLocaleDateString('sv-SE')}
                    </TableCell>
                    <TableCell>{getStatusChip(booking.status)}</TableCell>
                    <TableCell>{getPaymentStatusChip(booking.payment_status)}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Tooltip title="Redigera bokning">
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditClick(booking)}
                            sx={{ color: primaryColor }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Ta bort bokning">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteClick(booking)}
                            sx={{ color: '#d32f2f' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={bookings.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Rader per sida:"
        />
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Ta bort bokning</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Är du säker på att du vill ta bort bokningen för {bookingToDelete?.customer_name}? 
            Denna åtgärd kan inte ångras.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)} 
            sx={{ color: 'text.secondary' }}
          >
            Avbryt
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            variant="contained" 
            color="error"
          >
            Ta bort
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Booking Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Redigera bokning</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="customer_name"
                label="Namn"
                value={editFormData.customer_name || ''}
                onChange={handleTextFieldChange}
                fullWidth
                margin="dense"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="customer_email"
                label="Email"
                type="email"
                value={editFormData.customer_email || ''}
                onChange={handleTextFieldChange}
                fullWidth
                margin="dense"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="customer_phone"
                label="Telefon"
                value={editFormData.customer_phone || ''}
                onChange={handleTextFieldChange}
                fullWidth
                margin="dense"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="number_of_participants"
                label="Antal deltagare"
                type="number"
                value={editFormData.number_of_participants || ''}
                onChange={handleTextFieldChange}
                fullWidth
                margin="dense"
                InputProps={{ inputProps: { min: 1 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={editFormData.status || ''}
                  onChange={handleSelectChange}
                  label="Status"
                >
                  <MenuItem value="waiting">Väntande</MenuItem>
                  <MenuItem value="confirmed">Bekräftad</MenuItem>
                  <MenuItem value="cancelled">Avbokad</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Betalningsstatus</InputLabel>
                <Select
                  name="payment_status"
                  value={editFormData.payment_status || ''}
                  onChange={handleSelectChange}
                  label="Betalningsstatus"
                >
                  <MenuItem value="paid">Betald</MenuItem>
                  <MenuItem value="unpaid">Ej betald</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="message"
                label="Meddelande"
                value={editFormData.message || ''}
                onChange={handleTextFieldChange}
                fullWidth
                margin="dense"
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setEditDialogOpen(false)} 
            sx={{ color: 'text.secondary' }}
          >
            Avbryt
          </Button>
          <Button 
            onClick={handleEditSave} 
            variant="contained" 
            sx={{ bgcolor: primaryColor, '&:hover': { bgcolor: '#3e5549' } }}
          >
            Spara
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 