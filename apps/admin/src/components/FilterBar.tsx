import type { FormEvent, ReactNode } from 'react';

interface FilterBarProps {
  children: ReactNode;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  onReset?: () => void;
  resetLabel?: string;
}

export function FilterBar({ children, onSubmit, onReset, resetLabel = 'Clear filters' }: FilterBarProps) {
  return (
    <form className="filter-bar" onSubmit={onSubmit}>
      <div className="filter-fields">{children}</div>
      {onReset ? <button className="secondary-button" type="button" onClick={onReset}>{resetLabel}</button> : null}
      <button className="primary-button filter-submit" type="submit">Apply filters</button>
    </form>
  );
}
