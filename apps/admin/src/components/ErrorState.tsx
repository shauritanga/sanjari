import type { ReactNode } from 'react';

export function ErrorState({ title = 'Unable to load this view', message, action }: { title?: string; message?: string; action?: ReactNode }) {
  return <div className="state-panel error-state" role="alert"><strong>{title}</strong>{message ? <p>{message}</p> : null}{action ? <div>{action}</div> : null}</div>;
}
