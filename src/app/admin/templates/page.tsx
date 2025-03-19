'use client';

import React, { useState } from 'react';
import AdminHeader from '../../../components/admin/Dashboard/AdminHeader';
import TemplateManager from '../../../components/admin/Courses/TemplateManager';
import TemplateEditor from '../../../components/admin/Courses/TemplateEditor';
import { CourseTemplate } from '../../../types/course';
import styles from '../dashboard/courses/courses.module.css';

export default function TemplatesPage() {
  const [editingTemplate, setEditingTemplate] = useState<CourseTemplate | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // Handle saving template
  const handleSaveTemplate = async (template: Partial<CourseTemplate>) => {
    try {
      const isNewTemplate = !template.id;
      const url = isNewTemplate ? '/api/templates' : `/api/templates/${template.id}`;
      const method = isNewTemplate ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save template');
      }

      // Close editor and show success message
      setEditingTemplate(null);
      setMessage({
        text: isNewTemplate ? 'Mall skapad!' : 'Mall uppdaterad!',
        type: 'success',
      });

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving template:', error);
      setMessage({
        text: error instanceof Error ? error.message : 'Ett fel uppstod',
        type: 'error',
      });
    }
  };

  return (
    <div className={styles.pageContainer}>
      <AdminHeader 
        title="Kursmallar" 
        subtitle="Skapa och hantera kursmallar" 
      />
      
      <main className={styles.mainContent}>
        {message && (
          <div className={`${styles.message} ${message.type === 'error' ? styles.errorMessage : styles.successMessage}`}>
            {message.text}
          </div>
        )}
        
        {editingTemplate ? (
          <TemplateEditor
            template={editingTemplate}
            onSave={handleSaveTemplate}
            onCancel={() => setEditingTemplate(null)}
          />
        ) : (
          <TemplateManager onEditTemplate={setEditingTemplate} />
        )}
      </main>
    </div>
  );
} 