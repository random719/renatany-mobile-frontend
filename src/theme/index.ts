import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const colors = {
  primary: '#1F2937',
  accentCoral: '#F97066',
  accentEmerald: '#10B981',
  accentBlue: '#3B82F6',
  backgroundLight: '#F9FAFB',
  backgroundDark: '#111827',
  cardLight: '#FFFFFF',
  cardDark: '#1F2937',
  textPrimary: '#111827',
  textPrimaryDark: '#F9FAFB',
  textSecondary: '#6B7280',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  border: '#E5E7EB',
  borderDark: '#374151',
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    secondary: colors.accentBlue,
    error: colors.error,
    background: colors.backgroundLight,
    surface: colors.cardLight,
    onSurface: colors.textPrimary,
    onSurfaceVariant: colors.textSecondary,
    outline: colors.border,
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    secondary: colors.accentBlue,
    error: colors.error,
    background: colors.backgroundDark,
    surface: colors.cardDark,
    onSurface: colors.textPrimaryDark,
    onSurfaceVariant: colors.textSecondary,
    outline: colors.borderDark,
  },
};
