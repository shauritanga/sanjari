'use client';

import type { ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', busy = false, onConfirm, onClose }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <h2 id="confirm-dialog-title">{title}</h2>
        {description ? <div className="dialog-description">{description}</div> : null}
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose} disabled={busy}>{cancelLabel}</button>
          <button className="danger-button" type="button" onClick={onConfirm} disabled={busy}>{busy ? 'Working...' : confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
