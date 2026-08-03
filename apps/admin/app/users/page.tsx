'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { PageHeader } from '../../src/components/PageHeader';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { StatusBadge } from '../../src/components/StatusBadge';
import { ConfirmDialog } from '../../src/components/ConfirmDialog';
import { Toast } from '../../src/components/Toast';
import { FilterBar } from '../../src/components/FilterBar';
import { SearchField } from '../../src/components/SearchField';
import { adminRequest } from '../../src/lib/admin-api';

type User = {
  id: string;
  email: string;
  status: string;
  locale: string;
  profile: {
    displayName: string | null;
    city: string | null;
    moderationStatus: string;
    verificationStatus: string;
  } | null;
};

export default function UsersPage() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [pending, setPending] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    const raw = window.sessionStorage.getItem('sanjari.admin.claims');
    if (!raw) return;
    try {
      const claims = JSON.parse(raw) as { permissions?: string[] };
      setPermissions(claims.permissions ?? []);
    } catch {
      setPermissions([]);
    }
  }, []);

  async function search(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError('');
    setSearching(true);
    try {
      setUsers(
        (await adminRequest<User[]>(
          `/admin/operations/users?query=${encodeURIComponent(query)}`,
        )) ?? [],
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to search users.');
    } finally {
      setSearching(false);
    }
  }

  async function suspend() {
    if (!pending) return;
    setBusyId(pending.id);
    try {
      await adminRequest(`/admin/operations/users/${pending.id}/suspend`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: 'Suspended after authorized staff review.' }),
      });
      setUsers((current) =>
        current?.map((item) => (item.id === pending.id ? { ...item, status: 'suspended' } : item)) ?? null,
      );
      setToast(`${pending.profile?.displayName ?? pending.email} suspended.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to suspend user.');
    } finally {
      setBusyId('');
      setPending(null);
    }
  }

  return (
    <AdminShell>
      <PageHeader title="User search" description="Search and suspension actions are permission-gated and audited." />
      <FilterBar onSubmit={(event) => void search(event)}>
        <SearchField
          label="Search users"
          value={query}
          onChange={setQuery}
          placeholder="Email, ID, or display name"
        />
      </FilterBar>
      {error ? <ErrorState message={error} /> : null}
      {searching && users === null ? <LoadingState label="Searching users" /> : null}
      {users && users.length === 0 ? <EmptyState description="No users match this search." /> : null}
      <div className="case-list">
        {users?.map((user) => (
          <article className="case-item" key={user.id}>
            <div>
              <strong>{user.profile?.displayName ?? 'Member'}</strong>
              <span>
                {user.email} · <StatusBadge status={user.status} /> · {user.profile?.city ?? 'Location private'}
              </span>
            </div>
            {user.status === 'active' && (permissions.length === 0 || permissions.includes('users.suspend')) ? (
              <button
                className="secondary-button"
                disabled={busyId === user.id}
                onClick={() => setPending(user)}
              >
                {busyId === user.id ? 'Suspending...' : 'Suspend'}
              </button>
            ) : null}
          </article>
        ))}
      </div>
      <ConfirmDialog
        open={pending !== null}
        title={`Suspend ${pending?.profile?.displayName ?? pending?.email ?? 'this user'}?`}
        description="The account will be restricted immediately and the action recorded in the audit log."
        confirmLabel="Suspend"
        busy={busyId === pending?.id}
        onConfirm={() => void suspend()}
        onClose={() => setPending(null)}
      />
      {toast ? <Toast message={toast} tone="success" onDismiss={() => setToast('')} /> : null}
    </AdminShell>
  );
}
