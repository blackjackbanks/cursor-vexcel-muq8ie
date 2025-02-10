import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.0
import { ThemeMode, Theme } from '../../types/theme.types';
import { 
  lightTheme, 
  darkTheme, 
  highContrastTheme 
} from '../../config/theme.config';
import { 
  getSystemThemeMode, 
  getThemeByMode, 
  saveThemeToStorage, 
  getStoredTheme 
} from '../../utils/theme.utils';

/**
 * Interface defining the theme state structure
 */
interface ThemeState {
  currentTheme: Theme;
  previousTheme: Theme | null;
  systemPreference: ThemeMode;
  isInitialized: boolean;
}

/**
 * Initialize theme state with enhanced accessibility support
 * Follows WCAG 2.1 Level AA compliance requirements
 */
const initializeTheme = (): Theme => {
  // Check for stored theme preferences
  const storedTheme = getStoredTheme();
  if (storedTheme) {
    return storedTheme;
  }

  // Detect system theme preferences
  const systemMode = getSystemThemeMode();
  return getThemeByMode(systemMode);
};

/**
 * Initial state configuration with system preference detection
 */
const initialState: ThemeState = {
  currentTheme: initializeTheme(),
  previousTheme: null,
  systemPreference: getSystemThemeMode(),
  isInitialized: false
};

/**
 * Redux slice for theme management with accessibility enhancements
 */
const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    // Set theme with full theme configuration
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.previousTheme = state.currentTheme;
      state.currentTheme = action.payload;
      state.isInitialized = true;
      saveThemeToStorage(action.payload);
    },

    // Set theme using theme mode
    setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
      const newTheme = getThemeByMode(action.payload);
      state.previousTheme = state.currentTheme;
      state.currentTheme = newTheme;
      state.isInitialized = true;
      saveThemeToStorage(newTheme);
    },

    // Update system preference detection
    updateSystemPreference: (state) => {
      const systemMode = getSystemThemeMode();
      state.systemPreference = systemMode;
      
      // Auto-update theme if following system preference and not explicitly set
      if (!state.isInitialized) {
        state.currentTheme = getThemeByMode(systemMode);
      }
    },

    // Reset to previous theme if available
    revertToPreviousTheme: (state) => {
      if (state.previousTheme) {
        state.currentTheme = state.previousTheme;
        state.previousTheme = null;
        saveThemeToStorage(state.currentTheme);
      }
    },

    // Reset to system preference
    resetToSystemPreference: (state) => {
      const systemMode = getSystemThemeMode();
      state.systemPreference = systemMode;
      state.previousTheme = state.currentTheme;
      state.currentTheme = getThemeByMode(systemMode);
      state.isInitialized = false;
      saveThemeToStorage(state.currentTheme);
    }
  }
});

// Export actions
export const {
  setTheme,
  setThemeMode,
  updateSystemPreference,
  revertToPreviousTheme,
  resetToSystemPreference
} = themeSlice.actions;

// Selector for current theme with WCAG compliance
export const selectTheme = (state: { theme: ThemeState }): Theme => state.theme.currentTheme;

// Selector for current theme mode
export const selectThemeMode = (state: { theme: ThemeState }): ThemeMode => state.theme.currentTheme.mode;

// Selector for system preference
export const selectSystemPreference = (state: { theme: ThemeState }): ThemeMode => state.theme.systemPreference;

// Selector for initialization status
export const selectThemeInitialized = (state: { theme: ThemeState }): boolean => state.theme.isInitialized;

// Export reducer
export default themeSlice.reducer;