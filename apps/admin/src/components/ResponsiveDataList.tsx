import type { ReactNode } from 'react';
import type { DataTableColumn } from './DataTable';

interface ResponsiveDataListProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
}

export function ResponsiveDataList<T>({ columns, rows, rowKey, empty }: ResponsiveDataListProps<T>) {
  return (
    <div className="responsive-data-list">
      {rows.map((row) => (
        <article className="responsive-data-item" key={rowKey(row)}>
          {columns.map((column) => (
            <div className="responsive-data-field" key={column.key}>
              <span>{column.header}</span>
              <div>{column.render(row)}</div>
            </div>
          ))}
        </article>
      ))}
      {rows.length === 0 ? empty : null}
    </div>
  );
}
