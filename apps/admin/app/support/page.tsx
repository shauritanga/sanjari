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

type Ticket = { id: string; userId: string | null; subject: string; status: string; priority: string; createdAt: string; updatedAt: string };

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState('');
  const [pending, setPending] = useState<Ticket | null>(null);
  useEffect(() => {
    void adminRequest<Ticket[]>('/admin/operations/support')
      .then((data) => setTickets(data ?? []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load support queue.'));
  }, []);
  async function resolve() {
    if (!pending) return;
    setBusy(pending.id);
    try {
      const updated = await adminRequest<Ticket>(`/admin/operations/support/${pending.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'resolved', priority: pending.priority, reason: 'Authorized support review completed.' }) });
      if (updated) setTickets((current) => current?.map((item) => item.id === pending.id ? { ...item, ...updated } : item) ?? null);
      setToast('Support ticket resolved.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update ticket.'); } finally { setBusy(''); setPending(null); }
  }
  return (
    <AdminShell>
      <PageHeader title="Support queue" description="Support tickets are shown with operational metadata only." />
      {error ? <ErrorState message={error} /> : null}
      {tickets === null && !error ? <LoadingState label="Loading support queue" /> : null}
      {tickets && tickets.length === 0 ? <EmptyState description="No support tickets are open." /> : null}
      <div className="case-list">
        {tickets?.map((ticket) => (
          <article className="case-item" key={ticket.id}>
            <div><strong>{ticket.subject}</strong><span>{ticket.priority} · <StatusBadge status={ticket.status} /> · {ticket.userId ?? 'Unlinked'}</span></div>
            <div className="actions">
              <small>Updated {new Date(ticket.updatedAt).toLocaleString()}</small>
              {ticket.status !== 'resolved' ? (
                <button className="secondary-button" disabled={busy === ticket.id} onClick={() => setPending(ticket)}>
                  {busy === ticket.id ? 'Resolving...' : 'Resolve'}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      <ConfirmDialog
        open={pending !== null}
        title="Resolve this support ticket?"
        confirmLabel="Resolve"
        busy={busy === pending?.id}
        onConfirm={() => void resolve()}
        onClose={() => setPending(null)}
      />
      {toast ? <Toast message={toast} tone="success" onDismiss={() => setToast('')} /> : null}
    </AdminShell>
  );
}
