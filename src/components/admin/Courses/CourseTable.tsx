import React from 'react';
import { Course } from '../../../types/course';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';

interface CourseTableProps {
  courses: Course[];
  variant?: 'default' | 'draft' | 'past';
  onEdit?: (course: Course) => void;
  onPublish?: (course: Course) => void;
  onDelete?: (courseId: string) => void;
}

export const CourseTable: React.FC<CourseTableProps> = ({
  courses,
  variant = 'default',
  onEdit,
  onPublish,
  onDelete
}) => {
  const tableHeaderClassName = variant === 'draft'
    ? `${styles.tableHeader} ${styles.draftTableHeader}`
    : variant === 'past'
      ? `${styles.tableHeader} ${styles.pastTableHeader}`
      : styles.tableHeader;

  const rowClassName = variant === 'draft'
    ? `${styles.tableRow} ${styles.draftRow}`
    : styles.tableRow;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.toLocaleDateString('sv-SE')} ${date.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
  };

  return (
    <table className={styles.table}>
      <thead className={tableHeaderClassName}>
        <tr>
          <th className={styles.tableHeaderCell}>Titel</th>
          <th className={styles.tableHeaderCell}>Datum</th>
          <th className={styles.tableHeaderCell}>Status</th>
          <th className={styles.tableHeaderCell}>Åtgärder</th>
        </tr>
      </thead>
      <tbody>
        {courses.length === 0 ? (
          <tr className={styles.tableRow}>
            <td className={styles.tableCell} colSpan={4}>
              Inga kurser att visa
            </td>
          </tr>
        ) : (
          courses.map((course) => (
            <tr key={course.id} className={rowClassName}>
              <td className={styles.tableCell}>
                <div>
                  <h3 className={styles.courseTitle}>{course.title}</h3>
                  <p className={styles.courseDescription}>{course.description}</p>
                </div>
              </td>
              <td className={styles.tableCell}>
                {formatDate(course.start_date)}
              </td>
              <td className={styles.tableCell}>
                <span className={`${styles.statusBadge} ${course.is_published ? styles.publishedBadge : styles.draftBadge}`}>
                  {course.is_published ? 'Publicerad' : 'Avpublicerad'}
                </span>
              </td>
              <td className={styles.tableCell}>
                <div className={styles.actionButtonsContainer}>
                  {onEdit && (
                    <button
                      className={`${styles.actionButton} ${styles.editButton}`}
                      onClick={() => onEdit(course)}
                    >
                      Redigera
                    </button>
                  )}
                  {onPublish && variant !== 'past' && (
                    <button
                      className={`${styles.actionButton} ${course.is_published ? styles.unpublishButton : styles.publishButton}`}
                      onClick={() => onPublish(course)}
                    >
                      {course.is_published ? 'Avpublicera' : 'Publicera'}
                    </button>
                  )}
                  {onDelete && (
                    <button
                      className={`${styles.actionButton} ${styles.deleteButton}`}
                      onClick={() => {
                        if (confirm(`Är du säker på att du vill ta bort kursen "${course.title}"?`)) {
                          onDelete(course.id);
                        }
                      }}
                    >
                      Ta bort
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
};

export default CourseTable; 