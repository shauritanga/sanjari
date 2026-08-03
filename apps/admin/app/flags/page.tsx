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

type Flag = { id: string; key: string; enabled: boolean; rules: unknown; updatedAt: string };

export default function FlagsPage() {
  const [flags, setFlags] = useState<Flag[] | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState('');
  const [pending, setPending] = useState<Flag | null>(null);
  useEffect(() => {
    void adminRequest<Flag[]>('/admin/operations/flags')
      .then((data) => setFlags(data ?? []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load flags.'));
  }, []);
  async function toggle() {
    if (!pending) return;
    setBusy(pending.id);
    try {
      const updated = await adminRequest<Flag>(`/admin/operations/flags/${pending.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !pending.enabled }),
      });
      if (updated) {
        setFlags((current) => current?.map((item) => (item.id === pending.id ? updated : item)) ?? null);
      }
      setToast(pending.enabled ? `${pending.key} disabled.` : `${pending.key} enabled.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update flag.');
    } finally {
      setBusy('');
      setPending(null);
    }
  }
  return (
    <AdminShell>
      <PageHeader title="Feature flags" description="Controlled rollout switches are permission-gated and audited." />
      {error ? <ErrorState message={error} /> : null}
      {flags === null && !error ? <LoadingState label="Loading feature flags" /> : null}
      {flags && flags.length === 0 ? <EmptyState description="No feature flags have been configured yet." /> : null}
      <div className="case-list">
        {flags?.map((flag) => (
          <article className="case-item" key={flag.id}>
            <div>
              <strong>{flag.key}</strong>
              <span><StatusBadge status={flag.enabled ? 'active' : 'suspended'} label={flag.enabled ? 'Enabled' : 'Disabled'} /> · Updated {new Date(flag.updatedAt).toLocaleString()}</span>
            </div>
            <button className="secondary-button" disabled={busy === flag.id} onClick={() => setPending(flag)}>
              {busy === flag.id ? 'Saving...' : flag.enabled ? 'Disable' : 'Enable'}
            </button>
          </article>
        ))}
      </div>
      <ConfirmDialog
        open={pending !== null}
        title={pending?.enabled ? `Disable ${pending?.key}?` : `Enable ${pending?.key}?`}
        confirmLabel={pending?.enabled ? 'Disable' : 'Enable'}
        busy={busy === pending?.id}
        onConfirm={() => void toggle()}
        onClose={() => setPending(null)}
      />
      {toast ? <Toast message={toast} tone="success" onDismiss={() => setToast('')} /> : null}
    </AdminShell>
  );
}
