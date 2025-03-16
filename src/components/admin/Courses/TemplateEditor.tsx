import React, { useState, useEffect } from 'react';
import { CourseTemplate, Category } from '../../../types/course';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  MenuItem, 
  FormControlLabel,
  Switch,
  CircularProgress
} from '@mui/material';

interface TemplateEditorProps {
  template: CourseTemplate | null;
  onSave: (template: Partial<CourseTemplate>) => Promise<void>;
  onCancel: () => void;
}

const TemplateEditor: React.FC<TemplateEditorProps> = ({ template, onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [richDescription, setRichDescription] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load template data if editing
  useEffect(() => {
    if (template) {
      // Use title from client side mapping or categorie from database directly
      setTitle(template.title || template.categorie || '');
      setDescription(template.description || '');
      setRichDescription(template.rich_description || '');
      
      // Use is_published or published, whichever is available
      // Ensure that we always pass a boolean value to setIsPublished
      setIsPublished(
        template.is_published === true || template.published === true
      );
      
      setCategoryId(template.category_id || '');
      
      console.log('Template loaded with:', {
        title: template.title,
        categorie: template.categorie,
        is_published: template.is_published,
        published: template.published,
        category_id: template.category_id
      });
    }
  }, [template]);

  // Fetch categories
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch categories
        console.log('Fetching categories...');
        const categoriesResponse = await fetch('/api/categories');
        if (!categoriesResponse.ok) {
          throw new Error(`Failed to fetch categories: ${categoriesResponse.status} ${categoriesResponse.statusText}`);
        }
        const categoriesData = await categoriesResponse.json();
        console.log('Categories response:', categoriesData);
        
        if (categoriesData && Array.isArray(categoriesData.categories)) {
          setCategories(categoriesData.categories);
          console.log('Categories loaded:', categoriesData.categories.length);
        } else {
          console.error('Invalid categories response format:', categoriesData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate required fields
    if (!title) {
      setError('Title is required');
      setIsSubmitting(false);
      return;
    }

    if (!categoryId) {
      setError('Category is required');
      setIsSubmitting(false);
      return;
    }

    try {
      // Create template object with only fields that exist in the database
      const templateData: Partial<CourseTemplate> = {
        id: template?.id, // Include ID only if editing
        title, // Will be mapped to categorie in the API
        rich_description: richDescription,
        is_published: isPublished, // Will be mapped to published in the API
        category_id: categoryId
      };

      await onSave(templateData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 0, borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ bgcolor: 'primary.main', color: 'white', px: 3, py: 2 }}>
        <Typography variant="h6">
          {template?.id ? 'Redigera kursmall' : 'Skapa ny kursmall'}
        </Typography>
      </Box>
      
      <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        
        <Grid container spacing={3}>
          {/* Title */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              label="Mall Titel"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              helperText="Ett namn för denna kursmall, t.ex. 'Prova på', 'Helgkurs' etc."
            />
          </Grid>
          
          {/* Category */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              select
              label="Kategori"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={isSubmitting || loading}
              error={loading ? false : Boolean(categoryId) && !categories.some(c => c.id === categoryId)}
              helperText={
                loading ? 'Laddar kategorier...' : 
                (Boolean(categoryId) && !categories.some(c => c.id === categoryId)) ? 
                `Kategori med ID ${categoryId} hittades inte` : 'Välj vilken kategori kursen tillhör'
              }
            >
              <MenuItem value="">Välj kategori</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          
          {/* Description */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Kort beskrivning"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              helperText="En kort beskrivning som visas i kursöversikten och kurslistan"
            />
          </Grid>
          
          {/* Rich Description */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Detaljerad kursbeskrivning
            </Typography>
            <Box sx={{ 
              border: '1px solid', 
              borderColor: 'divider', 
              borderRadius: 1, 
              mb: 1
            }}>
              <TextField
                fullWidth
                multiline
                rows={10}
                value={richDescription}
                onChange={(e) => setRichDescription(e.target.value)}
                placeholder="Skriv en detaljerad beskrivning. HTML-taggar som <h2>, <p>, <strong>, <ul>, <li> osv. stöds för formatering."
                disabled={isSubmitting}
                sx={{ 
                  '& .MuiOutlinedInput-notchedOutline': { 
                    border: 'none' 
                  }
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Använd HTML-taggar för formatering. Exempel: &lt;h2&gt;Rubrik&lt;/h2&gt;, &lt;p&gt;Paragraf&lt;/p&gt;, &lt;strong&gt;Fetstil&lt;/strong&gt;, &lt;ul&gt;&lt;li&gt;Punktlista&lt;/li&gt;&lt;/ul&gt;
            </Typography>
          </Grid>
          
          {/* Published Status */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  disabled={isSubmitting}
                  color="primary"
                />
              }
              label="Publicerad"
            />
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
              Publicerade kursmallar kan användas för att skapa kursinstanser. Opublicerade mallar är endast synliga för administratörer.
            </Typography>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Avbryt
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          >
            {isSubmitting ? 'Sparar...' : 'Spara'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default TemplateEditor; 