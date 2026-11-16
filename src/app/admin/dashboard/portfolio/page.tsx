'use client';

import AdminHeader from '@/components/admin/Dashboard/AdminHeader';
import PortfolioManager from '@/components/admin/Portfolio/PortfolioManager';
import styles from '../courses/courses.module.css';

export default function PortfolioAdminPage() {
  return (
    <div className={styles.pageContainer}>
      <AdminHeader title="Portfolio" subtitle="Lägg till och välj bilder från bildarkivet" />
      <main className={styles.mainContent}>
        <PortfolioManager />
      </main>
    </div>
  );
}
