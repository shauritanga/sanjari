'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { adminRequest } from '../../src/lib/admin-api';

type Subscription = {
  id: string;
  userId: string;
  status: string;
  provider: string;
  plan: { code: string; title: string; priceCents: number; currency: string };
};

export default function SubscriptionsPage() {
  const [items, setItems] = useState<Subscription[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    void adminRequest<Subscription[]>('/admin/operations/subscriptions')
      .then((data) => setItems(data ?? []))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load subscriptions.'),
      );
  }, []);
  return (
    <AdminShell>
      <h1>Subscription overview</h1>
      <p>Entitlements are calculated server-side from verified purchase records.</p>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="case-list">
        {items.map((item) => (
          <article className="case-item" key={item.id}>
            <div>
              <strong>{item.plan.title}</strong>
              <span>
                {item.status} · {item.provider} · user {item.userId}
              </span>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
