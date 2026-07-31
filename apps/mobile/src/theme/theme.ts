import { sanjariBrand } from '@sanjari/shared-utils';

export const theme = {
  colors: sanjariBrand.colors,
  radius: {
    sm: 6,
    md: 8
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  }
} as const;
