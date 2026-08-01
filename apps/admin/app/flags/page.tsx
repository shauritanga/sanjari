'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { adminRequest } from '../../src/lib/admin-api';

type Flag = { id: string; key: string; enabled: boolean; rules: unknown; updatedAt: string };

export default function FlagsPage() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  useEffect(() => {
    void adminRequest<Flag[]>('/admin/operations/flags')
      .then((data) => setFlags(data ?? []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load flags.'));
  }, []);
  async function toggle(flag: Flag) {
    if (!window.confirm(`${flag.enabled ? 'Disable' : 'Enable'} ${flag.key}?`)) return;
    setBusy(flag.id);
    try {
      const updated = await adminRequest<Flag>(`/admin/operations/flags/${flag.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !flag.enabled }),
      });
      if (updated) {
        setFlags((current) => current.map((item) => (item.id === flag.id ? updated : item)));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update flag.');
    } finally {
      setBusy('');
    }
  }
  return (
    <AdminShell>
      <h1>Feature flags</h1>
      <p>Controlled rollout switches are permission-gated and audited.</p>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="case-list">
        {flags.map((flag) => (
          <article className="case-item" key={flag.id}>
            <div>
              <strong>{flag.key}</strong>
              <span>{flag.enabled ? 'Enabled' : 'Disabled'} · Updated {new Date(flag.updatedAt).toLocaleString()}</span>
            </div>
            <button disabled={busy === flag.id} onClick={() => void toggle(flag)}>
              {busy === flag.id ? 'Saving...' : flag.enabled ? 'Disable' : 'Enable'}
            </button>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
