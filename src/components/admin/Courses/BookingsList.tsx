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
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Booking } from '@/lib/supabaseAdmin';

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
  
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchBookings();
  }, [courseId]);
  
  const fetchBookings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          course:course_instances(
            *,
            template:course_templates(
              *,
              category:categories(*),
              instructor:instructors(*)
            )
          )
        `)
        .eq('course_id', courseId)
        .order('booking_date', { ascending: false });
      
      if (error) throw error;
      
      // Process the data to maintain backward compatibility
      const processedData = (data || []).map((booking: Booking) => {
        if (booking.course) {
          const template = booking.course.template;
          booking.course = {
            id: booking.course.id,
            template_id: template?.id || booking.course.template_id,
            current_participants: booking.course.current_participants || 0,
            max_participants: template?.max_participants || booking.course.max_participants || 0,
            start_date: booking.course.start_date,
            end_date: booking.course.end_date,
            status: booking.course.status,
            created_at: booking.course.created_at,
            updated_at: booking.course.updated_at,
            template,
            instructor: booking.course.instructor,
            category: booking.course.category
          };
        }
        return booking;
      });
      
      setBookings(processedData);
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

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!bookingToDelete) return;
    
    try {
      // First, create history record
      const historyData = {
        original_booking_id: bookingToDelete.id,
        course_id: bookingToDelete.course_id,
        customer_name: bookingToDelete.customer_name,
        customer_email: bookingToDelete.customer_email,
        customer_phone: bookingToDelete.customer_phone,
        number_of_participants: bookingToDelete.number_of_participants,
        original_booking_date: bookingToDelete.booking_date,
        cancellation_date: new Date().toISOString(),
        history_type: 'cancelled',
        message: bookingToDelete.message
      };

      const { error: historyError } = await supabase
        .from('booking_history')
        .insert(historyData);

      if (historyError) throw historyError;
      
      // Then delete the booking
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingToDelete.id);

      if (deleteError) throw deleteError;
      
      // Update course participants count
      if (bookingToDelete.course_id) {
        const { data: course, error: courseError } = await supabase
          .from('course_instances')
          .select('current_participants')
          .eq('id', bookingToDelete.course_id)
          .single();
        
        if (!courseError && course) {
          await supabase
            .from('course_instances')
            .update({
              current_participants: Math.max(0, course.current_participants - bookingToDelete.number_of_participants)
            })
            .eq('id', bookingToDelete.course_id);
        }
      }
      
      // Close the dialog
      setDeleteDialogOpen(false);
      setBookingToDelete(null);
      
      // Show success message
      alert('Bokningen har tagits bort');
      
      // Refresh the bookings list
      fetchBookings();
      
      // Notify parent component
      if (onBookingUpdate) {
        onBookingUpdate();
      }
    } catch (err) {
      console.error('Error deleting booking:', err);
      alert(`Kunde inte ta bort bokningen: ${err instanceof Error ? err.message : 'Okänt fel'}`);
    }
  };

  // Handle opening the edit dialog
  const handleEditClick = (booking: Booking) => {
    setBookingToEdit(booking);
    setEditFormData(booking);
    setEditDialogOpen(true);
  };

  // Handle edit form changes
  const handleEditFormChange = (field: keyof Booking, value: any) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle edit save
  const handleEditSave = async () => {
    if (!bookingToEdit) return;
    
    try {
      // First, get the current booking to calculate participant differences
      const { data: currentBooking, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingToEdit.id)
        .single();
        
      if (fetchError) throw fetchError;
      
      // Prepare the update data
      const updateData = {
        ...editFormData,
        updated_at: new Date().toISOString()
      };
      
      // Update the booking
      const { error: updateError } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingToEdit.id);

      if (updateError) throw updateError;
      
      // Update course participants count if needed
      if (currentBooking && currentBooking.course_id) {
        let participantsDiff = 0;
        
        // Calculate participant difference based on number changes
        const newParticipants = editFormData.number_of_participants ?? currentBooking.number_of_participants;
        if (newParticipants !== currentBooking.number_of_participants) {
          participantsDiff = newParticipants - currentBooking.number_of_participants;
        }
        
        // Adjust for status changes
        if (editFormData.status !== currentBooking.status) {
          if (editFormData.status === 'cancelled' && currentBooking.status !== 'cancelled') {
            // When changing to cancelled, subtract all participants
            participantsDiff -= newParticipants;
          } else if (editFormData.status !== 'cancelled' && currentBooking.status === 'cancelled') {
            // When changing from cancelled to another status, add all participants
            participantsDiff += newParticipants;
          }
        }
        
        // Only update if there's a change in participants
        if (participantsDiff !== 0) {
          const { data: course, error: courseError } = await supabase
            .from('course_instances')
            .select('current_participants')
            .eq('id', currentBooking.course_id)
            .single();
          
          if (!courseError && course) {
            await supabase
              .from('course_instances')
              .update({
                current_participants: Math.max(0, course.current_participants + participantsDiff)
              })
              .eq('id', currentBooking.course_id);
          }
        }
      }
      
      // Close the dialog
      setEditDialogOpen(false);
      setBookingToEdit(null);
      
      // Show success message
      alert('Bokningen har uppdaterats');
      
      // Refresh the bookings list
      fetchBookings();
      
      // Notify parent component
      if (onBookingUpdate) {
        onBookingUpdate();
      }
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
                onChange={(e) => handleEditFormChange('customer_name', e.target.value)}
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
                onChange={(e) => handleEditFormChange('customer_email', e.target.value)}
                fullWidth
                margin="dense"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="customer_phone"
                label="Telefon"
                value={editFormData.customer_phone || ''}
                onChange={(e) => handleEditFormChange('customer_phone', e.target.value)}
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
                onChange={(e) => handleEditFormChange('number_of_participants', e.target.value)}
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
                  onChange={(e) => handleEditFormChange('status', e.target.value as string)}
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
                  onChange={(e) => handleEditFormChange('payment_status', e.target.value as string)}
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
                onChange={(e) => handleEditFormChange('message', e.target.value)}
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