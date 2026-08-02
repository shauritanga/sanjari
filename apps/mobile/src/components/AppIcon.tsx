import { HugeiconsIcon } from '@hugeicons/react-native';
import type { IconSvgElement } from '@hugeicons/react-native';

interface AppIconProps {
  icon: IconSvgElement;
  color: string;
  size?: number;
  strokeWidth?: number;
}

export function AppIcon({ icon, color, size = 24, strokeWidth = 1.8 }: AppIconProps) {
  return <HugeiconsIcon icon={icon} color={color} size={size} strokeWidth={strokeWidth} />;
}
