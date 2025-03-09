import React from 'react';
import AdminHeader from './AdminHeader';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';
import CourseManager from '../Courses/CourseManager';

interface AdminDashboardProps {
  userName?: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ userName }) => {
  return (
    <div className={styles.pageContainer}>
      <AdminHeader title="Admin Dashboard" subtitle={userName ? `Välkommen, ${userName}` : 'Välkommen'} />
      
      <main className={styles.mainContent}>
        {/* Course Manager with maxCourses to limit how many are shown */}
        <CourseManager showHeader={false} maxCourses={3} />
      </main>
    </div>
  );
};

export default AdminDashboard; 