import React, { useState, useEffect } from 'react';
import { CourseTemplate, Category } from '../../../types/course';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';
import TemplateTable from './TemplateTable';
import { Box, Paper, Typography, Button, CircularProgress } from '@mui/material';
import SectionContainer from '../Dashboard/SectionContainer';

interface TemplateManagerProps {
  onEditTemplate: (template: CourseTemplate) => void;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({ onEditTemplate }) => {
  const [templates, setTemplates] = useState<CourseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Record<string, Category>>({});
  const [filter, setFilter] = useState('all');

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/templates');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && Array.isArray(data.templates)) {
        setTemplates(data.templates);
      } else {
        setTemplates([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && Array.isArray(data.categories)) {
        const categoriesMap: Record<string, Category> = {};
        data.categories.forEach((category: Category) => {
          categoriesMap[category.id] = category;
        });
        setCategories(categoriesMap);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchTemplates();
    fetchCategories();
  }, []);

  // Handle delete template
  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete template: ${response.status}`);
      }

      // Refresh templates
      fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      alert('Could not delete template: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const getFilterDescription = () => {
    if (filter === 'all') {
      return 'Alla mallar';
    } else {
      const category = categories[filter];
      return category ? category.name : 'Okänd kategori';
    }
  };

  return (
    <>
      {error && (
        <div className="error-message">{error}</div>
      )}

      {loading ? (
        <div>Laddar kursmallar...</div>
      ) : (
        <>
          <div className={styles.navButtons} style={{ marginBottom: '1rem' }}>
            <button onClick={() => onEditTemplate({} as CourseTemplate)} className={styles.addButton}>
              Lägg till ny mall
            </button>
          </div>

          <SectionContainer title="Kursmallar">
            <div className={styles.filterContainer} style={{ margin: '1rem' }}>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className={styles.statusSelect}
                aria-label="Filtrera kursmallar"
              >
                <option value="all">Alla mallar</option>
                {Object.values(categories).map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              
              <button
                onClick={fetchTemplates}
                className={styles.publishButton}
                title="Uppdatera listan med kursmallar"
              >
                <span>Uppdatera</span>
              </button>
              
              {getFilterDescription() && (
                <span className={styles.filterDescription}>
                  {getFilterDescription()} ({templates.length})
                </span>
              )}
            </div>

            {templates.length === 0 ? (
              <div className={styles.emptyState}>
                <p>Inga kursmallar hittades</p>
                <p className={styles.emptyStateSubtext}>Klicka på 'Lägg till ny mall' för att skapa en kursmall.</p>
              </div>
            ) : (
              <TemplateTable 
                templates={templates}
                categories={categories}
                onEditTemplate={onEditTemplate}
                onDeleteTemplate={handleDeleteTemplate}
              />
            )}
          </SectionContainer>
        </>
      )}
    </>
  );
};

export default TemplateManager; 