import React from 'react';
import { CourseTemplate, Category } from '../../../types/course';
import StandardTable from '../common/StandardTable';
import ActionButton from '../common/ActionButton';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';

interface TemplateTableProps {
  templates: CourseTemplate[];
  categories: Record<string, Category>;
  onEditTemplate: (template: CourseTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
}

export const TemplateTable: React.FC<TemplateTableProps> = ({
  templates,
  categories,
  onEditTemplate,
  onDeleteTemplate
}) => {
  // Format price for display
  const formatPrice = (price: number | null | undefined, currency: string | null | undefined) => {
    if (price === undefined || price === null) return 'Varierar';
    return `${price} ${currency || 'kr'}`;
  };

  return (
    <StandardTable 
      headers={['Namn', 'Kategori', 'Pris', 'Antal kurser', 'Åtgärder']}
      emptyMessage="Inga kursmallar hittades. Klicka på 'Lägg till ny mall' för att skapa en."
    >
      {templates.map((template) => (
        <tr key={template.id} className={styles.tableRow}>
          <td className={styles.tableCell}>
            <div>
              <h3 className={styles.courseTitle}>{template.title || template.categorie || 'Namnlös'}</h3>
              {template.description && (
                <p className={styles.courseDescription}>{template.description}</p>
              )}
            </div>
          </td>
          <td className={styles.tableCell}>
            <span className={`${styles.statusBadge} ${styles.publishedBadge}`}>
              {template.category?.name || categories[template.category_id || '']?.name || 'Ingen kategori'}
            </span>
          </td>
          <td className={styles.tableCell}>
            {formatPrice(template.price, template.currency)}
          </td>
          <td className={styles.tableCell}>
            <span className={`${styles.statusBadge} ${template.instances_count ? styles.publishedBadge : styles.draftBadge}`}>
              {template.instances_count || 0}
            </span>
          </td>
          <td className={styles.tableCell}>
            <div className={styles.actionButtonsContainer}>
              <ActionButton
                variant="edit"
                onClick={() => onEditTemplate(template)}
              />
              <ActionButton
                variant="delete"
                onClick={() => {
                  if (confirm('Är du säker på att du vill ta bort denna mall? Detta påverkar INTE existerande kurser.')) {
                    onDeleteTemplate(template.id);
                  }
                }}
              />
            </div>
          </td>
        </tr>
      ))}
    </StandardTable>
  );
};

export default TemplateTable; 