import type { ReactNode } from 'react';

interface PermissionGateProps {
  permission: string;
  permissions: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ permission, permissions, children, fallback = null }: PermissionGateProps) {
  return permissions.includes(permission) ? <>{children}</> : <>{fallback}</>;
}
