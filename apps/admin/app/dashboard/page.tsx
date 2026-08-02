'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Activity, Flag, ShieldCheck } from 'lucide-react';
import { AdminShell } from '../../src/components/AdminShell';
import { adminRequest } from '../../src/lib/admin-api';

const metricLabels = [
  ['Total users', 'users'], ['Active users', 'activeUsers'], ['Completed profiles', 'profiles'],
  ['Verified profiles', 'verifiedProfiles'], ['Likes', 'likes'], ['Matches', 'matches'],
  ['Conversations', 'conversations'], ['Messages', 'messages'], ['Open reports', 'reports'],
  ['Suspensions', 'suspensions'], ['Failed jobs', 'failedJobs'],
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
      <header className="page-header">
        <div><p className="eyebrow">Sanjari operations</p><h1>Good morning, admin</h1><p>Monitor trust, safety, growth, and platform health from one place.</p></div>
        <span className="status-chip"><span className="status-dot" /> Live data</span>
      </header>
      {error ? <p className="error-text">{error}</p> : null}
      <section className="metrics" aria-label="Platform metrics">
        {metricLabels.map(([label, key]) => (
          <div className="metric" key={label}>
            <span>{label}</span>
            <strong>{dashboardMetrics ? dashboardMetrics[key] : '...'}</strong>
          </div>
        ))}
      </section>
      <section className="dashboard-section dashboard-grid" aria-label="Operations shortcuts">
        <div className="panel">
          <p className="eyebrow">Priority queues</p><h2>Keep the platform moving</h2>
          <p>Jump into the areas that need operational attention. Counts above reflect the latest API response.</p>
          <div className="quick-links">
            <Link className="quick-link" href="/verification"><span><strong>Verification queue</strong><small>Review identity submissions</small></span><ShieldCheck size={18} /></Link>
            <Link className="quick-link" href="/reports"><span><strong>Reports and moderation</strong><small>Resolve safety cases</small></span><Flag size={18} /></Link>
            <Link className="quick-link" href="/health"><span><strong>System health</strong><small>Inspect service readiness</small></span><Activity size={18} /></Link>
          </div>
        </div>
        <div className="panel"><p className="eyebrow">Admin workspace</p><h2>Operate with confidence</h2><p>Every privileged action is permission-gated and recorded in the audit log for review.</p><Link className="quick-link" href="/audit"><span><strong>View audit logs</strong><small>Review recent administrator activity</small></span><ArrowRight size={18} /></Link></div>
      </section>
    </AdminShell>
  );
}
