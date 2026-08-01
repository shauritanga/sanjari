'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { adminRequest } from '../../src/lib/admin-api';

type Job = { id: string; queue: string; jobKey: string; status: string; attempts: number; lastError: string | null; updatedAt: string };
type Health = { failedJobs: number; activeJobs: number; recentJobs: Job[] };

export default function HealthPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    void adminRequest<Health>('/admin/operations/health')
      .then((data) => setHealth(data ?? null))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load system health.'));
  }, []);
  return (
    <AdminShell>
      <h1>System health</h1>
      <p>Background-job health and recent failures for authorized operators.</p>
      {error ? <p className="error-text">{error}</p> : null}
      <section className="metrics" aria-label="Job health metrics">
        <div className="metric"><span>Failed jobs</span><strong>{health?.failedJobs ?? '...'}</strong></div>
        <div className="metric"><span>Active jobs</span><strong>{health?.activeJobs ?? '...'}</strong></div>
      </section>
      <div className="case-list">
        {health?.recentJobs.map((job) => (
          <article className="case-item" key={job.id}><div><strong>{job.queue}</strong><span>{job.jobKey} · {job.status} · {job.attempts} attempts</span>{job.lastError ? <p>{job.lastError}</p> : null}</div><small>{new Date(job.updatedAt).toLocaleString()}</small></article>
        ))}
      </div>
    </AdminShell>
  );
}
