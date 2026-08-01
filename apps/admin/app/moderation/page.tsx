'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { adminRequest } from '../../src/lib/admin-api';

type Case = {
  id: string;
  status: string;
  report: { category: string; priority: string; description: string | null };
  actions: Array<{ action: string; reason: string }>;
};

export default function ModerationPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  useEffect(() => {
    void adminRequest<Case[]>('/admin/moderation/queue')
      .then((data) => setCases(data ?? []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load queue.'));
  }, []);
  async function suspend(caseId: string) {
    setBusy(caseId);
    try {
      await adminRequest(`/admin/moderation/cases/${caseId}/actions`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'suspend',
          reason: 'Human review found a safety risk requiring temporary restriction.',
        }),
      });
      setCases((current) => current.filter((item) => item.id !== caseId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to apply action.');
    } finally {
      setBusy('');
    }
  }
  return (
    <AdminShell>
      <h1>Moderation cases</h1>
      <p>Every moderation action requires a reason and audit log entry.</p>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="case-list">
        {cases.map((item) => (
          <article className="case-item" key={item.id}>
            <div>
              <strong>{item.report.category}</strong>
              <span>
                {item.report.priority} · {item.status}
              </span>
              <p>{item.report.description ?? 'No description provided.'}</p>
            </div>
            <button disabled={busy === item.id} onClick={() => void suspend(item.id)}>
              {busy === item.id ? 'Applying...' : 'Suspend'}
            </button>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
