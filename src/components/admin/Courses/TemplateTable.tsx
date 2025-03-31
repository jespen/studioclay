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

  // Format date for display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Okänt datum';
    const date = new Date(dateString);
    return date.toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Format rich description preview
  const formatRichDescription = (richDescription: string | undefined) => {
    if (!richDescription) return 'Ingen beskrivning';
    
    // Remove HTML tags and get plain text
    const plainText = richDescription.replace(/<[^>]*>/g, '');
    
    // Truncate to 50 characters if longer
    return plainText.length > 50 ? plainText.substring(0, 50) + '...' : plainText;
  };

  return (
    <StandardTable 
      headers={['Namn', 'Kategori', 'Skapat', 'Publicerad', 'Beskrivning', 'Antal kurser', 'Åtgärder']}
      emptyMessage="Inga kursmallar hittades. Klicka på 'Lägg till ny mall' för att skapa en."
    >
      {templates.map((template) => (
        <tr key={template.id} className={styles.tableRow}>
          <td className={styles.tableCell}>
            <div>
              <h3 className={styles.courseTitle}>{template.title || template.categorie || 'Namnlös'}</h3>
            </div>
          </td>
          <td className={styles.tableCell}>
            <span className={`${styles.statusBadge} ${styles.publishedBadge}`}>
              {template.category?.name || categories[template.category_id || '']?.name || 'Ingen kategori'}
            </span>
          </td>
          <td className={styles.tableCell}>
            {formatDate(template.created_at)}
          </td>
          <td className={styles.tableCell}>
            <span className={`${styles.statusBadge} ${(template.is_published || template.published) ? styles.publishedBadge : styles.draftBadge}`}>
              {(template.is_published || template.published) ? 'JA' : 'NEJ'}
            </span>
          </td>
          <td className={styles.tableCell}>
            <div 
              className={styles.descriptionPreview} 
              title={template.rich_description ? template.rich_description.replace(/<[^>]*>/g, '') : 'Ingen beskrivning'}
            >
              {formatRichDescription(template.rich_description)}
            </div>
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