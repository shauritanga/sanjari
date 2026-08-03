'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { PageHeader } from '../../src/components/PageHeader';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { StatusBadge } from '../../src/components/StatusBadge';
import { DataTable, DataTableColumn } from '../../src/components/DataTable';
import { ResponsiveDataList } from '../../src/components/ResponsiveDataList';
import { adminRequest } from '../../src/lib/admin-api';

type Case = {
  id: string;
  status: string;
  report: { category: string; priority: string };
  actions: Array<{ action: string }>;
};

export default function ReportsPage() {
  const [items, setItems] = useState<Case[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    void adminRequest<Case[]>('/admin/moderation/queue')
      .then((data) => setItems(data ?? []))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load reports.'),
      );
  }, []);

  const columns: DataTableColumn<Case>[] = [
    { key: 'category', header: 'Category', render: (item) => item.report.category },
    { key: 'priority', header: 'Priority', render: (item) => item.report.priority },
    { key: 'status', header: 'Status', render: (item) => <StatusBadge status={item.status} /> },
    { key: 'open', header: 'Case', render: () => <a href="/moderation">Open case</a> },
  ];

  return (
    <AdminShell>
      <PageHeader title="Reports queue" description="High-risk reports are prioritized for human moderation." />
      {error ? <ErrorState message={error} /> : null}
      {items === null && !error ? <LoadingState label="Loading reports" /> : null}
      {items && items.length === 0 ? <EmptyState description="No reports are awaiting review." /> : null}
      {items && items.length > 0 ? (
        <>
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(item) => item.id}
            caption="Reports queue"
          />
          <ResponsiveDataList columns={columns} rows={items} rowKey={(item) => item.id} />
        </>
      ) : null}
    </AdminShell>
  );
}
