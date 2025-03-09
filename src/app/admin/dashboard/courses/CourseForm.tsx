'use client';

import { useState, useEffect } from 'react';

type Category = {
  id: string;
  name: string;
};

type Instructor = {
  id: string;
  name: string;
};

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
  location: string;
  image_url: string | null;
  category_id: string | null;
  instructor_id: string | null;
  is_published: boolean;
};

type CourseFormProps = {
  course: Course | null;
  onSave: (courseData: Partial<Course>) => void;
  onCancel: () => void;
};

export default function CourseForm({ course, onSave, onCancel }: CourseFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [price, setPrice] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  // Fetch categories and instructors
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch categories
        const categoriesResponse = await fetch('/api/categories');
        if (!categoriesResponse.ok) {
          throw new Error('Failed to fetch categories');
        }
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData.categories || []);
        
        // Fetch instructors
        const instructorsResponse = await fetch('/api/instructors');
        if (!instructorsResponse.ok) {
          throw new Error('Failed to fetch instructors');
        }
        const instructorsData = await instructorsResponse.json();
        setInstructors(instructorsData.instructors || []);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching form data:', err);
        setError('Failed to load form data');
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  // Initialize form with course data if editing
  useEffect(() => {
    if (course) {
      setTitle(course.title || '');
      setDescription(course.description || '');
      
      if (course.start_date) {
        const startDateTime = new Date(course.start_date);
        setStartDate(formatDateForInput(startDateTime));
        setStartTime(formatTimeForInput(startDateTime));
      }
      
      if (course.end_date) {
        const endDateTime = new Date(course.end_date);
        setEndDate(formatDateForInput(endDateTime));
        setEndTime(formatTimeForInput(endDateTime));
      }
      
      setPrice(course.price?.toString() || '');
      setMaxParticipants(course.max_participants?.toString() || '');
      setCategoryId(course.category_id || '');
      setInstructorId(course.instructor_id || '');
      setIsPublished(course.is_published || false);
    } else {
      // Default values for new course
      const now = new Date();
      setStartDate(formatDateForInput(now));
      setStartTime('18:00');
      
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      setEndDate(formatDateForInput(now));
      setEndTime('20:00');
      
      setPrice('495');
      setMaxParticipants('8');
      setIsPublished(false);
      
      // Set default instructor to Eva Björk if available
      const evaInstructor = instructors.find(i => i.name.includes('Eva'));
      if (evaInstructor) {
        setInstructorId(evaInstructor.id);
      }
    }
  }, [course, instructors]);

  function formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function formatTimeForInput(date: Date): string {
    return date.toTimeString().substring(0, 5);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Combine date and time
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);
    
    // Calculate duration in minutes
    const durationMinutes = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60));
    
    const courseData: Partial<Course> = {
      title,
      description,
      start_date: startDateTime.toISOString(),
      end_date: endDateTime.toISOString(),
      duration_minutes: durationMinutes,
      price: parseFloat(price),
      currency: 'SEK',
      max_participants: maxParticipants ? parseInt(maxParticipants) : null,
      category_id: categoryId || null,
      instructor_id: instructorId || null,
      location: 'Studio Clay, Stockholm',
      is_published: isPublished
    };
    
    onSave(courseData);
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Laddar formulär...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
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
    <div className="bg-white p-6 rounded-lg shadow">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kurstitel *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beskrivning
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategori *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Välj kategori</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instruktör *
              </label>
              <select
                value={instructorId}
                onChange={(e) => setInstructorId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Välj instruktör</option>
                {instructors.map((instructor) => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Right column */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Startdatum *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Starttid *
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slutdatum *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sluttid *
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pris (SEK) *
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="0"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max antal deltagare *
                </label>
                <input
                  type="number"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  min="1"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            
            <div className="flex items-center mt-4">
              <input
                type="checkbox"
                id="is-published"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is-published" className="ml-2 block text-sm text-gray-900">
                Publicera kurs (synlig för besökare)
              </label>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              <p>
                {isPublished 
                  ? "Kursen kommer att vara synlig för besökare på hemsidan." 
                  : "Kursen kommer att sparas som utkast och kan publiceras senare."}
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Avbryt
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {course ? 'Uppdatera kurs' : 'Skapa kurs'}
          </button>
        </div>
      </form>
    </div>
  );
} 