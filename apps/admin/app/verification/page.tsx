'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { adminRequest } from '../../src/lib/admin-api';

type VerificationCase = {
  id: string;
  userId: string;
  type: string;
  status: string;
  provider: string | null;
  confidence: string | null;
};

export default function VerificationPage() {
  const [items, setItems] = useState<VerificationCase[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    void adminRequest<VerificationCase[]>('/admin/operations/verification')
      .then((data) => setItems(data ?? []))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load verification queue.'),
      );
  }, []);
  async function review(item: VerificationCase, status: 'approved' | 'rejected') {
    if (!window.confirm(`Confirm ${status} for verification case ${item.id}?`)) return;
    try {
      await adminRequest(`/admin/operations/verification/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          reason: `Human reviewer ${status} this verification case.`,
        }),
      });
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to review case.');
    }
  }
  return (
    <AdminShell>
      <h1>Verification queue</h1>
      <p>Selfie and identity-document review access is audited.</p>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="case-list">
        {items.map((item) => (
          <article className="case-item" key={item.id}>
            <div>
              <strong>{item.type}</strong>
              <span>
                {item.status} · {item.provider ?? 'manual review'} · user {item.userId}
              </span>
            </div>
            <div className="actions">
              <button onClick={() => void review(item, 'approved')}>Approve</button>
              <button onClick={() => void review(item, 'rejected')}>Reject</button>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
