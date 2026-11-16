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
        borderRadius: '8px',
        padding: '12px 24px',
        textTransform: 'none',
        fontWeight: 600,
        transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          backgroundColor: secondary ? 'rgba(84, 114, 100, 0.1)' : 'var(--primary-dark)',
          border: secondary ? '1px solid var(--primary-dark)' : 'none',
          boxShadow: secondary ? 'none' : '0 4px 12px rgba(61, 84, 74, 0.25)',
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