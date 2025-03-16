import React from 'react';
import { Button, ButtonProps } from '@mui/material';

interface StyledButtonProps extends ButtonProps {
  secondary?: boolean;
  fullWidth?: boolean;
}

// Button component that uses the global theme's colors
const StyledButton: React.FC<StyledButtonProps> = ({ 
  children, 
  secondary = false,
  fullWidth = false,
  ...props 
}) => {
  return (
    <Button
      {...props}
      sx={{
        backgroundColor: secondary ? 'transparent' : 'var(--primary)',
        color: secondary ? 'var(--primary)' : 'white',
        border: secondary ? '1px solid var(--primary)' : 'none',
        borderRadius: '4px',
        padding: '10px 24px',
        textTransform: 'none',
        fontWeight: 600,
        '&:hover': {
          backgroundColor: secondary ? 'rgba(84, 114, 100, 0.1)' : 'var(--primary-dark)',
          border: secondary ? '1px solid var(--primary-dark)' : 'none',
        },
        '&:disabled': {
          backgroundColor: secondary ? 'transparent' : 'rgba(84, 114, 100, 0.5)',
          color: secondary ? 'rgba(84, 114, 100, 0.5)' : 'rgba(255, 255, 255, 0.7)',
          border: secondary ? '1px solid rgba(84, 114, 100, 0.3)' : 'none',
        },
        width: fullWidth ? '100%' : 'auto',
        ...props.sx
      }}
    >
      {children}
    </Button>
  );
};

export default StyledButton; 