'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '../../../../components/admin/Dashboard/AdminHeader';
import styles from '../../dashboard/courses/courses.module.css';
import { useRouter } from 'next/navigation';

interface SessionInfo {
  sessionExists: boolean;
  activeSessionExists: boolean;
  userEmailExists: boolean;
  userEmail: string | null;
  cookieCount: number;
  cookieNames: string[];
  hasSupabaseAuth?: boolean;
  supabaseCookies?: string[];
}

interface Course {
  id: string;
  title: string;
  category?: string | { id: string; name: string; [key: string]: any };
  instructor?: string | { id: string; name: string; [key: string]: any };
  start_date?: string;
  end_date?: string;
  is_published?: boolean;
  max_participants?: number;
  current_participants?: number;
  availableSpots?: number;
  template?: any;
  template_id?: string;
}

interface DebugInfo {
  lastApiCalls: string[];
  sessionInfo: SessionInfo | null;
  systemInfo: {
    nextVersion: string;
    nodeVersion: string;
    buildTime: string;
  } | null;
  apiResponse?: any;
  courses?: Course[];
}

export default function DeveloperPage() {
  const router = useRouter();
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    lastApiCalls: [],
    sessionInfo: null,
    systemInfo: null,
    courses: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch debug information
  useEffect(() => {
    async function fetchDebugInfo() {
      try {
        setLoading(true);
        
        // Fetch session info
        const sessionResponse = await fetch('/api/auth/session-info');
        let sessionData = null;
        
        if (sessionResponse.ok) {
          const responseData = await sessionResponse.json();
          console.log('Session info response:', responseData);
          sessionData = responseData.sessionInfo || null;
        } else {
          console.error('Failed to fetch session info:', sessionResponse.status);
        }
        
        // Get system info
        const systemInfo = {
          nextVersion: "Next.js 15.2.1",
          nodeVersion: process.env.NODE_VERSION || "Unknown",
          buildTime: new Date().toISOString()
        };
        
        // Simulate API calls log (in a real app, you'd store these in localStorage or server-side)
        const lastApiCalls = [
          `GET /api/courses/?published=all - ${new Date().toISOString()}`,
          `POST /api/auth/local-login/ - ${new Date(Date.now() - 60000).toISOString()}`,
          `GET /api/auth/supabase-auth-test/ - ${new Date(Date.now() - 120000).toISOString()}`
        ];
        
        // Fetch courses
        const coursesResponse = await fetch('/api/courses/?published=all');
        let apiResponse;
        let courses: Course[] = [];
        
        if (coursesResponse.ok) {
          apiResponse = await coursesResponse.json();
          
          // Extract courses array from the response
          if (apiResponse && Array.isArray(apiResponse.courses)) {
            courses = apiResponse.courses;
          } else if (Array.isArray(apiResponse)) {
            courses = apiResponse;
          }
          
          console.log('Fetched courses for developer page:', courses.length);
        } else {
          console.error('Failed to fetch courses:', coursesResponse.status);
          apiResponse = null;
        }
        
        setDebugInfo({
          sessionInfo: sessionData,
          systemInfo,
          lastApiCalls,
          apiResponse,
          courses
        });
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDebugInfo();
  }, []);

  // Helper function to safely access arrays with a fallback
  const safeJoin = (arr?: any[] | null, separator = ', ') => {
    if (!arr || !Array.isArray(arr)) return 'None';
    return arr.length > 0 ? arr.join(separator) : 'None';
  };

  // Helper function to safely extract name from an object or return the value
  const safeObjectName = (value: any): string => {
    if (typeof value === 'object' && value !== null) {
      return value.name || 'N/A';
    }
    return value || 'N/A';
  };

  // Handle editing a course
  const handleEditCourse = (courseId: string) => {
    console.log('Navigating to edit course:', courseId);
    router.push(`/admin/dashboard/courses/${courseId}`);
  };

  return (
    <div className={styles.pageContainer}>
      <AdminHeader title="Developer Tools" subtitle="Debug information and system status" />
      
      <main className={styles.mainContent}>
        {error && (
          <div className="error-message" style={{ color: 'red', marginBottom: '2rem' }}>
            {error}
          </div>
        )}
        
        {loading ? (
          <div>Loading debug information...</div>
        ) : (
          <>
            <div className={styles.sectionContainer}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Session Information</h2>
              </div>
              <div style={{ padding: '1rem' }}>
                {debugInfo.sessionInfo ? (
                  <div>
                    <p><strong>Session Exists:</strong> {debugInfo.sessionInfo.sessionExists ? 'Yes' : 'No'}</p>
                    <p><strong>Active Session:</strong> {debugInfo.sessionInfo.activeSessionExists ? 'Yes' : 'No'}</p>
                    <p><strong>User Email Cookie:</strong> {debugInfo.sessionInfo.userEmailExists ? 'Yes' : 'No'}</p>
                    <p><strong>User Email:</strong> {debugInfo.sessionInfo.userEmail || 'Not available'}</p>
                    <p><strong>Cookie Count:</strong> {debugInfo.sessionInfo.cookieCount || 0}</p>
                    <p><strong>Cookie Names:</strong> {safeJoin(debugInfo.sessionInfo.cookieNames)}</p>
                    <p><strong>Has Supabase Auth:</strong> {debugInfo.sessionInfo.hasSupabaseAuth ? 'Yes' : 'No'}</p>
                    <p><strong>Supabase Cookies:</strong> {safeJoin(debugInfo.sessionInfo.supabaseCookies)}</p>
                  </div>
                ) : (
                  <p>No session information available at this time</p>
                )}
              </div>
            </div>
            
            <div className={styles.sectionContainer}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Available Courses</h2>
              </div>
              <div style={{ padding: '1rem' }}>
                {debugInfo.courses && debugInfo.courses.length > 0 ? (
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Title</th>
                          <th>Category</th>
                          <th>Instructor</th>
                          <th>Published</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {debugInfo.courses.map((course) => (
                          <tr key={course.id}>
                            <td><code>{course.id}</code></td>
                            <td>{course.title}</td>
                            <td>{safeObjectName(course.category)}</td>
                            <td>{safeObjectName(course.instructor)}</td>
                            <td>{course.is_published ? 'Yes' : 'No'}</td>
                            <td>
                              <button 
                                className={styles.editButton}
                                onClick={() => handleEditCourse(course.id)}
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>No courses available</p>
                )}
              </div>
            </div>
            
            <div className={styles.sectionContainer}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Recent API Calls</h2>
              </div>
              <div style={{ padding: '1rem' }}>
                {debugInfo.lastApiCalls.length > 0 ? (
                  <ul style={{ listStyleType: 'none', padding: 0 }}>
                    {debugInfo.lastApiCalls.map((call, index) => (
                      <li key={index} style={{ marginBottom: '0.5rem', fontFamily: 'monospace' }}>
                        {call}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No recent API calls</p>
                )}
              </div>
            </div>
            
            <div className={styles.sectionContainer}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>System Information</h2>
              </div>
              <div style={{ padding: '1rem' }}>
                {debugInfo.systemInfo ? (
                  <div>
                    <p><strong>Next.js Version:</strong> {debugInfo.systemInfo.nextVersion}</p>
                    <p><strong>Node Version:</strong> {debugInfo.systemInfo.nodeVersion}</p>
                    <p><strong>Build Time:</strong> {debugInfo.systemInfo.buildTime}</p>
                  </div>
                ) : (
                  <p>No system information available</p>
                )}
              </div>
            </div>
            
            <div className={styles.sectionContainer}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>API Response Details</h2>
              </div>
              <div style={{ padding: '1rem' }}>
                {debugInfo.apiResponse ? (
                  <pre style={{ 
                    overflow: 'auto', 
                    backgroundColor: '#f5f5f5', 
                    padding: '1rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.85rem' 
                  }}>
                    {typeof debugInfo.apiResponse === 'object' 
                      ? JSON.stringify(debugInfo.apiResponse, (key, value) => {
                          // Handle circular references and non-stringifiable objects
                          if (typeof value === 'object' && value !== null) {
                            try {
                              JSON.stringify(value);
                              return value;
                            } catch (err) {
                              return `[Object: ${Object.keys(value).join(', ')}]`;
                            }
                          }
                          return value;
                        }, 2)
                      : String(debugInfo.apiResponse)}
                  </pre>
                ) : (
                  <p>No API response data available</p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
} 