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

type QueuedPhoto = {
  id: string;
  moderationStatus: string;
  createdAt: string;
  userId: string;
  displayName: string | null;
  email: string;
  url: string;
};

type ReviewAction = 'approved' | 'rejected' | 'hidden';

export default function PhotosPage() {
  const [items, setItems] = useState<QueuedPhoto[] | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busyId, setBusyId] = useState('');
  const [pending, setPending] = useState<{ item: QueuedPhoto; status: ReviewAction } | null>(null);

  function load() {
    setError('');
    void adminRequest<QueuedPhoto[]>('/admin/operations/photos/queue')
      .then((data) => setItems(data ?? []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load the photo queue.'));
  }

  useEffect(() => {
    load();
  }, []);

  async function review() {
    if (!pending) return;
    const { item, status } = pending;
    setBusyId(item.id);
    try {
      await adminRequest(`/admin/operations/photos/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          reason: `Human reviewer marked this photo as ${status}.`,
        }),
      });
      setItems((current) => current?.filter((entry) => entry.id !== item.id) ?? null);
      setToast(
        status === 'approved'
          ? 'Photo approved — now visible to other members.'
          : status === 'rejected'
            ? 'Photo rejected.'
            : 'Photo hidden.',
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to review this photo.');
    } finally {
      setBusyId('');
      setPending(null);
    }
  }

  return (
    <AdminShell>
      <PageHeader
        title="Photo review"
        description="Newly uploaded photos wait here until a moderator approves them — approved photos become visible to other members in discovery."
      />
      {error ? <ErrorState message={error} /> : null}
      {items === null && !error ? <LoadingState label="Loading photo queue" /> : null}
      {items && items.length === 0 ? <EmptyState description="No photos are awaiting review." /> : null}
      <div className="photo-grid">
        {items?.map((item) => (
          <article className="photo-card" key={item.id}>
            <img className="photo-card-image" src={item.url} alt={`Submitted by ${item.displayName ?? item.email}`} />
            <div className="photo-card-body">
              <strong>{item.displayName ?? 'Sanjari member'}</strong>
              <span>{item.email}</span>
              <span>
                <StatusBadge status={item.moderationStatus} /> · Submitted {new Date(item.createdAt).toLocaleString()}
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
        title={
          pending?.status === 'approved'
            ? 'Approve this photo?'
            : pending?.status === 'rejected'
              ? 'Reject this photo?'
              : 'Hide this photo?'
        }
        description={`Confirm marking ${pending?.item.displayName ?? 'this member'}'s photo as ${pending?.status ?? ''}.`}
        confirmLabel={pending?.status === 'approved' ? 'Approve' : pending?.status === 'rejected' ? 'Reject' : 'Hide'}
        busy={busyId === pending?.item.id}
        onConfirm={() => void review()}
        onClose={() => setPending(null)}
      />
      {toast ? <Toast message={toast} tone="success" onDismiss={() => setToast('')} /> : null}
    </AdminShell>
  );
}
