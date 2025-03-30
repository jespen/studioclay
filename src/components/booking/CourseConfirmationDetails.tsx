import React from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import PeopleIcon from '@mui/icons-material/People';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';

interface CourseConfirmationDetailsProps {
  courseDetails: any;
  userInfo: any;
}

const CourseConfirmationDetails: React.FC<CourseConfirmationDetailsProps> = ({ 
  courseDetails, 
  userInfo 
}) => {
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('sv-SE', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Grid container spacing={4}>
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" gutterBottom>
          Kursinformation
        </Typography>
        
        {courseDetails && (
          <List dense>
            <ListItem disableGutters>
              <ListItemText 
                primary={courseDetails.title} 
                primaryTypographyProps={{ fontWeight: 'bold' }} 
              />
            </ListItem>
            
            {courseDetails.start_date && (
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <EventIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={`Datum: ${formatDate(courseDetails.start_date)}`} />
              </ListItem>
            )}
            
            {courseDetails.duration_minutes && (
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <AccessTimeIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={`Längd: ${courseDetails.duration_minutes} minuter`} />
              </ListItem>
            )}
            
            {courseDetails.location && (
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <LocationOnIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={`Plats: ${courseDetails.location}`} />
              </ListItem>
            )}
          </List>
        )}
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" gutterBottom>
          Personuppgifter
        </Typography>
        
        {userInfo && (
          <List dense>
            <ListItem disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={`${userInfo.firstName} ${userInfo.lastName}`} />
            </ListItem>
            
            <ListItem disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <EmailIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={userInfo.email} />
            </ListItem>
            
            <ListItem disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <PhoneIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={userInfo.phone} />
            </ListItem>
            
            <ListItem disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <PeopleIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={`Antal deltagare: ${userInfo.numberOfParticipants || 1}`} />
            </ListItem>
            
            {userInfo.specialRequirements && (
              <ListItem disableGutters>
                <ListItemText 
                  primary="Särskilda önskemål:" 
                  secondary={userInfo.specialRequirements} 
                />
              </ListItem>
            )}
          </List>
        )}
      </Grid>
    </Grid>
  );
};

export default CourseConfirmationDetails; 