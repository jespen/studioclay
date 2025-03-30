'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCourseWithCache, fetchWithCache } from '@/utils/apiCache';
import { Course, Booking } from '@/types/courses';

interface CourseManagementPageProps {
  courseId: string;
  initialCourse: Course | null;
  initialBookings: Booking[] | null;
}

export default function CourseManagementPage({ 
  courseId, 
  initialCourse,
  initialBookings 
}: CourseManagementPageProps) {
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(initialCourse);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshData, setRefreshData] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Memoize the fetchData function to prevent unnecessary rerenders
  const fetchData = useCallback(async () => {
    if (!refreshData) return; // Skip initial fetch since we have initial data
    
    try {
      setLoading(true);
      
      // Fetch course with cache
      const courseData = await fetchCourseWithCache(courseId, {
        forceRefresh: true // Always get fresh data when explicitly refreshing
      });
      
      // Check if the course data is properly structured
      if (courseData.course) {
        setCourse(courseData.course);
        console.log('Course data loaded successfully:', courseData.course);
      } else {
        console.error('Invalid course data format:', courseData);
        setError('Course data not in expected format');
      }
      
      // Fetch bookings with cache
      const bookingsData = await fetchWithCache<{bookings: Booking[]}>(
        `/api/courses/${courseId}/bookings`,
        {},
        {
          useCache: false, // Don't cache bookings as they change frequently
          cacheKey: `course-bookings-${courseId}`
        }
      );
      
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
      setRefreshData(false); // Reset the refresh flag
    }
  }, [courseId, refreshData]); // Only re-create when these dependencies change

  // Run the fetch operation when refreshData changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Rest of the component stays the same
} 