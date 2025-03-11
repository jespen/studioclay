'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '@/styles/BookingForm.module.css';

interface Course {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  duration_minutes: number | null;
  price: number;
  currency: string;
  max_participants: number | null;
  current_participants: number;
  location: string | null;
  image_url: string | null;
  category_id: string | null;
  instructor_id: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface BookingFormProps {
  courseId: string;
}

const BookingForm: React.FC<BookingFormProps> = ({ courseId }) => {
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    number_of_participants: 1,
    message: '',
  });

  // Format date for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    // Format: "15 aug 2025, 16:00"
    const day = date.getDate();
    const month = date.toLocaleString('sv-SE', { month: 'short' });
    const year = date.getFullYear();
    const time = date.toLocaleString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    
    return `${day} ${month} ${year}, ${time}`;
  };

  // Get date display text
  const getDateDisplay = (startDate: string | null, endDate: string | null): string => {
    if (!startDate) return '';
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    
    // If start and end are on the same day
    if (end && start.toDateString() === end.toDateString()) {
      const startTime = start.toLocaleString('sv-SE', { hour: '2-digit', minute: '2-digit' });
      const endTime = end.toLocaleString('sv-SE', { hour: '2-digit', minute: '2-digit' });
      const day = start.getDate();
      const month = start.toLocaleString('sv-SE', { month: 'short' });
      const year = start.getFullYear();
      
      return `${day} ${month} ${year}, ${startTime} - ${endTime}`;
    }
    
    // If multi-day course
    if (end && start.toDateString() !== end.toDateString()) {
      // For longer courses that span weeks
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 14) {
        // Weekly course
        const startDay = start.getDate();
        const startMonth = start.toLocaleString('sv-SE', { month: 'short' });
        const endDay = end.getDate();
        const endMonth = end.toLocaleString('sv-SE', { month: 'short' });
        const year = start.getFullYear();
        const dayOfWeek = start.toLocaleString('sv-SE', { weekday: 'long' });
        const startTime = start.toLocaleString('sv-SE', { hour: '2-digit', minute: '2-digit' });
        const endTime = end.toLocaleString('sv-SE', { hour: '2-digit', minute: '2-digit' });
        
        return `${dayOfWeek}ar, ${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}, ${startTime} - ${endTime}`;
      } else {
        // Weekend course or short course
        const startDay = start.getDate();
        const startMonth = start.toLocaleString('sv-SE', { month: 'short' });
        const endDay = end.getDate();
        const endMonth = end.toLocaleString('sv-SE', { month: 'short' });
        const year = start.getFullYear();
        
        return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;
      }
    }
    
    // Single date with no end time
    return formatDate(startDate);
  };

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        console.log('Client: Fetching course with ID:', courseId);
        
        // Add a small delay to ensure the API route is ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const response = await fetch(`/api/courses/${courseId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        console.log('Client: API response status:', response.status);
        
        if (!response.ok) {
          let errorMessage = `Failed to fetch course: ${response.status} ${response.statusText}`;
          
          try {
            const errorData = await response.json();
            console.error('Client: API error response:', errorData);
            if (errorData.error) {
              errorMessage += ` - ${errorData.error}`;
            }
          } catch (parseError) {
            console.error('Client: Could not parse error response:', parseError);
          }
          
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        if (!data || !data.course) {
          console.error('Client: Course data is missing in the response');
          throw new Error('Course data is missing in the response');
        }
        
        console.log('Client: Course data received:', data.course);
        setCourse(data.course);
        setError(null);
      } catch (err: any) {
        console.error('Client: Error fetching course:', err);
        setError(err.message || 'Failed to load course details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    if (courseId) {
      fetchCourse();
    } else {
      setError('No course ID provided');
      setLoading(false);
    }
  }, [courseId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!course) return;
    
    try {
      setSubmitting(true);
      
      const bookingData = {
        course_id: course.id,
        customer_name: formData.name,
        customer_email: formData.email,
        customer_phone: formData.phone,
        number_of_participants: parseInt(formData.number_of_participants.toString()),
        booking_date: new Date().toISOString(),
        status: 'confirmed',
        payment_status: 'unpaid',
        message: formData.message || null,
      };
      
      console.log('Submitting booking data:', bookingData);
      
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit booking');
      }
      
      setSuccess(true);
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        number_of_participants: 1,
        message: '',
      });
      
      // Redirect after a delay
      setTimeout(() => {
        router.push('/booking-confirmation');
      }, 3000);
      
    } catch (err: any) {
      console.error('Error submitting booking:', err);
      setError(err.message || 'Failed to submit booking. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <p>Laddar kursinformation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <h2>Ett fel uppstod</h2>
          <p>{error}</p>
          <Link href="/" className={styles.backButton}>
            Tillbaka till kurser
          </Link>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <h2>Kursen hittades inte</h2>
          <p>Den begärda kursen kunde inte hittas.</p>
          <Link href="/" className={styles.backButton}>
            Tillbaka till kurser
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.successContainer}>
          <h2>Tack för din bokning!</h2>
          <p>Din bokning av {course.title} har tagits emot.</p>
          <p>Vi kommer att kontakta dig inom kort för att bekräfta din bokning.</p>
          <p>Du omdirigeras nu...</p>
        </div>
      </div>
    );
  }

  const availableSpots = course.max_participants 
    ? course.max_participants - course.current_participants 
    : null;

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <div className={styles.courseInfo}>
          <Link href="/" className={styles.backLink}>
            ← Tillbaka till kurser
          </Link>
          <h1 className={styles.title}>Boka {course.title}</h1>
          
          <div className={styles.courseDetails}>
            <div className={styles.detailItem}>
              <svg className={styles.detailIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <span>{getDateDisplay(course.start_date, course.end_date)}</span>
            </div>
            
            {course.location && (
              <div className={styles.detailItem}>
                <svg className={styles.detailIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span>{course.location}</span>
              </div>
            )}
            
            <div className={styles.detailItem}>
              <svg className={styles.detailIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{course.price} {course.currency}</span>
            </div>
            
            {availableSpots !== null && (
              <div className={styles.detailItem}>
                <svg className={styles.detailIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                <span>{availableSpots} platser kvar</span>
              </div>
            )}
          </div>
          
          {course.description && (
            <div className={styles.courseDescription}>
              <p>{course.description}</p>
            </div>
          )}
        </div>

        <div className={styles.formContainer}>
          <h2 className={styles.formTitle}>Fyll i dina uppgifter</h2>
          
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="name" className={styles.label}>Namn *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className={styles.input}
                placeholder="Ditt namn"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>E-post *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className={styles.input}
                placeholder="din.epost@exempel.se"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="phone" className={styles.label}>Telefon</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={styles.input}
                placeholder="070-123 45 67"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="number_of_participants" className={styles.label}>Antal deltagare *</label>
              <select
                id="number_of_participants"
                name="number_of_participants"
                value={formData.number_of_participants}
                onChange={handleChange}
                required
                className={styles.select}
                disabled={availableSpots !== null && availableSpots < 1}
              >
                {availableSpots !== null ? (
                  Array.from({ length: Math.min(10, availableSpots) }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))
                ) : (
                  Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))
                )}
              </select>
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="message" className={styles.label}>Meddelande</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                className={styles.textarea}
                placeholder="Eventuella önskemål eller frågor"
                rows={4}
              />
            </div>
            
            <div className={styles.formActions}>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={submitting || (availableSpots !== null && availableSpots < 1)}
              >
                {submitting ? 'Skickar...' : 'Boka kurs'}
              </button>
            </div>
            
            {availableSpots !== null && availableSpots < 1 && (
              <div className={styles.fullNotice}>
                <p>Denna kurs är tyvärr fullbokad. Vänligen välj en annan kurs eller kontakta oss för att ställa dig på väntelista.</p>
              </div>
            )}
            
            {error && (
              <div className={styles.errorMessage}>
                <p>{error}</p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookingForm; 