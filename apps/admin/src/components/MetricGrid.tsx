import type { ReactNode } from 'react';

export interface MetricItem {
  id: string;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'error';
}

export function MetricGrid({ items, label = 'Metrics' }: { items: MetricItem[]; label?: string }) {
  return (
    <section className="metrics" aria-label={label}>
      {items.map((item) => (
        <div className={`metric metric-${item.tone ?? 'default'}`} key={item.id}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.detail ? <small>{item.detail}</small> : null}
        </div>
      ))}
    </section>
  );
}
