'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import CourseForm from '@/app/admin/dashboard/courses/CourseForm';
import BookingsTable from './BookingsTable';
import { Course } from '@/types/course';
import type { ExtendedBooking } from '@/types/booking';

interface CourseManagementPageProps {
  courseId: string;
  initialCourse: Course;
  initialBookings: ExtendedBooking[];
}

export default function CourseManagementPage({ 
  courseId, 
  initialCourse,
  initialBookings 
}: CourseManagementPageProps) {
  const router = useRouter();
  const [course, setCourse] = useState<Course>(initialCourse);
  const [bookings, setBookings] = useState<ExtendedBooking[]>(initialBookings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshData, setRefreshData] = useState(1);
  
  // Add User Dialog state (adapted from BookingsList edit dialog)
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [addUserFormData, setAddUserFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    number_of_participants: 1,
    payment_method: 'invoice',
    payment_status: 'PAID', // Admin-added users are typically already paid
    status: 'confirmed', // Admin-added users should be confirmed
    message: '',
    // Billing information for invoice payments
    invoice_address: '',
    invoice_postal_code: '',
    invoice_city: '',
    invoice_reference: ''
  });
  const [addUserLoading, setAddUserLoading] = useState(false);
  
  // Primary color from globals.css
  const primaryColor = '#547264';

  useEffect(() => {
    const fetchData = async () => {
      if (!refreshData) return; // Skip initial fetch since we have initial data
      
      try {
        setLoading(true);
        
        // Fetch course
        const courseResponse = await fetch(`/api/courses/${courseId}`);
        if (!courseResponse.ok) {
          const errorData = await courseResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch course');
        }
        const courseData = await courseResponse.json();
        
        // Check if the course data is properly structured
        if (courseData.course) {
          setCourse(courseData.course);
          console.log('Course data loaded successfully:', courseData.course);
        } else {
          console.error('Invalid course data format:', courseData);
          setError('Course data not in expected format');
        }
        
        // Fetch bookings
        const bookingsResponse = await fetch(`/api/courses/${courseId}/bookings`);
        if (!bookingsResponse.ok) {
          const errorData = await bookingsResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch bookings');
        }
        const bookingsData = await bookingsResponse.json();
        console.log('Received bookings data:', bookingsData);
        
        // Debug log for payment status
        bookingsData.bookings?.forEach((booking: any) => {
          console.log(`Booking ${booking.id} payment status:`, {
            hasPayments: !!booking.payments?.length,
            paymentStatus: booking.payments?.[0]?.status
          });
        });
        
        setBookings(bookingsData.bookings || []);
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Could not load data');
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchData();
    } else {
      setError('No course ID provided');
      setLoading(false);
    }
  }, [courseId, refreshData]);

  const handleSave = async (courseData: Partial<Course>) => {
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(courseData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update course');
      }

      // Refresh the course data
      const updatedData = await response.json();
      setCourse(updatedData.course);
      
      // Show success message
      alert('Kursen har uppdaterats');
    } catch (err) {
      console.error('Error updating course:', err);
      alert('Kunde inte uppdatera kursen: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleCancel = () => {
    router.push('/admin/dashboard');
  };
  
  // Function to refresh data when bookings or waitlist changes
  const handleDataUpdate = () => {
    setRefreshData(prev => prev + 1);
  };

  // Add User Dialog functions (adapted from BookingsList)
  const handleOpenAddUserModal = () => {
    setAddUserDialogOpen(true);
  };

  const handleCloseAddUserModal = () => {
    setAddUserDialogOpen(false);
    // Reset form data
    setAddUserFormData({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      number_of_participants: 1,
      payment_method: 'invoice',
      payment_status: 'PAID', // Admin-added users are typically already paid
      status: 'confirmed', // Admin-added users should be confirmed
      message: '',
      invoice_address: '',
      invoice_postal_code: '',
      invoice_city: '',
      invoice_reference: ''
    });
  };

  // Handle form changes (adapted from BookingsList)
  const handleAddUserFormChange = (field: string, value: any) => {
    setAddUserFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle adding new user (adapted from BookingsList edit save but for POST)
  const handleAddUser = async () => {
    try {
      setAddUserLoading(true);
      
      console.log('=== FRONTEND: Creating booking data ===');
      console.log('Form data:', addUserFormData);
      console.log('Course data:', { id: courseId, price: course.price });
      
      // Validate required fields before sending
      if (!addUserFormData.customer_name.trim()) {
        throw new Error('Kundens namn är obligatoriskt');
      }
      if (!addUserFormData.customer_email.trim()) {
        throw new Error('E-post är obligatoriskt');
      }
      if (!course.price || course.price <= 0) {
        throw new Error('Kurspris är inte satt eller ogiltigt');
      }
      if (addUserFormData.payment_method === 'invoice') {
        if (!addUserFormData.invoice_address.trim()) {
          throw new Error('Faktureringsadress är obligatorisk för fakturabetalning');
        }
        if (!addUserFormData.invoice_postal_code.trim()) {
          throw new Error('Postnummer är obligatoriskt för fakturabetalning');
        }
        if (!addUserFormData.invoice_city.trim()) {
          throw new Error('Ort är obligatorisk för fakturabetalning');
        }
      }
      
      const generateBookingReference = () => {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        return `BK-${timestamp}-${random}`;
      };
      
      const generatePaymentReference = () => {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 7).toUpperCase();
        return `PAY-${timestamp}-${random}`;
      };
      
      const generateInvoiceNumber = () => {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `INV-${year}${month}-${random}`;
      };
      
      const bookingReference = generateBookingReference();
      const paymentReference = addUserFormData.payment_method === 'invoice' ? generatePaymentReference() : null;
      const invoiceNumber = addUserFormData.payment_method === 'invoice' ? generateInvoiceNumber() : null;
      
      console.log('Generated references:', {
        bookingReference,
        paymentReference,
        invoiceNumber,
        paymentMethod: addUserFormData.payment_method
      });
      
      // Base booking data that's always included
      const baseBookingData = {
        course_id: courseId,
        customer_name: addUserFormData.customer_name,
        customer_email: addUserFormData.customer_email,
        customer_phone: addUserFormData.customer_phone,
        number_of_participants: addUserFormData.number_of_participants,
        booking_date: new Date().toISOString(),
        status: addUserFormData.status,
        payment_status: addUserFormData.payment_status,
        payment_method: addUserFormData.payment_method,
        unit_price: course.price,
        total_price: course.price * addUserFormData.number_of_participants,
        currency: 'SEK',
        message: addUserFormData.message,
        booking_reference: bookingReference,
        payment_reference: paymentReference
      };
      
      console.log('Base booking data:', baseBookingData);
      
      // Add invoice details if payment method is invoice
      let invoiceData: any = {};
      if (addUserFormData.payment_method === 'invoice') {
        invoiceData = {
          invoice_number: invoiceNumber,
          invoice_address: addUserFormData.invoice_address,
          invoice_postal_code: addUserFormData.invoice_postal_code,
          invoice_city: addUserFormData.invoice_city,
          invoice_reference: addUserFormData.invoice_reference
        };
        console.log('Invoice specific data:', invoiceData);
      }
      
      // Combine all data
      const bookingData = {
        ...baseBookingData,
        ...invoiceData
      };

      console.log('=== FINAL BOOKING DATA BEING SENT ===');
      console.log('Complete booking data:', JSON.stringify(bookingData, null, 2));
      
      // Check each field value explicitly
      console.log('=== FIELD VERIFICATION ===');
      Object.keys(bookingData).forEach(key => {
        const value = (bookingData as any)[key];
        console.log(`${key}: ${value} (${typeof value})`);
      });
      
      // Use the same API as BookingsList edit function but with POST for new booking
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create booking');
      }

      const result = await response.json();
      console.log("Booking created successfully:", result);

      // Close dialog and refresh data
      handleCloseAddUserModal();
      handleDataUpdate();
      
      // Show success message with booking details
      const successMessage = addUserFormData.payment_method === 'invoice' 
        ? `Deltagare har lagts till framgångsrikt! Fakturanummer: ${bookingData.invoice_number}`
        : 'Deltagare har lagts till framgångsrikt!';
      alert(successMessage);
      
    } catch (err) {
      console.error('Error adding user:', err);
      alert('Kunde inte lägga till deltagare: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setAddUserLoading(false);
    }
  };

  // Calculate available spots
  const currentParticipants = bookings
    .filter(b => b.status === 'confirmed')
    .reduce((sum, b) => sum + b.number_of_participants, 0);
  const availableSpots = (course?.max_participants || 0) - currentParticipants;

  if (error) {
    return (
      <Container 
        maxWidth={false} 
        sx={{ 
          py: 4,
          px: { xs: 2, sm: 3 }, // Smaller padding on the sides
          maxWidth: '100%',
          '@media (min-width: 1200px)': {
            px: 4, // Even on large screens, keep padding reasonable
          }
        }}
      >
        <Typography color="error">Error: {error}</Typography>
      </Container>
    );
  }

  return (
    <Container 
      maxWidth={false}
      sx={{ 
        px: { xs: 2, sm: 3 }, // Smaller padding on the sides
        maxWidth: '100%',
        '@media (min-width: 1200px)': {
          px: 4, // Even on large screens, keep padding reasonable
        }
      }}
    >
      <Box sx={{ mt: 4, mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin/dashboard')}
          sx={{ 
            mb: 2,
            color: primaryColor,
            '&:hover': {
              backgroundColor: 'rgba(84, 114, 100, 0.08)'
            }
          }}
        >
          Tillbaka till översikt
        </Button>
        
        {loading ? (
          <Typography>Laddar...</Typography>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : !course ? (
          <Typography>Kursen kunde inte hittas</Typography>
        ) : (
          <>
            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                {course.title}
              </Typography>
              <CourseForm
                course={course}
                onSave={handleSave}
                onCancel={() => router.push('/admin/dashboard')}
              />
            </Paper>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Bekräftade bokningar</Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleOpenAddUserModal}
                disabled={availableSpots <= 0}
                sx={{ 
                  backgroundColor: primaryColor,
                  '&:hover': {
                    backgroundColor: 'rgba(84, 114, 100, 0.9)'
                  }
                }}
              >
                {availableSpots <= 0 ? 'Kursen är fullbokad' : 'Lägg till deltagare'}
              </Button>
            </Box>
            
            <BookingsTable
              title="Bekräftade bokningar"
              bookings={bookings}
              loading={loading}
              error={error}
              status="confirmed"
              onBookingUpdate={handleDataUpdate}
              participantInfo={`${currentParticipants} av ${course?.max_participants || 0}`}
            />
            
            <BookingsTable
              title="Väntelista"
              bookings={bookings}
              loading={loading}
              error={error}
              status="pending"
              onBookingUpdate={handleDataUpdate}
              participantInfo={`${bookings
                .filter(b => b.status === 'pending')
                .reduce((sum, b) => sum + b.number_of_participants, 0)} personer`}
            />
            
            <BookingsTable
              title="Avbokade"
              bookings={bookings}
              loading={loading}
              error={error}
              status="cancelled"
              onBookingUpdate={handleDataUpdate}
              participantInfo={`${bookings
                .filter(b => b.status === 'cancelled')
                .reduce((sum, b) => sum + b.number_of_participants, 0)}`}
            />
            
            {/* Add User Dialog - Adapted from BookingsList edit dialog */}
            <Dialog
              open={addUserDialogOpen}
              onClose={handleCloseAddUserModal}
              fullWidth
              maxWidth="md"
            >
              <DialogTitle>Lägg till ny deltagare</DialogTitle>
              <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Kundens namn"
                      value={addUserFormData.customer_name}
                      onChange={(e) => handleAddUserFormChange('customer_name', e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="E-post"
                      value={addUserFormData.customer_email}
                      onChange={(e) => handleAddUserFormChange('customer_email', e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Telefon"
                      value={addUserFormData.customer_phone}
                      onChange={(e) => handleAddUserFormChange('customer_phone', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Antal deltagare"
                      value={addUserFormData.number_of_participants}
                      onChange={(e) => handleAddUserFormChange('number_of_participants', parseInt(e.target.value, 10))}
                      InputProps={{ inputProps: { min: 1, max: availableSpots } }}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Betalningsmetod</InputLabel>
                      <Select
                        value={addUserFormData.payment_method}
                        label="Betalningsmetod"
                        onChange={(e) => handleAddUserFormChange('payment_method', e.target.value)}
                      >
                        <MenuItem value="invoice">Faktura</MenuItem>
                        <MenuItem value="swish">Swish</MenuItem>
                        <MenuItem value="admin">Admin-skapad</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Betalningsstatus</InputLabel>
                      <Select
                        value={addUserFormData.payment_status}
                        label="Betalningsstatus"
                        onChange={(e) => handleAddUserFormChange('payment_status', e.target.value)}
                      >
                        <MenuItem value="PAID">Betald</MenuItem>
                        <MenuItem value="CREATED">Ej betald</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  {/* Billing Information - Show only for invoice payments */}
                  {addUserFormData.payment_method === 'invoice' && (
                    <>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: primaryColor }}>
                          Faktureringsuppgifter
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Faktureringsadress"
                          value={addUserFormData.invoice_address}
                          onChange={(e) => handleAddUserFormChange('invoice_address', e.target.value)}
                          required={addUserFormData.payment_method === 'invoice'}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Postnummer"
                          value={addUserFormData.invoice_postal_code}
                          onChange={(e) => handleAddUserFormChange('invoice_postal_code', e.target.value)}
                          required={addUserFormData.payment_method === 'invoice'}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Ort"
                          value={addUserFormData.invoice_city}
                          onChange={(e) => handleAddUserFormChange('invoice_city', e.target.value)}
                          required={addUserFormData.payment_method === 'invoice'}
                        />
                      </Grid>
                    </>
                  )}
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Meddelande (valfritt)"
                      value={addUserFormData.message}
                      onChange={(e) => handleAddUserFormChange('message', e.target.value)}
                      multiline
                      rows={3}
                    />
                  </Grid>
                  
                  {/* Information about available spots */}
                  <Grid item xs={12}>
                    <Typography variant="caption" color={availableSpots <= 0 ? "error" : "text.secondary"} sx={{ display: 'block', mt: 1 }}>
                      {availableSpots <= 0 
                        ? "Kursen är fullbokad. Inga platser kvar."
                        : `${currentParticipants} deltagare av ${course?.max_participants} registrerade (${availableSpots} platser kvar)`
                      }
                    </Typography>
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseAddUserModal}>Avbryt</Button>
                <Button 
                  onClick={handleAddUser} 
                  variant="contained" 
                  disabled={addUserLoading || availableSpots <= 0}
                  sx={{ backgroundColor: primaryColor, '&:hover': { backgroundColor: 'rgba(84, 114, 100, 0.9)' } }}
                >
                  {addUserLoading ? 'Lägger till...' : 'Lägg till deltagare'}
                </Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </Box>
    </Container>
  );
} 