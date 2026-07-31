import { AdminShell } from '../../src/components/AdminShell';

export default function PaymentsPage() {
  return <AdminShell><h1>Payment-event logs</h1><p>Webhook events are processed idempotently and retain signature status.</p></AdminShell>;
}
