interface StatusBadgeProps {
  status: string;
  label?: string;
}

function toneFor(status: string) {
  const normalized = status.toLowerCase();
  if (['active', 'approved', 'verified', 'published', 'resolved', 'success', 'healthy', 'read'].includes(normalized)) return 'success';
  if (['pending', 'review', 'queued', 'processing', 'warning', 'unread'].includes(normalized)) return 'warning';
  if (['failed', 'rejected', 'suspended', 'banned', 'error', 'blocked'].includes(normalized)) return 'error';
  return 'neutral';
}

export function StatusBadge({ status, label = status }: StatusBadgeProps) {
  return <span className={`status-badge status-${toneFor(status)}`}><span aria-hidden="true" />{label}</span>;
}
