import React, { useState, useMemo } from 'react';
import { Course } from '../../../types/course';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';
import StandardTable from '../common/StandardTable';
import ActionButton from '../common/ActionButton';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

// Add DeleteConfirmationDialog component
interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  courseTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  isOpen,
  courseTitle,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.dialogOverlay}>
      <div className={styles.dialogContent}>
        <h3>Bekräfta borttagning</h3>
        <p>Är du verkligen säker på att du vill ta bort kursen "{courseTitle}"?</p>
        <div className={styles.dialogButtons}>
          <button 
            className={`${styles.dialogButton} ${styles.confirmButton}`}
            onClick={onConfirm}
          >
            JA
          </button>
          <button 
            className={`${styles.dialogButton} ${styles.cancelButton}`}
            onClick={onCancel}
          >
            NEJ
          </button>
        </div>
      </div>
    </div>
  );
};

interface CourseTableProps {
  courses: Course[];
  variant?: 'default' | 'draft' | 'past';
  onEdit?: (course: Course) => void;
  onPublish?: (course: Course) => void;
  onDelete?: (courseId: string) => void;
}

type SortField = 'title' | 'date' | 'status' | 'price' | 'participants';
type SortDirection = 'asc' | 'desc';

export const CourseTable: React.FC<CourseTableProps> = ({
  courses,
  variant = 'default',
  onEdit,
  onPublish,
  onDelete
}) => {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  // Add state for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

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

  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return '-';
    return `${price.toLocaleString('sv-SE')} kr`;
  };

  const formatParticipants = (current: number, max: number | null) => {
    if (max === null) return `-`;
    return `${current}/${max}`;
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedCourses = useMemo(() => {
    return [...courses].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      
      switch (sortField) {
        case 'title':
          return multiplier * (a.title || '').localeCompare(b.title || '');
        
        case 'date':
          const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
          const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
          return multiplier * (dateA - dateB);
        
        case 'status':
          return multiplier * (Number(a.is_published) - Number(b.is_published));
        
        case 'price':
          const priceA = a.price || 0;
          const priceB = b.price || 0;
          return multiplier * (priceA - priceB);
        
        case 'participants':
          const participantsA = a.current_participants || 0;
          const participantsB = b.current_participants || 0;
          return multiplier * (participantsA - participantsB);
        
        default:
          return 0;
      }
    });
  }, [courses, sortField, sortDirection]);

  // Custom table headers with sort indicators
  const renderSortableHeader = (label: string, field: SortField) => {
    return (
      <div 
        className={styles.sortableHeader} 
        onClick={() => handleSort(field)}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      >
        {label}
        {sortField === field && (
          <span style={{ marginLeft: '4px' }}>
            {sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
          </span>
        )}
      </div>
    );
  };

  const tableHeaders = [
    renderSortableHeader('Titel', 'title'),
    renderSortableHeader('Datum', 'date'),
    renderSortableHeader('Status', 'status'),
    renderSortableHeader('Pris', 'price'),
    renderSortableHeader('Deltagare', 'participants'),
    'Åtgärder'
  ];

  return (
    <>
      <StandardTable 
        headers={tableHeaders}
        emptyMessage="Inga kurser att visa"
        variant={variant}
      >
        {sortedCourses.map((course) => (
          <tr key={course.id} className={rowClassName}>
            <td className={styles.tableCell}>
              <div>
                <h3 className={styles.courseTitle}>{course.title}</h3>
                <p 
                  className={styles.courseDescription} 
                  title={course.template?.rich_description || 'Ingen beskrivning tillgänglig'}
                >
                  {course.template?.rich_description 
                    ? `${course.template.rich_description.substring(0, 70)}${course.template.rich_description.length > 70 ? '...' : ''}` 
                    : 'Ingen beskrivning tillgänglig'}
                </p>
              </div>
            </td>
            <td className={styles.tableCell}>
              <div>
                <div>Start: {formatDate(course.start_date)}</div>
                <div>Slut: {formatDate(course.end_date)}</div>
              </div>
            </td>
            <td className={styles.tableCell}>
              <span className={`${styles.statusBadge} ${course.is_published ? styles.publishedBadge : styles.draftBadge}`}>
                {course.is_published ? 'Publicerad' : 'Avpublicerad'}
              </span>
            </td>
            <td className={styles.tableCell}>
              {formatPrice(course.price)}
            </td>
            <td className={styles.tableCell}>
              {formatParticipants(course.current_participants, course.max_participants)}
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
                      setCourseToDelete(course);
                      setDeleteDialogOpen(true);
                    }}
                  />
                )}
              </div>
            </td>
          </tr>
        ))}
      </StandardTable>
      
      {/* Add Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        courseTitle={courseToDelete?.title || ''}
        onConfirm={() => {
          if (courseToDelete && onDelete) {
            onDelete(courseToDelete.id);
          }
          setDeleteDialogOpen(false);
          setCourseToDelete(null);
        }}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setCourseToDelete(null);
        }}
      />
    </>
  );
};

export default CourseTable; 