'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { adminRequest } from '../../src/lib/admin-api';

type AppealCase = {
  id: string;
  status: string;
  report: { category: string; priority: string };
  appeals: Array<{ id: string; userId: string; statement: string; createdAt: string }>;
};

export default function AppealsPage() {
  const [items, setItems] = useState<AppealCase[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    void adminRequest<AppealCase[]>('/admin/moderation/appeals')
      .then((data) => setItems(data ?? []))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load appeals.'),
      );
  }, []);
  return (
    <AdminShell>
      <h1>Appeals</h1>
      <p>Appeals are reviewed separately from the original enforcement action.</p>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="case-list">
        {items.map((item) => (
          <article className="case-item" key={item.id}>
            <div>
              <strong>{item.report.category}</strong>
              <span>
                {item.report.priority} · {item.status}
              </span>
              <p>{item.appeals[0]?.statement}</p>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
