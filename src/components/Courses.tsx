'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '@/styles/Courses.module.css';
import { supabase } from '@/utils/supabase';

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
  template?: { category?: { name: string } };
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
}

const Courses = () => {
  const [tryCourses, setTryCourses] = useState<DisplayCourse[]>([]);
  const [longerCourses, setLongerCourses] = useState<DisplayCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default features for different course types
  const tryOnFeatures = [
    { text: '2 timmars session', included: true },
    { text: 'Dreja så mycket du vill/hinner', included: true },
    { text: 'Välj ut max 2 alster som bränns och glaseras', included: true },
    { text: 'Möjlighet att lägga till fler för 100 kr/st', included: true },
    { text: 'Du väljer glasyrfärg till dina alster', included: true },
    { text: 'Alster beskickas och glaseras av Studio Clay', included: true },
  ];

  const helgkursFeatures = [
    { text: 'Dag 1 (5 h) - Drejning', included: true },
    { text: 'Dag 2 (5 h) - Beskickning (färdigställer)', included: true },
    { text: 'Dag 3 (ca 2 h, 3-4 veckor senare) - Glasyrtilfälle', included: true },
    { text: '3 kg lera ingår', included: true },
    { text: 'Glasering och bränningar ingår', included: true },
    { text: 'Tillgång till egen drejskiva under kursen', included: true },
  ];

  const kvallskursFeatures = [
    { text: '3 h per tillfälle', included: true },
    { text: '5 gånger, sista gången glasering', included: true },
    { text: '3 kg lera ingår', included: true },
    { text: 'Glasering och bränningar ingår', included: true },
    { text: 'Tillgång till egen drejskiva under kursen', included: true },
    { text: 'Inblick i keramikens grunder', included: true },
  ];

  const dagkursFeatures = [
    { text: '3 h per tillfälle', included: true },
    { text: '7 gånger, sista gången glasering', included: true },
    { text: '3 kg lera ingår', included: true },
    { text: 'Glasering och bränningar ingår', included: true },
    { text: 'Tillgång till egen drejskiva under kursen', included: true },
    { text: 'Inblick i keramikens grunder', included: true },
  ];

  const privatFeatures = [
    { text: 'Personlig handledning', included: true },
    { text: 'Flexibla tider', included: true },
    { text: 'Anpassat efter dina önskemål', included: true },
    { text: 'Lera ingår', included: true },
    { text: 'Glasering och bränningar ingår', included: true },
    { text: 'Tillgång till egen drejskiva under lektionen', included: true },
  ];

  // Function to determine features based on course title
  const getFeatures = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('prova')) return tryOnFeatures;
    if (lowerTitle.includes('helg')) return helgkursFeatures;
    if (lowerTitle.includes('kväll')) return kvallskursFeatures;
    if (lowerTitle.includes('dag')) return dagkursFeatures;
    if (lowerTitle.includes('privat')) return privatFeatures;
    // Default features if no match
    return [
      { text: 'Professionell handledning', included: true },
      { text: 'Lera ingår', included: true },
      { text: 'Glasering och bränningar ingår', included: true },
    ];
  };

  // Function to format date for display
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

  // Function to get date display text
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

  // Function to determine session count based on course title and duration
  const getSessionCount = (title: string, startDate: string | null, endDate: string | null) => {
    const lowerTitle = title.toLowerCase();
    
    // Try to extract session count from title
    if (lowerTitle.includes('5 gånger')) return '5 gånger';
    if (lowerTitle.includes('7 gånger')) return '7 gånger';
    
    // If no session count in title, calculate from dates if available
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // If same day, no session count
      if (start.toDateString() === end.toDateString()) return '';
      
      // If more than 1 day apart, calculate days
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 1) {
        // For longer courses, estimate number of sessions
        if (diffDays > 14) {
          // If more than 2 weeks, assume weekly sessions
          const weeks = Math.ceil(diffDays / 7);
          return `${weeks} gånger`;
        } else {
          // Otherwise, show days
          return `${diffDays} dagar`;
        }
      }
    }
    
    return '';
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
    
    return {
      id: course.id,
      name: displayName,
      price: course.price ? course.price.toString() : '0',
      frequency: course.currency || 'kr',
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
    };
  };

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch courses directly from Supabase
        const { data: courses, error } = await supabase
          .from('course_instances')
          .select(`
            *,
            template:course_templates (
              category:categories (
                name
              )
            )
          `)
          .eq('is_published', true)
          .order('start_date', { ascending: true });

        if (error) {
          throw error;
        }

        // Map courses to display format
        const displayCourses = courses.map(mapApiCourseToDisplayCourse);

        // Split courses into try-on and longer courses
        const tryOn = displayCourses.filter(course => 
          course.name.toLowerCase().includes('prova')
        );
        const longer = displayCourses.filter(course => 
          !course.name.toLowerCase().includes('prova')
        );

        setTryCourses(tryOn);
        setLongerCourses(longer);
      } catch (err: any) {
        console.error('Error fetching courses:', err);
        setError(err.message || 'Failed to load courses');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, []);

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
                <div className={styles.courseScroll}>
                  <div className={styles.courseScrollInner}>
                    {tryCourses.map((course) => (
                      <div 
                        key={course.id} 
                        className={`${styles.courseCard} ${course.isPopular ? styles.popularCourse : ''}`}
                      >
                        {course.isPopular && (
                          <div className={styles.popularTag}>
                            {course.isFullyBooked ? 'Fullbokad' : 'Populär'}
                          </div>
                        )}
                        <div className={styles.cardHeader}>
                          <h3 className={styles.courseName}>{course.name}</h3>
                          <div className={styles.coursePrice}>
                            {course.price}
                            <span className={styles.frequency}>{course.frequency}</span>
                          </div>
                          {course.sessionCount && <div className={styles.sessionCount}>{course.sessionCount}</div>}
                          {course.startDate && (
                            <div className={styles.courseDate}>
                              <svg 
                                className={styles.dateIcon}
                                xmlns="http://www.w3.org/2000/svg" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                strokeWidth={1.5} 
                                stroke="currentColor" 
                                width="16" 
                                height="16"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                              </svg>
                              {getDateDisplay(course.startDate, course.endDate)}
                            </div>
                          )}
                          {course.availableSpots !== null && (
                            <div className={styles.availableSpots}>
                              <svg 
                                className={styles.spotsIcon}
                                xmlns="http://www.w3.org/2000/svg" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                strokeWidth={1.5} 
                                stroke="currentColor" 
                                width="16" 
                                height="16"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                              </svg>
                              {course.availableSpots} platser kvar
                            </div>
                          )}
                          <p className={styles.courseDescription}>{course.description}</p>
                        </div>

                        <ul className={styles.featuresList}>
                          {course.features.map((feature, index) => (
                            <li 
                              key={index} 
                              className={`${styles.featureItem} ${!feature.included ? styles.disabledFeature : ''}`}
                            >
                              <svg 
                                className={styles.featureIcon}
                                xmlns="http://www.w3.org/2000/svg" 
                                width="16" 
                                height="16" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                              >
                                {feature.included ? (
                                  <path d="M20 6L9 17l-5-5" />
                                ) : (
                                  <path d="M18 6L6 18M6 6l12 12" />
                                )}
                              </svg>
                              {feature.text}
                            </li>
                          ))}
                        </ul>

                        <div className={styles.cardFooter}>
                          <Link 
                            href={course.buttonLink} 
                            className={`${styles.actionButton} ${course.isSecondary ? styles.secondaryButton : ''}`}
                          >
                            {course.buttonText}
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {longerCourses.length > 0 && (
              <div className={styles.categorySection}>
                <h3 className={styles.categoryTitle}>Längre kurser</h3>
                <div className={styles.courseScroll}>
                  <div className={styles.courseScrollInner}>
                    {longerCourses.map((course) => (
                      <div 
                        key={course.id} 
                        className={`${styles.courseCard} ${course.isPopular ? styles.popularCourse : ''}`}
                      >
                        {course.isPopular && (
                          <div className={styles.popularTag}>
                            {course.isFullyBooked ? 'Fullbokad' : 'Populär'}
                          </div>
                        )}
                        <div className={styles.cardHeader}>
                          <h3 className={styles.courseName}>{course.name}</h3>
                          <div className={styles.coursePrice}>
                            {course.price}
                            <span className={styles.frequency}>{course.frequency}</span>
                          </div>
                          {course.sessionCount && <div className={styles.sessionCount}>{course.sessionCount}</div>}
                          {course.startDate && (
                            <div className={styles.courseDate}>
                              <svg 
                                className={styles.dateIcon}
                                xmlns="http://www.w3.org/2000/svg" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                strokeWidth={1.5} 
                                stroke="currentColor" 
                                width="16" 
                                height="16"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                              </svg>
                              {getDateDisplay(course.startDate, course.endDate)}
                            </div>
                          )}
                          {course.availableSpots !== null && (
                            <div className={styles.availableSpots}>
                              <svg 
                                className={styles.spotsIcon}
                                xmlns="http://www.w3.org/2000/svg" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                strokeWidth={1.5} 
                                stroke="currentColor" 
                                width="16" 
                                height="16"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                              </svg>
                              {course.availableSpots} platser kvar
                            </div>
                          )}
                          <p className={styles.courseDescription}>{course.description}</p>
                        </div>

                        <ul className={styles.featuresList}>
                          {course.features.map((feature, index) => (
                            <li 
                              key={index} 
                              className={`${styles.featureItem} ${!feature.included ? styles.disabledFeature : ''}`}
                            >
                              <svg 
                                className={styles.featureIcon}
                                xmlns="http://www.w3.org/2000/svg" 
                                width="16" 
                                height="16" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                              >
                                {feature.included ? (
                                  <path d="M20 6L9 17l-5-5" />
                                ) : (
                                  <path d="M18 6L6 18M6 6l12 12" />
                                )}
                              </svg>
                              {feature.text}
                            </li>
                          ))}
                        </ul>

                        <div className={styles.cardFooter}>
                          <Link 
                            href={course.buttonLink} 
                            className={`${styles.actionButton} ${course.isSecondary ? styles.secondaryButton : ''}`}
                          >
                            {course.buttonText}
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default Courses;