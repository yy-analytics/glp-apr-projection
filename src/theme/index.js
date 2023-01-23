import { createTheme } from '@mui/material';

export const theme = createTheme({
    palette: {
        type: 'dark',
        primary: {
            main: '#0eab4d',
        },
        secondary: {
            main: '#553f77',
        },
        background: {
            default: '#121614',
            paper: '#1e2220',
            lightPaper: '#303030',
        },
        text: {
            primary: '#f0f0f0',
            disabled: '#787878',
        },
        warning: {
            main: '#ffbe40',
        },
        success: {
            main: '#4caf50',
        },
        info: {
            main: '#1a77cd',
        },
        avax: {
            main: '#E84142',
        },
        action: {
            disabled: '#787878',
        }
    },
    typography: {
        fontFamily: 'Rubik,BlinkMacSystemFont,-apple-system,Segoe UI,Roboto,Oxygen,Ubuntu,Cantarell,Fira Sans,Droid Sans,Helvetica Neue,Helvetica,Arial,sans-serif',
    },
});