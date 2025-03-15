'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Box, Paper, Typography, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CourseForm from '@/app/admin/dashboard/courses/CourseForm';
import BookingsTable from './BookingsTable';
import { Course, Booking } from '@/types/course';

interface CourseManagementPageProps {
  courseId: string;
}

export default function CourseManagementPage({ courseId }: CourseManagementPageProps) {
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshData, setRefreshData] = useState(0);
  
  // Primary color from globals.css
  const primaryColor = '#547264';

  useEffect(() => {
    const fetchData = async () => {
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

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>Laddar kurs...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography color="error">Error: {error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
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
            
            <BookingsTable
              title="Bekräftade bokningar"
              bookings={bookings}
              loading={loading}
              error={error}
              status="confirmed"
              onEditBooking={() => {}}
              onUpdateBooking={handleDataUpdate}
              participantInfo={`${bookings
                .filter(b => b.status === 'confirmed')
                .reduce((sum, b) => sum + b.number_of_participants, 0)} av ${course?.max_participants || 0}`}
            />
            
            <BookingsTable
              title="Väntelista"
              bookings={bookings}
              loading={loading}
              error={error}
              status="waiting"
              onEditBooking={() => {}}
              onUpdateBooking={handleDataUpdate}
              participantInfo={`${bookings
                .filter(b => b.status === 'waiting')
                .reduce((sum, b) => sum + b.number_of_participants, 0)}`}
            />
            
            <BookingsTable
              title="Avbokade"
              bookings={bookings}
              loading={loading}
              error={error}
              status="cancelled"
              onEditBooking={() => {}}
              onUpdateBooking={handleDataUpdate}
              participantInfo={`${bookings
                .filter(b => b.status === 'cancelled')
                .reduce((sum, b) => sum + b.number_of_participants, 0)}`}
            />
          </>
        )}
      </Box>
    </Container>
  );
} 