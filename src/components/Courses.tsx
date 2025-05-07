'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from '@/styles/Courses.module.css';
import { fetchCoursesWithCache } from '@/utils/apiCache';

// Define the course type based on the API response
interface ApiCourse {
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
  template?: { 
    category?: { name: string };
    price?: number;
    image_url?: string | null;
  };
}

// Define our display course type
interface DisplayCourse {
  id: string;
  name: string;
  price: string;
  frequency: string;
  sessionCount: string;
  description: string;
  isPopular: boolean;
  isFullyBooked: boolean;
  features: { text: string; included: boolean }[];
  buttonText: string;
  buttonLink: string;
  isSecondary: boolean;
  startDate: string | null;
  endDate: string | null;
  availableSpots: number | null;
  location: string;
  imageUrl: string | null;
  startDateFormatted: string;
  endDateFormatted: string;
  timeFormatted: string;
  weekday: string;
}

const Courses = () => {
  const [tryCourses, setTryCourses] = useState<DisplayCourse[]>([]);
  const [longerCourses, setLongerCourses] = useState<DisplayCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper functions
  const getSessionCount = (title: string, startDate: string | null, endDate: string | null): string => {
    if (title.toLowerCase().includes('prova på')) {
      return '1 tillfälle';
    }
    
    if (title.toLowerCase().includes('helg')) {
      return '2 dagar';
    }
    
    // If we have both start and end date
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Calculate difference in days
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 2) {
        return '1 tillfälle';
      } else if (diffDays < 7) {
        return `${diffDays} dagar`;
      } else {
        // For longer periods, estimate weeks or months
        const diffWeeks = Math.ceil(diffDays / 7);
        if (diffWeeks <= 4) {
          return `${diffWeeks} veckor`;
        } else {
          const diffMonths = Math.ceil(diffWeeks / 4);
          return `${diffMonths} månader`;
        }
      }
    }
    
    return 'Flera tillfällen';
  };
  
  const getFeatures = (courseType: string): { text: string; included: boolean }[] => {
    const isProva = courseType.toLowerCase().includes('prova');
    
    return [
      { text: 'Material ingår', included: true },
      { text: 'Individuell handledning', included: true },
      { text: 'Grundläggande tekniker', included: true },
      { text: 'Tillgång till verktyg', included: true },
      { text: 'Ta hem dina verk', included: isProva ? false : true },
      { text: 'Glasering och bränning', included: isProva ? false : true },
    ];
  };

  // Format date for display on cards
  const formatDateForDisplay = (dateString: string | null): string => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    // Format like: "7 APRIL"
    return `${date.getDate()} ${date.toLocaleString('sv-SE', { 
      month: 'long',
      timeZone: 'Europe/Stockholm' 
    }).toUpperCase()}`;
  };
  
  // Get weekday in Swedish
  const getWeekday = (dateString: string | null): string => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    // Get weekday in Swedish: "MÅNDAG"
    return date.toLocaleString('sv-SE', { 
      weekday: 'long',
      timeZone: 'Europe/Stockholm'
    }).toUpperCase();
  };
  
  // Format time range like "18.00-21.00"
  const formatTimeRange = (startDate: string | null, endDate: string | null): string => {
    if (!startDate || !endDate) return '';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Create date formatter objects with Stockholm timezone
    const startHours = new Intl.DateTimeFormat('sv-SE', { 
      hour: '2-digit', 
      hour12: false,
      timeZone: 'Europe/Stockholm'
    }).format(start).padStart(2, '0');
    
    const startMinutes = new Intl.DateTimeFormat('sv-SE', { 
      minute: '2-digit',
      timeZone: 'Europe/Stockholm'
    }).format(start).padStart(2, '0');
    
    const endHours = new Intl.DateTimeFormat('sv-SE', { 
      hour: '2-digit', 
      hour12: false,
      timeZone: 'Europe/Stockholm'
    }).format(end).padStart(2, '0');
    
    const endMinutes = new Intl.DateTimeFormat('sv-SE', { 
      minute: '2-digit',
      timeZone: 'Europe/Stockholm'
    }).format(end).padStart(2, '0');
    
    // Format like: "18.00-21.00"
    return `${startHours}.${startMinutes}-${endHours}.${endMinutes}`;
  };

  // Function to convert API course to display course
  const mapApiCourseToDisplayCourse = (course: ApiCourse): DisplayCourse => {
    // Check if the course is fully booked
    const isFullyBooked = course.max_participants !== null && 
                          course.current_participants >= course.max_participants;
    
    // Calculate available spots
    const availableSpots = course.max_participants !== null 
      ? course.max_participants - course.current_participants 
      : null;

    // Get the category name from the template if available
    const displayName = course.template?.category?.name || course.title;
    
    // For debugging price and participant count
    console.log(`Course ${course.id} - ${displayName}:`, { 
      directPrice: course.price,
      templatePrice: course.template?.price,
      maxParticipants: course.max_participants,
      currentParticipants: course.current_participants,
      availableSpots: availableSpots,
      isFullyBooked: isFullyBooked,
      category: course.template?.category?.name,
      title: course.title,
      courseImageUrl: course.image_url,
      templateImageUrl: course.template?.image_url
    });
    
    // Get the image URL from the course or template
    const imageUrl = course.image_url || course.template?.image_url || null;
    console.log(`Final image URL for course ${course.id}: ${imageUrl}`);
    
    // Format dates and time for display
    const startDateFormatted = formatDateForDisplay(course.start_date);
    const endDateFormatted = formatDateForDisplay(course.end_date);
    const timeFormatted = formatTimeRange(course.start_date, course.end_date);
    const weekday = getWeekday(course.start_date);
    
    return {
      id: course.id,
      name: displayName,
      price: course.price ? course.price.toString() : (course.template?.price ? course.template.price.toString() : '0'),
      frequency: 'kr', // Always use 'kr' as currency
      sessionCount: getSessionCount(displayName, course.start_date, course.end_date),
      description: course.description || '',
      isPopular: false, // Will be set later
      isFullyBooked: isFullyBooked,
      features: getFeatures(displayName),
      buttonText: isFullyBooked ? 'Skriv upp dig på väntelista' : 'Boka kurs',
      buttonLink: isFullyBooked ? `/waitlist/${course.id}` : `/book-course/${course.id}`,
      isSecondary: false,
      startDate: course.start_date,
      endDate: course.end_date,
      availableSpots: availableSpots,
      location: 'Studio Clay Norrtullsgatan 65', // Fixed location for all courses
      imageUrl: imageUrl,
      startDateFormatted,
      endDateFormatted,
      timeFormatted,
      weekday
    };
  };

  // Memoize the filter to prevent unnecessary re-renders
  const filterCourses = useCallback((allCourses: DisplayCourse[]) => {
    // Ensure we have courses to filter
    if (!allCourses.length) return { tryOn: [], longer: [] };
    
    // Improved filtering for try-on courses
    const tryOn = allCourses.filter((course: DisplayCourse) => {
      // Check both the course name and possible properties that might contain "prova"
      return course.name.toLowerCase().includes('prova') || 
             (course.description && course.description.toLowerCase().includes('prova på'));
    });
    
    const longer = allCourses.filter((course: DisplayCourse) => {
      // Exclude any course that's classified as a try-on course
      return !(course.name.toLowerCase().includes('prova') ||
              (course.description && course.description.toLowerCase().includes('prova på')));
    });
    
    return { tryOn, longer };
  }, []);

  // Fetch and process courses
  const fetchCourses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use cached data when possible
      const data = await fetchCoursesWithCache(true);
      
      // Ensure we have the expected data structure
      const apiCourses = Array.isArray(data.courses) ? data.courses : [];
      console.log(`Found ${apiCourses.length} courses in response`);
      
      // Process the courses
      const processed = apiCourses
        .filter((course: ApiCourse) => course.is_published) // Only display published courses
        .map(mapApiCourseToDisplayCourse);
      
      // Apply the filtering
      const { tryOn, longer } = filterCourses(processed);
      
      setTryCourses(tryOn);
      setLongerCourses(longer);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      setError('Failed to load courses. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [filterCourses]);

  // Fetch courses on component mount and when the fetch function changes
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const getSpotsClass = (spots: number | null): string => {
    if (spots === null) return '';
    if (spots <= 2) return styles.low;
    if (spots <= 5) return styles.medium;
    return styles.high;
  };

  return (
    <section id="courses" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.titleSection}>
          <h2 className={styles.title}>Kurser</h2>
          <p className={styles.description}>
            Välj den kurs som passar dig bäst, från provakurser till helgkurser och regelbundna kurstillfällen.
          </p>
        </div>

        {isLoading ? (
          <div className={styles.loadingContainer}>
            <p>Laddar kurser...</p>
          </div>
        ) : error ? (
          <div className={styles.errorContainer}>
            <p>{error}</p>
          </div>
        ) : (
          <>
            {tryCourses.length > 0 && (
              <div className={styles.categorySection}>
                <h3 className={styles.categoryTitle}>Prova på</h3>
                <div className={styles.courseGrid}>
                  {tryCourses.map((course) => (
                    <div 
                      key={course.id} 
                      className={`${styles.courseCard} ${course.isFullyBooked ? styles.soldOutCourse : ''}`}
                    >
                      <div className={styles.courseImageContainer} style={{ backgroundImage: `url(${course.imageUrl || '/pictures/gronvas.jpg'})` }}>
                        {!course.isFullyBooked && course.availableSpots !== null && (
                          <div className={`${styles.availableSpots} ${getSpotsClass(course.availableSpots)}`}>
                            {course.availableSpots} plats{course.availableSpots !== 1 ? 'er' : ''} kvar
                          </div>
                        )}
                        <div className={styles.courseImageOverlay}>
                          <div className={styles.courseDate}>
                            <div className={styles.weekday}>{course.weekday}</div>
                            <div className={styles.dateRange}>
                              {course.startDateFormatted}-{course.endDateFormatted.split(' ')[0]} {course.endDateFormatted.split(' ')[1]}
                            </div>
                            <div className={styles.courseTime}>{course.timeFormatted}</div>
                          </div>
                        </div>
                        
                        {course.isFullyBooked && (
                          <div className={styles.soldOutTag}>
                            Slutsåld
                          </div>
                        )}
                      </div>
                      
                      <div className={styles.courseInfo}>
                        <h3 className={styles.courseName}>{course.name}</h3>
                        <div className={styles.coursePrice}>
                          <span className={styles.priceValue}>{course.price}</span>
                          <span className={styles.priceFrequency}>{course.frequency}</span>
                        </div>
                        
                        <div className={styles.cardFooter}>
                          <Link 
                            href={course.buttonLink} 
                            className={`${styles.actionButton} ${course.isSecondary ? styles.secondaryButton : ''}`}
                          >
                            {course.buttonText}
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {longerCourses.length > 0 && (
              <div className={styles.categorySection}>
                <h3 className={styles.categoryTitle}>Längre kurser</h3>
                <div className={styles.courseGrid}>
                  {longerCourses.map((course) => (
                    <div 
                      key={course.id} 
                      className={`${styles.courseCard} ${course.isFullyBooked ? styles.soldOutCourse : ''}`}
                    >
                      <div className={styles.courseImageContainer} style={{ backgroundImage: `url(${course.imageUrl || '/pictures/gronvas.jpg'})` }}>
                        {!course.isFullyBooked && course.availableSpots !== null && (
                          <div className={`${styles.availableSpots} ${getSpotsClass(course.availableSpots)}`}>
                            {course.availableSpots} plats{course.availableSpots !== 1 ? 'er' : ''} kvar
                          </div>
                        )}
                        <div className={styles.courseImageOverlay}>
                          <div className={styles.courseDate}>
                            <div className={styles.weekday}>{course.weekday}</div>
                            <div className={styles.dateRange}>
                              {course.startDateFormatted}-{course.endDateFormatted.split(' ')[0]} {course.endDateFormatted.split(' ')[1]}
                            </div>
                            <div className={styles.courseTime}>{course.timeFormatted}</div>
                          </div>
                        </div>
                        
                        {course.isFullyBooked && (
                          <div className={styles.soldOutTag}>
                            Slutsåld
                          </div>
                        )}
                      </div>
                      
                      <div className={styles.courseInfo}>
                        <h3 className={styles.courseName}>{course.name}</h3>
                        <div className={styles.coursePrice}>
                          <span className={styles.priceValue}>{course.price}</span>
                          <span className={styles.priceFrequency}>{course.frequency}</span>
                        </div>
                        
                        <div className={styles.cardFooter}>
                          <Link 
                            href={course.buttonLink} 
                            className={`${styles.actionButton} ${course.isSecondary ? styles.secondaryButton : ''}`}
                          >
                            {course.buttonText}
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {tryCourses.length === 0 && longerCourses.length === 0 && (
              <div className={styles.noCourses}>
                <p>Inga kurser tillgängliga för tillfället. Kom tillbaka senare!</p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default Courses;