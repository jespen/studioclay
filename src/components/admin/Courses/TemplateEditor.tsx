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
  CircularProgress,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import RichTextEditor from '../../../components/common/RichTextEditor';

// Create a theme with the primary color from globals.css
const theme = createTheme({
  palette: {
    primary: {
      main: '#547264', // sage green from globals.css
      light: '#7A9387',
      dark: '#3D544A',
    },
    secondary: {
      main: '#698577',
      light: '#9CB3A8',
      dark: '#415A50',
    },
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h6: {
      fontFamily: 'Georgia, serif',
      fontWeight: 700,
    },
    subtitle1: {
      fontWeight: 600,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '0.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
  },
});

interface TemplateEditorProps {
  template: CourseTemplate | null;
  onSave: (template: Partial<CourseTemplate>) => Promise<void>;
  onCancel: () => void;
}

const TemplateEditor: React.FC<TemplateEditorProps> = ({ template, onSave, onCancel }) => {
  const [title, setTitle] = useState('');
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
    <ThemeProvider theme={theme}>
      <Paper elevation={3} sx={{ p: 0, overflow: 'hidden' }}>
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
            {/* Category */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                select
                label="Kategori"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  // Set title based on selected category
                  const selectedCategory = categories.find(c => c.id === e.target.value);
                  if (selectedCategory) {
                    setTitle(selectedCategory.name);
                  }
                }}
                disabled={isSubmitting || loading}
                error={loading ? false : Boolean(categoryId) && !categories.some(c => c.id === categoryId)}
                helperText={
                  loading ? 'Laddar kategorier...' : 
                  (Boolean(categoryId) && !categories.some(c => c.id === categoryId)) ? 
                  `Kategori med ID ${categoryId} hittades inte` : 'Välj vilken kategori kursen tillhör'
                }
                color="primary"
              >
                <MenuItem value="">Välj kategori</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            
            {/* Rich Description */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 1, color: 'primary.main', fontWeight: 'bold' }}>
                Kursbeskrivning
              </Typography>
              <RichTextEditor
                value={richDescription}
                onChange={setRichDescription}
                placeholder="Skriv eller klistra in din kursbeskrivning här..."
                readOnly={isSubmitting}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Redigera texten med formateringsverktygen ovan. Du kan klippa och klistra in text från Word eller andra källor.
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
              color="primary"
              sx={{ borderRadius: '4px' }}
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
              sx={{ 
                borderRadius: '4px',
                boxShadow: 'none',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                }
              }}
            >
              {isSubmitting ? 'Sparar...' : 'Spara'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </ThemeProvider>
  );
};

export default TemplateEditor; 