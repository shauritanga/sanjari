import type { AdminUser } from '@prisma/client';

export type AdminClaims = Pick<AdminUser, 'id' | 'email' | 'displayName'> & {
  permissions: string[];
};
export type AdminRequest = {
  headers: { cookie?: string; 'x-csrf-token'?: string };
  admin?: AdminClaims;
  sessionId?: string;
};
