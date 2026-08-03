'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { PageHeader } from '../../src/components/PageHeader';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { StatusBadge } from '../../src/components/StatusBadge';
import { MetricGrid, MetricItem } from '../../src/components/MetricGrid';
import { DataTable, DataTableColumn } from '../../src/components/DataTable';
import { ResponsiveDataList } from '../../src/components/ResponsiveDataList';
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

  const metricItems: MetricItem[] = [
    { id: 'failedJobs', label: 'Failed jobs', value: health?.failedJobs ?? '...', tone: health && health.failedJobs > 0 ? 'error' : 'default' },
    { id: 'activeJobs', label: 'Active jobs', value: health?.activeJobs ?? '...' },
  ];

  const columns: DataTableColumn<Job>[] = [
    { key: 'queue', header: 'Queue', render: (job) => job.queue },
    { key: 'jobKey', header: 'Job', render: (job) => job.jobKey },
    { key: 'status', header: 'Status', render: (job) => <StatusBadge status={job.status} /> },
    { key: 'attempts', header: 'Attempts', render: (job) => job.attempts },
    { key: 'lastError', header: 'Last error', render: (job) => job.lastError ?? '—' },
    { key: 'updatedAt', header: 'Updated', render: (job) => new Date(job.updatedAt).toLocaleString() },
  ];

  return (
    <AdminShell>
      <PageHeader title="System health" description="Background-job health and recent failures for authorized operators." />
      {error ? <ErrorState message={error} /> : null}
      {health === null && !error ? <LoadingState label="Loading system health" /> : null}
      {health ? <MetricGrid items={metricItems} label="Job health metrics" /> : null}
      {health && health.recentJobs.length === 0 ? <EmptyState description="No recent job activity to show." /> : null}
      {health && health.recentJobs.length > 0 ? (
        <>
          <DataTable columns={columns} rows={health.recentJobs} rowKey={(job) => job.id} caption="Recent jobs" />
          <ResponsiveDataList columns={columns} rows={health.recentJobs} rowKey={(job) => job.id} />
        </>
      ) : null}
    </AdminShell>
  );
}
