import React from 'react';
import { 
  TextField, 
  TextFieldProps, 
  FormControl, 
  FormHelperText, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormControlLabel, 
  Checkbox, 
  SelectProps,
  FormControlProps
} from '@mui/material';

interface FormFieldProps extends Omit<TextFieldProps, 'error'> {
  error?: string;
}

interface SelectFieldProps {
  options: { value: string; label: string }[];
  label: string;
  error?: string;
  margin?: FormControlProps['margin'];
  fullWidth?: boolean;
  variant?: 'outlined' | 'standard' | 'filled';
  name?: string;
  value?: unknown;
  onChange?: SelectProps['onChange'];
  disabled?: boolean;
  required?: boolean;
}

interface CheckboxFieldProps {
  name: string;
  label: string;
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}

/**
 * Standard text input field with consistent styling
 */
export const FormTextField: React.FC<FormFieldProps> = ({ 
  error, 
  helperText,
  fullWidth = true,
  variant = "outlined",
  margin = "normal",
  ...props 
}) => {
  return (
    <TextField
      fullWidth={fullWidth}
      variant={variant}
      margin={margin}
      error={!!error}
      helperText={error || helperText}
      sx={{
        '& .MuiOutlinedInput-root': {
          '&.Mui-focused fieldset': {
            borderColor: 'var(--primary)',
          },
          '&:hover fieldset': {
            borderColor: 'var(--primary-light)',
          }
        },
        '& .MuiInputLabel-root': {
          '&.Mui-focused': {
            color: 'var(--primary)',
          },
        },
        '& .MuiInputBase-input': {
          '&.Mui-focused': {
            borderColor: 'var(--primary)',
          }
        },
        '& .MuiCheckbox-root': {
          '&.Mui-checked': {
            color: 'var(--primary)',
          }
        },
        ...props.sx
      }}
      {...props}
    />
  );
};

/**
 * Standard select field with consistent styling
 */
export const FormSelectField: React.FC<SelectFieldProps> = ({
  options,
  label,
  error,
  fullWidth = true,
  variant = "outlined",
  margin = "normal",
  ...props
}) => {
  return (
    <FormControl 
      fullWidth={fullWidth} 
      variant={variant} 
      error={!!error} 
      margin={margin}
      sx={{
        '& .MuiOutlinedInput-root': {
          '&.Mui-focused fieldset': {
            borderColor: 'var(--primary)',
          },
          '&:hover fieldset': {
            borderColor: 'var(--primary-light)',
          }
        },
        '& .MuiInputLabel-root': {
          '&.Mui-focused': {
            color: 'var(--primary)',
          },
        },
      }}
    >
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        {...props}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
      {error && <FormHelperText>{error}</FormHelperText>}
    </FormControl>
  );
};

/**
 * Standard checkbox field with consistent styling
 */
export const FormCheckboxField: React.FC<CheckboxFieldProps> = ({
  name,
  label,
  checked,
  onChange,
  error
}) => {
  return (
    <FormControl error={!!error}>
      <FormControlLabel
        control={
          <Checkbox
            name={name}
            checked={checked}
            onChange={onChange}
            sx={{
              '&.Mui-checked': {
                color: 'var(--primary)',
              },
            }}
          />
        }
        label={label}
      />
      {error && <FormHelperText>{error}</FormHelperText>}
    </FormControl>
  );
}; 