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

type DeletionRequest = {
  id: string;
  userId: string;
  status: string;
  reason: string | null;
  executeAfter: string;
  createdAt: string;
  user: { id: string; email: string; profile: { displayName: string | null } | null } | null;
};

export default function DeletionPage() {
  const [items, setItems] = useState<DeletionRequest[] | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ id: string; action: 'cancel' | 'expedite' } | null>(null);

  function load() {
    setError('');
    void adminRequest<DeletionRequest[]>('/admin/operations/deletion-requests')
      .then((data) => setItems(data ?? []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load deletion requests.'));
  }

  useEffect(() => {
    load();
  }, []);

  async function act() {
    if (!pending) return;
    setBusy(true);
    try {
      await adminRequest(`/admin/operations/deletion-requests/${pending.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action: pending.action,
          reason:
            pending.action === 'cancel'
              ? 'Deletion request cancelled after authorized staff review.'
              : 'Deletion request expedited after authorized staff review.',
        }),
      });
      setToast(pending.action === 'cancel' ? 'Deletion request cancelled.' : 'Deletion request expedited.');
      load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update deletion request.');
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  return (
    <AdminShell>
      <PageHeader
        title="Data-deletion requests"
        description="Deletion requests follow retention, evidence preservation, and legal hold rules. Cancel or expedite pending requests here."
      />
      {error ? <ErrorState message={error} /> : null}
      {items === null && !error ? <LoadingState label="Loading deletion requests" /> : null}
      {items && items.length === 0 ? <EmptyState description="No account-deletion requests are pending." /> : null}
      <div className="case-list">
        {items?.map((item) => {
          const actionable = ['requested', 'scheduled'].includes(item.status);
          return (
            <article className="case-item" key={item.id}>
              <div>
                <strong>{item.user?.profile?.displayName ?? item.user?.email ?? item.userId}</strong>
                <span>
                  <StatusBadge status={item.status} /> · Scheduled for {new Date(item.executeAfter).toLocaleString()}
                </span>
                {item.reason ? <p>{item.reason}</p> : null}
              </div>
              {actionable ? (
                <div className="actions">
                  <button className="secondary-button" onClick={() => setPending({ id: item.id, action: 'cancel' })}>
                    Cancel
                  </button>
                  <button className="danger-button" onClick={() => setPending({ id: item.id, action: 'expedite' })}>
                    Expedite
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      <ConfirmDialog
        open={pending !== null}
        title={pending?.action === 'cancel' ? 'Cancel this deletion request?' : 'Expedite this deletion request?'}
        description={
          pending?.action === 'cancel'
            ? 'The account will no longer be scheduled for deletion.'
            : 'The account will become eligible for deletion on the next processing run instead of waiting out the retention window.'
        }
        confirmLabel={pending?.action === 'cancel' ? 'Cancel request' : 'Expedite'}
        busy={busy}
        onConfirm={() => void act()}
        onClose={() => setPending(null)}
      />
      {toast ? <Toast message={toast} tone="success" onDismiss={() => setToast('')} /> : null}
    </AdminShell>
  );
}
