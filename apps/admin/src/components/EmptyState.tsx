import type { ReactNode } from 'react';

export function EmptyState({ title = 'Nothing to show', description, action }: { title?: string; description?: string; action?: ReactNode }) {
  return <div className="state-panel empty-state"><strong>{title}</strong>{description ? <p>{description}</p> : null}{action ? <div>{action}</div> : null}</div>;
}
