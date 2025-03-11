import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Course } from '../../../types/course';
import AdminHeader from '../Dashboard/AdminHeader';
import SectionContainer from '../Dashboard/SectionContainer';
import CourseTable from './CourseTable';
import CourseForm from '../../../app/admin/dashboard/courses/CourseForm';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';

interface CourseManagerProps {
  showHeader?: boolean;
  maxCourses?: number;
}

export const CourseManager: React.FC<CourseManagerProps> = ({ 
  showHeader = true,
  maxCourses
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [publishedActiveCourses, setPublishedActiveCourses] = useState<Course[]>([]);
  const [unpublishedActiveCourses, setUnpublishedActiveCourses] = useState<Course[]>([]);
  const [pastCourses, setPastCourses] = useState<Course[]>([]);
  const router = useRouter();

  // Function to fetch courses from the API
  async function fetchCourses() {
    try {
      setLoading(true);
      const response = await fetch('/api/courses/?published=all');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch courses: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received courses data:', data);
      console.log('Raw API response:', JSON.stringify(data));
      
      // Extract courses array from the response
      if (data && Array.isArray(data.courses)) {
        console.log('Setting courses from data.courses:', data.courses);
        setCourses(data.courses);
      } else if (Array.isArray(data)) {
        console.log('Setting courses from data array:', data);
        setCourses(data);
      } else {
        console.error('Unexpected API response format:', data);
        setCourses([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Function to toggle course publish status
  async function handlePublishToggle(course: Course) {
    try {
      console.log('Toggling publish status for course:', course);
      
      // Make sure we're using the instance ID
      if (!course.id) {
        console.error('Invalid course object - missing instance ID:', course);
        throw new Error('Course instance ID is required');
      }
      
      console.log('Course instance ID:', course.id);
      console.log('API URL:', `/api/courses/${course.id}`);
      
      const response = await fetch(`/api/courses/${course.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_published: !course.is_published }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error || `Failed to update course: ${response.status}`;
        console.error('Error details:', errorData);
        throw new Error(errorMessage);
      }

      await fetchCourses(); // Refresh the courses list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error toggling publish status:', err);
      alert(`Kunde inte ändra publiceringsstatus: ${err instanceof Error ? err.message : 'Okänt fel'}`);
    }
  }

  // Function to delete a course
  async function handleDeleteCourse(courseId: string) {
    try {
      console.log(`Attempting to delete course with ID: ${courseId}`);
      
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Delete course error response:', response.status, errorData);
        throw new Error(`Failed to delete course: ${response.status}${errorData ? ' - ' + JSON.stringify(errorData) : ''}`);
      }

      console.log(`Successfully deleted course with ID: ${courseId}`);
      await fetchCourses(); // Refresh the courses list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error in handleDeleteCourse:', err);
      alert(`Kunde inte ta bort kursen: ${err instanceof Error ? err.message : 'Okänt fel'}`);
    }
  }

  // Function to handle editing a course
  function handleEditCourse(course: Course) {
    console.log('Navigating to edit page for course:', course);
    router.push(`/admin/dashboard/courses/${course.id}`);
  }

  // Function to handle adding a new course
  function handleAddCourse() {
    setEditingCourse(null);
    setShowForm(true);
  }

  // Function to handle saving a course
  async function handleSaveCourse(courseData: Partial<Course>) {
    try {
      console.log('Saving course with data:', courseData);
      
      // If we have an ID, we're updating an existing course
      if (courseData.id) {
        const response = await fetch(`/api/courses/${courseData.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: courseData.title,
            start_date: courseData.start_date,
            end_date: courseData.end_date,
            max_participants: courseData.max_participants,
            is_published: courseData.is_published,
            template: courseData.template // Include template updates
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(`Failed to save course: ${response.status}${errorData ? ' - ' + JSON.stringify(errorData) : ''}`);
        }
      } else if (courseData.template_id) {
        // Creating a new instance of an existing template
        const response = await fetch('/api/courses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(courseData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(`Failed to save course: ${response.status}${errorData ? ' - ' + JSON.stringify(errorData) : ''}`);
        }
      } else {
        // Creating a completely new course with a new template
        const response = await fetch('/api/courses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(courseData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(`Failed to save course: ${response.status}${errorData ? ' - ' + JSON.stringify(errorData) : ''}`);
        }
      }

      await fetchCourses(); // Refresh the courses list
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error saving course:', err);
      alert(`Kunde inte spara kursen: ${err instanceof Error ? err.message : 'Okänt fel'}`);
    }
  }

  // Fetch courses on component mount
  useEffect(() => {
    fetchCourses();
  }, []);

  // Filter courses by published status and date - moved to useEffect to ensure client-side only execution
  useEffect(() => {
    if (courses.length > 0) {
      const now = new Date();
      let allCourses = [...courses];
      
      console.log('All courses from API:', allCourses);
      console.log('maxCourses parameter:', maxCourses);
      
      // Filter out any courses without an ID
      allCourses = allCourses.filter(course => course && course.id);
      
      // Apply maxCourses limit if specified
      let limitedCourses = [...allCourses];
      if (maxCourses && maxCourses > 0) {
        console.log(`Limiting to ${maxCourses} courses`);
        limitedCourses = allCourses.slice(0, maxCourses);
        console.log('Courses after limiting:', limitedCourses);
      } else {
        console.log('No course limit applied');
      }
      
      console.log('Current date for filtering:', now.toISOString());
      
      // First, separate courses by date (past vs. active)
      const pastCourses = limitedCourses.filter(course => 
        course.end_date && new Date(course.end_date) < now
      );
      
      const activeCourses = limitedCourses.filter(course => 
        !course.end_date || new Date(course.end_date) >= now
      );
      
      console.log('Past courses:', pastCourses);
      console.log('Active courses:', activeCourses);
      
      // Then, for active courses, separate by published status
      const publishedActiveCourses = activeCourses.filter(course => course.is_published);
      const unpublishedActiveCourses = activeCourses.filter(course => !course.is_published);
      
      // Set the state variables
      setPublishedActiveCourses(publishedActiveCourses);
      setUnpublishedActiveCourses(unpublishedActiveCourses);
      setPastCourses(pastCourses); // All past courses go to "Tidigare kurser" regardless of published status
      
      // Automatically unpublish past courses that are still marked as published
      pastCourses.forEach(async (course) => {
        if (course.is_published) {
          console.log(`Auto-unpublishing past course: ${course.title} (ID: ${course.id})`);
          try {
            const response = await fetch(`/api/courses/${course.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ is_published: false }),
            });
            
            if (!response.ok) {
              console.error(`Failed to auto-unpublish course ${course.id}: ${response.statusText}`);
            } else {
              console.log(`Successfully auto-unpublished course: ${course.title}`);
            }
          } catch (error) {
            console.error(`Error auto-unpublishing course ${course.id}:`, error);
          }
        }
      });
      
      // Refresh courses after unpublishing
      if (pastCourses.some(course => course.is_published)) {
        setTimeout(() => {
          fetchCourses();
        }, 1000);
      }

      console.log('=== COURSE DEBUG INFO ===');
      console.log(`All courses: ${allCourses.length}`);
      console.log(`Limited courses: ${limitedCourses.length}`);
      console.log(`Active courses: ${activeCourses.length}`);
      console.log(`Published active courses: ${publishedActiveCourses.length}`);
      console.log(`Unpublished active courses: ${unpublishedActiveCourses.length}`);
      console.log(`Past courses: ${pastCourses.length}`);
      console.log('Unpublished active courses details:', unpublishedActiveCourses);
      console.log('=== END DEBUG INFO ===');
    }
  }, [courses, maxCourses]);

  if (showForm) {
    return (
      <div className={styles.pageContainer}>
        <main className={styles.mainContent}>
          <CourseForm
            course={editingCourse}
            onSave={handleSaveCourse}
            onCancel={() => setShowForm(false)}
          />
        </main>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      {showHeader && (
        <AdminHeader title="Kurshantering" subtitle="Hantera kurser" />
      )}

      <main className={styles.mainContent}>
        {error && (
          <div className="error-message">{error}</div>
        )}

        {loading ? (
          <div>Laddar kurser...</div>
        ) : (
          <>
            <div className={styles.navButtons} style={{ marginBottom: '1rem' }}>
              <button onClick={handleAddCourse} className={styles.addButton}>
                + Lägg till ny kurs
              </button>
            </div>

            {/* Published courses */}
            <SectionContainer title="Publicerade kurser">
              <CourseTable 
                courses={publishedActiveCourses}
                onEdit={handleEditCourse}
                onPublish={handlePublishToggle}
                onDelete={handleDeleteCourse}
              />
            </SectionContainer>

            {/* Unpublished courses */}
            <SectionContainer title="Utkast" variant="draft">
              <CourseTable 
                courses={unpublishedActiveCourses}
                variant="draft"
                onEdit={handleEditCourse}
                onPublish={handlePublishToggle}
                onDelete={handleDeleteCourse}
              />
            </SectionContainer>

            {/* Past courses */}
            <SectionContainer title="Tidigare kurser" variant="past">
              <CourseTable 
                courses={pastCourses}
                variant="past"
                onEdit={handleEditCourse}
                onPublish={handlePublishToggle}
                onDelete={handleDeleteCourse}
              />
            </SectionContainer>
            
            {/* Debug information - moved to the end */}
            <div style={{ 
              background: '#f0f0f0', 
              padding: '10px', 
              marginTop: '30px',
              marginBottom: '20px', 
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}>
              <h3>Debug Information</h3>
              <p>All courses: {courses.length}</p>
              <p>Active courses: {publishedActiveCourses.length + unpublishedActiveCourses.length}</p>
              <p>Published active courses: {publishedActiveCourses.length}</p>
              <p>Unpublished active courses: {unpublishedActiveCourses.length}</p>
              <p>Past courses: {pastCourses.length}</p>
              <h4>Unpublished Active Courses:</h4>
              <ul>
                {unpublishedActiveCourses.map(course => (
                  <li key={course.id}>
                    {course.title} - End date: {course.end_date} - Published: {course.is_published ? 'Yes' : 'No'}
                  </li>
                ))}
              </ul>
              <h4>Past Courses:</h4>
              <ul>
                {pastCourses.map(course => (
                  <li key={course.id}>
                    {course.title} - End date: {course.end_date} - Published: {course.is_published ? 'Yes' : 'No'}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default CourseManager; 