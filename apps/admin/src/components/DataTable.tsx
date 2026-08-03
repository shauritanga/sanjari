import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption: string;
  empty?: ReactNode;
}

export function DataTable<T>({ columns, rows, rowKey, caption, empty }: DataTableProps<T>) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>{columns.map((column) => <th className={column.className} key={column.key} scope="col">{column.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>{columns.map((column) => <td className={column.className} key={column.key}>{column.render(row)}</td>)}</tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? empty : null}
    </div>
  );
}
