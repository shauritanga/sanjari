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

type PaymentEvent = {
  id: string;
  provider: string;
  externalEventId: string;
  eventType: string;
  signatureValid: boolean;
  processedAt: string | null;
  createdAt: string;
};

export default function PaymentsPage() {
  const [items, setItems] = useState<PaymentEvent[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    void adminRequest<PaymentEvent[]>('/admin/operations/payments')
      .then((data) => setItems(data ?? []))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load payment events.'),
      );
  }, []);

  const columns: DataTableColumn<PaymentEvent>[] = [
    { key: 'eventType', header: 'Event', render: (item) => item.eventType },
    { key: 'provider', header: 'Provider', render: (item) => item.provider },
    {
      key: 'signature',
      header: 'Signature',
      render: (item) => <StatusBadge status={item.signatureValid ? 'valid' : 'invalid'} label={item.signatureValid ? 'Signature valid' : 'Signature invalid'} />,
    },
    { key: 'externalEventId', header: 'External event ID', render: (item) => item.externalEventId },
  ];

  return (
    <AdminShell>
      <PageHeader
        title="Payment-event logs"
        description="Webhook events are processed idempotently and retain signature status. Payloads are redacted by default."
      />
      {error ? <ErrorState message={error} /> : null}
      {items === null && !error ? <LoadingState label="Loading payment events" /> : null}
      {items && items.length === 0 ? <EmptyState description="No payment events have been recorded yet." /> : null}
      {items && items.length > 0 ? (
        <>
          <DataTable columns={columns} rows={items} rowKey={(item) => item.id} caption="Payment-event logs" />
          <ResponsiveDataList columns={columns} rows={items} rowKey={(item) => item.id} />
        </>
      ) : null}
    </AdminShell>
  );
}
