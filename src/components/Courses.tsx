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

function ringText(phrase: string) {
  const unit = `${phrase} • `;
  const repeats = Math.max(2, Math.round(40 / unit.length));
  return unit.repeat(repeats);
}

export function CourseStatusBadge({
  courseId,
  isFullyBooked,
  availableSpots,
  toneClass,
}: {
  courseId: string;
  isFullyBooked: boolean;
  availableSpots: number | null;
  toneClass: string;
}) {
  if (!isFullyBooked && availableSpots === null) return null;

  const phrase = isFullyBooked
    ? 'SLUTSÅLD'
    : availableSpots === 1
      ? '1 PLATS KVAR'
      : `${availableSpots} PLATSER KVAR`;
  const pathId = `course-badge-${courseId}`;
  const label = isFullyBooked
    ? 'Slutsåld'
    : `${availableSpots} ${availableSpots === 1 ? 'plats' : 'platser'} kvar`;

  return (
    <div
      className={`${styles.statusBadge} ${isFullyBooked ? styles.soldOutBadge : toneClass}`}
      role="img"
      aria-label={label}
    >
      <svg className={styles.statusBadgeRing} viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <path
            id={pathId}
            d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0"
          />
        </defs>
        <text>
          <textPath href={`#${pathId}`} textLength="232" lengthAdjust="spacing">
            {ringText(phrase)}
          </textPath>
        </text>
      </svg>
      <span className={styles.statusBadgeCenter} aria-hidden="true">
        {isFullyBooked ? '–' : availableSpots}
      </span>
    </div>
  );
}

type CourseFilter = 'all' | 'try' | 'longer';

const COURSE_FILTERS: { id: CourseFilter; label: string }[] = [
  { id: 'all', label: 'Alla' },
  { id: 'try', label: 'Prova på' },
  { id: 'longer', label: 'Längre kurser' },
];

const Courses = () => {
  const [tryCourses, setTryCourses] = useState<DisplayCourse[]>([]);
  const [longerCourses, setLongerCourses] = useState<DisplayCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<CourseFilter>('all');

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
    
    // Sort both arrays by start date (earliest first)
    const sortByStartDate = (a: DisplayCourse, b: DisplayCourse) => {
      // Handle null/undefined start dates - put them at the end
      if (!a.startDate && !b.startDate) return 0;
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      
      return dateA.getTime() - dateB.getTime();
    };
    
    const sortedTryOn = tryOn.sort(sortByStartDate);
    const sortedLonger = longer.sort(sortByStartDate);
    
    // Log the sorting results for debugging
    console.log('Kurser sorterade efter startdatum:');
    console.log('Prova på kurser:', sortedTryOn.map(course => ({
      name: course.name,
      startDate: course.startDate,
      formattedDate: course.startDateFormatted
    })));
    console.log('Längre kurser:', sortedLonger.map(course => ({
      name: course.name, 
      startDate: course.startDate,
      formattedDate: course.startDateFormatted
    })));
    
    return { tryOn: sortedTryOn, longer: sortedLonger };
  }, []);

  // Fetch and process courses
  const fetchCourses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use cached data when possible
      const data = await fetchCoursesWithCache(true, { useCache: false });
      
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

  const renderCourseCard = (
    course: DisplayCourse,
    marker?: { label: string; placement: 'lead' | 'divider' }
  ) => (
    <div
      key={course.id}
      className={`${styles.courseCard} ${course.isFullyBooked ? styles.soldOutCourse : ''} ${marker ? styles.sectionStart : ''} ${marker?.placement === 'lead' ? styles.sectionLead : ''}`}
    >
      {marker && (
        <span className={`${styles.sectionLabel} ${marker.placement === 'lead' ? styles.sectionLabelLead : ''}`}>
          {marker.label}
        </span>
      )}
      <div className={styles.courseImageContainer} style={{ backgroundImage: `url(${course.imageUrl || '/pictures/gronvas.jpg'})` }}>
        <CourseStatusBadge
          courseId={course.id}
          isFullyBooked={course.isFullyBooked}
          availableSpots={course.availableSpots}
          toneClass={getSpotsClass(course.availableSpots)}
        />
        <div className={styles.courseImageOverlay}>
          <div className={styles.courseDate}>
            <div className={styles.weekday}>{course.weekday}</div>
            <div className={styles.dateRange}>
              {course.startDateFormatted}-{course.endDateFormatted.split(' ')[0]} {course.endDateFormatted.split(' ')[1]}
            </div>
            <div className={styles.courseTime}>{course.timeFormatted}</div>
          </div>
        </div>
      </div>

      <div className={styles.courseInfo}>
        <div className={styles.courseHeading}>
          <h3 className={styles.courseName}>{course.name}</h3>
          <div className={styles.coursePrice}>
            <span className={styles.priceValue}>{course.price}</span>
            <span className={styles.priceFrequency}>{course.frequency}</span>
          </div>
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
  );

  const showTryCourses = activeFilter === 'all' || activeFilter === 'try';
  const showLongerCourses = activeFilter === 'all' || activeFilter === 'longer';
  const visibleTryCourses = showTryCourses ? tryCourses : [];
  const visibleLongerCourses = showLongerCourses ? longerCourses : [];
  const hasVisibleCourses = visibleTryCourses.length > 0 || visibleLongerCourses.length > 0;
  const emptyMessage =
    activeFilter === 'try'
      ? 'Inga prova på kurser just nu.'
      : activeFilter === 'longer'
        ? 'Inga längre kurser just nu.'
        : 'Inga kurser tillgängliga för tillfället. Kom tillbaka senare!';

  return (
    <section id="courses" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.titleSection} data-reveal>
          <h2 className={styles.title}>Kurser</h2>
          <p className={styles.description}>
            Välj den kurs som passar dig bäst, från prova på kurser till helgkurser och regelbundna kurstillfällen.
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
            <div className={styles.filterContainer} role="group" aria-label="Filtrera kurser" data-reveal>
              {COURSE_FILTERS.map((filter) => {
                const isActive = activeFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    className={`${styles.filterButton} ${isActive ? styles.activeFilter : ''}`}
                    onClick={() => setActiveFilter(filter.id)}
                    aria-pressed={isActive}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {hasVisibleCourses && (
              <div className={styles.categorySection}>
                <div className={styles.courseGrid} data-reveal-stagger="zoom">
                  {visibleTryCourses.map((course, index) =>
                    renderCourseCard(
                      course,
                      activeFilter === 'all' && index === 0
                        ? { label: 'Prova på', placement: 'lead' }
                        : undefined
                    )
                  )}
                  {visibleLongerCourses.map((course, index) =>
                    renderCourseCard(
                      course,
                      activeFilter === 'all' && index === 0
                        ? {
                            label: 'Längre kurser',
                            placement: visibleTryCourses.length > 0 ? 'divider' : 'lead',
                          }
                        : undefined
                    )
                  )}
                </div>
              </div>
            )}

            {!hasVisibleCourses && (
              <div className={styles.noCourses}>
                <p>{emptyMessage}</p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default Courses;