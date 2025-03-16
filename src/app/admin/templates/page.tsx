'use client';

import React, { useState } from 'react';
import { Box, Typography, Container } from '@mui/material';
import AdminHeader from '@/components/admin/Dashboard/AdminHeader';
import TemplateManager from '@/components/admin/Courses/TemplateManager';
import TemplateEditor from '@/components/admin/Courses/TemplateEditor';
import { CourseTemplate } from '@/types/course';
import styles from '../dashboard/courses/courses.module.css';

export default function TemplatesPage() {
  const [editingTemplate, setEditingTemplate] = useState<CourseTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // Handle editing a template
  const handleEditTemplate = (template: CourseTemplate) => {
    setEditingTemplate(template);
    setIsEditing(true);
  };

  // Handle saving a template
  const handleSaveTemplate = async (templateData: Partial<CourseTemplate>): Promise<void> => {
    try {
      console.log('Saving template data:', templateData);
      
      let response;
      
      if (templateData.id) {
        // Update existing template
        response = await fetch(`/api/templates/${templateData.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(templateData),
        });
      } else {
        // Create new template
        response = await fetch('/api/templates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(templateData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save template');
      }

      // Log the response for debugging
      const responseData = await response.json();
      console.log('Template saved successfully:', responseData);

      setMessage({
        text: templateData.id ? 'Kursmall uppdaterad' : 'Ny kursmall skapad',
        type: 'success'
      });
      
      // Exit editing mode
      setIsEditing(false);
      setEditingTemplate(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error saving template:', error);
      setMessage({
        text: `Fel: ${error instanceof Error ? error.message : 'Okänt fel'}`,
        type: 'error'
      });
    }
  };

  return (
    <div className={styles.pageContainer}>
      <AdminHeader title="Kursmallar" subtitle="Hantera kursmallar och beskrivningar" />
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {message && (
          <Box
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 1,
              backgroundColor: message.type === 'success' ? '#e8f5e9' : '#ffebee',
              color: message.type === 'success' ? '#2e7d32' : '#c62828',
            }}
          >
            <Typography>{message.text}</Typography>
          </Box>
        )}
        
        {isEditing ? (
          <TemplateEditor
            template={editingTemplate}
            onSave={handleSaveTemplate}
            onCancel={() => {
              setIsEditing(false);
              setEditingTemplate(null);
            }}
          />
        ) : (
          <TemplateManager onEditTemplate={handleEditTemplate} />
        )}
      </Container>
    </div>
  );
} 