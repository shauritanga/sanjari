'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { PageHeader } from '../../src/components/PageHeader';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { Toast } from '../../src/components/Toast';
import { adminRequest } from '../../src/lib/admin-api';

type MatchingWeights = {
  sharedInterestWeight: number;
  sharedInterestCap: number;
  completenessWeight: number;
  verificationBonus: number;
  updatedAt: string | null;
};

export default function MatchingPage() {
  const [weights, setWeights] = useState<MatchingWeights | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void adminRequest<MatchingWeights>('/admin/operations/matching-config')
      .then((data) => { if (data) setWeights(data); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load matching configuration.'));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!weights) return;
    setSaving(true);
    try {
      const updated = await adminRequest<MatchingWeights>('/admin/operations/matching-config', {
        method: 'PATCH',
        body: JSON.stringify({
          sharedInterestWeight: weights.sharedInterestWeight,
          sharedInterestCap: weights.sharedInterestCap,
          completenessWeight: weights.completenessWeight,
          verificationBonus: weights.verificationBonus,
        }),
      });
      if (updated) setWeights(updated);
      setToast('Matching weights updated — live for the next discovery request.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save matching configuration.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell>
      <PageHeader
        title="Matching configuration"
        description="These weights are read directly by the discovery ranking algorithm on every request — changes take effect immediately."
      />
      {error ? <ErrorState message={error} /> : null}
      {!weights && !error ? <LoadingState label="Loading matching configuration" /> : null}
      {weights ? (
        <form className="panel" onSubmit={(event) => void save(event)} style={{ display: 'grid', gap: 18, maxWidth: 560 }}>
          <label className="search-field">
            <span>Shared-interest weight (points per shared interest)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={weights.sharedInterestWeight}
              onChange={(event) => setWeights({ ...weights, sharedInterestWeight: Number(event.target.value) })}
            />
          </label>
          <label className="search-field">
            <span>Shared-interest cap (max points from interests)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={weights.sharedInterestCap}
              onChange={(event) => setWeights({ ...weights, sharedInterestCap: Number(event.target.value) })}
            />
          </label>
          <label className="search-field">
            <span>Profile-completeness weight (0–1, fraction of completion score)</span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={weights.completenessWeight}
              onChange={(event) => setWeights({ ...weights, completenessWeight: Number(event.target.value) })}
            />
          </label>
          <label className="search-field">
            <span>Verified-profile bonus (points)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={weights.verificationBonus}
              onChange={(event) => setWeights({ ...weights, verificationBonus: Number(event.target.value) })}
            />
          </label>
          <p>
            {weights.updatedAt
              ? `Last updated ${new Date(weights.updatedAt).toLocaleString()}.`
              : 'Using the built-in defaults — no override has been saved yet.'}
          </p>
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save weights'}
          </button>
        </form>
      ) : null}
      {toast ? <Toast message={toast} tone="success" onDismiss={() => setToast('')} /> : null}
    </AdminShell>
  );
}
