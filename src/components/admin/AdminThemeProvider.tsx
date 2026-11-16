'use client';

import { ThemeProvider } from '@mui/material/styles';
import { adminTheme } from '@/theme/adminTheme';

export default function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={adminTheme}>{children}</ThemeProvider>;
}
