'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { adminRequest } from '../../src/lib/admin-api';

type Ticket = { id: string; userId: string | null; subject: string; status: string; priority: string; createdAt: string; updatedAt: string };

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  useEffect(() => {
    void adminRequest<Ticket[]>('/admin/operations/support')
      .then((data) => setTickets(data ?? []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load support queue.'));
  }, []);
  async function update(ticket: Ticket, status: string) {
    if (!window.confirm(`${status === 'resolved' ? 'Resolve' : 'Update'} this support ticket?`)) return;
    setBusy(ticket.id);
    try {
      const updated = await adminRequest<Ticket>(`/admin/operations/support/${ticket.id}`, { method: 'PATCH', body: JSON.stringify({ status, priority: ticket.priority, reason: 'Authorized support review completed.' }) });
      if (updated) setTickets((current) => current.map((item) => item.id === ticket.id ? { ...item, ...updated } : item));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update ticket.'); } finally { setBusy(''); }
  }
  return (
    <AdminShell>
      <h1>Support queue</h1>
      <p>Support tickets are shown with operational metadata only.</p>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="case-list">
        {tickets.map((ticket) => (
          <article className="case-item" key={ticket.id}>
            <div><strong>{ticket.subject}</strong><span>{ticket.priority} · {ticket.status} · {ticket.userId ?? 'Unlinked'}</span></div>
            <div className="actions"><small>Updated {new Date(ticket.updatedAt).toLocaleString()}</small>{ticket.status !== 'resolved' ? <button disabled={busy === ticket.id} onClick={() => void update(ticket, 'resolved')}>Resolve</button> : null}</div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
