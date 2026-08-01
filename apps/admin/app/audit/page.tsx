'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { adminRequest } from '../../src/lib/admin-api';

type Audit = {
  id: string;
  actorType: string;
  action: string;
  createdAt: string;
  metadata: unknown;
};

export default function AuditPage() {
  const [items, setItems] = useState<Audit[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    void adminRequest<Audit[]>('/admin/operations/audit')
      .then((data) => setItems(data ?? []))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load audit logs.'),
      );
  }, []);
  return (
    <AdminShell>
      <h1>Audit logs</h1>
      <p>Administrative and sensitive-data access logs are immutable.</p>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="case-list">
        {items.map((item) => (
          <article className="case-item" key={item.id}>
            <div>
              <strong>{item.action}</strong>
              <span>
                {item.actorType} · {new Date(item.createdAt).toLocaleString()}
              </span>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
