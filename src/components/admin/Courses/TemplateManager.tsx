import React, { useState, useEffect } from 'react';
import { CourseTemplate, Category } from '../../../types/course';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';

interface TemplateManagerProps {
  onEditTemplate: (template: CourseTemplate) => void;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({ onEditTemplate }) => {
  const [templates, setTemplates] = useState<CourseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Record<string, Category>>({});

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
    if (!confirm('Are you sure you want to delete this template? This will NOT affect existing courses.')) {
      return;
    }
    
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

  return (
    <Box sx={{ mb: 4 }}>
      <Paper elevation={3} sx={{ p: 0, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ bgcolor: 'primary.main', color: 'white', px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Kursmallar
          </Typography>
          <Button 
            variant="contained" 
            color="secondary" 
            onClick={() => onEditTemplate({} as CourseTemplate)}
            sx={{ textTransform: 'none' }}
          >
            Lägg till ny mall
          </Button>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 3 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : templates.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Typography>Inga kursmallar hittades. Klicka på 'Lägg till ny mall' för att skapa en.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Namn</TableCell>
                  <TableCell>Kategori</TableCell>
                  <TableCell>Pris</TableCell>
                  <TableCell>Antal kurser</TableCell>
                  <TableCell>Åtgärder</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>{template.title || template.categorie || 'Untitled'}</TableCell>
                    <TableCell>
                      {template.category?.name || categories[template.category_id || '']?.name || 'Ingen kategori'}
                    </TableCell>
                    <TableCell>
                      {template.price !== undefined && template.price !== null 
                       ? `${template.price} ${template.currency || ''}` 
                       : 'Varierar'}
                    </TableCell>
                    <TableCell>{template.instances_count || 0}</TableCell>
                    <TableCell>
                      <Tooltip title="Redigera">
                        <IconButton onClick={() => onEditTemplate(template)} size="small">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Ta bort">
                        <IconButton onClick={() => handleDeleteTemplate(template.id)} size="small">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default TemplateManager; 