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
      <AdminHeader title="Admin Dashboard" subtitle={userName ? `Välkommen!, ${userName}` : 'Välkommen'} />
      
      <main className={styles.dashboardMainContent}>
        {/* Course Manager without limiting the number of courses */}
        <CourseManager showHeader={false} />
      </main>
    </div>
  );
};

export default AdminDashboard; 