'use client';

import { createTheme } from '@mui/material/styles';

const sage = {
  main: '#547264',
  light: '#7A9387',
  dark: '#3D544A',
  contrastText: '#ffffff',
};

export const adminTheme = createTheme({
  palette: {
    primary: sage,
    secondary: {
      main: '#698577',
      light: '#9CB3A8',
      dark: '#415A50',
      contrastText: '#ffffff',
    },
    error: {
      main: '#b4534a',
      light: '#e8d2ce',
      dark: '#8f3f38',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f7f6f3',
      paper: '#ffffff',
    },
    text: {
      primary: '#1f2937',
      secondary: '#4b5563',
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: { fontFamily: 'Georgia, serif', fontWeight: 700 },
    h2: { fontFamily: 'Georgia, serif', fontWeight: 700 },
    h3: { fontFamily: 'Georgia, serif', fontWeight: 700 },
    h4: { fontFamily: 'Georgia, serif', fontWeight: 700 },
    h5: { fontFamily: 'Georgia, serif', fontWeight: 700 },
    h6: { fontFamily: 'Georgia, serif', fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: 'none',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 14 },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontFamily: 'Georgia, serif', paddingBottom: 8 },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: { padding: '12px 24px 20px' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 12 },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#eef3f0',
            color: '#3D544A',
            fontWeight: 700,
            fontSize: '0.75rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: '#f4f7f5' },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: '#e6ece8' },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: sage.main, height: 3 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
  },
});
