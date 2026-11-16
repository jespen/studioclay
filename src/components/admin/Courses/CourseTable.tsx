import React, { useState, useMemo } from 'react';
import { Course } from '../../../types/course';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';
import StandardTable from '../common/StandardTable';
import RowActions from '../common/RowActions';
import ConfirmDialog from '../common/ConfirmDialog';
import { htmlToText } from '@/utils/htmlToText';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

interface CourseTableProps {
  courses: Course[];
  variant?: 'default' | 'draft' | 'past';
  defaultSortDirection?: 'asc' | 'desc';
  onEdit?: (course: Course) => void;
  onPublish?: (course: Course) => void;
  onDelete?: (courseId: string) => void;
}

type SortField = 'title' | 'date' | 'status' | 'price' | 'participants';
type SortDirection = 'asc' | 'desc';

function stockholmParts(date: Date) {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    weekday: get('weekday').replace('.', ''),
    day: get('day'),
    month: get('month').replace('.', ''),
    time: `${get('hour')}:${get('minute')}`,
    dayKey: new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Stockholm',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date),
  };
}

function formatCourseWhen(startValue: string | null, endValue: string | null) {
  if (!startValue) return 'Datum saknas';
  const start = new Date(startValue);
  if (Number.isNaN(start.getTime())) return 'Datum saknas';
  const startParts = stockholmParts(start);
  if (!endValue) return `${startParts.weekday} ${startParts.day} ${startParts.month} ${startParts.time}`;

  const end = new Date(endValue);
  if (Number.isNaN(end.getTime())) {
    return `${startParts.weekday} ${startParts.day} ${startParts.month} ${startParts.time}`;
  }
  const endParts = stockholmParts(end);
  if (startParts.dayKey === endParts.dayKey) {
    return `${startParts.weekday} ${startParts.day} ${startParts.month} ${startParts.time}–${endParts.time}`;
  }
  return `${startParts.day} ${startParts.month} – ${endParts.day} ${endParts.month}`;
}

export const CourseTable: React.FC<CourseTableProps> = ({
  courses,
  variant = 'default',
  defaultSortDirection = 'asc',
  onEdit,
  onPublish,
  onDelete
}) => {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  const rowClassName = styles.tableRow;

  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return '–';
    return `${price.toLocaleString('sv-SE')} kr`;
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedCourses = useMemo(() => {
    return [...courses].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;

      switch (sortField) {
        case 'title':
          return multiplier * (a.title || '').localeCompare(b.title || '', 'sv');
        case 'date': {
          const dateA = (variant === 'past' ? a.end_date : a.start_date)
            ? new Date((variant === 'past' ? a.end_date : a.start_date) as string).getTime()
            : 0;
          const dateB = (variant === 'past' ? b.end_date : b.start_date)
            ? new Date((variant === 'past' ? b.end_date : b.start_date) as string).getTime()
            : 0;
          return multiplier * (dateA - dateB);
        }
        case 'status':
          return multiplier * (Number(a.is_published) - Number(b.is_published));
        case 'price':
          return multiplier * ((a.price || 0) - (b.price || 0));
        case 'participants':
          return multiplier * ((a.current_participants || 0) - (b.current_participants || 0));
        default:
          return 0;
      }
    });
  }, [courses, sortField, sortDirection, variant]);

  const renderSortableHeader = (label: string, field: SortField) => {
    return (
      <div
        className={styles.sortableHeader}
        onClick={() => handleSort(field)}
      >
        {label}
        {sortField === field && (
          <span style={{ marginLeft: '4px', display: 'inline-flex' }}>
            {sortDirection === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 16 }} /> : <ArrowDownwardIcon sx={{ fontSize: 16 }} />}
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
        columnLabels={['Titel', 'Datum', 'Status', 'Pris', 'Deltagare', 'Åtgärder']}
        emptyMessage="Inga kurser här ännu."
        variant={variant}
      >
        {sortedCourses.map((course) => {
          const description = htmlToText(course.template?.rich_description || course.rich_description);
          const current = course.current_participants || 0;
          const max = course.max_participants;
          const ratio = max ? Math.min(100, Math.round((current / max) * 100)) : 0;

          return (
            <tr key={course.id} className={rowClassName}>
              <td className={styles.tableCell}>
                <div>
                  <h3 className={styles.courseTitle}>{course.title}</h3>
                  <p className={styles.courseDescription} title={description || 'Ingen beskrivning'}>
                    {description || 'Ingen beskrivning'}
                  </p>
                </div>
              </td>
              <td className={styles.tableCell}>
                {formatCourseWhen(course.start_date, course.end_date)}
              </td>
              <td className={styles.tableCell}>
                <span className={`${styles.statusBadge} ${course.is_published ? styles.publishedBadge : styles.draftBadge}`}>
                  {course.is_published ? 'Publicerad' : 'Utkast'}
                </span>
              </td>
              <td className={styles.tableCell}>
                {formatPrice(course.price)}
              </td>
              <td className={styles.tableCell}>
                <div className={styles.capacity}>
                  <span>{max === null || max === undefined ? '–' : `${current}/${max}`}</span>
                  {max ? (
                    <div className={styles.capacityTrack} aria-hidden="true">
                      <div className={styles.capacityFill} style={{ width: `${ratio}%` }} />
                    </div>
                  ) : null}
                </div>
              </td>
              <td className={styles.tableCell}>
                <RowActions
                  onEdit={onEdit ? () => onEdit(course) : undefined}
                  items={[
                    ...(onPublish && variant !== 'past'
                      ? [{
                          label: course.is_published ? 'Avpublicera' : 'Publicera',
                          onClick: () => onPublish(course),
                        }]
                      : []),
                    ...(onDelete
                      ? [{
                          label: 'Ta bort',
                          danger: true,
                          onClick: () => setCourseToDelete(course),
                        }]
                      : []),
                  ]}
                />
              </td>
            </tr>
          );
        })}
      </StandardTable>

      <ConfirmDialog
        open={Boolean(courseToDelete)}
        title="Ta bort kurs"
        message={`Vill du ta bort kursen "${courseToDelete?.title || ''}"? Det går inte att ångra.`}
        onConfirm={() => {
          if (courseToDelete && onDelete) onDelete(courseToDelete.id);
          setCourseToDelete(null);
        }}
        onCancel={() => setCourseToDelete(null)}
      />
    </>
  );
};

export default CourseTable;
