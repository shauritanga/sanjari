'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { adminRequest } from '../../src/lib/admin-api';

type Notification = { id: string; userId: string; category: string; channel: string; title: string; readAt: string | null; createdAt: string };

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  useEffect(() => {
    void adminRequest<Notification[]>('/admin/operations/notifications')
      .then((data) => setItems(data ?? []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load notifications.'));
  }, []);
  async function markRead(item: Notification) {
    if (!window.confirm('Mark this notification as read?')) return;
    setBusy(item.id);
    try {
      const updated = await adminRequest<{ id: string; readAt: string | null }>(`/admin/operations/notifications/${item.id}`, { method: 'PATCH', body: JSON.stringify({ status: item.readAt ? 'unread' : 'read', reason: 'Authorized notification queue review completed.' }) });
      if (updated) setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: updated.readAt } : entry));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update notification.'); } finally { setBusy(''); }
  }
  return (
    <AdminShell>
      <h1>Notification queue</h1>
      <p>Recent notification records are visible to notification operators.</p>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="case-list">
        {items.map((item) => (
          <article className="case-item" key={item.id}>
            <div><strong>{item.title}</strong><span>{item.category} · {item.channel} · {item.readAt ? 'Read' : 'Unread'}</span></div>
            <div className="actions"><small>{new Date(item.createdAt).toLocaleString()}</small><button disabled={busy === item.id} onClick={() => void markRead(item)}>{item.readAt ? 'Mark unread' : 'Mark read'}</button></div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
