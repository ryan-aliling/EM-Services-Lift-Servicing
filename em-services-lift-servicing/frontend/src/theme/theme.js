import { createTheme } from '@mui/material/styles';

// Shared brand tokens across light/dark — a blue/teal pair that reads as
// "facilities/ops tooling" rather than a generic MUI default.
const BRAND = {
  blue: { main: '#0B63CE', light: '#4C8DFF', dark: '#08469A' },
  teal: { main: '#0E9384', light: '#3FBCAB', dark: '#0B6E63' },
};

// getDesignTokens returns a palette (plus shared typography/shape/component
// overrides) for the given mode. createAppTheme feeds this into createTheme.
function getDesignTokens(mode) {
  const isLight = mode === 'light';

  return {
    palette: {
      mode,
      primary: BRAND.blue,
      secondary: BRAND.teal,
      background: isLight
        ? { default: '#F5F7FA', paper: '#FFFFFF' }
        : { default: '#0B1220', paper: '#121B2E' },
      text: isLight
        ? { primary: '#101828', secondary: '#475467' }
        : { primary: '#E5E9F0', secondary: '#94A3B8' },
      divider: isLight ? '#E3E8EF' : '#233047',
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isLight ? '#FFFFFF' : '#121B2E',
            color: isLight ? '#101828' : '#E5E9F0',
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: { borderRadius: 12 },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600 },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
    },
  };
}

export function createAppTheme(mode) {
  return createTheme(getDesignTokens(mode));
}
