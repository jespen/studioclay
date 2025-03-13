'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '../../../../components/admin/Dashboard/AdminHeader';
import styles from '../../dashboard/courses/courses.module.css';

interface SessionInfo {
  sessionExists: boolean;
  activeSessionExists: boolean;
  userEmailExists: boolean;
  userEmail: string | null;
  cookieCount: number;
  cookieNames: string[];
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
}

export default function DeveloperPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    lastApiCalls: [],
    sessionInfo: null,
    systemInfo: null
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
        let sessionInfo;
        
        if (sessionResponse.ok) {
          sessionInfo = await sessionResponse.json();
        } else {
          console.error('Failed to fetch session info:', sessionResponse.status);
          sessionInfo = null;
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
        
        // Fetch a recent API response
        const coursesResponse = await fetch('/api/courses/?published=all');
        let apiResponse;
        
        if (coursesResponse.ok) {
          apiResponse = await coursesResponse.json();
        } else {
          console.error('Failed to fetch courses:', coursesResponse.status);
          apiResponse = null;
        }
        
        setDebugInfo({
          sessionInfo,
          systemInfo,
          lastApiCalls,
          apiResponse
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
                    <p><strong>Cookie Count:</strong> {debugInfo.sessionInfo.cookieCount}</p>
                    <p><strong>Cookie Names:</strong> {debugInfo.sessionInfo.cookieNames.join(', ')}</p>
                  </div>
                ) : (
                  <p>No session information available at this time</p>
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
                <h2 className={styles.sectionTitle}>Latest API Response</h2>
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
                    {JSON.stringify(debugInfo.apiResponse, null, 2)}
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