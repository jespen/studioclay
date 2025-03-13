import Contact from '@/components/Contact';
import { Button } from '@mui/material';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function ContactPage() {
  return (
    <div className="min-h-screen pt-[120px] pb-16">
      <div className="container-custom mb-8">
        <Button
          component={Link}
          href="/"
          startIcon={<ArrowBackIcon />}
          sx={{ 
            color: '#547264',
            '&:hover': {
              bgcolor: 'rgba(84, 114, 100, 0.08)'
            }
          }}
        >
          Tillbaka till startsidan
        </Button>
      </div>
      <Contact />
    </div>
  );
} 