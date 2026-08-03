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

type Subscription = {
  id: string;
  userId: string;
  status: string;
  provider: string;
  plan: { code: string; title: string; priceCents: number; currency: string };
};

export default function SubscriptionsPage() {
  const [items, setItems] = useState<Subscription[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    void adminRequest<Subscription[]>('/admin/operations/subscriptions')
      .then((data) => setItems(data ?? []))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load subscriptions.'),
      );
  }, []);

  const columns: DataTableColumn<Subscription>[] = [
    { key: 'plan', header: 'Plan', render: (item) => item.plan.title },
    { key: 'status', header: 'Status', render: (item) => <StatusBadge status={item.status} /> },
    { key: 'provider', header: 'Provider', render: (item) => item.provider },
    { key: 'user', header: 'User', render: (item) => item.userId },
  ];

  return (
    <AdminShell>
      <PageHeader title="Subscription overview" description="Entitlements are calculated server-side from verified purchase records." />
      {error ? <ErrorState message={error} /> : null}
      {items === null && !error ? <LoadingState label="Loading subscriptions" /> : null}
      {items && items.length === 0 ? <EmptyState description="No subscriptions have been recorded yet." /> : null}
      {items && items.length > 0 ? (
        <>
          <DataTable columns={columns} rows={items} rowKey={(item) => item.id} caption="Subscription overview" />
          <ResponsiveDataList columns={columns} rows={items} rowKey={(item) => item.id} />
        </>
      ) : null}
    </AdminShell>
  );
}
