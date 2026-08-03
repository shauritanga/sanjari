export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return <div className="state-panel loading-state" aria-live="polite" aria-busy="true"><span className="loading-spinner" aria-hidden="true" />{label}</div>;
}
