'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { adminRequest } from '../../src/lib/admin-api';

type Case = {
  id: string;
  status: string;
  report: { category: string; priority: string };
  actions: Array<{ action: string }>;
};

export default function ReportsPage() {
  const [items, setItems] = useState<Case[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    void adminRequest<Case[]>('/admin/moderation/queue')
      .then((data) => setItems(data ?? []))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load reports.'),
      );
  }, []);
  return (
    <AdminShell>
      <h1>Reports queue</h1>
      <p>High-risk reports are prioritized for human moderation.</p>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="case-list">
        {items.map((item) => (
          <article className="case-item" key={item.id}>
            <div>
              <strong>{item.report.category}</strong>
              <span>
                {item.report.priority} · {item.status}
              </span>
            </div>
            <a href="/moderation">Open case</a>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
