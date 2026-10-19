'use client';
import { createTheme } from '@mui/material/styles';

const textPrimary = 'rgba(76, 78, 100, 0.87)';
const textSecondary = 'rgba(76, 78, 100, 0.60)';
const textDisabled = 'rgba(76, 78, 100, 0.38)';
const divider = 'rgba(76, 78, 100, 0.12)';

export const plasiyerTheme = createTheme({
    palette: {
        primary: { main: '#e6cf17', light: '#fbf6d4', dark: '#d6c700', contrastText: '#000000' },
        secondary: { main: '#6D788D', contrastText: '#FFFFFF' },
        success: { main: '#28C76F', contrastText: '#FFFFFF' },
        warning: { main: '#FF9F43', contrastText: '#FFFFFF' },
        error: { main: '#FF4D49', contrastText: '#FFFFFF' },
        info: { main: '#26C6F9', contrastText: '#FFFFFF' },
        background: { default: '#F7F7F9', paper: '#FFFFFF' },
        text: { primary: textPrimary, secondary: textSecondary, disabled: textDisabled },
        divider,
    },
    shape: { borderRadius: 8 },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: 14,
        button: { textTransform: 'none', fontWeight: 500 },
        h6: { fontWeight: 600, color: textPrimary },
        h5: { fontWeight: 600, color: textPrimary },
        h4: { fontWeight: 700, color: textPrimary },
        subtitle1: { fontWeight: 600, color: textPrimary },
        subtitle2: { fontWeight: 600, color: textPrimary },
    },
    components: {
        MuiCard: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    border: `1px solid ${divider}`,
                    boxShadow: '0 2px 10px 0 rgba(76, 78, 100, 0.08)',
                    backgroundImage: 'none',
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: { borderBottom: `1px solid ${divider}`, paddingTop: 12, paddingBottom: 12 },
                head: {
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '0.17px',
                    fontWeight: 600,
                    color: textSecondary,
                    whiteSpace: 'nowrap',
                },
            },
        },
        MuiChip: {
            styleOverrides: { root: { fontWeight: 600, borderRadius: 6 } },
        },
        MuiToggleButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    padding: '5px 14px',
                    color: textSecondary,
                    borderColor: divider,
                    '&.Mui-selected': {
                        backgroundColor: '#e6cf17',
                        color: '#000000',
                        '&:hover': { backgroundColor: '#d6c700' },
                    },
                },
            },
        },
        MuiPaginationItem: {
            styleOverrides: { root: { fontWeight: 600 } },
        },
    },
});
