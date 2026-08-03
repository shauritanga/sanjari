interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  name?: string;
}

export function SearchField({ value, onChange, label = 'Search', placeholder = 'Search', name = 'search' }: SearchFieldProps) {
  return (
    <label className="search-field">
      <span>{label}</span>
      <input name={name} type="search" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
