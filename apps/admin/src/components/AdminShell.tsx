'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const navItems = [
  ['Dashboard', '/dashboard', 'analytics.read'],
  ['Users', '/users', 'users.read'],
  ['Verification', '/verification', 'verification.review'],
  ['Reports', '/reports', 'reports.resolve'],
  ['Moderation', '/moderation', 'reports.resolve'],
  ['Appeals', '/appeals', 'reports.resolve'],
  ['Subscriptions', '/subscriptions', 'subscriptions.read'],
  ['Payment Events', '/payments', 'payments.read'],
  ['Notifications', '/notifications', 'notifications.manage'],
  ['Feature Flags', '/flags', 'configuration.manage'],
  ['Roles', '/roles', 'configuration.manage'],
  ['Matching', '/matching', 'configuration.manage'],
  ['Content', '/content', 'configuration.manage'],
  ['Support', '/support', 'support.read'],
  ['Audit Logs', '/audit', 'audit.read'],
  ['System Health', '/health', 'health.read'],
  ['App Versions', '/versions', 'versions.read'],
  ['Legal Docs', '/legal', 'legal.read'],
  ['Deletion Requests', '/deletion', 'users.read'],
  ['Analytics', '/analytics', 'analytics.read'],
] as const;

export function AdminShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [permissions, setPermissions] = useState<string[]>([]);
  useEffect(() => {
    const raw = window.sessionStorage.getItem('sanjari.admin.claims');
    if (raw) setPermissions((JSON.parse(raw) as { permissions?: string[] }).permissions ?? []);
  }, []);
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Sanjari Admin</div>
        <nav className="nav" aria-label="Admin navigation">
          {navItems
            .filter(([, , permission]) => !permission || permissions.includes(permission))
            .map(([label, href]) => (
              <Link key={href} href={href as never}>
                {label}
              </Link>
            ))}
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
