'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { PageHeader } from '../../src/components/PageHeader';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { DataTable, DataTableColumn } from '../../src/components/DataTable';
import { ResponsiveDataList } from '../../src/components/ResponsiveDataList';
import { adminRequest } from '../../src/lib/admin-api';

type Audit = {
  id: string;
  actorType: string;
  action: string;
  createdAt: string;
  metadata: unknown;
};

export default function AuditPage() {
  const [items, setItems] = useState<Audit[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    void adminRequest<Audit[]>('/admin/operations/audit')
      .then((data) => setItems(data ?? []))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load audit logs.'),
      );
  }, []);

  const columns: DataTableColumn<Audit>[] = [
    { key: 'action', header: 'Action', render: (item) => item.action },
    { key: 'actorType', header: 'Actor', render: (item) => item.actorType },
    { key: 'createdAt', header: 'Recorded', render: (item) => new Date(item.createdAt).toLocaleString() },
  ];

  return (
    <AdminShell>
      <PageHeader title="Audit logs" description="Administrative and sensitive-data access logs are immutable." />
      {error ? <ErrorState message={error} /> : null}
      {items === null && !error ? <LoadingState label="Loading audit logs" /> : null}
      {items && items.length === 0 ? <EmptyState description="No audit events have been recorded yet." /> : null}
      {items && items.length > 0 ? (
        <>
          <DataTable columns={columns} rows={items} rowKey={(item) => item.id} caption="Audit logs" />
          <ResponsiveDataList columns={columns} rows={items} rowKey={(item) => item.id} />
        </>
      ) : null}
    </AdminShell>
  );
}
