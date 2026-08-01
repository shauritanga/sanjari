'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { adminRequest } from '../../src/lib/admin-api';

type Notification = { id: string; userId: string; category: string; channel: string; title: string; readAt: string | null; createdAt: string };

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    void adminRequest<Notification[]>('/admin/operations/notifications')
      .then((data) => setItems(data ?? []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load notifications.'));
  }, []);
  return (
    <AdminShell>
      <h1>Notification queue</h1>
      <p>Recent notification records are visible to notification operators.</p>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="case-list">
        {items.map((item) => (
          <article className="case-item" key={item.id}>
            <div><strong>{item.title}</strong><span>{item.category} · {item.channel} · {item.readAt ? 'Read' : 'Unread'}</span></div>
            <small>{new Date(item.createdAt).toLocaleString()}</small>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
