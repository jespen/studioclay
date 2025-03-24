'use client';

import { useState, useEffect } from 'react';
import { Course, Category, Instructor, CourseInstance, CourseTemplate } from '../../../../types/course';
import { TextField, Button, Box, Paper, Typography, FormControlLabel, Switch, Grid, MenuItem } from '@mui/material';
import RichTextEditor from '../../../../components/common/RichTextEditor';

type CourseFormProps = {
  course: Course | null;
  onSave: (courseData: Partial<Course>) => void;
  onCancel: () => void;
};

export default function CourseForm({ course, onSave, onCancel }: CourseFormProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [richDescription, setRichDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [price, setPrice] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [templateId, setTemplateId] = useState('');
  const [templates, setTemplates] = useState<CourseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Primary color from globals.css
  const primaryColor = '#547264';
  
  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        console.log('Fetching templates from API...');
        const response = await fetch('/api/templates/');
        
        if (!response.ok) {
          console.error(`Failed to fetch templates: ${response.status} ${response.statusText}`);
          throw new Error(`Kunde inte hämta kursmallar: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Templates data received:', data);
        
        const fetchedTemplates = Array.isArray(data.templates) ? data.templates : [];
        console.log(`Loaded ${fetchedTemplates.length} templates`);
        setTemplates(fetchedTemplates);
        
        // If we have a templateId but no description, set the rich description from the template
        if (templateId && !richDescription && !course) {
          const selectedTemplate = fetchedTemplates.find((temp: CourseTemplate) => temp.id === templateId);
          if (selectedTemplate?.rich_description) {
            setRichDescription(selectedTemplate.rich_description);
          }
        }
      } catch (err) {
        console.error('Error fetching templates:', err);
        setError(err instanceof Error ? err.message : 'Kunde inte hämta kursmallar');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTemplates();
  }, [templateId, richDescription, course]);
  
  // Initialize form with course data if editing
  useEffect(() => {
    if (course) {
      setTitle(course.title || '');
      setRichDescription(course.rich_description || course.template?.rich_description || '');
      setIsPublished(course.is_published || false);
      // Hämta pris direkt från kursen först om det finns, annars från mallen
      setPrice(course.price ? course.price.toString() : course.template?.price ? course.template.price.toString() : '');
      setTemplateId(course.template_id || '');
      setMaxParticipants(course.max_participants ? course.max_participants.toString() : '');
      
      // Handle dates with proper timezone handling
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
    return date.toLocaleTimeString('sv-SE').substring(0, 5);
  };
  
  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced validation - all fields are mandatory
    if (!templateId) {
      alert('Kursmall måste väljas');
      return;
    }
    
    if (!richDescription.trim()) {
      alert('Beskrivning är obligatoriskt');
      return;
    }
    
    if (!startDate || !startTime) {
      alert('Startdatum och starttid är obligatoriskt');
      return;
    }
    
    if (!endDate || !endTime) {
      alert('Slutdatum och sluttid är obligatoriskt');
      return;
    }
    
    if (!price || parseFloat(price) <= 0) {
      alert('Pris måste anges och vara större än 0');
      return;
    }
    
    if (!maxParticipants || parseInt(maxParticipants) <= 0) {
      alert('Max antal deltagare måste anges och vara större än 0');
      return;
    }
    
    // Get the selected template
    const selectedTemplate = templates.find(temp => temp.id === templateId);
    if (!selectedTemplate) {
      alert('Kunde inte hitta vald kursmall');
      return;
    }
    
    // Combine date and time for start and end
    const combinedStartDate = new Date(`${startDate}T${startTime}:00`);
    const combinedEndDate = new Date(`${endDate}T${endTime}:00`);
    
    // Validate that end date is after start date
    if (combinedEndDate <= combinedStartDate) {
      alert('Sluttid måste vara efter starttid');
      return;
    }
    
    // Calculate duration in minutes
    const durationMinutes = Math.round((combinedEndDate.getTime() - combinedStartDate.getTime()) / 60000);
    
    // Create course data with required values - save everything to the instance
    const courseData: Partial<CourseInstance> = {
      id: course?.id || undefined,
      title: selectedTemplate.title || selectedTemplate.categorie || '',
      start_date: combinedStartDate.toISOString(),
      end_date: combinedEndDate.toISOString(),
      max_participants: parseInt(maxParticipants),
      current_participants: course?.current_participants || 0,
      is_published: isPublished,
      template_id: templateId,
      rich_description: richDescription, // Store the rich description in the instance
      price: parseFloat(price) // Store price in the price field (what is used in DB)
    };
    
    // Log the price information for reference
    console.log(`Course price set to ${price} SEK - this price is stored in the 'price' field of the course instance`);
    
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
        {/* Template Selection */}
        <TextField
          fullWidth
          required
          select
          id="template"
          name="template"
          label="Kursmall"
          value={templateId}
          onChange={(e) => {
            const newTemplateId = e.target.value;
            setTemplateId(newTemplateId);
            // Find the selected template and update description
            const selectedTemplate = templates.find(temp => temp.id === newTemplateId);
            // Only set rich description if we're not editing an existing course
            if (selectedTemplate?.rich_description && !course) {
              setRichDescription(selectedTemplate.rich_description);
              // Set default title from template
              setTitle(selectedTemplate.title || selectedTemplate.categorie || '');
              // Set default price and other details if available
              if (selectedTemplate.price) setPrice(selectedTemplate.price.toString());
              if (selectedTemplate.max_participants) setMaxParticipants(selectedTemplate.max_participants.toString());
            }
          }}
          variant="outlined"
          size="small"
          sx={inputStyles}
        >
          <MenuItem value="">Välj kursmall</MenuItem>
          {templates.map((template) => (
            <MenuItem key={template.id} value={template.id}>
              {template.title || template.categorie}
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
              required
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
              required
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
        
        {/* Price and Max Participants */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
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
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              id="maxParticipants"
              name="maxParticipants"
              label="Max antal deltagare"
              type="number"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              variant="outlined"
              size="small"
              sx={inputStyles}
            />
          </Grid>
        </Grid>
        
        {/* Rich Description - using our custom RichTextEditor component */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: primaryColor, fontWeight: 'medium' }}>
            Beskrivning
          </Typography>
          <RichTextEditor
            value={richDescription}
            onChange={setRichDescription}
            placeholder="Skriv eller klistra in din beskrivning här..."
          />
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
            Denna beskrivning kommer från kursmallen men kan anpassas till denna specifika kurs.
          </Typography>
        </Box>
        
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