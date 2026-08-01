'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { adminRequest } from '../../src/lib/admin-api';

type Role = {
  id: string;
  name: string;
  description: string | null;
  permissions: Array<{ permission: { key: string; description: string | null } }>;
  admins: Array<{ adminUser: { id: string; email: string; displayName: string; status: string } }>;
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    void adminRequest<Role[]>('/admin/operations/roles')
      .then((data) => setRoles(data ?? []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load roles.'));
  }, []);
  return (
    <AdminShell>
      <h1>Admin roles</h1>
      <p>Role assignments and permissions are visible to configuration administrators.</p>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="case-list">
        {roles.map((role) => (
          <article className="case-item" key={role.id}>
            <div>
              <strong>{role.name}</strong>
              <span>{role.description ?? 'No description'}</span>
              <p>{role.permissions.map(({ permission }) => permission.key).join(', ') || 'No permissions'}</p>
              <small>{role.admins.length} assigned administrator(s)</small>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
