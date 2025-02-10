import { DefaultTheme } from 'styled-components'; // ^5.3.0
import { createTheme, ITheme } from '@fluentui/react'; // ^8.0.0
import { 
  ThemeMode, 
  ColorScheme, 
  Typography, 
  Spacing, 
  Theme,
  ExcelContextTheme 
} from '../types/theme.types';
import { ACCESSIBILITY } from '../constants/ui.constants';

// Base spacing unit following Office UI Fabric grid system
const DEFAULT_SPACING_UNIT = 8;

// Default typography configuration aligned with Office UI Fabric
const baseTypography: Typography = {
  fontFamily: 'Segoe UI',
  fontSize: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '20px',
    xl: '24px',
    xxl: '32px'
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75
  }
};

// Base spacing configuration
const baseSpacing: Spacing = {
  unit: DEFAULT_SPACING_UNIT,
  scale: {
    xs: DEFAULT_SPACING_UNIT / 2,    // 4px
    sm: DEFAULT_SPACING_UNIT,        // 8px
    md: DEFAULT_SPACING_UNIT * 2,    // 16px
    lg: DEFAULT_SPACING_UNIT * 3,    // 24px
    xl: DEFAULT_SPACING_UNIT * 4,    // 32px
    xxl: DEFAULT_SPACING_UNIT * 6    // 48px
  }
};

// Excel-specific color palette
const excelColors = {
  primary: '#217346',    // Excel green
  secondary: '#41A5EE',  // Office blue
  error: '#D83B01'       // Office red
};

/**
 * Creates the light theme configuration with Excel-specific optimizations
 */
export const createLightTheme = (excelContext?: ExcelContextTheme): Theme => {
  const colors: ColorScheme = {
    primary: excelColors.primary,
    secondary: excelColors.secondary,
    background: '#ffffff',
    surface: '#fafafa',
    text: '#323130',
    error: excelColors.error,
    warning: '#FFB900',
    success: '#107C10',
    info: '#0078D4'
  };

  const theme: Theme = {
    mode: ThemeMode.LIGHT,
    colors,
    typography: baseTypography,
    spacing: baseSpacing,
    ...excelContext
  };

  return Object.freeze(theme);
};

/**
 * Creates the dark theme configuration with enhanced contrast
 */
export const createDarkTheme = (excelContext?: ExcelContextTheme): Theme => {
  const colors: ColorScheme = {
    primary: '#3B8764',  // Adjusted Excel green for dark mode
    secondary: '#5B9BD5', // Adjusted Office blue for dark mode
    background: '#1f1f1f',
    surface: '#292929',
    text: '#ffffff',
    error: '#F1707B',
    warning: '#FFD335',
    success: '#57A64A',
    info: '#2B88D8'
  };

  const theme: Theme = {
    mode: ThemeMode.DARK,
    colors,
    typography: baseTypography,
    spacing: baseSpacing,
    ...excelContext
  };

  return Object.freeze(theme);
};

/**
 * Creates the high contrast theme configuration with maximum accessibility
 */
export const createHighContrastTheme = (excelContext?: ExcelContextTheme): Theme => {
  const colors: ColorScheme = {
    primary: '#ffffff',
    secondary: '#ffffff',
    background: '#000000',
    surface: '#000000',
    text: '#ffffff',
    error: '#ffffff',
    warning: '#ffffff',
    success: '#ffffff',
    info: '#ffffff'
  };

  // Enhanced typography for better readability in high contrast mode
  const highContrastTypography: Typography = {
    ...baseTypography,
    fontSize: {
      ...baseTypography.fontSize,
      md: '18px',  // Increased base font size
      lg: '22px',
      xl: '26px',
      xxl: '34px'
    }
  };

  const theme: Theme = {
    mode: ThemeMode.HIGH_CONTRAST,
    colors,
    typography: highContrastTypography,
    spacing: {
      ...baseSpacing,
      scale: {
        ...baseSpacing.scale,
        sm: DEFAULT_SPACING_UNIT * 1.5,  // Increased spacing for better touch targets
        md: DEFAULT_SPACING_UNIT * 2.5
      }
    },
    ...excelContext
  };

  return Object.freeze(theme);
};

// Default theme instances
export const lightTheme = createLightTheme();
export const darkTheme = createDarkTheme();
export const highContrastTheme = createHighContrastTheme();

// Create Fluent UI compatible themes
export const fluentLightTheme: ITheme = createTheme({
  palette: {
    themePrimary: lightTheme.colors.primary,
    themeDarkAlt: lightTheme.colors.secondary,
    neutralPrimary: lightTheme.colors.text,
    neutralLight: lightTheme.colors.surface,
    white: lightTheme.colors.background
  }
});

export const fluentDarkTheme: ITheme = createTheme({
  palette: {
    themePrimary: darkTheme.colors.primary,
    themeDarkAlt: darkTheme.colors.secondary,
    neutralPrimary: darkTheme.colors.text,
    neutralLight: darkTheme.colors.surface,
    white: darkTheme.colors.background
  }
});

export const fluentHighContrastTheme: ITheme = createTheme({
  palette: {
    themePrimary: highContrastTheme.colors.primary,
    themeDarkAlt: highContrastTheme.colors.secondary,
    neutralPrimary: highContrastTheme.colors.text,
    neutralLight: highContrastTheme.colors.surface,
    white: highContrastTheme.colors.background
  }
});