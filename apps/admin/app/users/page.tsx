'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { ConfirmDialog } from '../../src/components/ConfirmDialog';
import { DataTable, type DataTableColumn } from '../../src/components/DataTable';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { FilterBar } from '../../src/components/FilterBar';
import { LoadingState } from '../../src/components/LoadingState';
import { PageHeader } from '../../src/components/PageHeader';
import { Pagination } from '../../src/components/Pagination';
import { ResponsiveDataList } from '../../src/components/ResponsiveDataList';
import { SearchField } from '../../src/components/SearchField';
import { StatusBadge } from '../../src/components/StatusBadge';
import { Toast } from '../../src/components/Toast';
import { adminRequest } from '../../src/lib/admin-api';

type User = {
  id: string;
  email: string;
  status: string;
  locale: string;
  createdAt: string;
  deletedAt: string | null;
  profile: {
    displayName: string | null;
    city: string | null;
    moderationStatus: string;
    verificationStatus: string;
  } | null;
};

const PAGE_SIZE = 10;

function labelFor(value: string) {
  return value.replace(/[_-]/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function joinedDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function selectOptions(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function SelectFilter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="select-filter">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">All {label.toLowerCase()}</option>
        {options.map((option) => <option key={option} value={option}>{labelFor(option)}</option>)}
      </select>
    </label>
  );
}

function UserIdentity({ user }: { user: User }) {
  const name = user.profile?.displayName || 'Unnamed member';
  return (
    <div className="user-identity">
      <span className="user-avatar" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
      <span>
        <strong>{name}</strong>
        <small>{user.email}</small>
      </span>
    </div>
  );
}

function ProfileState({ user }: { user: User }) {
  return user.profile ? (
    <span className="table-secondary">{user.profile.city || 'Location private'}<br /><small>{user.locale.toUpperCase()}</small></span>
  ) : <span className="table-secondary">No profile<br /><small>{user.locale.toUpperCase()}</small></span>;
}

export default function UsersPage() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [pending, setPending] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [status, setStatus] = useState('all');
  const [moderationStatus, setModerationStatus] = useState('all');
  const [verificationStatus, setVerificationStatus] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const raw = window.sessionStorage.getItem('sanjari.admin.claims');
    if (!raw) return;
    try {
      setPermissions((JSON.parse(raw) as { permissions?: string[] }).permissions ?? []);
    } catch {
      setPermissions([]);
    }
  }, []);

  async function loadUsers(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError('');
    setLoading(true);
    try {
      setUsers((await adminRequest<User[]>(`/admin/operations/users?query=${encodeURIComponent(query.trim())}`)) ?? []);
      setPage(1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadUsers(); }, []);

  const filteredUsers = useMemo(() => users?.filter((user) => {
    if (status !== 'all' && user.status !== status) return false;
    if (moderationStatus !== 'all' && user.profile?.moderationStatus !== moderationStatus) return false;
    if (verificationStatus !== 'all' && user.profile?.verificationStatus !== verificationStatus) return false;
    return true;
  }) ?? [], [moderationStatus, status, users, verificationStatus]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pageUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const canSuspend = permissions.length === 0 || permissions.includes('users.suspend');
  const statusOptions = selectOptions(users?.map((user) => user.status) ?? []);
  const moderationOptions = selectOptions(users?.map((user) => user.profile?.moderationStatus ?? '') ?? []);
  const verificationOptions = selectOptions(users?.map((user) => user.profile?.verificationStatus ?? '') ?? []);

  const columns: DataTableColumn<User>[] = [
    { key: 'user', header: 'User', render: (user) => <UserIdentity user={user} /> },
    { key: 'account', header: 'Account status', render: (user) => <StatusBadge status={user.status} label={labelFor(user.status)} /> },
    { key: 'profile', header: 'Profile', render: (user) => <ProfileState user={user} /> },
    { key: 'moderation', header: 'Moderation', render: (user) => <StatusBadge status={user.profile?.moderationStatus ?? 'not_started'} label={labelFor(user.profile?.moderationStatus ?? 'Not reviewed')} /> },
    { key: 'verification', header: 'Verification', render: (user) => <StatusBadge status={user.profile?.verificationStatus ?? 'not_started'} label={labelFor(user.profile?.verificationStatus ?? 'Not started')} /> },
    { key: 'joined', header: 'Joined', render: (user) => <span className="table-secondary">{joinedDate(user.createdAt)}</span> },
    { key: 'actions', header: '', className: 'table-action-cell', render: (user) => user.status === 'active' && canSuspend ? <button className="table-action" disabled={busyId === user.id} onClick={() => setPending(user)}>{busyId === user.id ? 'Suspending...' : 'Suspend'}</button> : null },
  ];

  function resetFilters() {
    setQuery('');
    setStatus('all');
    setModerationStatus('all');
    setVerificationStatus('all');
    setPage(1);
    void loadUsers();
  }

  async function suspend() {
    if (!pending) return;
    setBusyId(pending.id);
    try {
      await adminRequest(`/admin/operations/users/${pending.id}/suspend`, { method: 'PATCH', body: JSON.stringify({ reason: 'Suspended after authorized staff review.' }) });
      setUsers((current) => current?.map((item) => item.id === pending.id ? { ...item, status: 'suspended' } : item) ?? null);
      setToast(`${pending.profile?.displayName ?? pending.email} suspended.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to suspend user.');
    } finally {
      setBusyId('');
      setPending(null);
    }
  }

  const metrics: Array<[string, number, string]> = [
    ['Loaded users', users?.length ?? 0, 'neutral'],
    ['Active accounts', users?.filter((user) => user.status === 'active').length ?? 0, 'success'],
    ['Needs review', users?.filter((user) => user.profile?.verificationStatus === 'pending' || user.profile?.moderationStatus === 'pending').length ?? 0, 'warning'],
    ['Suspended', users?.filter((user) => user.status === 'suspended').length ?? 0, 'error'],
  ];

  return (
    <AdminShell>
      <PageHeader eyebrow="Trust & safety" title="Users" description="Review account status, profile readiness, and trust signals from one workspace." status={<span className="status-chip"><span className="status-dot" />Live directory</span>} />
      <div className="metrics users-metrics">{metrics.map(([label, value, tone]) => <div className={`metric metric-${tone}`} key={label}><span>{label}</span><strong>{loading ? '—' : value}</strong><small>{label === 'Loaded users' ? 'Latest 50 results' : 'Across loaded results'}</small></div>)}</div>
      <section className="users-section" aria-labelledby="users-directory-title">
        <div className="section-toolbar">
          <div><h2 id="users-directory-title">User directory</h2><p>{users ? `${filteredUsers.length} matching users` : 'Loading directory'}</p></div>
          {users ? <span className="result-count">Updated just now</span> : null}
        </div>
        <FilterBar onSubmit={(event) => void loadUsers(event)} onReset={resetFilters}>
          <SearchField label="Search" value={query} onChange={setQuery} placeholder="Email, name, or user ID" />
          <SelectFilter label="Account status" value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={statusOptions} />
          <SelectFilter label="Moderation" value={moderationStatus} onChange={(value) => { setModerationStatus(value); setPage(1); }} options={moderationOptions} />
          <SelectFilter label="Verification" value={verificationStatus} onChange={(value) => { setVerificationStatus(value); setPage(1); }} options={verificationOptions} />
        </FilterBar>
        {error ? <ErrorState message={error} action={<button className="secondary-button" onClick={() => void loadUsers()}>Try again</button>} /> : null}
        {loading && users === null ? <LoadingState label="Loading user directory" /> : null}
        {!loading && users && filteredUsers.length === 0 ? <EmptyState title="No matching users" description="Try a different search term or clear the filters." action={<button className="secondary-button" onClick={resetFilters}>Clear filters</button>} /> : null}
        {users && filteredUsers.length > 0 ? <>
          <DataTable columns={columns} rows={pageUsers} rowKey={(user) => user.id} caption="User directory" />
          <ResponsiveDataList columns={columns} rows={pageUsers} rowKey={(user) => user.id} />
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </> : null}
      </section>
      <ConfirmDialog open={pending !== null} title={`Suspend ${pending?.profile?.displayName ?? pending?.email ?? 'this user'}?`} description="The account will be restricted immediately and the action recorded in the audit log." confirmLabel="Suspend" busy={busyId === pending?.id} onConfirm={() => void suspend()} onClose={() => setPending(null)} />
      {toast ? <Toast message={toast} tone="success" onDismiss={() => setToast('')} /> : null}
    </AdminShell>
  );
}
