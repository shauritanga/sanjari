import { useColorScheme } from 'react-native';
import { darkPalette, lightPalette, motion, radius, spacing, typography } from './theme';
import type { SemanticPalette } from './theme';

export interface AppTheme {
  dark: boolean;
  colors: SemanticPalette;
  radius: typeof radius;
  spacing: typeof spacing;
  typography: typeof typography;
  motion: typeof motion;
}

export function useAppTheme(): AppTheme {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  return {
    dark,
    colors: dark ? darkPalette : lightPalette,
    radius,
    spacing,
    typography,
    motion
  };
}
