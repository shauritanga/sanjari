'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { PageHeader } from '../../src/components/PageHeader';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { ConfirmDialog } from '../../src/components/ConfirmDialog';
import { Toast } from '../../src/components/Toast';
import { adminRequest } from '../../src/lib/admin-api';

type AppealCase = {
  id: string;
  status: string;
  report: { category: string; priority: string };
  appeals: Array<{ id: string; userId: string; statement: string; createdAt: string }>;
};

export default function AppealsPage() {
  const [items, setItems] = useState<AppealCase[] | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ appealId: string; caseId: string; status: 'upheld' | 'overturned' } | null>(null);

  function load() {
    setError('');
    void adminRequest<AppealCase[]>('/admin/moderation/appeals')
      .then((data) => setItems(data ?? []))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load appeals.'),
      );
  }

  useEffect(() => {
    load();
  }, []);

  async function resolve() {
    if (!pending) return;
    setBusy(true);
    try {
      await adminRequest(`/admin/moderation/appeals/${pending.appealId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: pending.status,
          reason:
            pending.status === 'overturned'
              ? 'Appeal reviewed and the original enforcement action was reversed.'
              : 'Appeal reviewed and the original enforcement action was upheld.',
        }),
      });
      setItems((current) => current?.filter((entry) => entry.id !== pending.caseId) ?? null);
      setToast(pending.status === 'overturned' ? 'Appeal overturned — account restored.' : 'Appeal upheld.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to resolve appeal.');
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  return (
    <AdminShell>
      <PageHeader title="Appeals" description="Appeals are reviewed separately from the original enforcement action." />
      {error ? <ErrorState message={error} /> : null}
      {items === null && !error ? <LoadingState label="Loading appeals" /> : null}
      {items && items.length === 0 ? <EmptyState description="No appeals are awaiting review." /> : null}
      <div className="case-list">
        {items?.map((item) => {
          const appeal = item.appeals[0];
          if (!appeal) return null;
          return (
            <article className="case-item" key={item.id}>
              <div>
                <strong>{item.report.category}</strong>
                <span>
                  {item.report.priority} · {item.status}
                </span>
                <p>{appeal.statement}</p>
              </div>
              <div className="actions">
                <button
                  className="secondary-button"
                  onClick={() => setPending({ appealId: appeal.id, caseId: item.id, status: 'upheld' })}
                >
                  Uphold
                </button>
                <button
                  className="primary-button"
                  onClick={() => setPending({ appealId: appeal.id, caseId: item.id, status: 'overturned' })}
                >
                  Overturn
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <ConfirmDialog
        open={pending !== null}
        title={pending?.status === 'overturned' ? 'Overturn this appeal?' : 'Uphold this appeal?'}
        description={
          pending?.status === 'overturned'
            ? 'The original enforcement action will be reversed and the account will be restored to active.'
            : 'The original enforcement action stays in effect and the appeal is closed.'
        }
        confirmLabel={pending?.status === 'overturned' ? 'Overturn' : 'Uphold'}
        busy={busy}
        onConfirm={() => void resolve()}
        onClose={() => setPending(null)}
      />
      {toast ? <Toast message={toast} tone="success" onDismiss={() => setToast('')} /> : null}
    </AdminShell>
  );
}
