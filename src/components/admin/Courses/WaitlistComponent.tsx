import React, { useState, useEffect } from 'react';
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
  Button
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
}

interface WaitlistComponentProps {
  courseId: string;
  onWaitlistUpdate?: () => void;
}

export default function WaitlistComponent({ courseId, onWaitlistUpdate }: WaitlistComponentProps) {
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
  
  const fetchWaitlist = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/courses/${courseId}/waitlist`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch waitlist');
      }
      
      const data = await response.json();
      setWaitlist(data.waitlist || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching waitlist:', err);
      setError(err instanceof Error ? err.message : 'Could not load waitlist');
    } finally {
      setLoading(false);
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
      const response = await fetch(`/api/waitlist/${entryToDelete.id}`, {
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
      alert('Väntelistan har tagits bort');
      
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

  // Handle confirming adding to course
  const handleAddConfirm = async () => {
    if (!entryToAdd) return;
    
    try {
      // Create a new booking from the waitlist entry
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          course_id: entryToAdd.course_id,
          customer_name: entryToAdd.customer_name,
          customer_email: entryToAdd.customer_email,
          customer_phone: entryToAdd.customer_phone,
          number_of_participants: entryToAdd.number_of_participants,
          message: entryToAdd.message,
          status: 'confirmed', // Set status to confirmed
          payment_status: 'unpaid'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to add to course');
      }
      
      // Delete the waitlist entry
      await fetch(`/api/waitlist/${entryToAdd.id}`, {
        method: 'DELETE',
      });
      
      // Remove the entry from the state
      setWaitlist(waitlist.filter(entry => entry.id !== entryToAdd.id));
      
      // Close the dialog
      setAddDialogOpen(false);
      setEntryToAdd(null);
      
      // Show success message
      alert('Personen har lagts till i kursen');
      
      // Notify parent component if needed
      if (onWaitlistUpdate) onWaitlistUpdate();
    } catch (err) {
      console.error('Error adding to course:', err);
      alert(`Kunde inte lägga till i kursen: ${err instanceof Error ? err.message : 'Okänt fel'}`);
    }
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