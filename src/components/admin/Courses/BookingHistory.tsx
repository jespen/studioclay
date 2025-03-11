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
  Box,
  Typography,
  CircularProgress,
  Chip
} from '@mui/material';
import { BookingHistory } from '@/types/course';

interface BookingHistoryProps {
  courseId: string;
}

export default function BookingHistoryList({ courseId }: BookingHistoryProps) {
  const [history, setHistory] = useState<BookingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Primary color from globals.css
  const primaryColor = '#547264';

  useEffect(() => {
    fetchHistory();
  }, [courseId]);
  
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/courses/${courseId}/history`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch booking history');
      }
      
      const data = await response.json();
      setHistory(data.history || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching booking history:', err);
      setError(err instanceof Error ? err.message : 'Could not load booking history');
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

  if (loading) {
    return (
      <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2, mt: 4, p: 3, textAlign: 'center' }}>
        <CircularProgress size={24} sx={{ color: primaryColor }} />
        <Typography sx={{ mt: 1 }}>Laddar historik...</Typography>
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

  if (!history.length) {
    return (
      <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2, mt: 4 }}>
        <Box sx={{ bgcolor: primaryColor, color: 'white', px: 3, py: 2 }}>
          <Typography variant="h6" component="h2">
            Bokningshistorik
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          <Typography>Ingen bokningshistorik hittades för denna kurs.</Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2, mt: 4 }}>
      <Box sx={{ bgcolor: primaryColor, color: 'white', px: 3, py: 2 }}>
        <Typography variant="h6" component="h2">
          Bokningshistorik ({history.length})
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
              <TableCell>Ursprunglig bokning</TableCell>
              <TableCell>Avbokningsdatum</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((record) => (
                <TableRow key={record.id} hover>
                  <TableCell>{record.customer_name}</TableCell>
                  <TableCell>{record.customer_email}</TableCell>
                  <TableCell>{record.customer_phone || '-'}</TableCell>
                  <TableCell align="center">{record.number_of_participants}</TableCell>
                  <TableCell>
                    {new Date(record.original_booking_date).toLocaleDateString('sv-SE')}
                  </TableCell>
                  <TableCell>
                    {new Date(record.cancellation_date).toLocaleDateString('sv-SE')}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label="Avbokad"
                      color="error"
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={history.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Rader per sida:"
      />
    </Paper>
  );
} 