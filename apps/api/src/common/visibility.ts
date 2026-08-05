export interface VisibilitySettings {
  hideAge?: boolean;
  hideOnlineStatus?: boolean;
  hideReadReceipts?: boolean;
  hideCity?: boolean;
  hideOccupation?: boolean;
  hideEducation?: boolean;
  hideHeight?: boolean;
}

export function readVisibility(value: unknown): VisibilitySettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return value as VisibilitySettings;
}
