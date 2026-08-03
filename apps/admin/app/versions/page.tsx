'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { PageHeader } from '../../src/components/PageHeader';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { Toast } from '../../src/components/Toast';
import { adminRequest } from '../../src/lib/admin-api';

type PlatformPolicy = {
  minSupportedVersion: string;
  latestVersion: string;
  forceUpdate: boolean;
  rolloutPercentage: number;
  releaseNotes: string | null;
  updatedAt: string | null;
};

type AppVersions = { ios: PlatformPolicy; android: PlatformPolicy };

export default function VersionsPage() {
  const [versions, setVersions] = useState<AppVersions | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [savingPlatform, setSavingPlatform] = useState<'ios' | 'android' | ''>('');

  useEffect(() => {
    void adminRequest<AppVersions>('/admin/operations/app-versions')
      .then((data) => { if (data) setVersions(data); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load app versions.'));
  }, []);

  async function save(platform: 'ios' | 'android', event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!versions) return;
    const policy = versions[platform];
    setSavingPlatform(platform);
    try {
      const updated = await adminRequest<AppVersions>('/admin/operations/app-versions', {
        method: 'PATCH',
        body: JSON.stringify({ platform, ...policy }),
      });
      if (updated) setVersions(updated);
      setToast(`${platform === 'ios' ? 'iOS' : 'Android'} rollout policy updated.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save rollout policy.');
    } finally {
      setSavingPlatform('');
    }
  }

  function updatePlatform(platform: 'ios' | 'android', patch: Partial<PlatformPolicy>) {
    if (!versions) return;
    setVersions({ ...versions, [platform]: { ...versions[platform], ...patch } });
  }

  function PlatformForm({ platform, label }: { platform: 'ios' | 'android'; label: string }) {
    if (!versions) return null;
    const policy = versions[platform];
    return (
      <form className="panel" onSubmit={(event) => void save(platform, event)} style={{ display: 'grid', gap: 16 }}>
        <h2>{label}</h2>
        <label className="search-field">
          <span>Minimum supported version</span>
          <input
            value={policy.minSupportedVersion}
            onChange={(event) => updatePlatform(platform, { minSupportedVersion: event.target.value })}
            placeholder="1.0.0"
            maxLength={20}
          />
        </label>
        <label className="search-field">
          <span>Latest version</span>
          <input
            value={policy.latestVersion}
            onChange={(event) => updatePlatform(platform, { latestVersion: event.target.value })}
            placeholder="1.2.0"
            maxLength={20}
          />
        </label>
        <label className="search-field">
          <span>Rollout percentage</span>
          <input
            type="number"
            min={0}
            max={100}
            value={policy.rolloutPercentage}
            onChange={(event) => updatePlatform(platform, { rolloutPercentage: Number(event.target.value) })}
          />
        </label>
        <label className="search-field">
          <span>Release notes</span>
          <textarea
            value={policy.releaseNotes ?? ''}
            onChange={(event) => updatePlatform(platform, { releaseNotes: event.target.value })}
            maxLength={2000}
            rows={3}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={policy.forceUpdate}
            onChange={(event) => updatePlatform(platform, { forceUpdate: event.target.checked })}
          />
          Force update below minimum supported version
        </label>
        <p>{policy.updatedAt ? `Last updated ${new Date(policy.updatedAt).toLocaleString()}.` : 'Using built-in defaults.'}</p>
        <button className="primary-button" type="submit" disabled={savingPlatform === platform}>
          {savingPlatform === platform ? 'Saving...' : `Save ${label} policy`}
        </button>
      </form>
    );
  }

  return (
    <AdminShell>
      <PageHeader
        title="Application versions"
        description="Mandatory-update thresholds and staged-rollout percentages, read by the mobile app's version-gate on launch."
      />
      {error ? <ErrorState message={error} /> : null}
      {!versions && !error ? <LoadingState label="Loading app versions" /> : null}
      {versions ? (
        <div className="dashboard-grid">
          <PlatformForm platform="ios" label="iOS" />
          <PlatformForm platform="android" label="Android" />
        </div>
      ) : null}
      {toast ? <Toast message={toast} tone="success" onDismiss={() => setToast('')} /> : null}
    </AdminShell>
  );
}
