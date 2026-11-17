'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Course, CourseInstance, CourseTemplate } from '../../../../types/course';
import { TextField, Button, Box, Paper, Typography, FormControlLabel, Switch, Grid, MenuItem, IconButton, Select, FormControl, SelectChangeEvent } from '@mui/material';
import RichTextEditor from '../../../../components/common/RichTextEditor';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ClearIcon from '@mui/icons-material/Clear';
import { fetchWithCache } from '@/utils/apiCache';

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
  const [loading, setLoading] = useState(!course);
  const [formReady, setFormReady] = useState(!course);
  const imagesRequested = useRef(false);
  const [error, setError] = useState('');
  
  // Image state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  
  // Gallery images
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string>('');
  const [loadingImages, setLoadingImages] = useState(false);
  
  // Memoize fetch functions to prevent unnecessary renders
  const fetchImages = useCallback(async () => {
    try {
      setLoadingImages(true);
      const data = await fetchWithCache<{images: string[]}>(
        '/api/storage/pictures',
        {},
        {
          useCache: true,
          expiry: 10 * 60 * 1000, // Cache images for 10 minutes
          cacheKey: 'gallery-images-courses'
        }
      );
      
      console.log('Images data received:', data);
      
      if (Array.isArray(data.images)) {
        setGalleryImages(data.images);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoadingImages(false);
    }
  }, []);
  
  const fetchTemplates = useCallback(async () => {
    try {
      const data = await fetchWithCache<{ templates: CourseTemplate[] }>(
        '/api/templates?summary=1',
        {},
        {
          useCache: true,
          expiry: 5 * 60 * 1000,
          cacheKey: 'course-templates-summary'
        }
      );
      
      if (Array.isArray(data.templates)) {
        setTemplates(data.templates);
      } else if (!course) {
        setError('Invalid templates data format');
      }
    } catch (error) {
      console.error('CourseForm: Error fetching templates:', error);
      if (!course) setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [course]);
  
  const loadGalleryImages = useCallback(() => {
    if (imagesRequested.current) return;
    imagesRequested.current = true;
    fetchImages();
  }, [fetchImages]);

  // Fetch templates when the component mounts
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);
  
  // Initialize form with course data when course prop changes
  useEffect(() => {
    if (course) {
      setTitle(course.title || '');
      setRichDescription(course.rich_description || course.template?.rich_description || '');
      setIsPublished(course.is_published || false);
      // Hämta pris direkt från kursen först om det finns, annars från mallen
      setPrice(course.price ? course.price.toString() : course.template?.price ? course.template.price.toString() : '');
      setTemplateId(course.template_id || '');
      setMaxParticipants(course.max_participants ? course.max_participants.toString() : '');
      
      // Set image preview if course has an image
      if (course.image_url) {
        setImagePreview(course.image_url);
        setSelectedGalleryImage(course.image_url);
        console.log('Setting image from course:', course.image_url);
      } else if (course.template?.image_url) {
        setImagePreview(course.template.image_url);
        setSelectedGalleryImage(course.template.image_url);
        console.log('Setting image from template:', course.template.image_url);
      }
      
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

      setFormReady(true);
    }
  }, [course]);
  
  // Helper functions for date formatting
  const formatDateForInput = (date: Date): string => {
    // HTML date inputs expect YYYY-MM-DD format
    return date.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Europe/Stockholm'
    });
  };
  
  const formatTimeForInput = (date: Date): string => {
    return date.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Stockholm'
    }).substring(0, 5);
  };
  
  // Image handling functions
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      // Validate file type
      if (!file.type.includes('image/')) {
        alert('Endast bildfiler är tillåtna (jpg, png, etc)');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Bilden är för stor. Max storlek är 5MB.');
        return;
      }
      
      setSelectedImage(file);
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
      
      // Clean up on unmount
      return () => URL.revokeObjectURL(objectUrl);
    }
  };
  
  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };
  
  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage) return null;
    
    try {
      setUploading(true);
      
      // Create form data for the file (matching shop pattern)
      const formData = new FormData();
      formData.append('file', selectedImage);
      
      // Upload image to Supabase through our API (same endpoint as shop)
      const response = await fetch('/api/storage/pictures', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload image');
      }
      
      const data = await response.json();
      return data.url;
    } catch (err) {
      console.error('Error uploading image:', err);
      alert(err instanceof Error ? `Kunde inte ladda upp bilden: ${err.message}` : 'Ett fel uppstod vid uppladdning av bilden');
      return null;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };
  
  // Handle gallery image selection
  const handleGalleryImageChange = (event: SelectChangeEvent<string>) => {
    const imagePath = event.target.value;
    console.log('Selected gallery image:', imagePath);
    if (imagePath) {
      setSelectedGalleryImage(imagePath);
      setImagePreview(imagePath);
      setSelectedImage(null); // Clear any uploaded image
    } else {
      // If user selects "Ingen galleribild", clear the preview
      setSelectedGalleryImage('');
      setImagePreview(null);
    }
  };
  
  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
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
    
    // Upload image if selected, otherwise use gallery image
    let imageUrl = selectedGalleryImage || imagePreview;
    
    console.log('Image selection status:', {
      selectedGalleryImage,
      imagePreview,
      selectedImage: selectedImage ? selectedImage.name : null,
      finalImageUrl: imageUrl
    });
    
    if (selectedImage) {
      const uploadedUrl = await uploadImage();
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      }
    }
    
    // Create course data with required values - save everything to the instance
    const courseData: Partial<CourseInstance> = {
      id: course?.id || undefined,
      title: title.trim() || selectedTemplate.title || selectedTemplate.categorie || '',
      start_date: combinedStartDate.toISOString(),
      end_date: combinedEndDate.toISOString(),
      max_participants: parseInt(maxParticipants),
      current_participants: course?.current_participants || 0,
      is_published: isPublished,
      template_id: templateId,
      rich_description: richDescription, // Store the rich description in the instance
      price: parseFloat(price), // Store price in the price field (what is used in DB)
      image_url: imageUrl // Store the image URL
    };
    
    // Log the price information for reference
    console.log(`Course price set to ${price} SEK - this price is stored in the 'price' field of the course instance`);
    console.log(`Course image set to: ${imageUrl}`);
    
    // Call the onSave callback with the course data
    onSave(courseData);
  };
  
  if (!formReady || loading) {
    return <div>Laddar...</div>;
  }

  if (error) {
    return (
      <Paper elevation={3} sx={{ p: 3, backgroundColor: '#ffebee' }}>
        <Typography variant="h6" color="error" gutterBottom>
          Kunde inte ladda kursmallarna
        </Typography>
        <Typography variant="body2">{error}</Typography>
        <Box sx={{ mt: 2 }}>
          <Button 
            variant="outlined" 
            color="primary"
            onClick={() => {
              setError('');
              fetchTemplates();
            }}
          >
            Försök igen
          </Button>
        </Box>
      </Paper>
    );
  }

  const fieldSx = { mb: 0 };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ pb: 11 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {course ? course.title || 'Redigera kurs' : 'Ny kurs'}
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>Grundinfo</Typography>
            <TextField
              fullWidth
              required
              id="title"
              name="title"
              label="Titel"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              variant="outlined"
              size="small"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              required
              select
              id="template"
              name="template"
              label="Kursmall"
              value={templateId}
              onChange={async (e) => {
                const newTemplateId = e.target.value;
                setTemplateId(newTemplateId);
                if (!newTemplateId || course) return;

                try {
                  const response = await fetch(`/api/templates/${newTemplateId}`);
                  if (!response.ok) return;
                  const data = await response.json();
                  const selectedTemplate = data.template;
                  if (!selectedTemplate?.rich_description) return;

                  setRichDescription(selectedTemplate.rich_description);
                  setTitle(selectedTemplate.title || selectedTemplate.categorie || '');
                  if (selectedTemplate.price) setPrice(selectedTemplate.price.toString());
                  if (selectedTemplate.max_participants) setMaxParticipants(selectedTemplate.max_participants.toString());
                  if (selectedTemplate.image_url) {
                    setImagePreview(selectedTemplate.image_url);
                    setSelectedGalleryImage(selectedTemplate.image_url);
                  }
                } catch (templateError) {
                  console.error('Failed to load template details:', templateError);
                }
              }}
              variant="outlined"
              size="small"
              sx={fieldSx}
            >
              <MenuItem value="">Välj kursmall</MenuItem>
              {templates.map((template) => (
                <MenuItem key={template.id} value={template.id}>
                  {template.title || template.categorie}
                </MenuItem>
              ))}
            </TextField>
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>Beskrivning</Typography>
            <RichTextEditor
              value={richDescription}
              onChange={setRichDescription}
              placeholder="Skriv kursbeskrivning här..."
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>Tid</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required id="start-date" label="Startdatum" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required id="start-time" label="Starttid" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required id="end-date" label="Slutdatum" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required id="end-time" label="Sluttid" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
              </Grid>
            </Grid>
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>Pris och platser</Typography>
            <TextField fullWidth required id="price" label="Pris (SEK)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} size="small" sx={{ mb: 2 }} />
            <TextField fullWidth required id="max-participants" label="Max antal deltagare" type="number" value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} size="small" sx={{ mb: 1 }} />
            <FormControlLabel
              control={<Switch checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} color="primary" />}
              label="Publicera kurs"
            />
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>Bild</Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <Select
                id="gallery-image"
                value={selectedGalleryImage}
                onChange={handleGalleryImageChange}
                onOpen={loadGalleryImages}
                displayEmpty
                size="small"
                disabled={loadingImages}
              >
                <MenuItem value="">Välj bild från galleriet</MenuItem>
                {loadingImages && <MenuItem disabled>Laddar bilder...</MenuItem>}
                {!loadingImages && galleryImages.length === 0 && <MenuItem disabled>Inga bilder hittades</MenuItem>}
                {galleryImages.map((image) => (
                  <MenuItem key={image} value={image}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box component="img" src={image} alt="" sx={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 0.5 }} />
                      <Box sx={{ fontSize: '0.8rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {image.split('/').pop()}
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} size="small">
                Byt bild
                <input type="file" accept="image/*" hidden onChange={handleImageChange} disabled={uploading} />
              </Button>
              {imagePreview && (
                <IconButton onClick={clearImage} color="error" disabled={uploading} aria-label="Ta bort bild">
                  <ClearIcon />
                </IconButton>
              )}
            </Box>
            {imagePreview && (
              <Box component="img" src={imagePreview} alt="Förhandsvisning" sx={{ width: 140, height: 105, objectFit: 'cover', borderRadius: 1, border: '1px solid #e6ece8' }} />
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Visas ovanför kursen. Max 5 MB.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          mt: 3,
          py: 1.5,
          px: 2,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1,
          bgcolor: 'rgba(247, 246, 243, 0.94)',
          borderTop: '1px solid #e6ece8',
          zIndex: 2,
        }}
      >
        <Button onClick={onCancel} color="inherit">Avbryt</Button>
        <Button type="submit" variant="contained" disabled={uploading}>
          {uploading ? 'Laddar upp...' : (course ? 'Spara ändringar' : 'Skapa kurs')}
        </Button>
      </Box>
    </Box>
  );
}
