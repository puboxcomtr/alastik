'use client';
import { createTheme } from '@mui/material/styles';
import { Placeholder } from 'react-bootstrap';

const colors = {
  primary: '#f2223b',   
  secondary: '#f2223b', 
  success: '#4ab368',   
  danger: '#d32f2f',   
  warning: '#ed6c02',   
  info: '#0288d1',     
  gray100: '#f9f9f9',
  gray200: '#f0f0f0',
  gray300: '#e0e0e0',
  gray400: '#bdbdbd',
  gray500: '#9e9e9e',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',
};

const theme = createTheme({
  palette: {
    primary: {
      main: colors.primary,
    },
    secondary: {
      main: colors.secondary,
    },
    background: {
      default: colors.gray100,
      paper: '#fff',
    },
    text: {
      primary: colors.gray900,
      secondary: colors.gray600,
    },
  },

  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
    button: {
      textTransform: 'none', // BUTONLAR CAPS LOCK olmasın
      fontWeight: 500,
    },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: colors.gray100,
        },
      },
    },

    // TextField & Input
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-input::placeholder': {
            color: colors.gray600,
            opacity: 1,
          },
        },
      },
    },

    MuiInputBase: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: 14,
        },
        input: {
          '::placeholder': {
            fontSize: '12px'
          },
          padding: '10px 14px',
          '&:focus': {
            boxShadow: 'none', 
          },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.gray600,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.gray600,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.gray600,
            borderWidth: 1,
            boxShadow: 'none', 
          },
        },
      },
    },

    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:focus': {
            boxShadow: 'none',
          },
        },
        icon: {
          color: colors.primary,
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          '&:focus': {
            boxShadow: 'none',
          },
        },
      },
    },
  },
});

export default theme;
