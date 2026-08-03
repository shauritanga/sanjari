import { sanjariBrand } from '@sanjari/shared-utils';

export const brandColors = sanjariBrand.colors;

export interface SemanticPalette {
  background: string;
  surface: string;
  surfaceAlt: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentAlt: string;
  gold: string;
  border: string;
  success: string;
  error: string;
  onAccent: string;
  overlay: string;
  skeleton: string;
}

export const lightPalette: SemanticPalette = {
  background: brandColors.warmWhite,
  surface: '#FFFFFF',
  surfaceAlt: brandColors.softRose,
  textPrimary: brandColors.charcoal,
  textSecondary: brandColors.secondaryText,
  accent: brandColors.coral,
  accentAlt: brandColors.deepPlum,
  gold: brandColors.softGold,
  border: brandColors.softRose,
  success: brandColors.success,
  error: brandColors.error,
  onAccent: '#FFFFFF',
  overlay: 'rgba(37, 33, 38, 0.55)',
  skeleton: '#F1E4E7'
};

export const darkPalette: SemanticPalette = {
  background: brandColors.darkBackground,
  surface: brandColors.darkCard,
  surfaceAlt: '#2E2530',
  textPrimary: brandColors.darkText,
  textSecondary: brandColors.darkSecondaryText,
  accent: brandColors.darkCoral,
  accentAlt: brandColors.darkPlum,
  gold: brandColors.softGold,
  border: 'rgba(255, 248, 250, 0.12)',
  success: brandColors.success,
  error: brandColors.error,
  onAccent: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.6)',
  skeleton: '#2E2530'
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 16,
  xl: 24,
  pill: 999
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
} as const;

export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800' as const },
  h1: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  bodyLarge: { fontSize: 17, lineHeight: 25, fontWeight: '400' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyMedium: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  micro: { fontSize: 11, lineHeight: 15, fontWeight: '600' as const }
} as const;

export const motion = {
  fast: 160,
  base: 240,
  slow: 360
} as const;

/** @deprecated use useAppTheme() for dark-mode-aware colors */
export const theme = {
  colors: brandColors,
  radius,
  spacing
} as const;
