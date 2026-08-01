'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { adminRequest } from '../../src/lib/admin-api';

type Metrics = { unreadNotifications: number; openSupportTickets: number; failedExports: number; failedJobs: number; recentAuditEvents: number };
const labels: Array<[string, keyof Metrics]> = [
  ['Unread notifications', 'unreadNotifications'],
  ['Open support tickets', 'openSupportTickets'],
  ['Failed exports', 'failedExports'],
  ['Failed jobs', 'failedJobs'],
  ['Audit events, 24h', 'recentAuditEvents'],
];

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    void adminRequest<Metrics>('/admin/operations/analytics')
      .then((data) => setMetrics(data ?? null))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load analytics.'));
  }, []);
  return (
    <AdminShell>
      <h1>Operational analytics</h1>
      <p>Aggregate queue, rights-processing, job, and audit signals.</p>
      {error ? <p className="error-text">{error}</p> : null}
      <section className="metrics" aria-label="Operational analytics">
        {labels.map(([label, key]) => <div className="metric" key={key}><span>{label}</span><strong>{metrics?.[key] ?? '...'}</strong></div>)}
      </section>
    </AdminShell>
  );
}
