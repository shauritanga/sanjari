'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { PageHeader } from '../../src/components/PageHeader';
import { ErrorState } from '../../src/components/ErrorState';
import { MetricGrid, MetricItem } from '../../src/components/MetricGrid';
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

  const metricItems: MetricItem[] = labels.map(([label, key]) => ({
    id: key,
    label,
    value: metrics?.[key] ?? '...',
  }));

  return (
    <AdminShell>
      <PageHeader title="Operational analytics" description="Aggregate queue, rights-processing, job, and audit signals." />
      {error ? <ErrorState message={error} /> : null}
      <MetricGrid items={metricItems} label="Operational analytics" />
    </AdminShell>
  );
}
