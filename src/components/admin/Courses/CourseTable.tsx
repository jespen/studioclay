import React from 'react';
import { Course } from '../../../types/course';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';
import StandardTable from '../common/StandardTable';
import ActionButton from '../common/ActionButton';

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
  const rowClassName = variant === 'past'
    ? `${styles.tableRow} ${styles.pastRow}`
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
    <StandardTable 
      headers={['Titel', 'Datum', 'Status', 'Åtgärder']}
      emptyMessage="Inga kurser att visa"
      variant={variant}
    >
      {courses.map((course) => (
        <tr key={course.id} className={rowClassName}>
          <td className={styles.tableCell}>
            <div>
              <h3 className={styles.courseTitle}>{course.title}</h3>
              <p className={styles.courseDescription}>{course.template?.description || 'Ingen beskrivning tillgänglig'}</p>
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
                <ActionButton
                  variant="edit"
                  onClick={() => onEdit(course)}
                />
              )}
              {onPublish && variant !== 'past' && (
                <ActionButton
                  variant={course.is_published ? "unpublish" : "publish"}
                  onClick={() => onPublish(course)}
                />
              )}
              {onDelete && (
                <ActionButton
                  variant="delete"
                  onClick={() => {
                    if (confirm(`Är du säker på att du vill ta bort kursen "${course.title}"?`)) {
                      onDelete(course.id);
                    }
                  }}
                />
              )}
            </div>
          </td>
        </tr>
      ))}
    </StandardTable>
  );
};

export default CourseTable; 