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
      
      // Extract courses array from the response
      if (data && Array.isArray(data.courses)) {
        setCourses(data.courses);
      } else if (Array.isArray(data)) {
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
      const updatedCourse = { ...course, is_published: !course.is_published };
      
      const response = await fetch(`/api/courses/${course.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_published: !course.is_published }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update course: ${response.status}`);
      }

      await fetchCourses(); // Refresh the courses list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error(err);
    }
  }

  // Function to delete a course
  async function handleDeleteCourse(courseId: string) {
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete course: ${response.status}`);
      }

      await fetchCourses(); // Refresh the courses list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error(err);
    }
  }

  // Function to handle editing a course
  function handleEditCourse(course: Course) {
    setEditingCourse(course);
    setShowForm(true);
  }

  // Function to handle adding a new course
  function handleAddCourse() {
    setEditingCourse(null);
    setShowForm(true);
  }

  // Function to handle saving a course
  async function handleSaveCourse(courseData: Partial<Course>) {
    try {
      const method = courseData.id ? 'PATCH' : 'POST';
      const url = courseData.id ? `/api/courses/${courseData.id}` : '/api/courses';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(courseData),
      });

      if (!response.ok) {
        throw new Error(`Failed to save course: ${response.status}`);
      }

      await fetchCourses(); // Refresh the courses list
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error(err);
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
      if (maxCourses) {
        allCourses = allCourses.slice(0, maxCourses);
      }
      
      const activeCourses = allCourses.filter(course => 
        course.end_date && new Date(course.end_date) >= now
      );
      
      setPublishedActiveCourses(activeCourses.filter(course => course.is_published));
      setUnpublishedActiveCourses(activeCourses.filter(course => !course.is_published));
      
      setPastCourses(allCourses.filter(course => 
        course.end_date && new Date(course.end_date) < now
      ));

      console.log(`All courses: ${allCourses.length}`);
      console.log(`Active courses: ${activeCourses.length}`);
      console.log(`Published active courses: ${activeCourses.filter(course => course.is_published).length}`);
      console.log(`Unpublished active courses: ${activeCourses.filter(course => !course.is_published).length}`);
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
            <div className={styles.navButtons} style={{ marginBottom: '2rem' }}>
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
          </>
        )}
      </main>
    </div>
  );
};

export default CourseManager; 