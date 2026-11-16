import React, { ReactNode } from 'react';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';

interface SectionContainerProps {
  title: string;
  count?: number;
  children: ReactNode;
  variant?: 'default' | 'draft' | 'past';
}

export const SectionContainer: React.FC<SectionContainerProps> = ({ 
  title, 
  count,
  children, 
  variant = 'default' 
}) => {
  const containerClassName = styles.sectionContainer;

  const headerClassName = variant === 'past'
    ? `${styles.sectionHeader} ${styles.pastHeader}`
    : styles.sectionHeader;

  return (
    <div className={containerClassName}>
      <div className={headerClassName}>
        <h2 className={styles.sectionTitle}>{count === undefined ? title : `${title} (${count})`}</h2>
      </div>
      {children}
    </div>
  );
};

export default SectionContainer; 