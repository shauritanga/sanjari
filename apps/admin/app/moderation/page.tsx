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
import { adminRequest } from '../../src/lib/admin-api';

type Case = {
  id: string;
  status: string;
  report: { category: string; priority: string; description: string | null };
  actions: Array<{ action: string; reason: string }>;
};

export default function ModerationPage() {
  const [cases, setCases] = useState<Case[] | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => {
    void adminRequest<Case[]>('/admin/moderation/queue')
      .then((data) => setCases(data ?? []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load queue.'));
  }, []);
  async function suspend() {
    if (!pending) return;
    setBusy(pending);
    try {
      await adminRequest(`/admin/moderation/cases/${pending}/actions`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'suspend',
          reason: 'Human review found a safety risk requiring temporary restriction.',
        }),
      });
      setCases((current) => current?.filter((item) => item.id !== pending) ?? null);
      setToast('Account suspended.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to apply action.');
    } finally {
      setBusy('');
      setPending(null);
    }
  }
  return (
    <AdminShell>
      <PageHeader title="Moderation cases" description="Every moderation action requires a reason and audit log entry." />
      {error ? <ErrorState message={error} /> : null}
      {cases === null && !error ? <LoadingState label="Loading moderation cases" /> : null}
      {cases && cases.length === 0 ? <EmptyState description="No moderation cases are awaiting review." /> : null}
      <div className="case-list">
        {cases?.map((item) => (
          <article className="case-item" key={item.id}>
            <div>
              <strong>{item.report.category}</strong>
              <span>
                {item.report.priority} · <StatusBadge status={item.status} />
              </span>
              <p>{item.report.description ?? 'No description provided.'}</p>
            </div>
            <button className="danger-button" disabled={busy === item.id} onClick={() => setPending(item.id)}>
              {busy === item.id ? 'Applying...' : 'Suspend'}
            </button>
          </article>
        ))}
      </div>
      <ConfirmDialog
        open={pending !== null}
        title="Suspend the reported account?"
        description="This applies a temporary restriction after this moderation review."
        confirmLabel="Suspend"
        busy={busy === pending}
        onConfirm={() => void suspend()}
        onClose={() => setPending(null)}
      />
      {toast ? <Toast message={toast} tone="success" onDismiss={() => setToast('')} /> : null}
    </AdminShell>
  );
}
