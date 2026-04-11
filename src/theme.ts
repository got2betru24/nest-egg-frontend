// =============================================================================
// NestEgg - src/theme.ts
// MUI v6 dark theme aligned with NestEgg design tokens.
// =============================================================================

import { createTheme } from '@mui/material/styles'

export const nestEggTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#2dd4aa',
      light: '#34e8bc',
      dark: '#1fb890',
      contrastText: '#0f1117',
    },
    secondary: {
      main: '#60a5fa',
      contrastText: '#0f1117',
    },
    error: {
      main: '#f87171',
    },
    warning: {
      main: '#f59e0b',
    },
    info: {
      main: '#60a5fa',
    },
    success: {
      main: '#2dd4aa',
    },
    background: {
      default: '#0f1117',
      paper: '#161b27',
    },
    text: {
      primary: '#f0ede8',
      secondary: '#9aa0b4',
      disabled: '#5c6480',
    },
    divider: 'rgba(255,255,255,0.08)',
  },

  typography: {
    fontFamily: "'DM Sans', system-ui, sans-serif",
    h1: {
      fontFamily: "'DM Serif Display', Georgia, serif",
      fontWeight: 400,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontFamily: "'DM Serif Display', Georgia, serif",
      fontWeight: 400,
      letterSpacing: '-0.02em',
    },
    h3: {
      fontFamily: "'DM Serif Display', Georgia, serif",
      fontWeight: 400,
      letterSpacing: '-0.02em',
    },
    h4: {
      fontFamily: "'DM Sans', system-ui, sans-serif",
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontFamily: "'DM Sans', system-ui, sans-serif",
      fontWeight: 600,
    },
    h6: {
      fontFamily: "'DM Sans', system-ui, sans-serif",
      fontWeight: 600,
    },
    body1: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.8125rem',
      lineHeight: 1.5,
      color: '#9aa0b4',
    },
    caption: {
      fontSize: '0.75rem',
      color: '#5c6480',
    },
    overline: {
      fontSize: '0.6875rem',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: '#5c6480',
    },
  },

  shape: {
    borderRadius: 8,
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0f1117',
          scrollbarWidth: 'thin',
          scrollbarColor: '#252d42 transparent',
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#161b27',
          border: '1px solid rgba(255,255,255,0.06)',
        },
        elevation2: {
          backgroundColor: '#1e2538',
        },
        elevation3: {
          backgroundColor: '#252d42',
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#161b27',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          letterSpacing: '0.01em',
          borderRadius: 6,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        outlined: {
          borderColor: 'rgba(255,255,255,0.12)',
          '&:hover': {
            borderColor: '#2dd4aa',
            backgroundColor: 'rgba(45,212,170,0.06)',
          },
        },
      },
    },

    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#1e2538',
            '& fieldset': {
              borderColor: 'rgba(255,255,255,0.10)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255,255,255,0.20)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#2dd4aa',
            },
          },
        },
      },
    },

    MuiSelect: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          backgroundColor: '#1e2538',
        },
      },
    },

    MuiSlider: {
      styleOverrides: {
        root: {
          color: '#2dd4aa',
        },
        track: {
          height: 3,
        },
        rail: {
          height: 3,
          backgroundColor: 'rgba(255,255,255,0.10)',
        },
        thumb: {
          width: 14,
          height: 14,
          '&:hover, &.Mui-focusVisible': {
            boxShadow: '0 0 0 6px rgba(45,212,170,0.16)',
          },
        },
        mark: {
          backgroundColor: 'rgba(255,255,255,0.20)',
          width: 2,
          height: 2,
          borderRadius: '50%',
        },
        markLabel: {
          fontSize: '0.6875rem',
          color: '#5c6480',
        },
      },
    },

    MuiSwitch: {
      styleOverrides: {
        root: {
          '& .MuiSwitch-switchBase.Mui-checked': {
            color: '#2dd4aa',
          },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
            backgroundColor: '#2dd4aa',
          },
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 400,
          fontSize: '0.8125rem',
          color: '#9aa0b4',
          minHeight: 40,
          '&.Mui-selected': {
            color: '#f0ede8',
            fontWeight: 500,
          },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#2dd4aa',
          height: 2,
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: '0.75rem',
          height: 24,
          borderRadius: 4,
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#252d42',
          border: '1px solid rgba(255,255,255,0.10)',
          fontSize: '0.75rem',
          fontFamily: "'DM Sans', system-ui, sans-serif",
          padding: '6px 10px',
          borderRadius: 6,
        },
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(255,255,255,0.06)',
        },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.05)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(45,212,170,0.10)',
            '&:hover': {
              backgroundColor: 'rgba(45,212,170,0.14)',
            },
          },
        },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255,255,255,0.08)',
          borderRadius: 2,
        },
        bar: {
          backgroundColor: '#2dd4aa',
          borderRadius: 2,
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
          borderRadius: 8,
        },
      },
    },
  },
})
