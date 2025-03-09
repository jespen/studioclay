'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CourseForm from './CourseForm';

type Course = {
  id: string;
  title: string;
  description: string;
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
  category?: { name: string } | null;
  instructor?: { name: string } | null;
};

export default function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchCourses();
  }, []);

  async function fetchCourses() {
    try {
      setLoading(true);
      // Always fetch all courses (published and unpublished) for the admin UI
      const response = await fetch('/api/courses?published=all');
      
      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }
      
      const data = await response.json();
      setCourses(data.courses || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async function togglePublishStatus(id: string, currentStatus: boolean) {
    try {
      const response = await fetch(`/api/courses/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_published: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update course');
      }

      // Update the local state
      setCourses(courses.map(course => 
        course.id === id ? { ...course, is_published: !currentStatus } : course
      ));
    } catch (err) {
      console.error('Error updating course:', err);
      setError('Failed to update course status');
    }
  }

  function handleAddCourse() {
    setEditingCourse(null);
    setShowForm(true);
  }

  function handleEditCourse(course: Course) {
    setEditingCourse(course);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingCourse(null);
  }

  async function handleSaveCourse(courseData: Partial<Course>) {
    try {
      if (editingCourse) {
        // Update existing course
        const response = await fetch(`/api/courses/${editingCourse.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(courseData),
        });

        if (!response.ok) {
          throw new Error('Failed to update course');
        }
      } else {
        // Create new course
        const response = await fetch('/api/courses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(courseData),
        });

        if (!response.ok) {
          throw new Error('Failed to create course');
        }
      }

      // Refresh the course list
      fetchCourses();
      setShowForm(false);
      setEditingCourse(null);
    } catch (err) {
      console.error('Error saving course:', err);
      setError('Failed to save course');
    }
  }

  // Filter courses into active and past
  const now = new Date();
  
  console.log('All courses:', courses);
  
  const activeCourses = courses.filter(course => {
    if (!course.end_date) return true; // If no end date, consider it active
    return new Date(course.end_date) >= now;
  });
  
  console.log('Active courses:', activeCourses);

  // Further separate active courses into published and unpublished
  const publishedActiveCourses = activeCourses.filter(course => course.is_published);
  const unpublishedActiveCourses = activeCourses.filter(course => !course.is_published);
  
  console.log('Published active courses:', publishedActiveCourses);
  console.log('Unpublished active courses:', unpublishedActiveCourses);

  const pastCourses = courses.filter(course => {
    if (!course.end_date) return false; // If no end date, don't include in past
    return new Date(course.end_date) < now;
  });

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Kurshantering</h1>
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-3">Laddar kurser...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Kurshantering</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Ett fel uppstod: {error}</p>
          <button 
            className="mt-2 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded"
            onClick={() => window.location.reload()}
          >
            Försök igen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {showForm ? (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">
              {editingCourse ? 'Redigera kurs' : 'Lägg till kurs'}
            </h2>
            <button
              onClick={handleCloseForm}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕ Stäng
            </button>
          </div>
          <CourseForm 
            course={editingCourse} 
            onSave={handleSaveCourse} 
            onCancel={handleCloseForm} 
          />
        </div>
      ) : (
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Kurshantering</h1>
          <button 
            onClick={handleAddCourse}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
          >
            <span className="mr-1">+</span> Lägg till kurs
          </button>
        </div>
      )}
      
      {/* Active Courses Table */}
      <div className="mb-10">
        <h2 className="text-xl font-bold mb-4">Aktiva kurser</h2>
        {activeCourses.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Inga aktiva kurser hittades</p>
            <button 
              onClick={handleAddCourse}
              className="mt-4 inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Skapa din första kurs
            </button>
          </div>
        ) : (
          <>
            {/* Published Active Courses */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3 text-green-700">Publicerade kurser</h3>
              {publishedActiveCourses.length === 0 ? (
                <div className="text-center py-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Inga publicerade kurser hittades</p>
                </div>
              ) : (
                <div className="overflow-x-auto bg-white rounded-lg shadow">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kurs</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pris</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Deltagare</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Åtgärder</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {publishedActiveCourses.map((course) => (
                        <tr key={course.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{course.title}</div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">{course.description}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {course.category?.name || 'Ingen kategori'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>{formatDate(course.start_date)}</div>
                            {course.end_date && course.start_date !== course.end_date && (
                              <div className="text-xs text-gray-400">till {formatDate(course.end_date)}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {course.price.toLocaleString()} {course.currency}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                            {course.current_participants}/{course.max_participants || '∞'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              course.is_published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {course.is_published ? 'Publicerad' : 'Utkast'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => togglePublishStatus(course.id, course.is_published)}
                                className={`text-xs px-2 py-1 rounded ${
                                  course.is_published 
                                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                                }`}
                              >
                                {course.is_published ? 'Avpublicera' : 'Publicera'}
                              </button>
                              <button 
                                onClick={() => handleEditCourse(course)}
                                className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 px-2 py-1 rounded"
                              >
                                Redigera
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Unpublished Active Courses */}
            <div>
              <h3 className="text-lg font-medium mb-3 text-gray-700">Utkast (ej publicerade)</h3>
              {unpublishedActiveCourses.length === 0 ? (
                <div className="text-center py-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Inga utkast hittades</p>
                </div>
              ) : (
                <div className="overflow-x-auto bg-white rounded-lg shadow">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kurs</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pris</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Deltagare</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Åtgärder</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {unpublishedActiveCourses.map((course) => (
                        <tr key={course.id} className="hover:bg-gray-50 bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-700">{course.title}</div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">{course.description}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {course.category?.name || 'Ingen kategori'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>{formatDate(course.start_date)}</div>
                            {course.end_date && course.start_date !== course.end_date && (
                              <div className="text-xs text-gray-400">till {formatDate(course.end_date)}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {course.price.toLocaleString()} {course.currency}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                            {course.current_participants}/{course.max_participants || '∞'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              course.is_published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {course.is_published ? 'Publicerad' : 'Utkast'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => togglePublishStatus(course.id, course.is_published)}
                                className={`text-xs px-2 py-1 rounded ${
                                  course.is_published 
                                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                                }`}
                              >
                                {course.is_published ? 'Avpublicera' : 'Publicera'}
                              </button>
                              <button 
                                onClick={() => handleEditCourse(course)}
                                className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 px-2 py-1 rounded"
                              >
                                Redigera
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Past Courses Table */}
      <div>
        <h2 className="text-xl font-bold mb-4">Tidigare kurser</h2>
        {pastCourses.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Inga tidigare kurser hittades</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kurs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pris</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Deltagare</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Åtgärder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pastCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-gray-50 text-gray-500">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">{course.title}</div>
                      <div className="text-sm truncate max-w-xs">{course.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {course.category?.name || 'Ingen kategori'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div>{formatDate(course.start_date)}</div>
                      {course.end_date && course.start_date !== course.end_date && (
                        <div className="text-xs text-gray-400">till {formatDate(course.end_date)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {course.price.toLocaleString()} {course.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      {course.current_participants}/{course.max_participants || '∞'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button 
                        onClick={() => handleEditCourse(course)}
                        className="text-xs bg-gray-100 text-gray-800 hover:bg-gray-200 px-2 py-1 rounded"
                      >
                        Visa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 