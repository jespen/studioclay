import React from 'react';
import AdminHeader from './AdminHeader';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';
import CourseManager from '../Courses/CourseManager';

interface AdminDashboardProps {
  userEmail?: string | null;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ userEmail }) => {
  return (
    <div className={styles.pageContainer}>
      <AdminHeader title="Studio Clay administation" subtitle={userEmail ? `Välkommen ${userEmail}` : 'Välkommen'} />
      
      <main className={styles.dashboardMainContent}>
        {/* Course Manager without limiting the number of courses */}
        <CourseManager showHeader={false} />
      </main>
    </div>
  );
};

export default AdminDashboard; 