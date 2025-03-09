'use client';

import { useState, useEffect } from 'react';
import { Course, Category, Instructor } from '../../../../types/course';
import { TextField, Button, Box, Paper, Typography, FormControlLabel, Switch, Grid, MenuItem } from '@mui/material';

type CourseFormProps = {
  course: Course | null;
  onSave: (courseData: Partial<Course>) => void;
  onCancel: () => void;
};

export default function CourseForm({ course, onSave, onCancel }: CourseFormProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [price, setPrice] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Primary color from globals.css
  const primaryColor = '#547264';
  
  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories/');
        if (!response.ok) {
          throw new Error('Kunde inte hämta kategorier');
        }
        const data = await response.json();
        setCategories(Array.isArray(data.categories) ? data.categories : []);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Kunde inte hämta kategorier');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, []);
  
  // Initialize form with course data if editing
  useEffect(() => {
    if (course) {
      setTitle(course.title || '');
      setDescription(course.description || '');
      setIsPublished(course.is_published || false);
      setPrice(course.price ? course.price.toString() : '');
      setCategoryId(course.category_id || '');
      
      // Handle dates
      if (course.start_date) {
        const startDateTime = new Date(course.start_date);
        setStartDate(formatDateForInput(startDateTime));
        setStartTime(formatTimeForInput(startDateTime));
      }
      
      if (course.end_date) {
        const endDateTime = new Date(course.end_date);
        setEndDate(formatDateForInput(endDateTime));
        setEndTime(formatTimeForInput(endDateTime));
      }
    }
  }, [course]);
  
  // Helper functions for date formatting
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };
  
  const formatTimeForInput = (date: Date): string => {
    return date.toISOString().split('T')[1].substring(0, 5);
  };
  
  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!title.trim()) {
      alert('Titel är obligatoriskt');
      return;
    }
    
    if (!startDate || !startTime) {
      alert('Startdatum och starttid är obligatoriskt');
      return;
    }
    
    // Combine date and time for start and end
    const combinedStartDate = new Date(`${startDate}T${startTime}:00`);
    
    let combinedEndDate = null;
    if (endDate && endTime) {
      combinedEndDate = new Date(`${endDate}T${endTime}:00`);
    }
    
    // Create course data with default values for location and currency
    const courseData: Partial<Course> = {
      title,
      description,
      location: 'Studio Clay', // Default value
      start_date: combinedStartDate.toISOString(),
      end_date: combinedEndDate ? combinedEndDate.toISOString() : undefined,
      price: price ? parseFloat(price) : undefined,
      currency: 'SEK', // Default value
      category_id: categoryId || null,
      is_published: isPublished,
    };
    
    // Call the onSave callback with the course data
    onSave(courseData);
  };
  
  if (loading) {
    return <div>Laddar...</div>;
  }

  // Custom styles for Material UI components
  const inputStyles = {
    '& .MuiOutlinedInput-root': {
      '&:hover fieldset': {
        borderColor: primaryColor,
      },
      '&.Mui-focused fieldset': {
        borderColor: primaryColor,
        borderWidth: 2,
      },
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: primaryColor,
    },
    mb: 3
  };

  return (
    <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2 }}>
      {/* Material UI-style header with primary color */}
      <Box sx={{ 
        bgcolor: primaryColor, 
        color: 'white', 
        px: 3, 
        py: 2 
      }}>
        <Typography variant="h6" component="h2">
          {course ? 'Redigera kurs' : 'Skapa kurs'}
        </Typography>
      </Box>
      
      {/* Form */}
      <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
        {/* Title */}
        <TextField
          fullWidth
          required
          id="title"
          name="title"
          label="Kurstitel"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          variant="outlined"
          size="small"
          sx={inputStyles}
        />
        

        
        {/* Category */}
        <TextField
          fullWidth
          select
          id="category"
          name="category"
          label="Kategori"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          variant="outlined"
          size="small"
          sx={inputStyles}
        >
          <MenuItem value="">Välj kategori</MenuItem>
          {categories.map((category) => (
            <MenuItem key={category.id} value={category.id}>
              {category.name}
            </MenuItem>
          ))}
        </TextField>
        
        {/* Date and Time */}
        <Typography variant="subtitle2" sx={{ mb: 1, color: primaryColor, fontWeight: 'medium' }}>
          Datum och tid
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              id="startDate"
              name="startDate"
              label="Startdatum"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              variant="outlined"
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={inputStyles}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              id="startTime"
              name="startTime"
              label="Starttid"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              variant="outlined"
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={inputStyles}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="endDate"
              name="endDate"
              label="Slutdatum"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              variant="outlined"
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={inputStyles}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              id="endTime"
              name="endTime"
              label="Sluttid"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              variant="outlined"
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={inputStyles}
            />
          </Grid>
        </Grid>
        
        {/* Price */}
        <TextField
          fullWidth
          id="price"
          name="price"
          label="Pris (SEK)"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          variant="outlined"
          size="small"
          sx={inputStyles}
        />
                {/* Description */}
                <TextField
          fullWidth
          id="description"
          name="description"
          label="Beskrivning"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          variant="outlined"
          size="small"
          multiline
          rows={4}
          sx={inputStyles}
        />
        
        {/* Published Status */}
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                color="primary"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: primaryColor,
                    '&:hover': {
                      backgroundColor: 'rgba(84, 114, 100, 0.08)',
                    },
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: primaryColor,
                  },
                }}
              />
            }
            label="Publicera kurs (synlig för besökare)"
          />
        </Box>
        
        {/* Form Actions */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: 2, 
          mt: 4, 
          pt: 2, 
          borderTop: '1px solid', 
          borderColor: 'divider' 
        }}>
          <Button
            variant="outlined"
            onClick={onCancel}
            size="medium"
            sx={{
              borderColor: primaryColor,
              color: primaryColor,
              '&:hover': {
                borderColor: primaryColor,
                backgroundColor: 'rgba(84, 114, 100, 0.08)',
              },
            }}
          >
            Avbryt
          </Button>
          <Button
            type="submit"
            variant="contained"
            size="medium"
            sx={{
              backgroundColor: primaryColor,
              '&:hover': {
                backgroundColor: '#3D544A', // Darker shade of the primary color
              },
            }}
          >
            {course ? 'Uppdatera' : 'Skapa'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
} 