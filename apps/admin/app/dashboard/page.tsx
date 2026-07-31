import { AdminShell } from '../../src/components/AdminShell';

const metrics = [
  ['New registrations', '0'],
  ['Active users', '0'],
  ['Completed profiles', '0'],
  ['Verified profiles', '0'],
  ['Likes', '0'],
  ['Matches', '0'],
  ['Conversations', '0'],
  ['Messages', '0'],
  ['Reports', '0'],
  ['Suspensions', '0'],
  ['Subscription conversion', '0%'],
  ['Failed jobs', '0']
] as const;

export default function DashboardPage() {
  return (
    <AdminShell>
      <h1>Dashboard</h1>
      <p>Operational overview for moderation, trust, safety, subscriptions, and platform health.</p>
      <section className="metrics" aria-label="Platform metrics">
        {metrics.map(([label, value]) => (
          <div className="metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>
    </AdminShell>
  );
}
