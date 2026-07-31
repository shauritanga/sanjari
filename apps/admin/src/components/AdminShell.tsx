import Link from 'next/link';

const navItems = [
  ['Dashboard', '/dashboard'],
  ['Users', '/users'],
  ['Verification', '/verification'],
  ['Reports', '/reports'],
  ['Moderation', '/moderation'],
  ['Appeals', '/appeals'],
  ['Subscriptions', '/subscriptions'],
  ['Payment Events', '/payments'],
  ['Notifications', '/notifications'],
  ['Feature Flags', '/flags'],
  ['Matching', '/matching'],
  ['Content', '/content'],
  ['Support', '/support'],
  ['Audit Logs', '/audit'],
  ['System Health', '/health'],
  ['App Versions', '/versions'],
  ['Legal Docs', '/legal'],
  ['Deletion Requests', '/deletion'],
  ['Analytics', '/analytics']
] as const;

export function AdminShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Sanjari Admin</div>
        <nav className="nav" aria-label="Admin navigation">
          {navItems.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
