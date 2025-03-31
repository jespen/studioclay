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
  const [openAddUserModal, setOpenAddUserModal] = useState(false);
  const [addUserFormData, setAddUserFormData] = useState({
    name: '',
    address: '',
    postalCode: '',
    city: '',
    email: '',
    phone: '',
    numberOfParticipants: '1',
    paymentMethod: 'invoice' // Default to invoice
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

  const handleOpenAddUserModal = () => {
    setOpenAddUserModal(true);
  };

  const handleCloseAddUserModal = () => {
    setOpenAddUserModal(false);
    // Reset form data
    setAddUserFormData({
      name: '',
      address: '',
      postalCode: '',
      city: '',
      email: '',
      phone: '',
      numberOfParticipants: '1',
      paymentMethod: 'invoice'
    });
  };

  const handleAddUserFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddUserFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setAddUserFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddUser = async () => {
    try {
      setAddUserLoading(true);
      
      // Use the invoice/create endpoint which handles both booking creation and invoice generation
      const invoiceData = {
        courseId: courseId,
        userInfo: {
          firstName: addUserFormData.name.split(' ')[0],
          lastName: addUserFormData.name.split(' ').slice(1).join(' '),
          email: addUserFormData.email,
          phone: addUserFormData.phone,
          address: addUserFormData.address,
          postalCode: addUserFormData.postalCode,
          city: addUserFormData.city,
          numberOfParticipants: addUserFormData.numberOfParticipants,
          specialRequirements: '' // Optional field
        },
        paymentDetails: {
          method: addUserFormData.paymentMethod,
          invoiceDetails: {
            address: addUserFormData.address,
            postalCode: addUserFormData.postalCode,
            city: addUserFormData.city,
          }
        }
      };

      console.log('Sending invoice data:', invoiceData);
      
      const invoiceResponse = await fetch('/api/invoice/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      if (!invoiceResponse.ok) {
        const errorData = await invoiceResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create invoice and booking');
      }

      const result = await invoiceResponse.json();
      console.log("Invoice and booking created successfully:", result);

      // Close modal and refresh data
      handleCloseAddUserModal();
      handleDataUpdate();
      alert('Användare har lagts till och faktura har skickats');
    } catch (err) {
      console.error('Error adding user:', err);
      alert('Kunde inte lägga till användare: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setAddUserLoading(false);
    }
  };

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
                sx={{ 
                  backgroundColor: primaryColor,
                  '&:hover': {
                    backgroundColor: 'rgba(84, 114, 100, 0.9)'
                  }
                }}
              >
                Lägg till deltagare
              </Button>
            </Box>
            
            <BookingsTable
              title="Bekräftade bokningar"
              bookings={bookings}
              loading={loading}
              error={error}
              status="confirmed"
              onBookingUpdate={handleDataUpdate}
              participantInfo={`${bookings
                .filter(b => b.status === 'confirmed')
                .reduce((sum, b) => sum + b.number_of_participants, 0)} av ${course?.max_participants || 0}`}
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
            
            {/* Add User Modal */}
            <Dialog open={openAddUserModal} onClose={handleCloseAddUserModal} fullWidth maxWidth="md">
              <DialogTitle>Lägg till användare på kursen</DialogTitle>
              <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Namn"
                      name="name"
                      value={addUserFormData.name}
                      onChange={handleAddUserFormChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Adress"
                      name="address"
                      value={addUserFormData.address}
                      onChange={handleAddUserFormChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Postnummer"
                      name="postalCode"
                      value={addUserFormData.postalCode}
                      onChange={handleAddUserFormChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Ort"
                      name="city"
                      value={addUserFormData.city}
                      onChange={handleAddUserFormChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="E-post"
                      name="email"
                      type="email"
                      value={addUserFormData.email}
                      onChange={handleAddUserFormChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Telefon"
                      name="phone"
                      value={addUserFormData.phone}
                      onChange={handleAddUserFormChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth required>
                      <InputLabel id="payment-method-label">Betalningsmetod</InputLabel>
                      <Select
                        labelId="payment-method-label"
                        name="paymentMethod"
                        value={addUserFormData.paymentMethod}
                        label="Betalningsmetod"
                        onChange={handleSelectChange}
                      >
                        <MenuItem value="invoice">Faktura</MenuItem>
                        <MenuItem value="swish">Swish</MenuItem>
                        <MenuItem value="giftCard">Presentkort</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth required>
                      <InputLabel id="participants-label">Antal deltagare</InputLabel>
                      {(() => {
                        // Calculate available spots
                        const currentParticipants = bookings
                          .filter(b => b.status === 'confirmed')
                          .reduce((sum, b) => sum + b.number_of_participants, 0);
                        const availableSpots = (course?.max_participants || 0) - currentParticipants;
                        const maxOptions = Math.min(10, Math.max(1, availableSpots));
                        
                        return (
                          <Select
                            labelId="participants-label"
                            name="numberOfParticipants"
                            value={addUserFormData.numberOfParticipants}
                            label="Antal deltagare"
                            onChange={handleSelectChange}
                          >
                            {availableSpots <= 0 ? (
                              <MenuItem value="0" disabled>Inga platser kvar</MenuItem>
                            ) : (
                              [...Array(maxOptions)].map((_, i) => (
                                <MenuItem key={i+1} value={(i+1).toString()}>{i+1}</MenuItem>
                              ))
                            )}
                          </Select>
                        );
                      })()}
                    </FormControl>
                    {(() => {
                      const currentParticipants = bookings
                        .filter(b => b.status === 'confirmed')
                        .reduce((sum, b) => sum + b.number_of_participants, 0);
                      const availableSpots = (course?.max_participants || 0) - currentParticipants;
                      
                      return (
                        <Typography variant="caption" color={availableSpots <= 0 ? "error" : "text.secondary"} sx={{ display: 'block', mt: 1 }}>
                          {availableSpots <= 0 
                            ? "Kursen är fullbokad. Inga platser kvar."
                            : `${currentParticipants} deltagare av ${course?.max_participants} registrerade (${availableSpots} platser kvar)`
                          }
                        </Typography>
                      );
                    })()}
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseAddUserModal}>Avbryt</Button>
                <Button 
                  onClick={handleAddUser} 
                  variant="contained" 
                  color="primary"
                  disabled={addUserLoading || (() => {
                    const currentParticipants = bookings
                      .filter(b => b.status === 'confirmed')
                      .reduce((sum, b) => sum + b.number_of_participants, 0);
                    const availableSpots = (course?.max_participants || 0) - currentParticipants;
                    return availableSpots <= 0;
                  })()}
                  sx={{ 
                    backgroundColor: primaryColor,
                    '&:hover': {
                      backgroundColor: 'rgba(84, 114, 100, 0.9)'
                    }
                  }}
                >
                  {addUserLoading ? 'Bearbetar...' : 'Lägg till och skicka faktura'}
                </Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </Box>
    </Container>
  );
} 