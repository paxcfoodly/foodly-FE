'use client';

import React, { useCallback, useMemo } from 'react';
import Table from '@/components/ui/Table';
import type { TableColumn, PaginationConfig } from '@/components/ui/Table';

/* ── Types ─────────────────────────────────────────── */

export interface DataGridColumn<T = Record<string, unknown>> {
  /** 컬럼 제목 */
  title: string;
  /** 데이터 필드 키 */
  dataIndex: string;
  /** 컬럼 키 (선택) */
  key?: string;
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
  /** 컬럼 너비 드래그 리사이즈 허용 (기본 true; width가 설정된 컬럼만 적용) */
  resizable?: boolean;
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
  summary?: () => React.ReactNode;
  /** 행 클릭 콜백 */
  onRow?: (record: T, index?: number) => React.HTMLAttributes<HTMLElement>;
  /** bordered — disabled by default (No-Line rule) */
  bordered?: boolean;
  /** localStorage 에 사용자가 드래그한 컬럼 너비를 저장할 키. 페이지 단위 unique 권장 (예: 'preventive-maint-grid'). */
  storageKey?: string;
}

const DEFAULT_PAGE_SIZE = 50;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

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
  size = 'middle',
  summary,
  onRow,
  storageKey,
}: DataGridProps<T>) {
  /* ── 컬럼 변환 ─── */
  const tableColumns: TableColumn<T>[] = useMemo(
    () =>
      columns.map((col) => ({
        title: col.title,
        dataIndex: col.dataIndex,
        // 같은 dataIndex를 가진 컬럼이 둘 이상 있을 때(예: '점검일'과
        // '상태'가 모두 next_plan_date 기준) React key 충돌을 막기 위해
        // col.key를 우선 사용.
        key: col.key ?? col.dataIndex,
        width: col.width,
        align: col.align,
        fixed: col.fixed,
        ellipsis: col.ellipsis ?? true,
        sorter: col.sorter ?? false,
        resizable: col.resizable,
        render: col.render,
      })),
    [columns],
  );

  /* ── 페이지네이션 설정 ─── */
  const pagination: PaginationConfig | false = useMemo(() => {
    if (total === undefined) return false;
    return {
      current: page,
      pageSize,
      total,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
      onChange: (p: number, ps: number) => {
        onPageChange?.(p, ps);
      },
    };
  }, [total, page, pageSize, onPageChange]);

  /* ── 정렬 변경 핸들러 ─── */
  const handleSortChange = useCallback(
    (field: string, order: 'asc' | 'desc') => {
      onSortChange?.(field, order);
    },
    [onSortChange],
  );

  /* ── onRow 어댑터 (index가 optional → required) ─── */
  const handleRow = useMemo(() => {
    if (!onRow) return undefined;
    return (record: T, index: number) => onRow(record, index) as React.HTMLAttributes<HTMLTableRowElement>;
  }, [onRow]);

  return (
    <Table<T>
      columns={tableColumns}
      dataSource={dataSource}
      rowKey={rowKey}
      loading={loading}
      pagination={pagination}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={onSortChange ? handleSortChange : undefined}
      selectionMode={selectionMode}
      selectedRowKeys={selectedRowKeys ?? []}
      onSelectionChange={onSelectionChange}
      emptyText={emptyText}
      scrollX={scrollX}
      size={size === 'large' ? 'middle' : size}
      title={title}
      summary={summary}
      onRow={handleRow}
      storageKey={storageKey}
    />
  );
}
