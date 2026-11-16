import React from 'react';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';

interface StandardTableProps {
  headers: (string | React.ReactNode)[];
  columnLabels?: string[];
  emptyMessage?: string;
  variant?: 'default' | 'draft' | 'past';
  children: React.ReactNode;
}

function labelFor(headers: (string | React.ReactNode)[], columnLabels: string[] | undefined, index: number) {
  if (columnLabels?.[index]) return columnLabels[index];
  const header = headers[index];
  return typeof header === 'string' ? header : '';
}

/**
 * Shared admin table. On narrow screens each cell shows its column label.
 */
const StandardTable: React.FC<StandardTableProps> = ({
  headers,
  columnLabels,
  emptyMessage = 'Inga poster att visa',
  variant = 'default',
  children
}) => {
  const tableHeaderClassName = variant === 'past'
    ? `${styles.tableHeader} ${styles.pastTableHeader}`
    : styles.tableHeader;

  const labeledRows = React.Children.map(children, (child) => {
    if (!React.isValidElement(child) || child.type !== 'tr') return child;
    const row = child as React.ReactElement<{ children?: React.ReactNode }>;
    const cells = React.Children.map(row.props.children, (cell, index) => {
      if (!React.isValidElement(cell)) return cell;
      const label = labelFor(headers, columnLabels, index);
      return React.cloneElement(cell as React.ReactElement<Record<string, unknown>>, {
        'data-label': label,
      });
    });
    return React.cloneElement(row, {}, cells);
  });

  return (
    <div className={styles.tableWrapper}>
      <table className={`${styles.table} ${styles.responsiveTable}`}>
        <thead className={tableHeaderClassName}>
          <tr>
            {headers.map((header, index) => (
              <th key={index} className={styles.tableHeaderCell}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {React.Children.count(children) === 0 ? (
            <tr className={styles.tableRow}>
              <td className={styles.emptyCell} colSpan={headers.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            labeledRows
          )}
        </tbody>
      </table>
    </div>
  );
};

export default StandardTable;
