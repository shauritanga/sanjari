import type { ReactNode } from 'react';

export function Toast({ message, tone = 'default', action, onDismiss }: { message: string; tone?: 'default' | 'success' | 'error'; action?: ReactNode; onDismiss?: () => void }) {
  return <div className={`toast toast-${tone}`} role={tone === 'error' ? 'alert' : 'status'}><span>{message}</span>{action}{onDismiss ? <button type="button" className="toast-dismiss" onClick={onDismiss} aria-label="Dismiss notification">×</button> : null}</div>;
}
