'use client';

import { useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
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
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  async function search() {
    try {
      setUsers(
        (await adminRequest<User[]>(
          `/admin/operations/users?query=${encodeURIComponent(query)}`,
        )) ?? [],
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to search users.');
    }
  }
  async function suspend(user: User) {
    if (!window.confirm(`Suspend ${user.profile?.displayName ?? user.email}?`)) return;
    try {
      await adminRequest(`/admin/operations/users/${user.id}/suspend`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: 'Suspended after authorized staff review.' }),
      });
      setUsers((current) =>
        current.map((item) => (item.id === user.id ? { ...item, status: 'suspended' } : item)),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to suspend user.');
    }
  }
  return (
    <AdminShell>
      <h1>User search</h1>
      <p>Search and suspension actions are permission-gated and audited.</p>
      <div className="search-row">
        <input
          aria-label="Search users"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Email, ID, or display name"
        />
        <button onClick={() => void search()}>Search</button>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="case-list">
        {users.map((user) => (
          <article className="case-item" key={user.id}>
            <div>
              <strong>{user.profile?.displayName ?? 'Member'}</strong>
              <span>
                {user.email} · {user.status} · {user.profile?.city ?? 'Location private'}
              </span>
            </div>
            {user.status === 'active' ? (
              <button onClick={() => void suspend(user)}>Suspend</button>
            ) : null}
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
