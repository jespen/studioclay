'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '@/styles/BookingForm.module.css'; // Reuse booking form styles

interface WaitlistFormProps {
  courseId: string;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  number_of_participants: number;
  message: string;
}

const WaitlistForm: React.FC<WaitlistFormProps> = ({ courseId }) => {
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
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
    const month = date.toLocaleString('sv-SE', { 
      month: 'short',
      timeZone: 'Europe/Stockholm'
    });
    const year = date.getFullYear();
    const time = date.toLocaleString('sv-SE', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Europe/Stockholm'
    });
    
    return `${day} ${month} ${year}, ${time}`;
  };

  // Get date display text
  const getDateDisplay = (startDate: string | null, endDate: string | null): string => {
    if (!startDate) return '';
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    
    // If start and end are on the same day
    if (end && start.toDateString() === end.toDateString()) {
      const startTime = start.toLocaleString('sv-SE', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Europe/Stockholm'
      });
      const endTime = end.toLocaleString('sv-SE', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Europe/Stockholm'
      });
      const day = start.getDate();
      const month = start.toLocaleString('sv-SE', { 
        month: 'short',
        timeZone: 'Europe/Stockholm'
      });
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
        const startMonth = start.toLocaleString('sv-SE', { 
          month: 'short',
          timeZone: 'Europe/Stockholm'
        });
        const endDay = end.getDate();
        const endMonth = end.toLocaleString('sv-SE', { 
          month: 'short',
          timeZone: 'Europe/Stockholm'
        });
        const year = start.getFullYear();
        const dayOfWeek = start.toLocaleString('sv-SE', { 
          weekday: 'long',
          timeZone: 'Europe/Stockholm'
        });
        const startTime = start.toLocaleString('sv-SE', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Europe/Stockholm'
        });
        const endTime = end.toLocaleString('sv-SE', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Europe/Stockholm'
        });
        
        return `${dayOfWeek}ar, ${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}, ${startTime} - ${endTime}`;
      } else {
        // Weekend course or short course
        const startDay = start.getDate();
        const startMonth = start.toLocaleString('sv-SE', { 
          month: 'short',
          timeZone: 'Europe/Stockholm'
        });
        const endDay = end.getDate();
        const endMonth = end.toLocaleString('sv-SE', { 
          month: 'short',
          timeZone: 'Europe/Stockholm'
        });
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
        setError(null);
        
        // Use API endpoint instead of direct Supabase access
        const response = await fetch(`/api/courses/${courseId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch course');
        }
        
        const data = await response.json();
        
        if (data.course) {
          setCourse(data.course);
        } else {
          throw new Error('Course not found');
        }
      } catch (err) {
        console.error('Error fetching course:', err);
        setError('Kunde inte ladda kursinformation. Försök igen senare.');
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'number_of_participants') {
      // Convert to number and ensure it's at least 1
      const parsedValue = parseInt(value, 10);
      const numValue = !isNaN(parsedValue) ? Math.max(1, parsedValue) : 1;
      setFormData((prev) => ({ ...prev, [name]: numValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== WAITLIST FORM SUBMIT START ===');
    console.log('Form data before processing:', JSON.stringify(formData, null, 2));
    console.log('Course ID:', courseId);
    
    try {
      setSubmitting(true);
      setSubmitError(null);
      
      // Ensure number_of_participants is a number
      const numberOfParticipants = parseInt(formData.number_of_participants.toString(), 10);
      console.log('Parsed number of participants:', numberOfParticipants);
      
      if (isNaN(numberOfParticipants) || numberOfParticipants < 1) {
        console.error('❌ Invalid number of participants:', numberOfParticipants);
        throw new Error('Antal deltagare måste vara minst 1');
      }
      
      // Prepare request payload
      const requestPayload = {
        course_id: courseId,
        customer_name: formData.name,
        customer_email: formData.email,
        customer_phone: formData.phone,
        number_of_participants: numberOfParticipants,
        message: formData.message,
      };
      
      console.log('Request payload:', JSON.stringify(requestPayload, null, 2));
      console.log('Making API request to /api/waitlist...');
      
      // Use API endpoint instead of direct Supabase access
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });
      
      console.log('API response status:', response.status);
      console.log('API response ok:', response.ok);
      
      // Always try to parse the response
      let responseData;
      try {
        responseData = await response.json();
        console.log('API response data:', JSON.stringify(responseData, null, 2));
      } catch (parseError) {
        console.error('❌ Failed to parse response JSON:', parseError);
        console.log('Raw response text:', await response.text());
        throw new Error('Ogiltigt svar från servern');
      }
      
      if (!response.ok) {
        console.error('❌ API request failed with status:', response.status);
        console.error('❌ Error response:', responseData);
        throw new Error(responseData.error || 'Failed to join waitlist');
      }
      
      console.log('✅ API request successful');
      console.log('✅ Response data:', responseData);
      
      // Success! Redirect to confirmation page instead of showing inline message
      console.log('✅ Redirecting to waitlist confirmation page');
      router.push('/waitlist-confirmation');
      console.log('=== WAITLIST FORM SUBMIT SUCCESS ===');
      
    } catch (err) {
      console.error('❌ Error in form submission:', err);
      console.error('❌ Error type:', typeof err);
      console.error('❌ Error message:', err instanceof Error ? err.message : 'Unknown error');
      console.error('❌ Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      
      const errorMessage = err instanceof Error ? err.message : 'Det gick inte att anmäla sig till väntelistan. Försök igen senare.';
      console.error('❌ Setting error message:', errorMessage);
      
      setSubmitError(errorMessage);
      console.log('=== WAITLIST FORM SUBMIT ERROR ===');
    } finally {
      console.log('Setting submitting to false');
      setSubmitting(false);
      console.log('=== WAITLIST FORM SUBMIT END ===');
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Laddar kursinformation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2>Ett fel uppstod</h2>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className={styles.retryButton}
        >
          Försök igen
        </button>
      </div>
    );
  }

  if (!course) {
    return (
      <div className={styles.errorContainer}>
        <h2>Kursen kunde inte hittas</h2>
        <p>Vi kunde inte hitta den begärda kursen. Vänligen gå tillbaka och försök igen.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.formHeader}>
        <Link href="/" className={styles.backLink}>
          ← Tillbaka till kurser
        </Link>
        <h1>Väntelista: {course.template?.title || course.title}</h1>
        <p className={styles.courseDate}>
          {getDateDisplay(course.start_date, course.end_date)}
        </p>
        <p className={styles.waitlistInfo}>
          Denna kurs är fullbokad. Genom att skriva upp dig på väntelistan blir du kontaktad om en plats blir ledig.
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="name">Namn *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Ditt namn"
            className={styles.input}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="email">E-post *</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="Din e-postadress"
            className={styles.input}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="phone">Telefon</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Ditt telefonnummer"
            className={styles.input}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="number_of_participants">Antal personer *</label>
          <select
            id="number_of_participants"
            name="number_of_participants"
            value={formData.number_of_participants}
            onChange={handleChange}
            required
            className={styles.select}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="message">Meddelande</label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Valfritt meddelande"
            className={styles.textarea}
            rows={4}
          />
        </div>
        
        <button
          type="submit"
          disabled={submitting}
          className={styles.submitButton}
        >
          {submitting ? 'Skickar...' : 'Skriv upp mig på väntelistan'}
        </button>
        
        {submitError && <p className={styles.errorMessage}>{submitError}</p>}
      </form>
    </div>
  );
};

export default WaitlistForm; 