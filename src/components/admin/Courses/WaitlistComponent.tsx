import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Box,
  Typography,
  Link,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

interface WaitlistEntry {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  number_of_participants: number;
  message: string | null;
  created_at: string;
  course_id: string;
  // OPTION 2: New fields for combined waitlist
  source: 'waitlist' | 'booking'; // indicates source table
  booking_reference?: string | null; // only for entries from bookings table
}

interface WaitlistComponentProps {
  courseId: string;
  onWaitlistUpdate?: () => void;
  onAddToCoursePrefill?: (waitlistEntry: WaitlistEntry) => void;
  onRegisterRemoveFunction?: (removeFunction: (entryId: string) => Promise<void>) => void;
}

export default function WaitlistComponent({ courseId, onWaitlistUpdate, onAddToCoursePrefill, onRegisterRemoveFunction }: WaitlistComponentProps) {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<WaitlistEntry | null>(null);
  
  // Add to course dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [entryToAdd, setEntryToAdd] = useState<WaitlistEntry | null>(null);
  
  // Primary color from globals.css
  const primaryColor = '#547264';

  useEffect(() => {
    fetchWaitlist();
  }, [courseId]);
  
  // Public function to remove a waitlist entry (called from parent)
  const removeWaitlistEntry = useCallback(async (entryId: string) => {
    console.log('=== WAITLIST: Removing entry from parent ===');
    console.log('Entry ID to remove:', entryId);
    
    try {
      // Find the entry to determine which API to call
      const entryToRemove = waitlist.find(entry => entry.id === entryId);
      if (!entryToRemove) {
        throw new Error('Entry not found in current waitlist');
      }
      
      console.log('Entry source:', entryToRemove.source);
      
      // Choose the correct API endpoint based on source
      let apiUrl = '';
      if (entryToRemove.source === 'waitlist') {
        // Remove from waitlist table
        apiUrl = `/api/waitlist/${entryId}`;
      } else if (entryToRemove.source === 'booking') {
        // Remove from bookings table (this is a pending booking)
        apiUrl = `/api/bookings/${entryId}`;
      } else {
        throw new Error('Unknown entry source');
      }
      
      console.log('Making delete request to:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete waitlist entry');
      }
      
      // Remove the entry from the state
      setWaitlist(prev => prev.filter(entry => entry.id !== entryId));
      
      console.log('✅ Waitlist entry removed successfully');
      
      // Notify parent component if needed
      if (onWaitlistUpdate) onWaitlistUpdate();
      
    } catch (err) {
      console.error('Error removing waitlist entry:', err);
      throw err; // Re-throw so parent can handle the error
    }
  }, [waitlist]);

  // Register the remove function with parent - only when function reference changes
  useEffect(() => {
    if (onRegisterRemoveFunction) {
      onRegisterRemoveFunction(removeWaitlistEntry);
    }
  }, [onRegisterRemoveFunction, removeWaitlistEntry]);
  
  const fetchWaitlist = async () => {
    console.log('=== WAITLIST COMPONENT FETCH START ===');
    console.log('Fetching combined waitlist for courseId:', courseId);
    
    try {
      setLoading(true);
      const apiUrl = `/api/courses/${courseId}/waitlist`;
      console.log('Making request to:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        console.error('❌ Response not ok, trying to parse error data...');
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error data:', errorData);
        throw new Error(errorData.error || 'Failed to fetch waitlist');
      }
      
      console.log('✅ Response ok, parsing data...');
      const data = await response.json();
      console.log('✅ Parsed response data:', JSON.stringify(data, null, 2));
      
      const waitlistData = data.waitlist || [];
      console.log('✅ Combined waitlist data extracted:', waitlistData);
      console.log('✅ Number of combined waitlist entries:', waitlistData.length);
      
      // Log source breakdown if available
      if (data.sources) {
        console.log('✅ Sources breakdown:', data.sources);
      }
      
      setWaitlist(waitlistData);
      setError(null);
      console.log('✅ State updated successfully');
      console.log('=== WAITLIST COMPONENT FETCH SUCCESS ===');
    } catch (err) {
      console.error('❌ Error fetching waitlist:', err);
      console.error('❌ Error type:', typeof err);
      console.error('❌ Error message:', err instanceof Error ? err.message : 'Unknown error');
      setError(err instanceof Error ? err.message : 'Could not load waitlist');
      console.log('=== WAITLIST COMPONENT FETCH ERROR ===');
    } finally {
      setLoading(false);
      console.log('=== WAITLIST COMPONENT FETCH END ===');
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle opening the delete confirmation dialog
  const handleDeleteClick = (entry: WaitlistEntry) => {
    setEntryToDelete(entry);
    setDeleteDialogOpen(true);
  };

  // Handle confirming the deletion
  const handleDeleteConfirm = async () => {
    if (!entryToDelete) return;
    
    try {
      // Choose the correct API endpoint based on source
      let apiUrl = '';
      if (entryToDelete.source === 'waitlist') {
        apiUrl = `/api/waitlist/${entryToDelete.id}`;
      } else if (entryToDelete.source === 'booking') {
        apiUrl = `/api/bookings/${entryToDelete.id}`;
      } else {
        throw new Error('Unknown entry source');
      }
      
      console.log('Deleting entry via:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete waitlist entry');
      }
      
      // Remove the entry from the state
      setWaitlist(waitlist.filter(entry => entry.id !== entryToDelete.id));
      
      // Close the dialog
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
      
      // Show success message
      const sourceText = entryToDelete.source === 'booking' ? 'bokning' : 'väntelista';
      alert(`${entryToDelete.customer_name} har tagits bort från ${sourceText}`);
      
      // Notify parent component if needed
      if (onWaitlistUpdate) onWaitlistUpdate();
    } catch (err) {
      console.error('Error deleting waitlist entry:', err);
      alert(`Kunde inte ta bort från väntelistan: ${err instanceof Error ? err.message : 'Okänt fel'}`);
    }
  };

  // Handle opening the add to course dialog
  const handleAddClick = (entry: WaitlistEntry) => {
    setEntryToAdd(entry);
    setAddDialogOpen(true);
  };

  // Helper function to get source chip
  const getSourceChip = (source: 'waitlist' | 'booking') => {
    if (source === 'booking') {
      return (
        <Chip 
          label="Flyttad" 
          size="small" 
          sx={{ 
            backgroundColor: '#fff3cd', 
            color: '#856404',
            fontSize: '0.7rem',
            height: '20px'
          }} 
        />
      );
    } else {
      return (
        <Chip 
          label="Väntelista" 
          size="small" 
          sx={{ 
            backgroundColor: '#d1ecf1', 
            color: '#0c5460',
            fontSize: '0.7rem',
            height: '20px'
          }} 
        />
      );
    }
  };

  // Handle confirming adding to course
  const handleAddConfirm = async () => {
    if (!entryToAdd) return;
    
    console.log('=== WAITLIST: Sending data to parent for form prefill ===');
    console.log('Entry to add:', entryToAdd);
    
    // Close the dialog
    setAddDialogOpen(false);
    
    // Send the waitlist entry to parent to prefill the add user form
    if (onAddToCoursePrefill) {
      onAddToCoursePrefill(entryToAdd);
    } else {
      console.warn('onAddToCoursePrefill callback not provided');
      alert('Funktionen är inte tillgänglig. Kontakta utvecklaren.');
    }
    
    setEntryToAdd(null);
  };

  if (loading) {
    return (
      <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2, mt: 4, p: 3, textAlign: 'center' }}>
        <CircularProgress size={24} sx={{ color: primaryColor }} />
        <Typography sx={{ mt: 1 }}>Laddar väntelista...</Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2, mt: 4, p: 3 }}>
        <Typography color="error">Error: {error}</Typography>
      </Paper>
    );
  }

  if (!waitlist.length) {
    return (
      <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2, mt: 4 }}>
        <Box sx={{ bgcolor: primaryColor, color: 'white', px: 3, py: 2 }}>
          <Typography variant="h6" component="h2">
            Väntelista
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          <Typography>Inga personer i väntelistan för denna kurs.</Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <>
      <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2, mt: 4 }}>
        <Box sx={{ bgcolor: primaryColor, color: 'white', px: 3, py: 2 }}>
          <Typography variant="h6" component="h2">
            Väntelista ({waitlist.length})
          </Typography>
        </Box>

        <TableContainer>
          <Table sx={{ minWidth: 650 }} size="small">
            <TableHead>
              <TableRow>
                <TableCell>Namn</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Telefon</TableCell>
                <TableCell align="center">Antal</TableCell>
                <TableCell>Typ</TableCell>
                <TableCell>Datum</TableCell>
                <TableCell>Meddelande</TableCell>
                <TableCell align="right">Åtgärder</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {waitlist
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((entry) => (
                  <TableRow key={entry.id} hover>
                    <TableCell>{entry.customer_name}</TableCell>
                    <TableCell>{entry.customer_email}</TableCell>
                    <TableCell>
                      {entry.customer_phone ? (
                        <Link href={`tel:${entry.customer_phone}`} underline="hover">
                          {entry.customer_phone}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell align="center">{entry.number_of_participants}</TableCell>
                    <TableCell>
                      {getSourceChip(entry.source)}
                      {entry.booking_reference && (
                        <Box component="span" sx={{ ml: 1, fontSize: '0.7rem', color: 'text.secondary' }}>
                          ({entry.booking_reference})
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(entry.created_at).toLocaleDateString('sv-SE')}
                    </TableCell>
                    <TableCell>
                      {entry.message ? entry.message.substring(0, 30) + (entry.message.length > 30 ? '...' : '') : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Tooltip title="Lägg till i kursen">
                          <IconButton 
                            size="small" 
                            onClick={() => handleAddClick(entry)}
                            sx={{ color: 'success.main' }}
                          >
                            <PersonAddIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Ta bort från väntelistan">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteClick(entry)}
                            sx={{ color: '#d32f2f' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={waitlist.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Rader per sida:"
        />
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Ta bort från väntelistan</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Är du säker på att du vill ta bort {entryToDelete?.customer_name} från väntelistan? 
            Denna åtgärd kan inte ångras.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)} 
            sx={{ color: 'text.secondary' }}
          >
            Avbryt
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            variant="contained" 
            color="error"
          >
            Ta bort
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add to Course Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
      >
        <DialogTitle>Lägg till i kursen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Vill du lägga till {entryToAdd?.customer_name} i kursen? 
            Detta kommer att skapa en ny bokning och ta bort personen från väntelistan.
            Bokningsstatus kommer att sättas till "Bekräftad".
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setAddDialogOpen(false)} 
            sx={{ color: 'text.secondary' }}
          >
            Avbryt
          </Button>
          <Button 
            onClick={handleAddConfirm} 
            variant="contained" 
            sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
          >
            Lägg till i kursen
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 