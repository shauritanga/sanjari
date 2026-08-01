'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { adminRequest } from '../../src/lib/admin-api';

type Ticket = { id: string; userId: string | null; subject: string; status: string; priority: string; createdAt: string; updatedAt: string };

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    void adminRequest<Ticket[]>('/admin/operations/support')
      .then((data) => setTickets(data ?? []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load support queue.'));
  }, []);
  return (
    <AdminShell>
      <h1>Support queue</h1>
      <p>Support tickets are shown with operational metadata only.</p>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="case-list">
        {tickets.map((ticket) => (
          <article className="case-item" key={ticket.id}>
            <div><strong>{ticket.subject}</strong><span>{ticket.priority} · {ticket.status} · {ticket.userId ?? 'Unlinked'}</span></div>
            <small>Updated {new Date(ticket.updatedAt).toLocaleString()}</small>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
