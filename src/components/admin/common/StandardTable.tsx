import React from 'react';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';

interface StandardTableProps {
  headers: string[];
  emptyMessage?: string;
  variant?: 'default' | 'draft' | 'past';
  children: React.ReactNode;
}

/**
 * A standardized table component for admin tables
 * Used to ensure consistent styling and structure across all admin tables
 */
const StandardTable: React.FC<StandardTableProps> = ({
  headers,
  emptyMessage = 'Inga poster att visa',
  variant = 'default',
  children
}) => {
  const tableHeaderClassName = variant === 'past'
    ? `${styles.tableHeader} ${styles.pastTableHeader}`
    : styles.tableHeader;

  return (
    <table className={styles.table}>
      <thead className={tableHeaderClassName}>
        <tr>
          {headers.map((header, index) => (
            <th key={index} className={styles.tableHeaderCell}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {React.Children.count(children) === 0 ? (
          <tr className={styles.tableRow}>
            <td className={styles.tableCell} colSpan={headers.length}>
              {emptyMessage}
            </td>
          </tr>
        ) : (
          children
        )}
      </tbody>
    </table>
  );
};

export default StandardTable; 