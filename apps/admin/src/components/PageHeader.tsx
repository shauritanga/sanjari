import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  status?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions, status }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions || status ? <div className="page-header-actions">{actions}{status}</div> : null}
    </header>
  );
}
