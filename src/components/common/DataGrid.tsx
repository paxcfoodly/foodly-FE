'use client';

import React, { useCallback, useMemo } from 'react';
import { Table, Typography, Empty } from 'antd';
import type { TableProps, TablePaginationConfig } from 'antd';
import type { SorterResult, FilterValue } from 'antd/es/table/interface';
import type { ColumnsType } from 'antd/es/table';
import { InboxOutlined } from '@ant-design/icons';

/* ── Types ─────────────────────────────────────────── */

export interface DataGridColumn<T = Record<string, unknown>> {
  /** 컬럼 제목 */
  title: string;
  /** 데이터 필드 키 */
  dataIndex: string;
  /** 컬럼 너비 (px 또는 %) */
  width?: number | string;
  /** 정렬 가능 여부 */
  sorter?: boolean;
  /** 커스텀 렌더러 */
  render?: (value: unknown, record: T, index: number) => React.ReactNode;
  /** 정렬 방식 (기본 asc/desc 토글) */
  align?: 'left' | 'center' | 'right';
  /** 고정 컬럼 */
  fixed?: 'left' | 'right';
  /** 말줄임 처리 */
  ellipsis?: boolean;
}

export type RowSelectionMode = 'single' | 'multiple' | 'none';

export interface DataGridProps<T extends Record<string, unknown> = Record<string, unknown>> {
  /** 컬럼 정의 배열 */
  columns: DataGridColumn<T>[];
  /** 데이터 소스 */
  dataSource: T[];
  /** 로우 고유 키 필드 (기본: 'id') */
  rowKey?: string | ((record: T) => string);
  /** 로딩 상태 */
  loading?: boolean;

  /* ── 페이징 ─── */
  /** 현재 페이지 (1-based) */
  page?: number;
  /** 페이지 크기 (기본 50) */
  pageSize?: number;
  /** 전체 레코드 수 (서버 사이드 페이징) */
  total?: number;
  /** 페이지/페이지사이즈 변경 콜백 */
  onPageChange?: (page: number, pageSize: number) => void;

  /* ── 정렬 ─── */
  /** 정렬 필드 */
  sortBy?: string;
  /** 정렬 방향 */
  sortOrder?: 'asc' | 'desc';
  /** 정렬 변경 콜백 */
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;

  /* ── 행 선택 ─── */
  /** 행 선택 모드 (기본 none) */
  selectionMode?: RowSelectionMode;
  /** 선택된 행 키 목록 */
  selectedRowKeys?: React.Key[];
  /** 선택 변경 콜백 */
  onSelectionChange?: (selectedKeys: React.Key[], selectedRows: T[]) => void;

  /* ── 기타 ─── */
  /** 테이블 상단 제목 */
  title?: string;
  /** 빈 상태 메시지 */
  emptyText?: string;
  /** 스크롤 영역 (x: 가로 스크롤) */
  scrollX?: number | string;
  /** 테이블 크기 */
  size?: 'small' | 'middle' | 'large';
  /** 테이블 하단 요약 */
  summary?: TableProps<T>['summary'];
  /** 행 클릭 콜백 */
  onRow?: (record: T, index?: number) => React.HTMLAttributes<HTMLElement>;
  /** bordered */
  bordered?: boolean;
}

const DEFAULT_PAGE_SIZE = 50;
const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];

/* ── Component ─────────────────────────────────────── */

export default function DataGrid<T extends Record<string, unknown> = Record<string, unknown>>({
  columns,
  dataSource,
  rowKey = 'id',
  loading = false,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  total,
  onPageChange,
  sortBy,
  sortOrder,
  onSortChange,
  selectionMode = 'none',
  selectedRowKeys,
  onSelectionChange,
  title,
  emptyText = '데이터가 없습니다.',
  scrollX,
  size = 'small',
  summary,
  onRow,
  bordered = true,
}: DataGridProps<T>) {
  /* ── Ant 컬럼 변환 ─── */
  const antColumns: ColumnsType<T> = useMemo(
    () =>
      columns.map((col) => ({
        title: col.title,
        dataIndex: col.dataIndex,
        key: col.dataIndex,
        width: col.width,
        align: col.align,
        fixed: col.fixed,
        ellipsis: col.ellipsis ?? true,
        sorter: col.sorter ?? false,
        sortOrder:
          sortBy === col.dataIndex
            ? sortOrder === 'asc'
              ? ('ascend' as const)
              : ('descend' as const)
            : undefined,
        render: col.render as ColumnsType<T>[number]['render'],
      })),
    [columns, sortBy, sortOrder],
  );

  /* ── 페이지네이션 설정 ─── */
  const pagination: TablePaginationConfig | false =
    total !== undefined
      ? {
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          showTotal: (t: number, range: [number, number]) =>
            `${range[0]}-${range[1]} / 총 ${t}건`,
          size: 'small',
        }
      : false;

  /* ── 행 선택 설정 ─── */
  const rowSelection: TableProps<T>['rowSelection'] =
    selectionMode !== 'none'
      ? {
          type: selectionMode === 'single' ? 'radio' : 'checkbox',
          selectedRowKeys: selectedRowKeys ?? [],
          onChange: (keys: React.Key[], rows: T[]) => {
            onSelectionChange?.(keys, rows);
          },
        }
      : undefined;

  /* ── onChange 통합 핸들러 ─── */
  const handleTableChange = useCallback(
    (
      pag: TablePaginationConfig,
      _filters: Record<string, FilterValue | null>,
      sorter: SorterResult<T> | SorterResult<T>[],
    ) => {
      // 페이징
      if (pag.current && pag.pageSize) {
        onPageChange?.(pag.current, pag.pageSize);
      }

      // 정렬 (단일 컬럼)
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      if (s?.field && s.order) {
        onSortChange?.(
          String(s.field),
          s.order === 'ascend' ? 'asc' : 'desc',
        );
      } else if (s?.field && !s.order) {
        // 정렬 해제 → 기본 정렬
        onSortChange?.('', 'asc');
      }
    },
    [onPageChange, onSortChange],
  );

  /* ── 빈 상태 ─── */
  const emptyLocale = useMemo(
    () => ({
      emptyText: (
        <Empty
          image={<InboxOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />}
          description={emptyText}
        />
      ),
    }),
    [emptyText],
  );

  return (
    <div className="data-grid-wrapper">
      {title && (
        <Typography.Title level={5} style={{ marginBottom: 12 }}>
          {title}
        </Typography.Title>
      )}
      <Table<T>
        columns={antColumns}
        dataSource={dataSource}
        rowKey={rowKey}
        loading={loading}
        pagination={pagination}
        rowSelection={rowSelection}
        onChange={handleTableChange}
        locale={emptyLocale}
        scroll={scrollX ? { x: scrollX } : undefined}
        size={size}
        summary={summary}
        onRow={onRow}
        bordered={bordered}
        showSorterTooltip={false}
      />
    </div>
  );
}
