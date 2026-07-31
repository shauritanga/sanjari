import { AdminShell } from '../../src/components/AdminShell';

export default function HealthPage() {
  return <AdminShell><h1>System health</h1><p>API, database, Redis, queues, storage, and notification providers are monitored.</p></AdminShell>;
}
