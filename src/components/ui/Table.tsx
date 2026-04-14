'use client';

import React from 'react';
import { Inbox, ChevronUp, ChevronDown } from 'lucide-react';

/* ── Column Definition ── */
export interface TableColumn<T = Record<string, unknown>> {
  title: string;
  dataIndex: string;
  key?: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  sorter?: boolean;
  fixed?: 'left' | 'right';
  ellipsis?: boolean;
  render?: (value: unknown, record: T, index: number) => React.ReactNode;
}

/* ── Pagination ── */
export interface PaginationConfig {
  current: number;
  pageSize: number;
  total: number;
  onChange: (page: number, pageSize: number) => void;
  pageSizeOptions?: number[];
}

/* ── Props ── */
export interface TableProps<T = Record<string, unknown>> {
  columns: TableColumn<T>[];
  dataSource: T[];
  rowKey?: string | ((record: T, index: number) => string);
  loading?: boolean;
  pagination?: PaginationConfig | false;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (field: string, order: 'asc' | 'desc') => void;
  emptyText?: string;
  size?: 'small' | 'middle';
  onRow?: (record: T, index: number) => React.HTMLAttributes<HTMLTableRowElement>;
  selectionMode?: 'single' | 'multiple' | 'none';
  selectedRowKeys?: React.Key[];
  onSelectionChange?: (keys: React.Key[], rows: T[]) => void;
  scrollX?: number | string;
  title?: string;
  summary?: () => React.ReactNode;
}

function getRowKey<T>(record: T, rowKey: string | ((r: T, i: number) => string), index: number): React.Key {
  if (typeof rowKey === 'function') return rowKey(record, index);
  return (record as Record<string, unknown>)[rowKey] as React.Key ?? index;
}

export default function Table<T extends Record<string, unknown> = Record<string, unknown>>({
  columns,
  dataSource,
  rowKey = 'id',
  loading = false,
  pagination,
  sortBy,
  sortOrder,
  onSortChange,
  emptyText = '데이터가 없습니다.',
  onRow,
  selectionMode = 'none',
  selectedRowKeys = [],
  onSelectionChange,
  scrollX,
  title,
  summary,
}: TableProps<T>) {
  const handleSort = (field: string) => {
    if (!onSortChange) return;
    if (sortBy === field) {
      onSortChange(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, 'asc');
    }
  };

  const handleSelect = (key: React.Key, record: T) => {
    if (!onSelectionChange) return;
    if (selectionMode === 'single') {
      onSelectionChange([key], [record]);
    } else {
      const newKeys = selectedRowKeys.includes(key)
        ? selectedRowKeys.filter((k) => k !== key)
        : [...selectedRowKeys, key];
      const newRows = dataSource.filter((r, i) => newKeys.includes(getRowKey(r, rowKey, i) as React.Key));
      onSelectionChange(newKeys as React.Key[], newRows);
    }
  };

  return (
    <div className="relative">
      {title && <h3 className="text-base font-semibold text-gray-700 mb-3">{title}</h3>}

      {loading && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-lg">
          <svg className="animate-spin w-8 h-8 text-cyan-accent" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
      )}

      <div className={scrollX ? 'overflow-x-auto' : ''} style={scrollX ? { maxWidth: '100%' } : undefined}>
        <table className="w-full border-collapse" style={scrollX ? { minWidth: scrollX } : undefined}>
          <thead>
            <tr>
              {selectionMode !== 'none' && (
                <th className="w-12 bg-dark-700 px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider" />
              )}
              {columns.map((col) => (
                <th
                  key={col.key || col.dataIndex}
                  className={`
                    bg-dark-700 px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider
                    ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                    ${col.sorter ? 'cursor-pointer select-none hover:text-gray-600' : ''}
                  `}
                  style={{ width: col.width }}
                  onClick={col.sorter ? () => handleSort(col.dataIndex) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.title}
                    {col.sorter && sortBy === col.dataIndex && (
                      sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataSource.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectionMode !== 'none' ? 1 : 0)} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Inbox className="w-12 h-12 text-gray-300" />
                    <span className="text-sm text-gray-400">{emptyText}</span>
                  </div>
                </td>
              </tr>
            ) : (
              dataSource.map((record, rowIdx) => {
                const key = getRowKey(record, rowKey, rowIdx);
                const isSelected = selectedRowKeys.includes(key);
                const rowProps = onRow ? onRow(record, rowIdx) : {};

                return (
                  <tr
                    key={key}
                    className={`
                      transition-colors
                      ${rowIdx % 2 === 1 ? 'bg-dark-700' : 'bg-white'}
                      hover:bg-dark-900
                      ${isSelected ? 'bg-cyan-accent/5' : ''}
                      ${rowProps.className || ''}
                    `}
                    {...rowProps}
                    onClick={(e) => {
                      rowProps.onClick?.(e);
                    }}
                  >
                    {selectionMode !== 'none' && (
                      <td className="px-4 py-3.5">
                        <input
                          type={selectionMode === 'single' ? 'radio' : 'checkbox'}
                          checked={isSelected}
                          onChange={() => handleSelect(key, record)}
                          className="accent-cyan-accent"
                        />
                      </td>
                    )}
                    {columns.map((col) => {
                      const value = record[col.dataIndex];
                      return (
                        <td
                          key={col.key || col.dataIndex}
                          className={`
                            px-4 py-3.5 text-sm text-gray-700
                            ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                            ${col.ellipsis ? 'truncate max-w-0' : ''}
                          `}
                          style={{ width: col.width }}
                        >
                          {col.render ? col.render(value, record, rowIdx) : (value as React.ReactNode)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {summary && <div className="mt-2">{summary()}</div>}

      {/* Pagination */}
      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-gray-400">
            {Math.min((pagination.current - 1) * pagination.pageSize + 1, pagination.total)}-
            {Math.min(pagination.current * pagination.pageSize, pagination.total)} / 총 {pagination.total}건
          </span>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.ceil(pagination.total / pagination.pageSize) }, (_, i) => i + 1)
              .slice(Math.max(0, pagination.current - 3), pagination.current + 2)
              .map((p) => (
                <button
                  key={p}
                  onClick={() => pagination.onChange(p, pagination.pageSize)}
                  className={`
                    w-8 h-8 rounded-md text-sm font-medium transition-colors
                    ${p === pagination.current
                      ? 'bg-cyan-accent text-white'
                      : 'text-gray-600 hover:bg-dark-700'}
                  `}
                >
                  {p}
                </button>
              ))}
          </div>
          <select
            value={pagination.pageSize}
            onChange={(e) => pagination.onChange(1, Number(e.target.value))}
            className="h-8 px-2 bg-dark-700 border border-dark-500 rounded-md text-sm text-gray-700"
          >
            {(pagination.pageSizeOptions || [10, 20, 50, 100]).map((s) => (
              <option key={s} value={s}>{s}건/쪽</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
