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

type VerificationCase = {
  id: string;
  userId: string;
  type: string;
  status: string;
  provider: string | null;
  confidence: string | null;
};

type VerificationCodes = {
  enabled: boolean;
  email: Array<{ id: string; userId: string; email: string; testCode: string | null; expiresAt: string; attempts: number }>;
  phone: Array<{ id: string; userId: string; phoneNumber: string; testCode: string | null; expiresAt: string; attempts: number }>;
};

export default function VerificationPage() {
  const [items, setItems] = useState<VerificationCase[] | null>(null);
  const [codes, setCodes] = useState<VerificationCodes | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busyId, setBusyId] = useState('');
  const [pending, setPending] = useState<{ item: VerificationCase; status: 'approved' | 'rejected' } | null>(null);

  useEffect(() => {
    void adminRequest<VerificationCase[]>('/admin/operations/verification')
      .then((data) => setItems(data ?? []))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load verification queue.'),
      );
    void adminRequest<VerificationCodes>('/admin/operations/verification-codes')
      .then((data) => { if (data) setCodes(data); })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load test verification codes.'),
      );
  }, []);

  async function review() {
    if (!pending) return;
    const { item, status } = pending;
    setBusyId(item.id);
    try {
      await adminRequest(`/admin/operations/verification/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          reason: `Human reviewer ${status} this verification case.`,
        }),
      });
      setItems((current) => current?.filter((entry) => entry.id !== item.id) ?? null);
      setToast(status === 'approved' ? 'Verification case approved.' : 'Verification case rejected.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to review case.');
    } finally {
      setBusyId('');
      setPending(null);
    }
  }

  return (
    <AdminShell>
      <PageHeader title="Verification queue" description="Selfie and identity-document review access is audited." />
      {codes?.enabled ? (
        <section className="case-list">
          <h2>Test verification codes</h2>
          <p>Temporary test-only codes. Share them with the matching tester before they expire.</p>
          {[...codes.email.map((item) => ({ ...item, channel: 'Email', recipient: item.email })), ...codes.phone.map((item) => ({ ...item, channel: 'Phone', recipient: item.phoneNumber }))].map((item) => (
            <article className="case-item" key={`${item.channel}-${item.id}`}>
              <div>
                <strong>{item.channel}: {item.recipient}</strong>
                <span>User {item.userId} · expires {new Date(item.expiresAt).toLocaleTimeString()}</span>
              </div>
              <strong>{item.testCode ?? 'Unavailable'}</strong>
            </article>
          ))}
          {!codes.email.length && !codes.phone.length ? <p>No active codes.</p> : null}
        </section>
      ) : null}
      {error ? <ErrorState message={error} /> : null}
      {items === null && !error ? <LoadingState label="Loading verification queue" /> : null}
      {items && items.length === 0 ? <EmptyState description="No verification cases are awaiting review." /> : null}
      <div className="case-list">
        {items?.map((item) => (
          <article className="case-item" key={item.id}>
            <div>
              <strong>{item.type}</strong>
              <span>
                <StatusBadge status={item.status} /> · {item.provider ?? 'manual review'} · user {item.userId}
              </span>
            </div>
            <div className="actions">
              <button
                className="secondary-button"
                disabled={busyId === item.id}
                onClick={() => setPending({ item, status: 'approved' })}
              >
                Approve
              </button>
              <button
                className="danger-button"
                disabled={busyId === item.id}
                onClick={() => setPending({ item, status: 'rejected' })}
              >
                Reject
              </button>
            </div>
          </article>
        ))}
      </div>
      <ConfirmDialog
        open={pending !== null}
        title={pending?.status === 'approved' ? 'Approve this verification case?' : 'Reject this verification case?'}
        description={`Confirm ${pending?.status ?? ''} for verification case ${pending?.item.id ?? ''}.`}
        confirmLabel={pending?.status === 'approved' ? 'Approve' : 'Reject'}
        busy={busyId === pending?.item.id}
        onConfirm={() => void review()}
        onClose={() => setPending(null)}
      />
      {toast ? <Toast message={toast} tone="success" onDismiss={() => setToast('')} /> : null}
    </AdminShell>
  );
}
