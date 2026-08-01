'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '../../src/components/AdminShell';
import { adminRequest } from '../../src/lib/admin-api';

const metricLabels = [
  ['Users', 'users'],
  ['Active users', 'activeUsers'],
  ['Completed profiles', 'profiles'],
  ['Verified profiles', 'verifiedProfiles'],
  ['Likes', 'likes'],
  ['Matches', 'matches'],
  ['Conversations', 'conversations'],
  ['Messages', 'messages'],
  ['Open reports', 'reports'],
  ['Suspensions', 'suspensions'],
  ['Failed jobs', 'failedJobs'],
] as const;

type Metrics = {
  users: number;
  activeUsers: number;
  profiles: number;
  verifiedProfiles: number;
  likes: number;
  matches: number;
  conversations: number;
  messages: number;
  reports: number;
  suspensions: number;
  failedJobs: number;
};

export default function DashboardPage() {
  const [dashboardMetrics, setDashboardMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    void adminRequest<Metrics>('/admin/operations/dashboard')
      .then((data) => setDashboardMetrics(data ?? null))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load dashboard.'),
      );
  }, []);
  return (
    <AdminShell>
      <h1>Dashboard</h1>
      <p>Operational overview for moderation, trust, safety, subscriptions, and platform health.</p>
      {error ? <p className="error-text">{error}</p> : null}
      <section className="metrics" aria-label="Platform metrics">
        {metricLabels.map(([label, key]) => (
          <div className="metric" key={label}>
            <span>{label}</span>
            <strong>{dashboardMetrics ? dashboardMetrics[key] : '...'}</strong>
          </div>
        ))}
      </section>
    </AdminShell>
  );
}
