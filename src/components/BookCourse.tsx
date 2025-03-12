'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '@/styles/BookCourse.module.css';
import coursesStyles from '@/styles/Courses.module.css';
import servicesStyles from '@/styles/Services.module.css';
import Services from '@/components/Services';

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

const BookCourse = () => {
  const [tryCourses, setTryCourses] = useState<DisplayCourse[]>([]);
  const [longerCourses, setLongerCourses] = useState<DisplayCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

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

  // Translated FAQs to Swedish
  const faqs = [
    {
      question: 'Vad ska jag ha på mig till en keramikkurs?',
      answer: 'Använd bekväma kläder som du inte har något emot att få lera på. Många föredrar att bära förkläde eller rock. Undvik löst sittande ärmar som kan dra i lera eller vatten. Ta med en handduk och överväg att ha ett par rena skor om du vill hålla dina vanliga skor lerfria.',
    },
    {
      question: 'Behöver jag ta med egna verktyg?',
      answer: 'Alla grundläggande verktyg och material tillhandahålls för nybörjare. För mellan- och avancerade kurser ger vi en lista över rekommenderade verktyg som du kan vilja köpa. Många elever utvecklar preferenser för specifika verktyg när de fortskrider.',
    },
    {
      question: 'Hur många föremål kommer jag att göra i en kurs?',
      answer: 'Detta varierar beroende på kursnivå och typ. I nybörjarkurser slutför eleverna vanligtvis 3-5 färdiga föremål. Mer avancerade kurser kan fokusera på färre, mer komplexa föremål eller fler föremål beroende på de tekniker som lärs ut.',
    },
    {
      question: 'Finns det en åldersgräns för era kurser?',
      answer: 'Vuxenkurser är för personer från 16 år och uppåt. Vi erbjuder specifika kurser för barn i åldern 8-15 år, och familjekurser där föräldrar och barn kan arbeta tillsammans. Kontrollera de specifika kursbeskrivningarna för åldersrekommendationer.',
    },
    {
      question: 'När får jag mina färdiga föremål?',
      answer: 'Keramik kräver tid för torkning, biskuitbränning, glasering och slutlig bränning. Denna process tar vanligtvis 3-4 veckor efter din sista lektion. Vi meddelar dig när dina föremål är klara för upphämtning.',
    },
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

  // Services data
  const services = [
    {
      id: 1,
      title: 'Företagsevent',
      description: 'Kreativa keramikworkshops för företag som vill stärka teambuilding.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
      link: '/contact',
      audience: ['Företag']
    },
    {
      id: 2,
      title: 'Designa ditt event',
      description: 'Tillgång till professionell utrustning och utrymme för erfarna keramiker.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
      link: '/contact',
      audience: ['Individuell', 'Företag']
    },
    {
      id: 3,
      title: 'Presentkort',
      description: 'Perfekta presenter för vänner och familj som vill utforska keramik.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      ),
      link: '/gift-card',
      audience: ['Individuell', 'Företag']
    }
  ];

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/courses/?published=true');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch courses: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.courses || !Array.isArray(data.courses)) {
          throw new Error('Invalid response format');
        }
        
        // Convert API courses to display courses
        const displayCourses = data.courses.map(mapApiCourseToDisplayCourse);
        
        // Categorize courses
        const tryOnCourses: DisplayCourse[] = [];
        const otherCourses: DisplayCourse[] = [];
        
        displayCourses.forEach((course: DisplayCourse) => {
          // If course is fully booked, show "Fullbokad" instead of "Populär"
          if (course.isFullyBooked) {
            course.isPopular = true; // Use the popular tag to show "Fullbokad"
          } else {
            // Otherwise, mark some courses as popular (e.g., every second course)
            course.isPopular = course.id.charCodeAt(0) % 2 === 0;
          }
          
          if (course.name.toLowerCase().includes('prova')) {
            tryOnCourses.push(course);
          } else {
            otherCourses.push(course);
          }
        });
        
        setTryCourses(tryOnCourses);
        setLongerCourses(otherCourses);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching courses:', err);
        setError('Failed to load courses. Please try again later.');
        
        // Fallback to sample data if API fails
        setTryCourses([
          {
            id: '1',
            name: 'Prova-på',
            price: '800',
            frequency: 'kr',
            sessionCount: '',
            description: 'Perfekt för nybörjare som vill prova på drejning för första gången.',
            isPopular: false,
            isFullyBooked: false,
            features: tryOnFeatures,
            buttonText: 'Boka kurs',
            buttonLink: '/book-course/1',
            isSecondary: false,
            startDate: '2025-03-27T11:30:00+00:00',
            endDate: '2025-03-27T13:30:00+00:00',
            availableSpots: null,
          },
        ]);
        
        setLongerCourses([
          {
            id: '2',
            name: 'Helgkurs',
            price: '3000',
            frequency: 'kr',
            sessionCount: '',
            description: 'Drejning, med inslag av korta förevisningsdrejningar som inspiration och tips för eget drejande.',
            isPopular: true,
            isFullyBooked: false,
            features: helgkursFeatures,
            buttonText: 'Boka kurs',
            buttonLink: '/book-course/2',
            isSecondary: false,
            startDate: '2025-03-22T09:00:00+00:00',
            endDate: '2025-03-23T16:00:00+00:00',
            availableSpots: null,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCourses();
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        {/* Back to Home button */}
        <div className={styles.backButtonContainer}>
          <Link href="/" className={styles.backButton}>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              width="20" 
              height="20"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 19l-7-7m0 0l7-7m-7 7h18" 
              />
            </svg>
            Tillbaka till startsidan
          </Link>
        </div>

        <div className={styles.titleSection}>
          <h1 className={styles.title}>
            Boka en <span className={styles.highlightText}>Keramikkurs</span>
          </h1>
          <p className={styles.description}>
            Anmäl dig till en av våra praktiska keramikkurser och lär dig drejningstekniker från erfarna instruktörer i en kreativ och stödjande miljö.
          </p>
        </div>

        {/* Courses section using the Courses component style */}
        <div className={coursesStyles.container}>
          {isLoading ? (
            <div className={coursesStyles.loadingContainer}>
              <p>Laddar kurser...</p>
            </div>
          ) : error ? (
            <div className={coursesStyles.errorContainer}>
              <p>{error}</p>
            </div>
          ) : (
            <>
              {tryCourses.length > 0 && (
                <div className={coursesStyles.categorySection}>
                  <h3 className={coursesStyles.categoryTitle}>Prova på</h3>
                  <div className={coursesStyles.courseScroll}>
                    <div className={coursesStyles.courseScrollInner}>
                      {tryCourses.map((course) => (
                        <div 
                          key={course.id} 
                          className={`${coursesStyles.courseCard} ${course.isPopular ? coursesStyles.popularCourse : ''}`}
                        >
                          {course.isPopular && (
                            <div className={coursesStyles.popularTag}>
                              {course.isFullyBooked ? 'Fullbokad' : 'Populär'}
                            </div>
                          )}
                          <div className={coursesStyles.cardHeader}>
                            <h3 className={coursesStyles.courseName}>{course.name}</h3>
                            <div className={coursesStyles.coursePrice}>
                              {course.price}
                              <span className={coursesStyles.frequency}>{course.frequency}</span>
                            </div>
                            {course.sessionCount && <div className={coursesStyles.sessionCount}>{course.sessionCount}</div>}
                            {course.startDate && (
                              <div className={coursesStyles.courseDate}>
                                <svg 
                                  className={coursesStyles.dateIcon}
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
                              <div className={coursesStyles.availableSpots}>
                                <svg 
                                  className={coursesStyles.spotsIcon}
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
                            <p className={coursesStyles.courseDescription}>{course.description}</p>
                          </div>

                          <ul className={coursesStyles.featuresList}>
                            {course.features.map((feature, index) => (
                              <li 
                                key={index} 
                                className={`${coursesStyles.featureItem} ${!feature.included ? coursesStyles.disabledFeature : ''}`}
                              >
                                <svg 
                                  className={coursesStyles.featureIcon}
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

                          <div className={coursesStyles.cardFooter}>
                            <Link 
                              href={course.buttonLink} 
                              className={`${coursesStyles.actionButton} ${course.isSecondary ? coursesStyles.secondaryButton : ''}`}
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
                <div className={coursesStyles.categorySection}>
                  <h3 className={coursesStyles.categoryTitle}>Längre kurser</h3>
                  <div className={coursesStyles.courseScroll}>
                    <div className={coursesStyles.courseScrollInner}>
                      {longerCourses.map((course) => (
                        <div 
                          key={course.id} 
                          className={`${coursesStyles.courseCard} ${course.isPopular ? coursesStyles.popularCourse : ''}`}
                        >
                          {course.isPopular && (
                            <div className={coursesStyles.popularTag}>
                              {course.isFullyBooked ? 'Fullbokad' : 'Populär'}
                            </div>
                          )}
                          <div className={coursesStyles.cardHeader}>
                            <h3 className={coursesStyles.courseName}>{course.name}</h3>
                            <div className={coursesStyles.coursePrice}>
                              {course.price}
                              <span className={coursesStyles.frequency}>{course.frequency}</span>
                            </div>
                            {course.sessionCount && <div className={coursesStyles.sessionCount}>{course.sessionCount}</div>}
                            {course.startDate && (
                              <div className={coursesStyles.courseDate}>
                                <svg 
                                  className={coursesStyles.dateIcon}
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
                              <div className={coursesStyles.availableSpots}>
                                <svg 
                                  className={coursesStyles.spotsIcon}
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
                            <p className={coursesStyles.courseDescription}>{course.description}</p>
                          </div>

                          <ul className={coursesStyles.featuresList}>
                            {course.features.map((feature, index) => (
                              <li 
                                key={index} 
                                className={`${coursesStyles.featureItem} ${!feature.included ? coursesStyles.disabledFeature : ''}`}
                              >
                                <svg 
                                  className={coursesStyles.featureIcon}
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

                          <div className={coursesStyles.cardFooter}>
                            <Link 
                              href={course.buttonLink} 
                              className={`${coursesStyles.actionButton} ${course.isSecondary ? coursesStyles.secondaryButton : ''}`}
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

        {/* Services section */}
        <div className={styles.servicesSection}>
          <div className={servicesStyles.titleSection}>
            <h2 className={servicesStyles.title}>Övriga Tjänster</h2>
            <p className={servicesStyles.description}>
              Vi erbjuder kreativa keramikupplevelser för både privatpersoner och företag, från företagsevent till presentkort.
            </p>
          </div>

          <div className={servicesStyles.servicesGrid}>
            {services.map((service) => (
              <div key={service.id} className={servicesStyles.serviceCard}>
                <div className={servicesStyles.serviceContent}>
                  <div className={servicesStyles.serviceIcon}>{service.icon}</div>
                  <h3 className={servicesStyles.serviceTitle}>{service.title}</h3>
                  <p className={servicesStyles.serviceDesc}>{service.description}</p>
                  <div className={servicesStyles.audienceTags}>
                    {service.audience.map((type) => (
                      <span key={type} className={servicesStyles.audienceTag}>
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
                <Link href={service.link} className={servicesStyles.serviceLink}>
                  Läs Mer
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ section - Translated to Swedish */}
        <div className={styles.faqSection}>
          <h2 className={styles.faqTitle}>Vanliga frågor</h2>
          <div className={styles.faqList}>
            {faqs.map((faq, index) => (
              <div key={index} className={styles.faqItem}>
                <div 
                  className={styles.faqQuestion}
                  onClick={() => toggleFaq(index)}
                >
                  {faq.question}
                  <svg 
                    className={styles.faqIcon} 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    width="20" 
                    height="20"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d={openFaqIndex === index ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} 
                    />
                  </svg>
                </div>
                {openFaqIndex === index && (
                  <div className={styles.faqAnswer}>
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookCourse; 