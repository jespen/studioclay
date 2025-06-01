'use client';

import { useState, useEffect, useCallback } from 'react';
import { Course, Category, Instructor, CourseInstance, CourseTemplate } from '../../../../types/course';
import { TextField, Button, Box, Paper, Typography, FormControlLabel, Switch, Grid, MenuItem, IconButton, Select, FormControl, InputLabel, SelectChangeEvent } from '@mui/material';
import RichTextEditor from '../../../../components/common/RichTextEditor';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ClearIcon from '@mui/icons-material/Clear';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import { fetchWithCache, fetchTemplatesWithCache } from '@/utils/apiCache';

// Initialize Supabase client with public key for storage operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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
  
  // Image state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  
  // Gallery images
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string>('');
  const [loadingImages, setLoadingImages] = useState(false);
  
  // Primary color from globals.css
  const primaryColor = '#547264';
  
  // Memoize fetch functions to prevent unnecessary renders
  const fetchImages = useCallback(async () => {
    try {
      setLoadingImages(true);
      const data = await fetchWithCache<{images: string[]}>(
        '/api/images',
        {},
        {
          useCache: true,
          expiry: 10 * 60 * 1000, // Cache images for 10 minutes
          cacheKey: 'gallery-images'
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
      setLoading(true);
      console.log('CourseForm: Fetching templates...');
      const data = await fetchTemplatesWithCache({
        useCache: true,
        expiry: 5 * 60 * 1000, // Cache templates for 5 minutes
        forceRefresh: false
      });
      
      console.log('CourseForm: Templates API response:', data);
      
      if (Array.isArray(data.templates)) {
        console.log(`CourseForm: Found ${data.templates.length} templates`);
        setTemplates(data.templates);
      } else {
        console.error('CourseForm: Templates data is not an array:', data.templates);
        setError('Invalid templates data format');
      }
    } catch (error) {
      console.error('CourseForm: Error fetching templates:', error);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Fetch images when the component mounts
  useEffect(() => {
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
    }
  }, [course]);
  
  // Update selected image when galleryImages loads
  useEffect(() => {
    // If we already have a selected image URL but it wasn't in the gallery before
    if (selectedGalleryImage && galleryImages.length > 0) {
      // Check if the selected image exists in the gallery now
      const imageExists = galleryImages.includes(selectedGalleryImage);
      if (!imageExists) {
        // If the image exists in the file system but wasn't in our hardcoded list before
        const imageFromSamePath = galleryImages.find(img => 
          img.startsWith(selectedGalleryImage.split('/').slice(0, -1).join('/'))
        );
        if (imageFromSamePath) {
          setSelectedGalleryImage(imageFromSamePath);
          setImagePreview(imageFromSamePath);
        }
      }
    }
  }, [galleryImages, selectedGalleryImage]);
  
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
      
      // Generate a unique filename
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `course-images/${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('course-assets')
        .upload(fileName, selectedImage, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('Error uploading image:', error);
        alert(`Kunde inte ladda upp bilden: ${error.message}`);
        return null;
      }
      
      // Get the public URL for the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('course-assets')
        .getPublicUrl(fileName);
      
      return publicUrl;
    } catch (err) {
      console.error('Unexpected error during upload:', err);
      alert('Ett fel uppstod vid uppladdning av bilden');
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
      title: selectedTemplate.title || selectedTemplate.categorie || '',
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
  
  if (loading) {
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
              // Set image from template if available
              if (selectedTemplate.image_url) {
                setImagePreview(selectedTemplate.image_url);
              }
            }
          }}
          variant="outlined"
          size="small"
          sx={inputStyles}
        >
          <MenuItem value="">Välj kursmall</MenuItem>
          {/* Log template rendering outside JSX to avoid 'void' errors */}
          {(() => { console.log('CourseForm: Rendering template dropdown with templates:', templates); return null; })()}
          {templates.map((template) => (
            <MenuItem key={template.id} value={template.id}>
              {template.title || template.categorie}
            </MenuItem>
          ))}
        </TextField>
        
        {/* Course Image Selection */}
        <Box sx={{ mb: 3, mt: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Kursbild</Typography>
          
          {/* Gallery Image Selection */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            {/* <InputLabel id="gallery-image-label">Välj bild från galleri</InputLabel> */}
            <Select
              labelId="gallery-image-label"
              id="gallery-image"
              value={selectedGalleryImage}
              onChange={handleGalleryImageChange}
              label="Välj bild från galleri"
              displayEmpty
              size="small"
              sx={inputStyles}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 400,
                    overflow: 'auto'
                  }
                },
                anchorOrigin: {
                  vertical: 'bottom',
                  horizontal: 'left'
                },
                transformOrigin: {
                  vertical: 'top',
                  horizontal: 'left'
                }
              }}
              disabled={loadingImages}
            >
              <MenuItem value="">Ingen galleribild</MenuItem>
              
              {loadingImages && (
                <MenuItem disabled>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                    Laddar bilder...
                  </Box>
                </MenuItem>
              )}
              
              {!loadingImages && galleryImages.length === 0 && (
                <MenuItem disabled>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                    Inga bilder hittades
                  </Box>
                </MenuItem>
              )}
              
              {galleryImages.map((image) => (
                <MenuItem key={image} value={image} sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '10px',
                  paddingY: '8px'
                }}>
                  <Box 
                    component="img" 
                    src={image} 
                    alt="Gallery thumbnail" 
                    sx={{ 
                      width: '60px', 
                      height: '45px', 
                      objectFit: 'cover',
                      borderRadius: '4px' 
                    }} 
                  />
                  <Box sx={{ fontSize: '0.8rem', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {image.split('/').pop()}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Eller ladda upp en ny bild:
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              sx={{ 
                borderColor: primaryColor,
                color: primaryColor,
                '&:hover': { borderColor: primaryColor, backgroundColor: 'rgba(84, 114, 100, 0.04)' }
              }}
            >
              Välj bild
              <input 
                type="file" 
                accept="image/*" 
                hidden 
                onChange={handleImageChange} 
                disabled={uploading}
              />
            </Button>
            
            {imagePreview && (
              <IconButton 
                onClick={clearImage} 
                color="error" 
                sx={{ ml: 1 }}
                disabled={uploading}
              >
                <ClearIcon />
              </IconButton>
            )}
          </Box>
          
          {/* Image Preview */}
          {imagePreview && (
            <Box sx={{ mt: 2, mb: 2, position: 'relative' }}>
              <Box 
                component="img" 
                src={imagePreview} 
                alt="Course preview" 
                sx={{ 
                  maxWidth: '100%', 
                  maxHeight: '200px', 
                  borderRadius: 1,
                  border: '1px solid #e0e0e0' 
                }} 
              />
              
              {uploading && (
                <Box 
                  sx={{ 
                    position: 'absolute', 
                    bottom: 0, 
                    left: 0, 
                    width: `${uploadProgress}%`, 
                    height: '4px', 
                    bgcolor: primaryColor,
                    transition: 'width 0.3s ease'
                  }} 
                />
              )}
            </Box>
          )}
          
          <Typography variant="caption" color="text.secondary">
            Bilden kommer att visas ovanför kursinformationen. Max storlek: 5MB.
          </Typography>
        </Box>
        
        {/* Rich Description */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Beskrivning</Typography>
          <RichTextEditor
            value={richDescription}
            onChange={setRichDescription}
            placeholder="Skriv kursbeskrivning här..."
          />
        </Box>
        
        {/* Time and Date */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              id="start-date"
              name="start-date"
              label="Startdatum"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              variant="outlined"
              size="small"
              sx={inputStyles}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              id="start-time"
              name="start-time"
              label="Starttid"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              variant="outlined"
              size="small"
              sx={inputStyles}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              id="end-date"
              name="end-date"
              label="Slutdatum"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              variant="outlined"
              size="small"
              sx={inputStyles}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              id="end-time"
              name="end-time"
              label="Sluttid"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              variant="outlined"
              size="small"
              sx={inputStyles}
            />
          </Grid>
        </Grid>
        
        {/* Price and Max participants */}
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
              id="max-participants"
              name="max-participants"
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
        
        {/* Published status */}
        <FormControlLabel
          control={
            <Switch
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              color="primary"
              sx={{ 
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: primaryColor
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: primaryColor
                }
              }}
            />
          }
          label="Publicera kurs"
          sx={{ mb: 3 }}
        />
        
        {/* Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button 
            onClick={onCancel} 
            sx={{ 
              mr: 2,
              color: 'text.secondary',
              '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
            }}
          >
            Avbryt
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            sx={{ 
              bgcolor: primaryColor,
              '&:hover': { bgcolor: '#3e5349' }
            }}
            disabled={uploading}
          >
            {uploading ? 'Laddar upp...' : (course ? 'Spara ändringar' : 'Skapa kurs')}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
} 