'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '@/styles/BookingForm.module.css'; // Reuse booking form styles
import { supabase } from '@/utils/supabase';

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
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    number_of_participants: 1,
    message: '',
  });
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

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
        
        const { data: courseData, error: courseError } = await supabase
          .from('course_instances')
          .select(`
            *,
            template:course_templates (
              *,
              category:categories (*),
              instructor:instructors (*)
            )
          `)
          .eq('id', courseId)
          .single();
        
        if (courseError) {
          console.error('Client: Supabase error:', courseError);
          throw new Error(courseError.message);
        }
        
        if (!courseData) {
          console.error('Client: Course data is missing');
          throw new Error('Course not found');
        }

        // Process the data to match the expected structure
        const processedCourse = {
          ...courseData,
          ...courseData.template,
          template_id: courseData.template?.id,
          category: courseData.template?.category || null,
          instructor: courseData.template?.instructor || null
        };
        
        console.log('Client: Course data received:', processedCourse);
        setCourse(processedCourse);
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
      
      const waitlistData = {
        course_id: course.id,
        customer_name: formData.name,
        customer_email: formData.email,
        customer_phone: formData.phone,
        number_of_participants: parseInt(formData.number_of_participants.toString()),
        message: formData.message || null
      };
      
      console.log('Client: Submitting waitlist data:', waitlistData);
      
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(waitlistData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to join waitlist');
      }
      
      console.log('Client: Waitlist entry created:', result.data);
      setSuccess(true);
      
      // Redirect to confirmation page
      router.push('/waitlist-confirmation');
    } catch (err: any) {
      console.error('Client: Error submitting waitlist form:', err);
      setError(err.message || 'Failed to join waitlist. Please try again later.');
      setSuccess(false);
    } finally {
      setSubmitting(false);
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
        
        {error && <p className={styles.errorMessage}>{error}</p>}
        {success && (
          <p className={styles.successMessage}>
            Du har lagts till på väntelistan! Vi kontaktar dig om en plats blir ledig.
          </p>
        )}
      </form>
    </div>
  );
};

export default WaitlistForm; 