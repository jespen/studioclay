import React, { useState } from 'react';
import { CourseTemplate, Category } from '../../../types/course';
import StandardTable from '../common/StandardTable';
import RowActions from '../common/RowActions';
import ConfirmDialog from '../common/ConfirmDialog';
import { htmlToText } from '@/utils/htmlToText';
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

  const [templateToDelete, setTemplateToDelete] = useState<CourseTemplate | null>(null);

  const formatRichDescription = (richDescription: string | undefined) => {
    const plainText = htmlToText(richDescription);
    if (!plainText) return 'Ingen beskrivning';
    return plainText.length > 80 ? plainText.substring(0, 80) + '...' : plainText;
  };

  return (
    <>
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
              title={htmlToText(template.rich_description) || 'Ingen beskrivning'}
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
            <RowActions
              onEdit={() => onEditTemplate(template)}
              items={[{
                label: 'Ta bort',
                danger: true,
                onClick: () => setTemplateToDelete(template),
              }]}
            />
          </td>
        </tr>
      ))}
    </StandardTable>
      <ConfirmDialog
        open={Boolean(templateToDelete)}
        title="Ta bort kursmall"
        message={`Vill du ta bort mallen "${templateToDelete?.title || 'utan namn'}"? Befintliga kurser påverkas inte.`}
        onConfirm={() => {
          if (templateToDelete) onDeleteTemplate(templateToDelete.id);
          setTemplateToDelete(null);
        }}
        onCancel={() => setTemplateToDelete(null)}
      />
    </>
  );
};

export default TemplateTable; 