'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileCheck2,
  FileText,
  Flag,
  Gavel,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Scale,
  Settings2,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  UserRound,
  Users,
  WalletCards,
} from 'lucide-react';
import { adminRequest } from '../lib/admin-api';

type Icon = typeof LayoutDashboard;
type NavItem = { label: string; href: string; permission: string; icon: Icon };

const groups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', permission: 'analytics.read', icon: LayoutDashboard },
      { label: 'Analytics', href: '/analytics', permission: 'analytics.read', icon: BarChart3 },
    ],
  },
  {
    label: 'Trust & safety',
    items: [
      { label: 'Users', href: '/users', permission: 'users.read', icon: Users },
      { label: 'Verification', href: '/verification', permission: 'verification.review', icon: ShieldCheck },
      { label: 'Reports', href: '/reports', permission: 'reports.resolve', icon: Flag },
      { label: 'Moderation', href: '/moderation', permission: 'reports.resolve', icon: Gavel },
      { label: 'Appeals', href: '/appeals', permission: 'reports.resolve', icon: Scale },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Subscriptions', href: '/subscriptions', permission: 'subscriptions.read', icon: Sparkles },
      { label: 'Payments', href: '/payments', permission: 'payments.read', icon: WalletCards },
      { label: 'Notifications', href: '/notifications', permission: 'notifications.manage', icon: Bell },
      { label: 'Support', href: '/support', permission: 'support.read', icon: CircleHelp },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Matching', href: '/matching', permission: 'configuration.manage', icon: HeartHandshake },
      { label: 'Content', href: '/content', permission: 'configuration.manage', icon: FileCheck2 },
      { label: 'Feature flags', href: '/flags', permission: 'configuration.manage', icon: Settings2 },
      { label: 'App versions', href: '/versions', permission: 'versions.read', icon: Smartphone },
      { label: 'System health', href: '/health', permission: 'health.read', icon: Activity },
    ],
  },
  {
    label: 'Governance',
    items: [
      { label: 'Audit logs', href: '/audit', permission: 'audit.read', icon: FileText },
      { label: 'Roles', href: '/roles', permission: 'configuration.manage', icon: Shield },
      { label: 'Legal docs', href: '/legal', permission: 'legal.read', icon: FileText },
      { label: 'Deletion requests', href: '/deletion', permission: 'users.read', icon: Trash2 },
    ],
  },
];

const titles = new Map(groups.flatMap((group) => group.items.map((item) => [item.href, item.label])));

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function AdminShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const [sidebarProfileOpen, setSidebarProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [claims, setClaims] = useState<{ displayName?: string; email?: string; permissions?: string[] }>({});
  const permissions = claims.permissions ?? [];

  useEffect(() => {
    setCollapsed(window.localStorage.getItem('sanjari.admin.sidebarCollapsed') === 'true');
    setDark(window.localStorage.getItem('sanjari.admin.theme') === 'dark');
    const raw = window.sessionStorage.getItem('sanjari.admin.claims');
    if (raw) {
      try { setClaims(JSON.parse(raw) as typeof claims); } catch { window.sessionStorage.removeItem('sanjari.admin.claims'); }
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    window.localStorage.setItem('sanjari.admin.theme', dark ? 'dark' : 'light');
  }, [dark]);

  const visibleGroups = useMemo(
    () => groups.map((group) => ({ ...group, items: group.items.filter((item) => permissions.length === 0 || permissions.includes(item.permission)) })).filter((group) => group.items.length > 0),
    [permissions],
  );
  const displayName = claims.displayName || 'Administrator';
  const pageTitle = titles.get(pathname) ?? 'Dashboard';

  function toggleCollapsed() {
    setCollapsed((value) => { const next = !value; window.localStorage.setItem('sanjari.admin.sidebarCollapsed', String(next)); return next; });
  }

  async function logout() {
    try { await adminRequest('/admin/auth/logout', { method: 'POST' }); } catch { /* clear local state even if the session already expired */ }
    window.sessionStorage.removeItem('sanjari.admin.csrf');
    window.sessionStorage.removeItem('sanjari.admin.claims');
    router.replace('/login');
  }

  return (
    <div className={`shell${collapsed ? ' shell-collapsed' : ''}`}>
      {mobileOpen ? <button className="mobile-overlay" aria-label="Close navigation" onClick={() => setMobileOpen(false)} /> : null}
      <aside className={`sidebar${mobileOpen ? ' sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <span className="brand-mark">S</span>
          <span className="brand-copy"><strong>Sanjari</strong><small>Admin console</small></span>
        </div>
        <nav className="nav" aria-label="Admin navigation">
          {visibleGroups.map((group) => <div className="nav-group" key={group.label}>
            <span className="nav-group-label">{group.label}</span>
            {group.items.map((item) => {
              const IconComponent = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return <Link className={`nav-link${active ? ' active' : ''}`} key={item.href} href={item.href as never} title={collapsed ? item.label : undefined} onClick={() => setMobileOpen(false)}>
                <IconComponent className="nav-icon" size={18} strokeWidth={1.8} /><span className="nav-label">{item.label}</span>
              </Link>;
            })}
          </div>)}
        </nav>
        <div className="sidebar-footer">
          <button className="sidebar-toggle" onClick={toggleCollapsed} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}<span className="nav-label">Collapse menu</span>
          </button>
          <button className="sidebar-profile" onClick={() => setSidebarProfileOpen((value) => !value)} aria-expanded={sidebarProfileOpen}>
            <span className="avatar avatar-small">{initials(displayName)}</span><span className="profile-summary nav-label"><strong>{displayName}</strong><small>Administrator</small></span>
          </button>
          {sidebarProfileOpen ? <div className="profile-popover sidebar-popover"><strong>{displayName}</strong><span>{claims.email || 'Admin account'}</span><button onClick={() => void logout()}><LogOut size={15} /> Sign out</button></div> : null}
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-title"><button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div><span className="breadcrumb">Sanjari / Operations</span><strong>{pageTitle}</strong></div></div>
          <div className="header-actions">
            <button className="icon-button" onClick={() => setDark((value) => !value)} title={dark ? 'Use light theme' : 'Use dark theme'} aria-label={dark ? 'Use light theme' : 'Use dark theme'}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button>
            <Link className="icon-button notification-button" href="/notifications" title="Notifications" aria-label="Notifications"><Bell size={19} /><span className="notification-dot" /></Link>
            <div className="profile-anchor"><button className="header-profile" onClick={() => setHeaderProfileOpen((value) => !value)} aria-label="Open account menu" aria-expanded={headerProfileOpen}><span className="avatar">{initials(displayName)}</span></button>{headerProfileOpen ? <div className="profile-popover header-popover"><div className="popover-user"><span className="avatar">{initials(displayName)}</span><div><strong>{displayName}</strong><span>{claims.email || 'Admin account'}</span></div></div><Link href="/dashboard"><UserRound size={15} /> Workspace overview</Link><button onClick={() => void logout()}><LogOut size={15} /> Sign out</button></div> : null}</div>
          </div>
        </header>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
