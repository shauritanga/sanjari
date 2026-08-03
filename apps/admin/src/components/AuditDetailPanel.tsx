import type { ReactNode } from 'react';

export interface AuditDetail {
  label: string;
  value: ReactNode;
}

export function AuditDetailPanel({ title = 'Audit details', details }: { title?: string; details: AuditDetail[] }) {
  return (
    <section className="audit-detail-panel" aria-labelledby="audit-detail-title">
      <h2 id="audit-detail-title">{title}</h2>
      <dl>{details.map((detail) => <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}</dl>
    </section>
  );
}
