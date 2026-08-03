'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { PageHeader } from '../../src/components/PageHeader';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { Toast } from '../../src/components/Toast';
import { adminRequest } from '../../src/lib/admin-api';

type Role = {
  id: string;
  name: string;
  description: string | null;
  permissions: Array<{ permission: { key: string; description: string | null } }>;
  admins: Array<{ adminUser: { id: string; email: string; displayName: string; status: string } }>;
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [assignRoleId, setAssignRoleId] = useState<Record<string, string>>({});
  const [busyRoleId, setBusyRoleId] = useState('');

  function load() {
    setError('');
    void adminRequest<Role[]>('/admin/operations/roles')
      .then((data) => setRoles(data ?? []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load roles.'));
  }

  useEffect(() => {
    load();
  }, []);

  async function assign(role: Role) {
    const adminUserId = assignRoleId[role.id]?.trim();
    if (!adminUserId) return;
    setBusyRoleId(role.id);
    try {
      await adminRequest(`/admin/operations/admins/${adminUserId}/roles`, {
        method: 'PATCH',
        body: JSON.stringify({ roleId: role.id }),
      });
      setToast(`Assigned "${role.name}" to administrator.`);
      setAssignRoleId((current) => ({ ...current, [role.id]: '' }));
      load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to assign role.');
    } finally {
      setBusyRoleId('');
    }
  }

  return (
    <AdminShell>
      <PageHeader title="Admin roles" description="Role assignments and permissions are visible to configuration administrators." />
      {error ? <ErrorState message={error} /> : null}
      {roles === null && !error ? <LoadingState label="Loading roles" /> : null}
      {roles && roles.length === 0 ? <EmptyState description="No roles have been configured yet." /> : null}
      <div className="case-list">
        {roles?.map((role) => (
          <article className="case-item" key={role.id}>
            <div>
              <strong>{role.name}</strong>
              <span>{role.description ?? 'No description'}</span>
              <p>{role.permissions.map(({ permission }) => permission.key).join(', ') || 'No permissions'}</p>
              <small>
                {role.admins.length === 0
                  ? 'No administrators assigned'
                  : role.admins.map(({ adminUser }) => adminUser.displayName || adminUser.email).join(', ')}
              </small>
            </div>
            <div className="actions">
              <input
                aria-label={`Admin user ID to assign ${role.name}`}
                placeholder="Admin user ID"
                value={assignRoleId[role.id] ?? ''}
                onChange={(event) =>
                  setAssignRoleId((current) => ({ ...current, [role.id]: event.target.value }))
                }
              />
              <button
                className="secondary-button"
                disabled={busyRoleId === role.id || !assignRoleId[role.id]?.trim()}
                onClick={() => void assign(role)}
              >
                {busyRoleId === role.id ? 'Assigning...' : 'Assign role'}
              </button>
            </div>
          </article>
        ))}
      </div>
      {toast ? <Toast message={toast} tone="success" onDismiss={() => setToast('')} /> : null}
    </AdminShell>
  );
}
