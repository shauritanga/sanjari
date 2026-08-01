'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { adminRequest } from '../../src/lib/admin-api';

type PaymentEvent = {
  id: string;
  provider: string;
  externalEventId: string;
  eventType: string;
  signatureValid: boolean;
  processedAt: string | null;
  createdAt: string;
};

export default function PaymentsPage() {
  const [items, setItems] = useState<PaymentEvent[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    void adminRequest<PaymentEvent[]>('/admin/operations/payments')
      .then((data) => setItems(data ?? []))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load payment events.'),
      );
  }, []);
  return (
    <AdminShell>
      <h1>Payment-event logs</h1>
      <p>
        Webhook events are processed idempotently and retain signature status. Payloads are redacted
        by default.
      </p>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="case-list">
        {items.map((item) => (
          <article className="case-item" key={item.id}>
            <div>
              <strong>{item.eventType}</strong>
              <span>
                {item.provider} · {item.signatureValid ? 'signature valid' : 'signature invalid'} ·{' '}
                {item.externalEventId}
              </span>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
