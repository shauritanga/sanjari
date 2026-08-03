'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { PageHeader } from '../../src/components/PageHeader';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { StatusBadge } from '../../src/components/StatusBadge';
import { ConfirmDialog } from '../../src/components/ConfirmDialog';
import { Toast } from '../../src/components/Toast';
import { DataTable, DataTableColumn } from '../../src/components/DataTable';
import { ResponsiveDataList } from '../../src/components/ResponsiveDataList';
import { adminRequest } from '../../src/lib/admin-api';

type Notification = { id: string; userId: string; category: string; channel: string; title: string; readAt: string | null; createdAt: string };

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState('');
  const [pending, setPending] = useState<Notification | null>(null);
  useEffect(() => {
    void adminRequest<Notification[]>('/admin/operations/notifications')
      .then((data) => setItems(data ?? []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load notifications.'));
  }, []);
  async function markRead() {
    if (!pending) return;
    setBusy(pending.id);
    try {
      const updated = await adminRequest<{ id: string; readAt: string | null }>(`/admin/operations/notifications/${pending.id}`, { method: 'PATCH', body: JSON.stringify({ status: pending.readAt ? 'unread' : 'read', reason: 'Authorized notification queue review completed.' }) });
      if (updated) setItems((current) => current?.map((entry) => entry.id === pending.id ? { ...entry, readAt: updated.readAt } : entry) ?? null);
      setToast(pending.readAt ? 'Notification marked unread.' : 'Notification marked read.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update notification.'); } finally { setBusy(''); setPending(null); }
  }

  const columns: DataTableColumn<Notification>[] = [
    { key: 'title', header: 'Title', render: (item) => item.title },
    { key: 'category', header: 'Category', render: (item) => item.category },
    { key: 'channel', header: 'Channel', render: (item) => item.channel },
    { key: 'status', header: 'Status', render: (item) => <StatusBadge status={item.readAt ? 'read' : 'unread'} label={item.readAt ? 'Read' : 'Unread'} /> },
    { key: 'createdAt', header: 'Created', render: (item) => new Date(item.createdAt).toLocaleString() },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <button className="secondary-button" disabled={busy === item.id} onClick={() => setPending(item)}>
          {busy === item.id ? 'Saving...' : item.readAt ? 'Mark unread' : 'Mark read'}
        </button>
      ),
    },
  ];

  return (
    <AdminShell>
      <PageHeader title="Notification queue" description="Recent notification records are visible to notification operators." />
      {error ? <ErrorState message={error} /> : null}
      {items === null && !error ? <LoadingState label="Loading notifications" /> : null}
      {items && items.length === 0 ? <EmptyState description="No notifications have been recorded yet." /> : null}
      {items && items.length > 0 ? (
        <>
          <DataTable columns={columns} rows={items} rowKey={(item) => item.id} caption="Notification queue" />
          <ResponsiveDataList columns={columns} rows={items} rowKey={(item) => item.id} />
        </>
      ) : null}
      <ConfirmDialog
        open={pending !== null}
        title={pending?.readAt ? 'Mark this notification as unread?' : 'Mark this notification as read?'}
        confirmLabel={pending?.readAt ? 'Mark unread' : 'Mark read'}
        busy={busy === pending?.id}
        onConfirm={() => void markRead()}
        onClose={() => setPending(null)}
      />
      {toast ? <Toast message={toast} tone="success" onDismiss={() => setToast('')} /> : null}
    </AdminShell>
  );
}
